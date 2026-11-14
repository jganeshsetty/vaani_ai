"""REST endpoints for tasks, calls, and real Gnani voice interaction."""
from __future__ import annotations

import base64
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.models import CallOut, CallStartRequest, CallStatus, Language, TaskCreate, TaskOut, TaskStatus
from app.services import call_service, task_service
from app.services.agentic_engine import AgentState, build_followup, build_opening_greeting, build_summary, extract_caller_name
from app.services.gnani_client import GnaniSTTClient, GnaniTTSClient

logger = logging.getLogger("vaani.api")

router = APIRouter(prefix="/api", tags=["tasks"])


@router.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(payload: TaskCreate) -> TaskOut:
    task = await task_service.create_task(payload)
    return task


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(user_id: str | None = None) -> list[TaskOut]:
    return await task_service.list_tasks(user_id=user_id)


@router.get("/tasks/{task_id}", response_model=TaskOut)
async def get_task(task_id: str) -> TaskOut:
    task = await task_service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# Note: Legacy /api/calls/start endpoint removed.
# Use POST /api/create-outbound-call in call_sessions.py instead.
# This endpoint created tasks and triggered Exotel calls, which is no longer used.


@router.get("/calls/{call_id}", response_model=CallOut)
async def get_call(call_id: str) -> CallOut:
    call = await call_service.get_call(call_id)
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.get("/calls", response_model=list[CallOut])
async def list_calls(task_id: str | None = None) -> list[CallOut]:
    return await call_service.list_calls(task_id=task_id)


@router.post("/calls/{call_id}/complete")
async def complete_call(call_id: str, summary: str = "") -> JSONResponse:
    await call_service.set_call_summary(call_id, summary)
    return JSONResponse({"status": "ok", "call_id": call_id})


@router.post("/calls/{call_id}/transcript")
async def add_transcript_entry(call_id: str, entry: dict) -> JSONResponse:
    await call_service.append_transcript(call_id, entry)
    return JSONResponse({"status": "ok", "call_id": call_id})


# --- Voice API for Real Gnani Synthesis & Transcription ---

class SynthesizeReq(BaseModel):
    text: str
    language: Optional[str] = "kannada"
    voice: Optional[str] = "Aarohi"


@router.post("/voice/synthesize")
async def synthesize_voice(req: SynthesizeReq):
    """Synthesize text into speech using Gnani Timbre and return audio/wav."""
    lang = Language.KANNADA if req.language == "kannada" else (Language.ENGLISH if req.language == "english" else Language.KANGLISH)
    client = GnaniTTSClient(language=lang, voice=req.voice or "Aarohi")
    wav_bytes = await client.synthesize_wav(req.text)
    return Response(content=wav_bytes, media_type="audio/wav")


@router.post("/voice/converse")
async def voice_converse(
    call_id: str = Form(...),
    audio: UploadFile = File(...),
):
    """Full conversational turn: transcribes caller audio with Gnani STT,

    generates agent response, synthesizes agent voice with Gnani TTS, and saves
    actual real speech to call transcript.
    """
    call = await call_service.get_call(call_id)
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")

    task = await task_service.get_task(call.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    # Read uploaded caller speech
    audio_bytes = await audio.read()

    # Transcribe caller audio with Gnani Prisma STT
    lang = getattr(call, "language_detected", None) or task.language
    stt = GnaniSTTClient(language=lang)
    callee_text = await stt.transcribe(audio_bytes, filename=audio.filename or "speech.wav")

    if not callee_text:
        callee_text = "ಹಲೋ"

    # Save real callee transcript
    callee_entry = {
      "role": "receiver",
      "speaker": "Receiver",
      "kannada": callee_text,
      "english": callee_text,
      "language": lang.value,
    }
    await call_service.append_transcript(call_id, callee_entry)

    # Agent decides response based on what caller said
    agent_state = AgentState(
        task=task,
        call_id=call_id,
        language=lang,
        turn=len(call.transcript) // 2 + 1,
    )
    caller_name = extract_caller_name(agent_state) or "Caller"

    agent_reply = build_followup(agent_state, callee_text)
    if not agent_reply:
        agent_reply = "ಧನ್ಯವಾದಗಳು, ಬಾಯ್!"

    # Save real agent reply to transcript
    agent_entry = {
      "role": "caller",
      "speaker": caller_name,
      "kannada": agent_reply,
      "english": agent_reply,
      "language": lang.value,
    }
    await call_service.append_transcript(call_id, agent_entry)

    # Synthesize agent voice with Gnani Timbre TTS
    tts = GnaniTTSClient(language=lang, voice="Aarohi")
    reply_wav = await tts.synthesize_wav(agent_reply)
    reply_b64 = base64.b64encode(reply_wav).decode("ascii")

    # Check if call is completed
    if agent_state.done:
        summary = build_summary(agent_state)
        await call_service.set_call_summary(call_id, summary)

    return JSONResponse(
        {
            "callee_text": callee_text,
            "agent_reply": agent_reply,
            "audio_base64": reply_b64,
            "done": agent_state.done,
        }
    )
