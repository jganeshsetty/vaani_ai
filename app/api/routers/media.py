"""WebSocket router for Exotel media connections."""
from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket

from app.config import settings
from app.services.media_websocket import media_websocket_handler

logger = logging.getLogger("vaani.media.router")

router = APIRouter(tags=["media"])


@router.websocket(settings.media_ws_path)
async def media(websocket: WebSocket) -> None:
    await media_websocket_handler(websocket)