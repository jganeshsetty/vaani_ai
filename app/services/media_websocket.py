"""WebSocket endpoint that bridges Exotel Connect Voice AI (AgentStream) with Gnani.

Protocol (Exotel Connect Voice AI / AgentStream):
- Exotel connects to WebSocket `wss://[domain]/media` or `wss://[domain]/media/<call_id>`.
- Exotel sends JSON text frames:
    {"event": "connected"}
    {"event": "start", "stream_sid": "...", "start": {"stream_sid": "...", "call_sid": "..."}}
    {"event": "media", "stream_sid": "...", "media": {"payload": "<base64 8kHz 16-bit PCM>"}}
    {"event": "stop"}
- Agent replies with JSON text frames:
    {"event": "media", "stream_sid": "...", "media": {"payload": "<base64 8kHz 16-bit PCM>"}}
    {"event": "clear", "stream_sid": "..."}
- User speech is transcribed with Gnani Prisma STT (REST v3).
- Agent speech is synthesized with Gnani Timbre TTS (REST v1).
"""
from __future__ import annotations

import asyncio
import audioop
import base64
import json
import logging
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from app.config import settings
from app.models import CallStatus, Language
from app.services import call_service, task_service
from app.services.gnani_client import GnaniSTTClient, GnaniTTSClient

logger = logging.getLogger("vaani.media")

# Audio settings for Exotel (standard telephony PSTN)
EXOTEL_SAMPLE_RATE = 8000
GNANI_SAMPLE_RATE = 16000
SAMPLE_WIDTH = 2  # 16-bit
CHANNELS = 1     # Mono


class ExotelMediaHandler:
    """Manages the full lifecycle of an Exotel Voice AI media stream."""

    def __init__(self, websocket: WebSocket, call_id: Optional[str] = None) -> None:
        self.websocket = websocket
        self.call_id = call_id
        self.stream_sid: Optional[str] = None
        self.call = None
        self.task = None

        self.tts = GnaniTTSClient(language=Language.KANNADA, voice="Aarohi")
        self.stt = GnaniSTTClient(language=Language.KANNADA, sample_rate=GNANI_SAMPLE_RATE)

        self.agent_speaking = False
        self.audio_buffer = bytearray()
        self.user_speaking = False
        self.silence_count = 0
        self.turns_count = 0
        self.call_completed = False

    async def _resolve_call_and_task(self, call_sid: Optional[str] = None) -> bool:
        """Resolve the call and task from MongoDB."""
        if self.call and self.task:
            return True

        if self.call_id:
            self.call = await call_service.get_call(self.call_id)

        if not self.call and call_sid:
            self.call = await call_service.get_call_by_exotel_sid(call_sid)

        if not self.call:
            self.call = await call_service.get_latest_active_call()

        if self.call:
            self.call_id = self.call.id
            if call_sid and not self.call.exotel_call_sid:
                await call_service.set_call_exotel(self.call.id, call_sid, self.stream_sid or "")
            self.task = await task_service.get_task(self.call.task_id)

        return self.call is not None and self.task is not None

    async def handle(self) -> None:
        """Main handler for the WebSocket connection."""
        await self.websocket.accept()
        logger.info("Exotel WebSocket ACCEPTED! (call_id: %s)", self.call_id)

        # Attempt initial resolution
        await self._resolve_call_and_task()

        try:
            while True:
                raw_message = await self.websocket.receive()
                if raw_message.get("type") == "websocket.disconnect":
                    logger.info("WebSocket disconnect received for call %s", self.call_id)
                    break

                text_data = raw_message.get("text")
                if not text_data:
                    # In case Exotel sends binary
                    bytes_data = raw_message.get("bytes")
                    if bytes_data:
                        self.audio_buffer.extend(bytes_data)
                    continue

                try:
                    data = json.loads(text_data)
                except json.JSONDecodeError:
                    continue

                event = data.get("event")

                if event == "connected":
                    logger.info("Exotel event: connected for call %s", self.call_id)

                elif event == "start":
                    self.stream_sid = data.get("stream_sid") or data.get("start", {}).get("stream_sid")
                    call_sid = data.get("start", {}).get("call_sid") or data.get("call_sid") or ""
                    logger.info("Exotel stream started: stream_sid=%s, call_sid=%s", self.stream_sid, call_sid)

                    await self._resolve_call_and_task(call_sid)

                    recipient_name = "ಗಣೇಶ್"
                    if self.task and self.task.description and "ganesh" not in self.task.description.lower():
                        recipient_name = "ಸ್ನೇಹಿತರೆ"

                    # Brief 400ms delay to ensure Exotel media bridge is open to handset
                    await asyncio.sleep(0.4)

                    # Trigger opening Kanglish greeting:
                    greeting = f"ಹಲೋ {recipient_name}, ನಿಮ್ಮ ಪ್ರಾಜೆಕ್ಟ್ ಸಕ್ಸಸ್‌ಫುಲ್ಲಾಗಿ ಕಂಪ್ಲೀಟ್ ಆಗಿದ್ಯಾ?"
                    await self._speak(greeting)

                elif event == "media":
                    if self.agent_speaking:
                        # Avoid acoustic echo loop while agent is speaking
                        continue

                    media_payload = data.get("media", {}).get("payload", "")
                    if not media_payload:
                        continue

                    try:
                        chunk = base64.b64decode(media_payload)
                    except Exception:
                        continue

                    rms = audioop.rms(chunk, SAMPLE_WIDTH)

                    # Speech detection threshold (speech energy typically > 350-500)
                    if rms > 350:
                        self.user_speaking = True
                        self.silence_count = 0
                        self.audio_buffer.extend(chunk)
                    else:
                        if self.user_speaking:
                            self.silence_count += 1
                            self.audio_buffer.extend(chunk)
                            # ~0.8s of silence after speech (approx 4-5 chunks of 160-200ms)
                            if self.silence_count >= 5:
                                self.user_speaking = False
                                await self._process_user_turn()

                elif event == "stop":
                    logger.info("Exotel event: stop received for call %s", self.call_id)
                    break

        except WebSocketDisconnect:
            logger.info("Exotel WebSocket client disconnected for call %s", self.call_id)
        except Exception as exc:
            logger.exception("Error in Exotel WebSocket loop: %s", exc)
        finally:
            await self._finalize()

    async def _process_user_turn(self) -> None:
        """Process collected user speech audio through Gnani STT and generate reply."""
        if len(self.audio_buffer) < 4000:
            self.audio_buffer.clear()
            return

        user_pcm8k = bytes(self.audio_buffer)
        self.audio_buffer.clear()

        # Resample from Exotel 8kHz to Gnani STT 16kHz
        try:
            user_pcm16k, _ = audioop.ratecv(user_pcm8k, SAMPLE_WIDTH, CHANNELS, EXOTEL_SAMPLE_RATE, GNANI_SAMPLE_RATE, None)
        except Exception as exc:
            logger.warning("Resample error: %s", exc)
            user_pcm16k = user_pcm8k

        # Transcribe with Gnani Prisma STT
        transcript = await self.stt.transcribe(user_pcm16k)
        if not transcript:
            logger.info("Gnani STT returned empty transcript for turn")
            return

        logger.info("User speech recognized: '%s'", transcript)
        if self.call_id:
            await call_service.append_transcript(self.call_id, {
                "role": "callee",
                "text": transcript,
                "language": "kn-IN",
            })

        self.turns_count += 1
        lower_trans = transcript.lower()

        # Handle user requirements:
        # 1. "while starting conversation, when the opposite person say, hello, the agent must start with the hello and continue"
        # 2. Project confirmation
        if "hello" in lower_trans or "ಹಲೋ" in lower_trans or "ನಮಸ್ಕಾರ" in lower_trans:
            reply = "ಹಲೋ ಗಣೇಶ್ ಅವರೇ! ನಿಮ್ಮ ಪ್ರಾಜೆಕ್ಟ್ ಸಕ್ಸಸ್‌ಫುಲ್ಲಾಗಿ ಕಂಪ್ಲೀಟ್ ಆಗಿದ್ಯಾ?"
            is_final = False
        elif any(w in lower_trans for w in ["yes", "complete", "done", "ಹೌದು", "ಆಗಿದೆ", "ಮುಗಿದಿದೆ", "succes", "finish"]):
            reply = "ತುಂಬಾ ಸಂತೋಷ ಗಣೇಶ್ ಅವರೇ! ಧನ್ಯವಾದಗಳು, ಕರೆ ಮುಕ್ತಾಯ ಮಾಡ್ತಿದ್ದೀನಿ. ನಮಸ್ಕಾರ!"
            is_final = True
        else:
            reply = "ತುಂಬಾ ಧನ್ಯವಾದಗಳು ಗಣೇಶ್ ಅವರೇ, ನಮಸ್ಕಾರ!"
            is_final = True

        await self._speak(reply)

        if is_final or self.turns_count >= 3:
            self.call_completed = True
            if self.call_id:
                summary = f"Call completed with Ganesh (+91 86600 39103). User stated: '{transcript}'. Project status confirmed successfully."
                await call_service.set_call_summary(self.call_id, summary)
            # Give Exotel handset 2.2 seconds to finish hearing the agent's concluding audio
            await asyncio.sleep(2.2)
            try:
                await self.websocket.close(code=1000, reason="call_completed")
            except Exception:
                pass

    async def _speak(self, text: str) -> None:
        """Synthesize text via Gnani Timbre and stream chunks to Exotel."""
        if not self.stream_sid:
            logger.warning("Cannot speak: stream_sid not established yet")
            return

        self.agent_speaking = True
        logger.info("Agent speaking to Exotel: '%s'", text)
        if self.call_id:
            await call_service.append_transcript(self.call_id, {
                "role": "agent",
                "text": text,
                "language": "kn-IN",
            })

        try:
            # 1. Synthesize 16kHz WAV from Gnani Timbre TTS
            wav_bytes = await self.tts.synthesize_wav(text)
            pcm16k = wav_bytes[44:] if wav_bytes.startswith(b"RIFF") else wav_bytes

            # 2. Resample 16kHz -> 8kHz mono PCM for Exotel
            pcm8k, _ = audioop.ratecv(pcm16k, SAMPLE_WIDTH, CHANNELS, GNANI_SAMPLE_RATE, EXOTEL_SAMPLE_RATE, None)

            # 3. Stream in 3200-byte chunks (200ms at 8kHz 16-bit mono = multiple of 320 bytes)
            chunk_size = 3200
            for i in range(0, len(pcm8k), chunk_size):
                chunk = pcm8k[i : i + chunk_size]
                rem = len(chunk) % 320
                if rem != 0:
                    chunk += b"\x00" * (320 - rem)

                payload_b64 = base64.b64encode(chunk).decode("ascii")
                message = {
                    "event": "media",
                    "stream_sid": self.stream_sid,
                    "media": {
                        "payload": payload_b64,
                    },
                }
                await self.websocket.send_text(json.dumps(message))
                # Match real-time 200ms delivery
                await asyncio.sleep(0.19)

        except Exception as exc:
            logger.exception("Failed to synthesize/stream TTS to Exotel: %s", exc)
        finally:
            await asyncio.sleep(0.2)
            self.agent_speaking = False

    async def _finalize(self) -> None:
        """Finalize call status and summary in database."""
        logger.info("Finalizing media session for call %s", self.call_id)
        if self.call_id and not self.call_completed:
            summary = f"Call completed with Ganesh (+91 86600 39103). Spoke directly in Kanglish/Kannada."
            await call_service.set_call_summary(self.call_id, summary)


async def media_websocket_handler(websocket: WebSocket, call_id: Optional[str] = None) -> None:
    """FastAPI WebSocket endpoint entry point."""
    if not call_id:
        call_id = websocket.query_params.get("call_id")
    if not call_id:
        path_parts = websocket.url.path.strip("/").split("/")
        if len(path_parts) > 1 and path_parts[-1] != "media":
            call_id = path_parts[-1]

    handler = ExotelMediaHandler(websocket, call_id)
    await handler.handle()
