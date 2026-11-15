"""Call Session API Router for streamlined VaaniCall AI architecture.

Core Endpoints:
  - POST /api/initiate - Initiate dynamic outbound call session (stores in MongoDB, returns shareable URL)
  - GET /api/setup - Fetch user setup profile and permanent link configuration
  - POST /api/setup - Save user setup profile (instructions, persona, voice cloning) and generate permanent link
  - GET /api/sessions/room/{room_id} - Fetch call session by UUID/room_id (auto-provisions if missing)
  - GET /api/summary/{room_id} - Fetch call summary, action items, and complete transcript
  - POST /api/calls/{room_id}/end - End call and trigger AI summary + action items extraction
  - WebSocket /ws/call/{room_id} & /ws/{room_id} - Real-time two-way voice streaming (Gnani STT -> Evon v3.3 -> Gnani TTS)
"""
from __future__ import annotations

import asyncio
import logging
import json
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.models import CallMode, CallStatus, Language
from app.services.call_session_service import (
    create_session,
    get_session_by_room,
    append_transcript,
    set_session_status,
    set_call_summary,
    list_sessions,
    get_user_profile,
    save_user_profile,
)
from app.services.gnani_client import GnaniSTTClient, GnaniTTSClient
from app.services.evon_client import evon_client

logger = logging.getLogger("vaani.callsessions")

router = APIRouter(prefix="/api", tags=["call-sessions"])


# --- Pydantic Schemas ---

class InitiateCallRequest(BaseModel):
    """Payload to initiate a new dynamic call session."""
    target_number: str = Field(..., description="Target phone number (e.g. +91 8660039103)")
    recipient_name: Optional[str] = Field("Recipient", description="Name of the person being called")
    caller_name: Optional[str] = Field("Host", description="Your name / caller identity")
    context_prompt: str = Field(..., min_length=1, max_length=3000, description="Exact context/message to convey")
    voice_tone: Optional[str] = Field("natural", description="Conversation tone: natural, professional, urgent, friendly")
    speaker_id: Optional[str] = Field(None, description="Gnani voice cloning profile ID if available")
    language: Optional[Language] = Field(Language.ENGLISH, description="Language for call")
    schedule_time: Optional[str] = Field(None, description="Optional ISO timestamp for scheduled calling")


class SetupProfileRequest(BaseModel):
    """Payload to configure one-time user profile & permanent auto-responder."""
    user_name: str = Field(..., min_length=1, max_length=100, description="Your primary user name")
    persona: Optional[str] = Field("Personal autonomous voice assistant", description="Role/persona description")
    base_instructions: str = Field(..., min_length=1, max_length=3000, description="Base system instructions for the AI")
    voice_id: Optional[str] = Field("Aarohi", description="Standard voice name or cloned profile")
    speaker_id: Optional[str] = Field(None, description="Voice cloning ID from Gnani Timbre")
    phone: Optional[str] = Field(None, description="Your primary phone number")


class SessionResponse(BaseModel):
    """Full session response representation."""
    id: str
    room_id: str
    mode: str
    target_number: Optional[str] = None
    target_name: Optional[str] = None
    caller_name: Optional[str] = "Host"
    context_prompt: str
    voice_tone: Optional[str] = "natural"
    status: str
    transcript: list[dict]
    summary: Optional[str] = None
    action_items: list[str] = []
    scheduled_time: Optional[str] = None
    language: str
    created_at: str
    updated_at: str
    speaker_id: Optional[str] = None


class SummaryResponse(BaseModel):
    """Structured post-call summary and action items."""
    room_id: str
    status: str
    caller_name: str
    recipient_name: str
    summary: str
    action_items: list[str]
    transcript: list[dict]
    duration_seconds: int = 0
    created_at: str
    updated_at: str


# --- Core Page 1: Initiation Endpoint ---

@router.post("/initiate", status_code=201)
@router.post("/outbound", status_code=201)
async def initiate_call_session(req: InitiateCallRequest):
    """
    Page 1 Initiation Endpoint:
    - Generates a cryptographically strong UUID session ID.
    - Normalizes phone number.
    - Persists session details in MongoDB Atlas.
    - Returns shareable link: /call/[session-uuid]
    """
    clean_phone = req.target_number.strip()
    if not clean_phone.startswith("+"):
        clean_phone = f"+{clean_phone}"

    session_uuid = str(uuid.uuid4())

    scheduled_time = None
    if req.schedule_time:
        try:
            scheduled_time = datetime.fromisoformat(req.schedule_time.replace("Z", "+00:00"))
        except Exception:
            pass

    session = await create_session(
        mode=CallMode.OUTBOUND,
        target_number=clean_phone,
        target_name=req.recipient_name or "Recipient",
        caller_name=req.caller_name or "Host",
        context_prompt=req.context_prompt,
        voice_tone=req.voice_tone or "natural",
        language=req.language or Language.ENGLISH,
        scheduled_time=scheduled_time,
        speaker_id=req.speaker_id,
        room_id=session_uuid,
    )

    shareable_path = f"/call/{session_uuid}"

    return {
        "status": "success",
        "session_uuid": session_uuid,
        "room_id": session_uuid,
        "link": shareable_path,
        "full_url": f"http://localhost:3000{shareable_path}",
        "target_number": clean_phone,
        "recipient_name": session.target_name,
        "caller_name": session.caller_name,
        "context_prompt": session.context_prompt,
        "voice_tone": session.voice_tone,
        "formatted_sms": (
            f"Hello {session.target_name}! This is {session.caller_name}. "
            f"Please join our secure voice call here:\n\n👉 http://localhost:3000{shareable_path}\n\n"
            f"(No app required • Opens directly in mobile browser)"
        ),
    }


# Backwards compatibility for messaging endpoint
@router.post("/messages/send", status_code=200)
async def send_message_compat(data: dict):
    phone = data.get("phone", "+918660039103")
    recipient = data.get("recipient_name", "Recipient")
    caller = data.get("caller", "Host")
    instructions = data.get("instructions", "Call setup")

    req = InitiateCallRequest(
        target_number=phone,
        recipient_name=recipient,
        caller_name=caller,
        context_prompt=instructions,
    )
    res = await initiate_call_session(req)
    return {
        "status": "success",
        "phone": res["target_number"],
        "recipient_name": res["recipient_name"],
        "caller": res["caller_name"],
        "link": res["link"],
        "room_id": res["room_id"],
        "message": res["formatted_sms"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# --- Core Page 2: One-Time Setup Endpoints ---

@router.get("/setup")
async def get_setup_configuration(user_id: str = "default_user"):
    """Fetch current one-time user profile & permanent auto-responder configuration."""
    profile = await get_user_profile(user_id)
    permanent_room_id = profile.get("permanent_room_id", "p-my-link")
    permanent_link = f"/call/{permanent_room_id}"
    user_name = profile.get("user_name", "Host")

    return {
        "status": "success",
        "profile": profile,
        "permanent_room_id": permanent_room_id,
        "permanent_link": permanent_link,
        "auto_responder_template": (
            f"Hi! I'm currently unavailable to take calls. "
            f"Please speak with my personal voice assistant here:\n\n👉 http://localhost:3000{permanent_link}\n\n"
            f"It will capture your message and notify me immediately."
        ),
    }


@router.post("/setup")
async def save_setup_configuration(req: SetupProfileRequest, user_id: str = "default_user"):
    """
    Save one-time profile, base agent instructions, voice preference,
    and generate permanent auto-responder link.
    """
    profile = await save_user_profile(req.model_dump(), user_id=user_id)
    permanent_room_id = profile.get("permanent_room_id")
    permanent_link = f"/call/{permanent_room_id}"

    return {
        "status": "success",
        "message": "One-time profile saved successfully",
        "profile": profile,
        "permanent_room_id": permanent_room_id,
        "permanent_link": permanent_link,
        "auto_responder_template": (
            f"Hi! I'm currently unavailable to take calls. "
            f"Please speak with my personal voice assistant here:\n\n👉 http://localhost:3000{permanent_link}\n\n"
            f"It will capture your message and notify me immediately."
        ),
    }


# --- Core Page 3 & 4: Session & Summary Endpoints ---

@router.post("/sessions/spawn-permanent/{room_id}")
async def spawn_permanent_session(room_id: str):
    """
    When an opposite caller taps the permanent auto-responder link (e.g. /call/p-ganesh),
    dynamically generate a fresh temporary session UUID so this incoming caller gets their own
    dedicated call session, transcript, and summary.
    """
    clean_id = room_id.replace("p-", "")
    profile = await get_user_profile("default_user")
    user_name = profile.get("user_name", clean_id.capitalize())
    instructions = profile.get("base_instructions") or f"Greet the caller on behalf of {user_name}, ask who is calling and why, and take their message."

    fresh_uuid = str(uuid.uuid4())
    session = await create_session(
        mode=CallMode.INBOUND,
        target_number=None,
        target_name="Incoming Caller",
        caller_name=user_name,
        context_prompt=f"[PERMANENT AUTO-RESPONDER FOR {user_name.upper()}]: {instructions}",
        language=Language.ENGLISH,
        speaker_id=profile.get("speaker_id"),
        room_id=fresh_uuid,
    )

    return {
        "status": "success",
        "room_id": fresh_uuid,
        "permanent_id": room_id,
        "caller_name": user_name,
        "recipient_name": "Incoming Caller",
        "context_prompt": session.context_prompt,
    }


@router.get("/sessions/recent")
async def get_recent_call_summaries(limit: int = 20):
    """List recent call sessions with summary and transcript count for viewing on website."""
    all_sessions = await list_sessions()
    recent = []
    for s in all_sessions[:limit]:
        recent.append({
            "id": s.id,
            "room_id": s.room_id,
            "mode": s.mode.value,
            "caller_name": getattr(s, "caller_name", "Host"),
            "target_name": s.target_name or "Participant",
            "target_number": s.target_number,
            "status": s.status.value,
            "summary": s.summary,
            "action_items": getattr(s, "action_items", []),
            "turns_count": len(s.transcript or []),
            "created_at": s.created_at.isoformat(),
        })
    return {"status": "success", "sessions": recent}


@router.get("/sessions/room/{room_id}", response_model=SessionResponse)
@router.get("/call-sessions/room/{room_id}", response_model=SessionResponse)
async def get_session_by_room_id(room_id: str):
    """
    Fetch session details by UUID room_id.
    Auto-provisions gracefully if opened on-the-fly.
    """
    session = await get_session_by_room(room_id)
    if session is None:
        # Check if this is a permanent profile room
        is_permanent = room_id.startswith("p-")
        target_name = room_id.replace("p-", "").capitalize() if is_permanent else "Recipient"
        caller_name = room_id.replace("p-", "").capitalize() if is_permanent else "Host"

        session = await create_session(
            mode=CallMode.INBOUND if is_permanent else CallMode.OUTBOUND,
            target_number=None,
            target_name=target_name,
            caller_name=caller_name,
            context_prompt=(
                f"You are {caller_name}'s personal voice AI assistant. "
                f"Greet the caller warmly in English, ask for their name, understand their request, "
                f"and provide helpful answers. Speak in a natural, polite conversational tone."
            ),
            language=Language.ENGLISH,
            room_id=room_id,
        )

    return SessionResponse(
        id=session.id,
        room_id=session.room_id,
        mode=session.mode.value,
        target_number=session.target_number,
        target_name=session.target_name,
        caller_name=getattr(session, "caller_name", "Host"),
        context_prompt=session.context_prompt,
        voice_tone=getattr(session, "voice_tone", "natural"),
        status=session.status.value,
        transcript=session.transcript,
        summary=session.summary,
        action_items=getattr(session, "action_items", []),
        scheduled_time=session.scheduled_time.isoformat() if session.scheduled_time else None,
        language=session.language.value,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        speaker_id=session.speaker_id,
    )


@router.get("/summary/{room_id}")
async def get_call_summary(room_id: str):
    """
    Page 4 Call Summary Endpoint:
    Fetches post-call transcript, executive summary, and action items from MongoDB Atlas.
    If the summary hasn't been generated yet, runs Evon v3.3 summarization and persists it.
    """
    session = await get_session_by_room(room_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Call session '{room_id}' not found")

    transcript = session.transcript or []
    summary = session.summary
    action_items = getattr(session, "action_items", [])

    # If call finished with transcript but summary wasn't computed yet, compute with Evon
    if transcript and (not summary or not action_items):
        evon = evon_client()
        try:
            if not summary:
                summary = await evon.summarize(transcript)
            if not action_items:
                action_items = await evon.extract_action_items(transcript)
            await set_call_summary(session.id, summary, action_items)
        except Exception as e:
            logger.warning("Error generating summary on fetch: %s", e)
            if not summary:
                summary = "Call completed. Discussion captured in transcript."
            if not action_items:
                action_items = ["Review call transcript notes."]

    duration = 0
    if transcript and len(transcript) > 1:
        try:
            first_t = datetime.fromisoformat(transcript[0].get("timestamp", "").replace("Z", "+00:00"))
            last_t = datetime.fromisoformat(transcript[-1].get("timestamp", "").replace("Z", "+00:00"))
            duration = max(1, int((last_t - first_t).total_seconds()))
        except Exception:
            duration = max(15, len(transcript) * 12)

    return SummaryResponse(
        room_id=session.room_id,
        status=session.status.value,
        caller_name=getattr(session, "caller_name", "Host"),
        recipient_name=session.target_name or "Participant",
        summary=summary or "Call completed. Discussion captured in transcript.",
        action_items=action_items or ["Review call transcript notes."],
        transcript=transcript,
        duration_seconds=duration,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.post("/calls/{room_id}/end")
async def end_call_session(room_id: str):
    """Explicitly terminate call, update status, and generate post-call summary + action items."""
    session = await get_session_by_room(room_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Call session '{room_id}' not found")

    await set_session_status(session.id, CallStatus.COMPLETED)

    transcript = session.transcript or []
    evon = evon_client()

    summary = "Call ended."
    action_items = []
    if transcript:
        try:
            summary = await evon.summarize(transcript)
            action_items = await evon.extract_action_items(transcript)
        except Exception as exc:
            logger.warning("Evon post-call summary error: %s", exc)
            summary = "Call ended successfully with active dialogue recorded."
            action_items = ["Follow up on discussed topics."]
        await set_call_summary(session.id, summary, action_items)

    return {
        "status": "success",
        "room_id": room_id,
        "summary": summary,
        "action_items": action_items,
    }


# --- WebSocket Connection Manager ---

class ConnectionManager:
    """Manages active WebSockets for streaming voice calls."""

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


manager = ConnectionManager()


# --- Real-Time Streaming WebSocket ---

@router.websocket("/ws/{room_id}")
@router.websocket("/ws/call/{room_id}")
async def call_websocket(websocket: WebSocket, room_id: str):
    """
    Core Voice AI Pipeline:
    1. Client connects with mic audio stream.
    2. Sends immediate warm audio greeting.
    3. Streams two-way voice:
       - Gnani STT processes incoming PCM audio
       - Evon v3.3 streams conversational tokens
       - Gnani TTS (with custom voice cloning speaker_id) synthesizes speech audio
       - Streams audio bytes + live transcript back to client
    4. On disconnect, auto-extracts summary and action items to MongoDB Atlas.
    """
    connection_id = f"{room_id}"

    try:
        await manager.connect(room_id, websocket)

        session = await get_session_by_room(room_id)
        if session is None:
            is_permanent = room_id.startswith("p-")
            caller_name = room_id.replace("p-", "").replace("-", " ").capitalize() if is_permanent else "Host"
            session = await create_session(
                mode=CallMode.INBOUND if is_permanent else CallMode.OUTBOUND,
                target_number=None,
                target_name="Caller" if is_permanent else "Recipient",
                caller_name=caller_name,
                context_prompt=f"You are {caller_name}'s personal voice assistant. Greet the caller warmly and speak conversationally.",
                language=Language.ENGLISH,
                room_id=room_id,
            )

        await set_session_status(session.id, CallStatus.ACTIVE)

        # Initialize STT & TTS clients
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

        caller = getattr(session, "caller_name", None) or "Host"
        recipient = session.target_name or "there"
        tone = getattr(session, "voice_tone", "natural")

        persona = (
            f"You are {caller} speaking directly with {recipient} on a voice call. "
            f"Maintain a {tone}, warm, authentic, natural human conversational tone. "
            f"Speak in the first person. Keep responses concise (1-2 spoken sentences) like a real person on the phone."
        )
        system_prompt = f"{persona}\n\nCall Objective / Context:\n{session.context_prompt}"

        conversation_history = [{"role": "system", "content": system_prompt}]
        transcript_entries: list[dict] = []

        await websocket.send_json({
            "type": "ready",
            "status": "active",
            "caller_name": caller,
            "recipient_name": recipient,
            "message": "Connected to voice call engine.",
        })

        async def synthesize_and_send(text: str) -> None:
            if not text.strip():
                return
            try:
                tts_audio = await tts_client.synthesize_wav(text.strip())
                if tts_audio and len(tts_audio) > 44:
                    await websocket.send_bytes(tts_audio)
            except Exception as e:
                logger.warning("TTS synthesis error: %s", e)

        async def process_turn(user_text: str) -> str:
            # Emit callee transcript
            await websocket.send_json({
                "type": "transcript",
                "data": {
                    "role": "callee",
                    "speaker": recipient,
                    "text": user_text,
                    "language": session.language.value,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            })

            conversation_history.append({"role": "user", "content": user_text})
            u_entry = {
                "role": "user",
                "speaker": recipient,
                "text": user_text,
                "language": session.language.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            transcript_entries.append(u_entry)
            await append_transcript(session.id, u_entry)

            # Evon streaming response
            evon_response = ""
            sentence_buffer = ""

            async for chunk in evon.chat(conversation_history, max_tokens=256, temperature=0.7):
                evon_response += chunk
                sentence_buffer += chunk
                await websocket.send_json({"type": "text_chunk", "text": chunk})

                if any(c in chunk for c in '.!?'):
                    await synthesize_and_send(sentence_buffer.strip())
                    sentence_buffer = ""

            if sentence_buffer.strip():
                await synthesize_and_send(sentence_buffer.strip())

            conversation_history.append({"role": "assistant", "content": evon_response})

            # Emit agent transcript
            await websocket.send_json({
                "type": "transcript",
                "data": {
                    "role": "agent",
                    "speaker": caller,
                    "text": evon_response,
                    "language": session.language.value,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            })

            a_entry = {
                "role": "assistant",
                "speaker": caller,
                "text": evon_response,
                "language": session.language.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            transcript_entries.append(a_entry)
            await append_transcript(session.id, a_entry)

            return evon_response

        # Automatic initial greeting tailored to outbound objective vs inbound screening
        if session.mode == CallMode.INBOUND or room_id.startswith("p-"):
            initial_greeting = f"Hey! It's {caller}. I'm tied up at the moment and couldn't pick up, but I can hear you—what's going on?"
        else:
            prompt_clean = session.context_prompt.strip().rstrip(".")
            if len(prompt_clean) > 85:
                prompt_clean = prompt_clean[:82] + "..."
            initial_greeting = f"Hey {recipient}! It's {caller}. Glad I caught you! Wanted to touch base real quick regarding {prompt_clean}—do you have a minute?"
        await websocket.send_json({
            "type": "transcript",
            "data": {
                "role": "agent",
                "speaker": caller,
                "text": initial_greeting,
                "language": session.language.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        })
        conversation_history.append({"role": "assistant", "content": initial_greeting})
        g_entry = {
            "role": "assistant",
            "speaker": caller,
            "text": initial_greeting,
            "language": session.language.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        transcript_entries.append(g_entry)
        await append_transcript(session.id, g_entry)
        await synthesize_and_send(initial_greeting)

        while True:
            data = await websocket.receive()
            dtype = data.get("type") if isinstance(data, dict) else getattr(data, "type", None)

            if dtype == "websocket.receive":
                dbytes = data.get("bytes") if isinstance(data, dict) else getattr(data, "bytes", None)
                dtext = data.get("text") if isinstance(data, dict) else getattr(data, "text", None)

                if dbytes:
                    transcribed = await stt_client.transcribe(dbytes, filename="audio.wav")
                    if transcribed and transcribed.strip():
                        await process_turn(transcribed.strip())
                elif dtext:
                    try:
                        msg = json.loads(dtext)
                        mtype = msg.get("type")
                        if mtype == "ping":
                            await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                        elif mtype in ["message", "speak", "text"]:
                            user_text = msg.get("text") or msg.get("message") or ""
                            if user_text.strip():
                                await process_turn(user_text.strip())
                        elif mtype in ["hangup", "end", "stop"]:
                            break
                    except json.JSONDecodeError:
                        pass
            elif dtype == "websocket.disconnect":
                break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", connection_id)
    except Exception as exc:
        logger.exception("WebSocket call session error: %s", exc)
    finally:
        manager.disconnect(room_id)
        # Finalize call session status and auto-generate summary
        try:
            session = await get_session_by_room(room_id)
            if session:
                await set_session_status(session.id, CallStatus.COMPLETED)
                if transcript_entries and (not session.summary or not session.action_items):
                    evon = evon_client()
                    summary = await evon.summarize(transcript_entries)
                    action_items = await evon.extract_action_items(transcript_entries)
                    await set_call_summary(session.id, summary, action_items)
        except Exception as e:
            logger.warning("Error generating final summary on disconnect: %s", e)
