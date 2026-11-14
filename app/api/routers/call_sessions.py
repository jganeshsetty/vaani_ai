"""Call Session API Router for outbound calls and WebSocket streaming.

Endpoints:
  - POST /api/create-outbound-call - Create session and send WhatsApp Magic Link
  - GET /api/sessions/room/{room_id} - Fetch session by room_id
  - GET /api/sessions - List all sessions
  - WebSocket /ws/call/{room_id} - Real-time STT -> Evon -> TTS streaming
"""
from __future__ import annotations

import asyncio
import base64
import logging
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.models import CallMode, CallStatus, Language
from app.services.call_session_service import (
    create_session,
    get_session_by_room,
    append_transcript,
    set_session_status,
    set_call_summary,
    set_recording_url,
)
from app.services.whatsapp import get_whatsapp_service
from app.services.gnani_client import GnaniSTTClient, GnaniTTSClient, get_gnani_lang_code
from app.services.evon_client import evon_client
from app.services.gcs_service import GCSService

logger = logging.getLogger("vaani.callsessions")

router = APIRouter(prefix="/api", tags=["call-sessions"])


# --- Request / Response Models ---

class CreateOutboundCallRequest(BaseModel):
    """Request body for creating an outbound call session."""

    target_number: str = Field(..., description="Target phone number in E.164 format")
    context_prompt: str = Field(..., min_length=1, max_length=2000, description="The prompt/instructions for the AI agent")
    language: Optional[Language] = Field(default=Language.KANNADA, description="Conversation language")
    target_name: Optional[str] = Field(None, description="Target person's name for context")


class CreateOutboundCallResponse(BaseModel):
    """Response after creating an outbound call session."""

    room_id: str
    status: str
    target_number: str
    message: str = "Session created and WhatsApp message sent successfully"


class SessionResponse(BaseModel):
    """Call session response model."""

    id: str
    room_id: str
    mode: str
    target_number: str | None
    target_name: str | None
    context_prompt: str
    status: str
    transcript: list[dict]
    summary: str | None
    recording_url: str | None
    language: str
    created_at: str
    updated_at: str


# --- Outbound Call Creation Endpoint ---

@router.post("/create-outbound-call", response_model=CreateOutboundCallResponse, status_code=201)
async def create_outbound_call(request: CreateOutboundCallRequest):
    """Create a new outbound call session and send WhatsApp Magic Link."""
    # Validate phone number format
    if not request.target_number.startswith("+") and not request.target_number.startswith("++"):
        raise HTTPException(status_code=400, detail="Phone number must be in E.164 format (e.g., +1234567890)")

    # Create session in MongoDB
    session = await create_session(
        mode=CallMode.OUTBOUND,
        target_number=request.target_number,
        context_prompt=request.context_prompt,
        language=request.language,
        target_name=request.target_name,
    )

    # Send WhatsApp Magic Link
    try:
        whatsapp = get_whatsapp_service()
        await whatsapp.send_magic_link(
            to=request.target_number,
            room_id=session.room_id,
            domain="https://vaani.ai",  # Update with your frontend domain
        )
    except Exception as e:
        logger.exception("Failed to send WhatsApp message: %s", e)
        # Update session status to failed
        raise HTTPException(status_code=500, detail=f"Session created but WhatsApp message failed: {str(e)}")

    return CreateOutboundCallResponse(
        room_id=session.room_id,
        status=session.status,
        target_number=session.target_number,
    )


# --- Session Management Endpoints ---

@router.get("/sessions/room/{room_id}", response_model=SessionResponse)
async def get_session_by_room_id(room_id: str):
    """Fetch a call session by its room_id (UUID)."""
    session = await get_session_by_room(room_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(
        id=session.id,
        room_id=session.room_id,
        mode=session.mode,
        target_number=session.target_number,
        target_name=session.target_name,
        context_prompt=session.context_prompt,
        status=session.status,
        transcript=session.transcript,
        summary=session.summary,
        recording_url=session.recording_url,
        language=session.language,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions():
    """List all call sessions."""
    from app.services.call_session_service import list_sessions as list_all_sessions
    sessions = await list_all_sessions()
    return [
        SessionResponse(
            id=s.id,
            room_id=s.room_id,
            mode=s.mode,
            target_number=s.target_number,
            target_name=s.target_name,
            context_prompt=s.context_prompt,
            status=s.status,
            transcript=s.transcript,
            summary=s.summary,
            recording_url=s.recording_url,
            language=s.language,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
        )
        for s in sessions
    ]


# --- WebSocket Connection Manager ---

class ConnectionManager:
    """Manages WebSocket connections for call sessions."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[room_id] = websocket
        logger.info("WebSocket connected: room_id=%s", room_id)

    def disconnect(self, room_id: str):
        if room_id in self.active_connections:
            del self.active_connections[room_id]
            logger.info("WebSocket disconnected: room_id=%s", room_id)

    async def send_text(self, room_id: str, message: str):
        if room_id in self.active_connections:
            await self.active_connections[room_id].send_text(message)

    async def send_json(self, room_id: str, data: dict):
        if room_id in self.active_connections:
            await self.active_connections[room_id].send_json(data)


manager = ConnectionManager()


# --- WebSocket Endpoint for Real-Time Call Streaming ---

@router.websocket("/ws/call/{room_id}")
async def call_websocket(websocket: WebSocket, room_id: str):
    """
    Real-time WebSocket endpoint for voice call streaming.

    Flow:
    1. Client connects and session is loaded from MongoDB
    2. Client streams microphone audio via WebSocket
    3. Backend:
       - Processes audio with Gnani STT
       - Sends text to Evon v3.3 for response
       - Streams response text back
       - Synthesizes TTS audio with Gnani Timbre
       - Streams audio bytes back to client

    On disconnect:
    - Generates session summary using Evon
    - Uploads audio to GCS
    - Saves recording URL and summary to MongoDB
    """
    connection_id = f"{room_id}"

    try:
        await manager.connect(room_id, websocket)

        # Load session from MongoDB
        session = await get_session_by_room(room_id)
        if session is None:
            await websocket.send_json({"error": "Session not found", "type": "error"})
            await websocket.close()
            return

        # Update session status to active
        await set_session_status(session.id, CallStatus.ACTIVE)

        # Initialize clients
        stt_client = GnaniSTTClient(
            api_key=None,  # Will use settings.gnani_api_key
            language=session.language,
            sample_rate=16000,
        )

        tts_client = GnaniTTSClient(
            api_key=None,  # Will use settings.gnani_api_key
            language=session.language,
            voice="Aarohi",
        )

        evon = evon_client()
        gcs = GCSService()

        # Build system instruction for Evon from context_prompt
        system_prompt = session.context_prompt

        # Store conversation history
        conversation_history = [{"role": "system", "content": system_prompt}]
        audio_chunks: list[bytes] = []
        transcript_entries: list[dict] = []

        # Send ready signal
        await websocket.send_json({
            "type": "ready",
            "status": "active",
            "message": "Connected. Starting call session...",
            "system_prompt": system_prompt[:100] + "..." if len(system_prompt) > 100 else system_prompt,
        })

        async def process_turn(user_text: str) -> str:
            """Process a turn: STT -> Evon -> TTS -> return text and audio."""
            # Add user turn to history
            conversation_history.append({"role": "user", "content": user_text})

            transcript_entry_user = {
                "role": "user",
                "speaker": "User",
                "text": user_text,
                "language": session.language.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            transcript_entries.append(transcript_entry_user)

            # Get response from Evon
            evon_response = ""
            async for chunk in evon.chat(conversation_history, max_tokens=512, temperature=0.7):
                evon_response += chunk
                await websocket.send_json({"type": "text_chunk", "text": chunk})

            # Add agent response to history
            conversation_history.append({"role": "assistant", "content": evon_response})

            transcript_entry_agent = {
                "role": "assistant",
                "speaker": "AI Agent",
                "text": evon_response,
                "language": session.language.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            transcript_entries.append(transcript_entry_agent)

            # Synthesize TTS
            tts_chunks = []
            async for audio_chunk in tts_client.synthesize(evon_response):
                tts_chunks.append(audio_chunk)
                await websocket.send_json({
                    "type": "audio_chunk",
                    "chunk_size": len(audio_chunk),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            # Combine audio chunks and store
            full_audio = b"".join(tts_chunks)
            audio_chunks.append(full_audio)

            return evon_response

        try:
            while True:
                # Receive audio chunk from client
                data = await websocket.receive()

                if data.type == "websocket.receive":
                    if data.bytes:
                        # Raw audio bytes - transcribe with Gnani STT
                        audio_bytes = data.bytes
                        transcribed = await stt_client.transcribe(audio_bytes, filename="mic_input.wav")

                        if transcribed:
                            logger.info("STT result: %s", transcribed[:50])
                            response_text = await process_turn(transcribed)

                            if not response_text:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": "No response generated",
                                })
                    elif data.text:
                        # Text message from client (for debugging/testing)
                        try:
                            msg = json.loads(data.text)
                            if msg.get("type") == "ping":
                                await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                            elif msg.get("type") == "stop":
                                break
                        except json.JSONDecodeError:
                            pass

                elif data.type == "websocket.disconnect":
                    break

        except WebSocketDisconnect:
            logger.info("WebSocket disconnected by client: %s", connection_id)
        except Exception as e:
            logger.exception("WebSocket error: %s", e)
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
            except:
                pass

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", connection_id)
    except Exception as e:
        logger.exception("WebSocket connection error: %s", e)
    finally:
        manager.disconnect(room_id)

        # Generate summary and upload recording on disconnect
        try:
            # Generate summary
            summary_text = await evon.summarize(transcript_entries) if transcript_entries else "Call completed with no meaningful conversation."

            # Upload audio to GCS
            if audio_chunks:
                combined_audio = b"".join(audio_chunks)
                # Add WAV header if needed
                recording_url = gcs.upload_bytes(combined_audio, content_type="audio/wav")
            else:
                recording_url = None

            # Save to MongoDB
            await set_call_summary(session.id, summary_text)
            if recording_url:
                await set_recording_url(session.id, recording_url)

            # Update transcript
            for entry in transcript_entries:
                await append_transcript(session.id, entry)

            logger.info("Call session completed: room_id=%s, summary=%s", room_id, summary_text[:50] if summary_text else "N/A")

        except Exception as e:
            logger.exception("Error during session finalization: %s", e)

        # Clean up clients
        try:
            await stt_client.close()
            await tts_client.close()
        except:
            pass

    return JSONResponse({"status": "completed"})