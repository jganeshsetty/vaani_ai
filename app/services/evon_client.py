"""Hugging Face Inference Client for Evon v3.3 (gnani/gnani-evon-v3.3-30B-A3B).

The model is served via the Hugging Face Inference API (InferenceClient).
We use the chat-completion endpoint with a system prompt that loads the
session context, and stream the model's text reply token by token.
"""
from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Optional

try:
    from huggingface_hub import InferenceClient
except ImportError:
    InferenceClient = None  # type: ignore

from app.config import settings

logger = logging.getLogger("vaani.evon")


class EvonClient:
    """Thin wrapper around the Hugging Face InferenceClient for Evon v3.3."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or settings.huggingface_api_key
        self.model = model or settings.huggingface_model
        self._client: Optional[InferenceClient] = None

    def _ensure_client(self) -> Any:
        if InferenceClient is None:
            raise RuntimeError("huggingface_hub package is not installed. Install with 'pip install huggingface_hub'.")
        if self._client is None:
            if not self.api_key:
                raise RuntimeError("HUGGINGFACE_API_KEY is not configured")
            self._client = InferenceClient(token=self.api_key)
        return self._client

    async def chat(
        self,
        messages: list[dict],
        *,
        max_tokens: int = 512,
        temperature: float = 0.7,
        stream: bool = True,
    ) -> AsyncIterator[str]:
        """Stream the model's text reply token by token.

        Yields incremental text fragments. Never raises on transient API
        errors — logs and stops streaming.
        """
        client = self._ensure_client()
        try:
            stream_obj = client.chat_completion(
                messages=messages,
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            async for chunk in stream_obj:
                try:
                    choice = chunk.choices[0]
                    delta = choice.delta
                    if delta and getattr(delta, "content", None):
                        yield delta.content
                except (IndexError, AttributeError):
                    continue
        except Exception as exc:
            logger.exception("Evon chat failed: %s", exc)
            return

    async def chat_once(
        self,
        messages: list[dict],
        *,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        """Run a non-streaming chat completion and return the full reply text."""
        client = self._ensure_client()
        try:
            resp = client.chat_completion(
                messages=messages,
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=False,
            )
            choice = resp.choices[0]
            return choice.message.content or ""
        except Exception as exc:
            logger.exception("Evon chat_once failed: %s", exc)
            return ""

    async def summarize(
        self,
        transcript: list[dict],
        *,
        max_tokens: int = 512,
        temperature: float = 0.3,
    ) -> str:
        """Generate a concise call summary from a transcript using Evon."""
        transcript_text = "\n".join(
            f"{entry.get('role', 'unknown')}: {entry.get('text', '')}"
            for entry in transcript
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a concise call-summarization assistant. "
                    "Produce a 3-5 bullet executive summary of the conversation "
                    "including key outcomes, decisions, and any action items."
                ),
            },
            {
                "role": "user",
                "content": f"Summarize this call transcript:\n\n{transcript_text}",
            },
        ]
        return await self.chat_once(messages, max_tokens=max_tokens, temperature=temperature)


def evon_client() -> EvonClient:
    return EvonClient()