"""Call Session API Router for dual-mode web-based calling system.

Endpoints:
  - POST /api/outbound - Create outbound session
  - POST /api/generate-busy-session - Generate inbound session (busy mode)
  - GET /api/sessions - List all sessions
  - GET /api/sessions/room/{room_id} - Fetch session by room_id
  - WebSocket /ws/call/{room_id} - Real-time STT -> Evon -> TTS streaming
"""
from __future__ import annotations

import asyncio
import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.models import CallMode, CallStatus, Language, SpeakerIdRequest
from app.services.call_session_service import (
    create_session,
    get_session_by_room,
    append_transcript,
    set_session_status,
    set_call_summary,
    set_scheduled_time,
)
from app.services.gnani_client import GnaniSTTClient, GnaniTTSClient
from app.services.evon_client import evon_client

logger = logging.getLogger("vaani.callsessions")

router = APIRouter(prefix="/api", tags=["call-sessions"])


# --- Request / Response Models ---

class CreateOutboundRequest(BaseModel):
    """Request body for creating an outbound call session."""

    target_name: Optional[str] = Field(default="Recipient", description="Target person's name for context")
    target_number: str = Field(..., description="Target phone number in E.164 format")
    context_prompt: str = Field(..., min_length=1, max_length=2000, description="The prompt/instructions for the AI agent")
    language: Optional[Language] = Field(default=Language.ENGLISH, description="Conversation language")
    schedule_time: Optional[str] = Field(None, description="ISO string timestamp when session should start (null = immediate)")
    speaker_id: Optional[str] = None


class CreateOutboundResponse(BaseModel):
    """Response after creating an outbound call session."""

    room_id: str
    mode: str
    status: str


class BusySessionResponse(BaseModel):
    """Response for busy mode session generation."""

    room_id: str
    mode: str
    status: str


class SendMessageRequest(BaseModel):
    """Request payload for dispatching call link message."""

    phone: str
    recipient_name: Optional[str] = "Ganesh"
    caller: Optional[str] = "Ganesh"
    instructions: Optional[str] = "Both Feature 1 and Feature 2 are working perfectly"
    link: Optional[str] = None
    message: Optional[str] = None


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
    scheduled_time: Optional[str] = None
    language: str
    created_at: str
    updated_at: str
    speaker_id: Optional[str] = None


# --- Default Busy Mode Prompt ---
DEFAULT_BUSY_MODE_PROMPT = "You are Ganesh's AI assistant. He is busy right now. Greet the caller, ask for their name, and take a message."


# --- Outbound Call Creation Endpoint ---

@router.post("/outbound", response_model=CreateOutboundResponse, status_code=201)
async def create_outbound_session(request: CreateOutboundRequest):
    """Create a new outbound call session."""
    # Normalize and validate phone number format
    norm_phone = request.target_number.strip()
    if not norm_phone.startswith("+"):
        norm_phone = f"+{norm_phone}"

    # Parse schedule_time if provided
    scheduled_time = None
    if request.schedule_time:
        try:
            scheduled_time = datetime.fromisoformat(request.schedule_time.replace("Z", "+00:00"))
            if scheduled_time < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="schedule_time must be in the future")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid schedule_time format: {e}")

    # Create session in MongoDB
    session = await create_session(
        mode=CallMode.OUTBOUND,
        target_number=norm_phone,
        context_prompt=request.context_prompt,
        language=request.language,
        target_name=request.target_name,
        scheduled_time=scheduled_time,
        speaker_id=request.speaker_id,
    )

    return CreateOutboundResponse(
        room_id=session.room_id,
        mode=session.mode,
        status=session.status,
    )


# --- Call Message Dispatch Pipeline Endpoint ---

@router.post("/messages/send", status_code=200)
async def send_call_message(payload: SendMessageRequest):
    """
    Backend pipeline endpoint for Feature 2:
    - Normalizes recipient phone number
    - Generates dynamic call session link
    - Formats outgoing message
    - Auto-provisions the call session in MongoDB for immediate connection
    """
    import re
    clean_phone = payload.phone.strip()
    if not clean_phone.startswith("+"):
        clean_phone = f"+{clean_phone}"

    extracted_room = None
    link = payload.link
    if link:
        m = re.search(r'/call/([a-zA-Z0-9_\-]+)', link)
        if m:
            extracted_room = m.group(1)

    room_id = extracted_room or str(uuid.uuid4())

    existing_session = await get_session_by_room(room_id)
    if existing_session is None:
        session = await create_session(
            mode=CallMode.OUTBOUND,
            target_number=clean_phone,
            context_prompt=f"[CALLER_PERSONA: Speak informally as {payload.caller}.] {payload.instructions or 'Call setup'}",
            language=Language.ENGLISH,
            target_name=payload.recipient_name or "Ganesh",
            room_id=room_id,
        )
    else:
        session = existing_session

    if not link:
        link = f"http://localhost:3000/call/{room_id}?caller={payload.caller}&phone={clean_phone}&desc={payload.instructions or 'Call setup'}"

    formatted_msg = payload.message or (
        f"Hello {payload.recipient_name or 'there'}! This is {payload.caller}. "
        f"Please join our secure voice call through this link:\n\n👉 {link}\n\n(No app download required • Opens directly in mobile browser)"
    )

    return {
        "status": "success",
        "phone": clean_phone,
        "recipient_name": payload.recipient_name,
        "caller": payload.caller,
        "link": link,
        "room_id": room_id,
        "message": formatted_msg,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# --- Busy Mode Session Generation Endpoint ---

@router.post("/generate-busy-session", response_model=BusySessionResponse, status_code=201)
async def generate_busy_session():
    """Generate a busy mode session (inbound) with default prompt."""
    session = await create_session(
        mode=CallMode.INBOUND,
        target_number=None,
        context_prompt=DEFAULT_BUSY_MODE_PROMPT,
        language=Language.KANNADA,
        target_name=None,
        scheduled_time=None,
    )

    return BusySessionResponse(
        room_id=session.room_id,
        mode=session.mode,
        status=session.status,
    )


# --- Session Management Endpoints ---

@router.get("/sessions/room/{room_id}", response_model=SessionResponse)
@router.get("/call-sessions/room/{room_id}", response_model=SessionResponse)
async def get_session_by_room_id(room_id: str):
    """Fetch a call session by its room_id (UUID), auto-provisioning if dynamically created."""
    session = await get_session_by_room(room_id)
    if session is None:
        session = await create_session(
            mode=CallMode.OUTBOUND,
            target_number=None,
            context_prompt="You are Ganesh's conversational voice assistant. Greet the recipient warmly and converse naturally in English.",
            language=Language.ENGLISH,
            target_name="Recipient",
            room_id=room_id,
        )
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
        scheduled_time=session.scheduled_time.isoformat() if session.scheduled_time else None,
        language=session.language,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        speaker_id=session.speaker_id,
    )


@router.get("/sessions", response_model=list[SessionResponse])
@router.get("/call-sessions", response_model=list[SessionResponse])
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
            scheduled_time=s.scheduled_time.isoformat() if s.scheduled_time else None,
            language=s.language,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            speaker_id=s.speaker_id,
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
    - Saves transcript array + summary text to MongoDB
    """
    connection_id = f"{room_id}"

    try:
        await manager.connect(room_id, websocket)

        # Load session from MongoDB (or auto-provision if on-the-fly room)
        session = await get_session_by_room(room_id)
        if session is None:
            session = await create_session(
                mode=CallMode.OUTBOUND,
                target_number=None,
                context_prompt="You are Ganesh's conversational voice assistant. Greet the recipient warmly and converse naturally in English.",
                language=Language.ENGLISH,
                target_name="Recipient",
                room_id=room_id,
            )

        # Update session status to active (skip scheduled -> pending for now)
        await set_session_status(session.id, CallStatus.ACTIVE)

        # Initialize clients
        stt_client = GnaniSTTClient(
            api_key=None,
            language=session.language,
            sample_rate=16000,
        )

        tts_client = GnaniTTSClient(
            api_key=None,
            language=session.language,
            voice="Aarohi",
            speaker_id=getattr(session, "speaker_id", None),
        )

        evon = evon_client()

        # Build system instruction for Evon from context_prompt
        persona = (
            "You MUST speak exactly as the persona described below. "
            "NEVER introduce yourself as an AI, bot, or assistant. Never break character. "
            "Use natural speech patterns, filler words like 'umm', 'ah', 'you know' sparingly. "
            "Respond conversationally."
        )
        system_prompt = f"{persona}\n\n{session.context_prompt}"

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

        async def synthesize_sentence(text: str) -> None:
            """Synthesize a complete sentence and stream audio bytes to the client."""
            if not text.strip():
                return
            try:
                tts_audio = await tts_client.synthesize_wav(text.strip())
                if tts_audio and len(tts_audio) > 44:
                    await websocket.send_bytes(tts_audio)
            except Exception as e:
                logger.exception("TTS synthesis failed for sentence: %s", e)

        async def process_turn(user_text: str) -> str:
            """Process a turn: STT -> Evon -> sentence-chunked TTS -> return text and audio."""
            # Send callee transcript to frontend immediately
            await websocket.send_json({
                "type": "transcript",
                "data": {
                    "role": "callee",
                    "text": user_text,
                    "language": session.language.value,
                },
            })

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

            # Get response from Evon, streaming tokens into a sentence buffer
            evon_response = ""
            sentence_buffer = ""

            async for chunk in evon.chat(conversation_history, max_tokens=512, temperature=0.7):
                evon_response += chunk
                sentence_buffer += chunk
                await websocket.send_json({"type": "text_chunk", "text": chunk})

                # Check for sentence boundary
                if any(c in chunk for c in '.!?'):
                    await synthesize_sentence(sentence_buffer.strip())
                    sentence_buffer = ""

            # Flush any remaining partial sentence
            if sentence_buffer.strip():
                await synthesize_sentence(sentence_buffer.strip())

            # Add agent response to history
            conversation_history.append({"role": "assistant", "content": evon_response})

            # Send agent transcript to frontend
            await websocket.send_json({
                "type": "transcript",
                "data": {
                    "role": "agent",
                    "text": evon_response,
                    "language": session.language.value,
                },
            })

            transcript_entry_agent = {
                "role": "assistant",
                "speaker": "AI Agent",
                "text": evon_response,
                "language": session.language.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            transcript_entries.append(transcript_entry_agent)

            return evon_response

        # Automatically deliver opening greeting so the call starts speaking immediately!
        initial_greeting = f"Hello! This is {session.target_name or 'Ganesh'}. Thanks for joining the call! How can I help you today?"
        await websocket.send_json({
            "type": "transcript",
            "data": {
                "role": "agent",
                "text": initial_greeting,
                "language": session.language.value,
            },
        })
        conversation_history.append({"role": "assistant", "content": initial_greeting})
        transcript_entries.append({
            "role": "assistant",
            "speaker": "AI Agent",
            "text": initial_greeting,
            "language": session.language.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await synthesize_sentence(initial_greeting)

        try:
            while True:
                # Receive message or audio chunk from client
                data = await websocket.receive()
                dtype = data.get("type") if isinstance(data, dict) else getattr(data, "type", None)

                if dtype == "websocket.receive":
                    dbytes = data.get("bytes") if isinstance(data, dict) else getattr(data, "bytes", None)
                    dtext = data.get("text") if isinstance(data, dict) else getattr(data, "text", None)

                    if dbytes:
                        # Raw audio bytes - transcribe with Gnani STT
                        transcribed = await stt_client.transcribe(dbytes, filename="mic_input.wav")

                        if transcribed:
                            logger.info("STT result: %s", transcribed[:50])
                            response_text = await process_turn(transcribed)

                            if not response_text:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": "No response generated",
                                })
                    elif dtext:
                        # Text message from client
                        try:
                            msg = json.loads(dtext)
                            mtype = msg.get("type")
                            if mtype == "ping":
                                await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                            elif mtype in ["message", "speak", "text"]:
                                user_text = msg.get("text") or msg.get("message") or ""
                                if user_text.strip():
                                    await process_turn(user_text.strip())
                            elif mtype == "stop":
                                break
                        except json.JSONDecodeError:
                            pass

                elif dtype == "websocket.disconnect":
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

        # Generate summary and save transcript on disconnect
        try:
            # Generate summary using Evon
            summary_text = await evon.summarize(transcript_entries) if transcript_entries else "Call completed with no meaningful conversation."

            # Save transcript entries to MongoDB
            for entry in transcript_entries:
                await append_transcript(session.id, entry)

            # Save summary to MongoDB
            await set_call_summary(session.id, summary_text)

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