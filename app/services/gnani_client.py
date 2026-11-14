"""Client for Gnani.ai Speech APIs: Prisma (STT) and Timbre (TTS).

STT: https://api.vachana.ai/stt/v3
TTS: https://api.vachana.ai/api/v1/tts/inference

Authentication uses the X-API-Key-ID header with the unified Gnani API key.
"""
from __future__ import annotations

import io
import json
import logging
import wave
from typing import AsyncIterator, Optional

import httpx

from app.config import settings
from app.models import Language

logger = logging.getLogger("vaani.gnani")

_TTS_ENDPOINT = "https://api.vachana.ai/api/v1/tts/inference"
_STT_ENDPOINT = "https://api.vachana.ai/stt/v3"

# In-memory cache for repeated synthesized audio to save latency & tokens
_TTS_CACHE: dict[tuple[str, str, str], bytes] = {}


def get_gnani_lang_code(language: Language | str) -> str:
    """Map language enum to Gnani language code."""
    val = language.value if isinstance(language, Language) else str(language).lower()
    if "kannada" in val or val == "kn":
        return "kn-IN"
    if "english" in val or val == "en":
        return "en-IN"
    if "kanglish" in val:
        return "kn-IN"
    return "kn-IN"


class GnaniTTSClient:
    """Text-to-Speech client using Gnani Timbre."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        language: Language = Language.KANNADA,
        voice: str = "Aarohi",
    ) -> None:
        self.api_key = api_key or settings.gnani_api_key
        self.language = language
        self.voice = voice or "Aarohi"

    async def connect(self) -> None:
        """Connection hook for backwards compatibility."""
        if not self.api_key:
            logger.warning("Gnani TTS: No API key provided.")

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        """Stream synthesized audio chunks for media WebSocket streaming."""
        audio_wav = await self.synthesize_wav(text)
        chunk_size = 320
        for i in range(0, len(audio_wav), chunk_size):
            yield audio_wav[i : i + chunk_size]

    async def synthesize_wav(self, text: str) -> bytes:
        """Synthesize text into a complete, standard WAV audio file."""
        norm_text = text.strip()
        lang_code = get_gnani_lang_code(self.language)
        cache_key = (lang_code, self.voice, norm_text)

        if settings.enable_tts_cache and cache_key in _TTS_CACHE:
            logger.info("TTS Cache HIT for '%s'", norm_text[:30])
            return _TTS_CACHE[cache_key]

        if not self.api_key:
            logger.warning("No Gnani API key, generating clean silent audio bytes.")
            return b"\x00" * 3200

        headers = {
            "Content-Type": "application/json",
            "X-API-Key-ID": self.api_key,
        }
        payload = {
            "text": norm_text,
            "model": "timbre-v3.0",
            "voice": self.voice,
            "language": lang_code,
            "audio_config": {
                "encoding": "linear_pcm",
                "container": "wav",
                "sample_rate": 16000,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(_TTS_ENDPOINT, json=payload, headers=headers)
                resp.raise_for_status()
                audio_bytes = resp.content
                if settings.enable_tts_cache:
                    _TTS_CACHE[cache_key] = audio_bytes
                logger.info("Gnani TTS synthesized %d bytes for '%s'", len(audio_bytes), norm_text[:30])
                return audio_bytes
        except Exception as exc:
            logger.exception("Gnani TTS synthesis failed: %s", exc)
            return b"\x00" * 3200

    async def close(self) -> None:
        pass


class GnaniSTTClient:
    """Speech-to-Text client using Gnani Prisma."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        language: Language = Language.KANNADA,
        sample_rate: int = 16000,
    ) -> None:
        self.api_key = api_key or settings.gnani_api_key
        self.language = language
        self.sample_rate = sample_rate

    async def connect(self) -> None:
        pass

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        """Transcribe audio bytes (WAV/PCM/MP3) to text using Gnani Prisma."""
        if not self.api_key:
            logger.warning("Gnani STT: No API key provided.")
            return ""

        # If raw PCM without WAV header, wrap it with a 16kHz mono header
        if not audio_bytes.startswith(b"RIFF"):
            buf = io.BytesIO()
            with wave.open(buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_bytes)
            audio_bytes = buf.getvalue()

        lang_code = get_gnani_lang_code(self.language)
        headers = {"X-API-Key-ID": self.api_key}
        files = {"audio_file": (filename, audio_bytes, "audio/wav")}
        data = {"model": "prisma-v3.0", "language_code": lang_code}

        try:
            async with httpx.AsyncClient(timeout=25) as client:
                resp = await client.post(_STT_ENDPOINT, files=files, data=data, headers=headers)
                resp.raise_for_status()
                res_data = resp.json()
                transcript = res_data.get("transcript", "").strip()
                logger.info("Gnani STT transcribed '%s' (request_id: %s)", transcript, res_data.get("request_id"))
                return transcript
        except Exception as exc:
            logger.exception("Gnani STT transcription failed: %s", exc)
            return ""

    async def close(self) -> None:
        pass