"""WebSocket clients for Gnani Prisma (STT) and Gnani Timbre (TTS).

Both services use a bidirectional WebSocket protocol. The client here is a
thin async wrapper that opens a connection, sends an initial handshake and
provides async generators for outgoing audio and incoming text/speech.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator, Optional

import websockets
from websockets.exceptions import ConnectionClosed

from app.config import settings
from app.models import Language

logger = logging.getLogger("vaani.gnani")


class GnaniSTTClient:
    """Streaming Speech-to-Text via Gnani Prisma."""

    def __init__(
        self,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        language: Language = Language.KANNADA,
        sample_rate: int = 8000,
    ) -> None:
        self.url = url or settings.gnani_prisma_ws_url
        self.api_key = api_key or settings.gnani_api_key
        self.language = language
        self.sample_rate = sample_rate
        self._ws = None
        self._recv_task: Optional[asyncio.Task] = None
        self._inbox: asyncio.Queue = asyncio.Queue()
        self._closed = False

    async def connect(self) -> None:
        if not self.url:
            raise RuntimeError("Gnani Prisma URL not configured")
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        self._ws = await websockets.connect(self.url, additional_headers=headers)
        await self._ws.send(
            json.dumps(
                {
                    "type": "start",
                    "language": self.language.value,
                    "sample_rate": self.sample_rate,
                }
            )
        )
        self._recv_task = asyncio.create_task(self._recv_loop())
        logger.info("Gnani STT connected (%s)", self.language.value)

    async def _recv_loop(self) -> None:
        assert self._ws is not None
        try:
            async for raw in self._ws:
                await self._inbox.put(json.loads(raw) if isinstance(raw, str) else raw)
        except ConnectionClosed as exc:
            logger.warning("Gnani STT connection closed: %s", exc)
            await self._inbox.put({"type": "error", "error": str(exc)})
        finally:
            await self._inbox.put({"type": "closed"})

    async def send_audio(self, audio: bytes) -> None:
        """Send a chunk of PCM audio to the STT service."""
        assert self._ws is not None, "STT client not connected"
        await self._ws.send(audio)

    async def transcripts(self) -> AsyncIterator[dict]:
        """Yield transcript events from the STT service."""
        while True:
            msg = await self._inbox.get()
            if msg.get("type") == "closed":
                return
            yield msg

    async def close(self) -> None:
        self._closed = True
        if self._recv_task is not None:
            self._recv_task.cancel()
            try:
                await self._recv_task
            except (asyncio.CancelledError, Exception):
                pass
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:
                pass


class GnaniTTSClient:
    """Streaming Text-to-Speech via Gnani Timbre."""

    def __init__(
        self,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        language: Language = Language.KANNADA,
        sample_rate: int = 8000,
        voice: str = "default",
    ) -> None:
        self.url = url or settings.gnani_timbre_ws_url
        self.api_key = api_key or settings.gnani_api_key
        self.language = language
        self.sample_rate = sample_rate
        self.voice = voice
        self._ws = None
        self._inbox: asyncio.Queue = asyncio.Queue()
        self._recv_task: Optional[asyncio.Task] = None
        self._closed = False

    async def connect(self) -> None:
        if not self.url:
            raise RuntimeError("Gnani Timbre URL not configured")
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        self._ws = await websockets.connect(self.url, additional_headers=headers)
        await self._ws.send(
            json.dumps(
                {
                    "type": "start",
                    "language": self.language.value,
                    "sample_rate": self.sample_rate,
                    "voice": self.voice,
                }
            )
        )
        self._recv_task = asyncio.create_task(self._recv_loop())
        logger.info("Gnani TTS connected (%s)", self.language.value)

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        """Stream synthesized PCM audio for the given text."""
        assert self._ws is not None, "TTS client not connected"
        await self._ws.send(json.dumps({"type": "synthesize", "text": text}))
        while True:
            msg = await self._inbox.get()
            mtype = msg.get("type")
            if mtype == "audio":
                yield msg.get("audio", b"")
            elif mtype == "done":
                return
            elif mtype == "error":
                raise RuntimeError(f"TTS error: {msg.get('error')}")
            elif mtype == "closed":
                return

    async def _recv_loop(self) -> None:
        assert self._ws is not None
        try:
            async for raw in self._ws:
                await self._inbox.put(json.loads(raw) if isinstance(raw, str) else raw)
        except ConnectionClosed as exc:
            logger.warning("Gnani TTS connection closed: %s", exc)
            await self._inbox.put({"type": "closed"})

    async def close(self) -> None:
        self._closed = True
        if self._recv_task is not None:
            self._recv_task.cancel()
            try:
                await self._recv_task
            except (asyncio.CancelledError, Exception):
                pass
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:
                pass