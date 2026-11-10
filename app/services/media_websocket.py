"""WebSocket endpoint that bridges Exotel Connect Voice AI with Gnani.

Protocol (Exotel Connect Voice AI):
- Exotel opens a WebSocket to `wss://[domain]/media?call_id=<id>`.
- Both sides send binary PCM audio frames (8kHz 16-bit mono).
- This handler routes inbound audio -> Gnani Prisma (STT) and outbound
  synthesized audio -> Gnani Timbre (TTS) -> back to Exotel.
"""
from __future__ import annotations

import asyncio
import logging
import math
import struct
from typing import Optional

import websockets
from websockets.exceptions import ConnectionClosed

from app.config import settings
from app.models import Language
from app.services.agentic_engine import (
    AgentState,
    build_followup,
    build_opening_greeting,
    build_summary,
    detect_language,
)
from app.services.call_service import append_transcript, set_call_summary, set_verification
from app.services.gnani_client import GnaniSTTClient, GnaniTTSClient
from app.services.task_service import get_task

logger = logging.getLogger("vaani.media")


def calculate_pcm16_rms(pcm_bytes: bytes) -> float:
    """Calculate Root Mean Square (RMS) energy for 16-bit PCM to detect silence."""
    count = len(pcm_bytes) // 2
    if count == 0:
        return 0.0
    shorts = struct.unpack(f"<{count}h", pcm_bytes[: count * 2])
    sum_squares = sum(s * s for s in shorts)
    return math.sqrt(sum_squares / count)


class ExotelMediaHandler:
    """Per-connection state for a single Exotel media WebSocket."""

    def __init__(self, call_id: str) -> None:
        self.call_id = call_id
        self.exotel_ws = None
        self.stt: Optional[GnaniSTTClient] = None
        self.tts: Optional[GnaniTTSClient] = None
        self.agent: Optional[AgentState] = None
        self._stt_task: Optional[asyncio.Task] = None
        self._tts_task: Optional[asyncio.Task] = None
        self._closed = False
        self._agent_speaking: bool = False
        self._trailing_silence_count: int = 0

    async def handle(self, websocket) -> None:
        """Main entry point: accept the Exotel connection and run the loop."""
        self.exotel_ws = websocket
        task = await get_task(self.call_id)
        if task is None:
            logger.error("Call %s has no matching task", self.call_id)
            await websocket.close(code=1011, reason="task_not_found")
            return

        language = Language.KANNADA
        self.agent = AgentState(task=task, call_id=self.call_id, language=language)

        # Connect to Gnani services.
        try:
            self.stt = GnaniSTTClient(language=language)
            await self.stt.connect()
            self.tts = GnaniTTSClient(language=language)
            await self.tts.connect()
        except Exception as exc:
            logger.exception("Failed to connect Gnani services: %s", exc)
            await self._close()
            return

        # Kick off STT transcript processing.
        self._stt_task = asyncio.create_task(self._process_transcripts())

        # Send the opening greeting.
        greeting = build_opening_greeting(self.agent)
        await self._speak(greeting)

        try:
            async for message in websocket:
                if isinstance(message, bytes):
                    # Half-duplex suppression: avoid streaming agent's own speech back to STT
                    if self._agent_speaking:
                        continue

                    # Voice Activity Detection (VAD): suppress pure silence frames to save STT streaming tokens
                    if settings.vad_enabled:
                        rms = calculate_pcm16_rms(message)
                        if rms < settings.vad_energy_threshold:
                            self._trailing_silence_count += 1
                            # Allow ~200ms padding then suppress streaming empty silence
                            if self._trailing_silence_count > 10:
                                continue
                        else:
                            self._trailing_silence_count = 0

                    await self.stt.send_audio(message)
                else:
                    logger.debug("Non-binary frame from Exotel: %s", message)
        except ConnectionClosed as exc:
            logger.info("Exotel closed connection for call %s: %s", self.call_id, exc)
        finally:
            await self._finalize()

    async def _process_transcripts(self) -> None:
        """Consume STT transcripts and drive the agentic loop."""
        assert self.stt is not None and self.agent is not None
        async for event in self.stt.transcripts():
            if event.get("type") == "transcript":
                text = event.get("text", "")
                if not text:
                    continue
                # Detect language from the callee's speech.
                detected = detect_language(text)
                self.agent.language = detected
                self.agent.transcript.append({"role": "callee", "text": text, "language": detected.value})
                await append_transcript(self.call_id, {"role": "callee", "text": text, "language": detected.value})

                utterance = build_followup(self.agent, text)
                if utterance is None:
                    break
                await self._speak(utterance)
            elif event.get("type") == "error":
                logger.error("STT error: %s", event.get("error"))
                break

    async def _speak(self, text: str) -> None:
        """Synthesize text and stream audio back to Exotel with turn optimization."""
        assert self.tts is not None and self.exotel_ws is not None
        self._agent_speaking = True
        self.agent.transcript.append({"role": "agent", "text": text})
        await append_transcript(self.call_id, {"role": "agent", "text": text})
        try:
            async for audio_chunk in self.tts.synthesize(text):
                try:
                    await self.exotel_ws.send(audio_chunk)
                except ConnectionClosed:
                    return
        finally:
            # Short grace period for echo dissipation before unmuting incoming stream
            await asyncio.sleep(0.15)
            self._agent_speaking = False

        # Hang up Exotel call as soon as task is completed to save telephony minutes
        if self.agent.done:
            logger.info("Call goals completed for %s. Closing Exotel session to save minutes.", self.call_id)
            await asyncio.sleep(0.5)
            if self.exotel_ws is not None:
                try:
                    await self.exotel_ws.close(code=1000, reason="call_completed")
                except Exception:
                    pass

    async def _finalize(self) -> None:
        self._closed = True
        if self._stt_task is not None:
            self._stt_task.cancel()
            try:
                await self._stt_task
            except (asyncio.CancelledError, Exception):
                pass
        if self.agent is not None:
            summary = build_summary(self.agent)
            await set_call_summary(self.call_id, summary)
            for question, status in self.agent.confirmed.items():
                await set_verification(self.call_id, question, status)
        for client in (self.stt, self.tts):
            if client is not None:
                await client.close()
        logger.info("Media handler finalized for call %s", self.call_id)

    async def _close(self) -> None:
        await self._finalize()


async def media_websocket_handler(websocket) -> None:
    """FastAPI/uvicorn WebSocket route handler for Exotel media."""
    call_id = None
    # Prefer query params, fall back to path parsing.
    try:
        query = websocket.request.query
        call_id = query.get("call_id")
    except Exception:
        pass
    if not call_id:
        # Try to extract from path.
        path = websocket.request.path
        parts = path.split("/")
        for part in parts:
            if part and part.isalnum() and len(part) > 10:
                call_id = part
                break

    if not call_id:
        logger.error("No call_id in WebSocket request")
        await websocket.close(code=1008, reason="missing_call_id")
        return

    handler = ExotelMediaHandler(call_id)
    await handler.handle(websocket)