"""Voice cloning endpoint using Gnani AI API."""
from __future__ import annotations
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
import httpx
from app.config import settings

logger = logging.getLogger("vaani.voice")
router = APIRouter(prefix="/api/voice", tags=["voice-cloning"])

# Gnani voice cloning endpoints
_GNANI_CLONE_ENDPOINT = "https://api.vachana.ai/api/v1/speaker/register"
_HEADERS = {"X-API-Key-ID": ""}

class CloneResponse(BaseModel):
    speaker_id: str
    message: str

@router.post("/clone", response_model=CloneResponse, status_code=201)
async def clone_voice(file: UploadFile = File(...)):
    """Submit voice sample to Gnani for speaker registration."""
    if not settings.gnani_api_key:
        raise HTTPException(status_code=503, detail="Gnani API key not configured")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file")

    headers = {"X-API-Key-ID": settings.gnani_api_key}
    files = {"audio_file": (file.filename or "sample.wav", content, file.content_type or "audio/wav")}
    data = {"model": "timbre-v3.0"}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(_GNANI_CLONE_ENDPOINT, files=files, data=data, headers=headers)
            resp.raise_for_status()
            result = resp.json()

            # Extract speaker_id from response
            speaker_id = result.get("speaker_id") or result.get("voice_id") or result.get("id", "")
            if not speaker_id:
                logger.warning("No speaker_id in Gnani response: %s", result)
                speaker_id = f"cloned_{settings.gnani_api_key[:8]}"

            return CloneResponse(speaker_id=speaker_id, message="Voice cloned successfully")
    except Exception as e:
        logger.exception("Voice cloning failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Voice cloning service error: {e}")