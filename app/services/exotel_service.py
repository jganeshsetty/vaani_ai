"""Exotel Connect Voice AI REST + WebSocket integration."""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings
from app.models import Language, TaskOut

logger = logging.getLogger("vaani.exotel")


EXOTEL_MEDIA_WS_HOST = "exotel.com"  # placeholder; configured per-deployment


async def trigger_exotel_call(
    call_id: str,
    task: TaskOut,
    target_number: Optional[str] = None,
    language: Language = Language.KANNADA,
) -> dict:
    """Call the Exotel REST API to start a Voice AI session.

    Returns the parsed JSON response. If credentials are not configured the call
    is skipped and an empty dict is returned so the rest of the pipeline can
    still run (useful for local development).
    """
    if not settings.exotel_api_key or not settings.exotel_token:
        logger.warning("Exotel credentials missing — skipping trigger for call %s", call_id)
        return {"skipped": True, "reason": "no_credentials"}

    number = target_number or task.target_number
    if not number:
        raise ValueError("No target phone number for task %s", task.id)

    url = f"{settings.exotel_base_url}/connect/{settings.exotel_voice_ai_sid}/voice-ai"
    payload = {
        "from": number,
        "to": number,
        "language": language.value,
        "media_ws_path": settings.media_ws_path,
        "call_id": call_id,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            json=payload,
            auth=(settings.exotel_api_key, settings.exotel_token),
        )
        resp.raise_for_status()
        data = resp.json()
    logger.info("Exotel triggered for call %s -> %s", call_id, data.get("sid"))
    return data


def media_ws_url(call_id: str) -> str:
    """Build the WebSocket URL Exotel will connect back to for media."""
    scheme = "wss"
    host = settings.host if settings.host != "0.0.0.0" else "localhost"
    port = settings.port
    return f"{scheme}://{host}:{port}{settings.media_ws_path}?call_id={call_id}"