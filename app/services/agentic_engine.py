"""Agentic conversation engine.

Consumes STT transcripts from Gnani Prisma, decides what to say next based on
the task constraints, and hands text to Gnani Timbre for synthesis. Also
classifies each question as confirmed / unclear / not_asked based on the
callee's response.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Optional

from app.config import settings
from app.models import ConfirmationStatus, Language, TaskOut

logger = logging.getLogger("vaani.agent")


# --- Language detection ---------------------------------------------------------

_KANNADA_CHARS = re.compile(r"[ಀ-೿]")
_KANNADA_WORDS = {"ನಮಸ್ತೆ", "ಹೌದು", "ಇಲ್ಲ", "ಇದೆ", "ಧನ್ಯವಾದ", "ಕನ್ನಡ"}
_ENGLISH_WORDS = {"yes", "no", "hello", "ok", "sure", "dispatched", "shipped"}


def detect_language(text: str) -> Language:
    """Detect Kannada, English, or mixed Kanglish from a transcript segment."""
    if not text:
        return Language.KANNADA
    kannada_hits = len(_KANNADA_CHARS.findall(text))
    words = re.findall(r"[A-Za-z]+", text.lower())
    en_hits = sum(1 for w in words if w in _ENGLISH_WORDS)
    if kannada_hits > 0 and en_hits == 0:
        return Language.KANNADA
    if kannada_hits == 0 and en_hits > 0:
        return Language.ENGLISH
    if kannada_hits > 0 and en_hits > 0:
        return Language.KANGLISH
    return Language.KANNADA


# --- Verification ---------------------------------------------------------------

# Heuristic markers for "yes/confirmed" vs "no/unclear".
_POSITIVE_MARKERS = re.compile(
    r"\b(yes|yeah|yep|sure|dispatched|shipped|sent|confirmed|available|done|okay|ok)\b",
    re.IGNORECASE,
)
_NEGATIVE_MARKERS = re.compile(
    r"\b(no|not yet|dont|don't|not sure|unclear|maybe|later|cannot|can't|waiting)\b",
    re.IGNORECASE,
)


def classify_response(text: str, question: str) -> ConfirmationStatus:
    """Classify a callee response relative to a question."""
    if not text or not text.strip():
        return ConfirmationStatus.UNCLEAR
    if _NEGATIVE_MARKERS.search(text):
        return ConfirmationStatus.UNCLEAR
    if _POSITIVE_MARKERS.search(text):
        return ConfirmationStatus.CONFIRMED
    return ConfirmationStatus.UNCLEAR


# --- Agentic state --------------------------------------------------------------

@dataclass
class AgentState:
    """Mutable per-call agent state with configurable token-saving max turns."""

    task: TaskOut
    call_id: str
    language: Language = Language.KANNADA
    asked: set[str] = field(default_factory=set)
    confirmed: dict[str, ConfirmationStatus] = field(default_factory=dict)
    transcript: list[dict] = field(default_factory=list)
    turn: int = 0
    max_turns: int = field(default_factory=lambda: settings.max_call_turns)
    done: bool = False
    summary: Optional[str] = None

    @property
    def remaining_questions(self) -> list[str]:
        return [q for q in self.task.questions_to_ask if q not in self.asked]

    def mark_asked(self, question: str) -> None:
        self.asked.add(question)

    def mark_confirmed(self, question: str, status: ConfirmationStatus) -> None:
        self.confirmed[question] = status


def build_opening_greeting(state: AgentState) -> str:
    """Build the first thing the agent says when the call connects."""
    lang = state.language
    if settings.concise_mode:
        if lang == Language.KANNADA:
            return "ನಮಸ್ತೆ, ವಾಣಿಕಾಲ್ ಕಡೆಯಿಂದ ಕರೆ ಮಾಡ್ತಿದ್ದೀನಿ."
        if lang == Language.KANGLISH:
            return "Hello, I am calling from VaaniCall."
        return "Hello, calling from VaaniCall regarding your task."

    if lang == Language.KANNADA:
        return "ನಮಸ್ತೆ, ನಾನು ವಾಣಿಯಾಳಿ. ನಾನು ನಿಮ್ಮ ಕೆಲೆಗೆ ಸಹಾಯ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ."
    if lang == Language.KANGLISH:
        return "Hello, I am Vaani. I'd like to help you with your task."
    return "Hello, I am Vaani. How can I help you today?"


def pick_next_question(state: AgentState) -> Optional[str]:
    """Return the next question to ask, or None if all questions have been asked."""
    remaining = state.remaining_questions
    if not remaining:
        return None
    return remaining[0]


def build_followup(state: AgentState, callee_text: str) -> Optional[str]:
    """Decide the next agent utterance after a callee response.

    Returns the text to synthesize, or None when the call should end.
    """
    state.turn += 1
    if state.turn >= state.max_turns:
        state.done = True
        return None

    # If we have outstanding questions, ask the next one.
    question = pick_next_question(state)
    if question is not None:
        state.mark_asked(question)
        status = classify_response(callee_text, question)
        state.mark_confirmed(question, status)
        lang = state.language
        if lang == Language.KANNADA:
            return f"{_translit(question)}? ಹೌದಾ?"
        if lang == Language.KANGLISH:
            return f"{question}? Is that correct?"
        return f"{question}?"

    # No more questions — wrap up immediately.
    state.done = True
    if state.language == Language.KANNADA:
        return "ಧನ್ಯವಾದಗಳು, ನಾನು ನಿಮ್ಮ ಮಾಹಿತಿ ದಾಖಲಿಸಿದ್ದೇನೆ."
    if state.language == Language.KANGLISH:
        return "Thank you. I have noted the information."
    return "Thank you. I have noted the information."


def _translit(text: str) -> str:
    """Best-effort: return text unchanged for now (Gnani handles mixed scripts)."""
    return text


def build_summary(state: AgentState) -> str:
    """Build a final summary of the call for the user."""
    lines = [f"Task: {state.task.description}"]
    for q, status in state.confirmed.items():
        if isinstance(status, ConfirmationStatus):
            st = status.value
        else:
            st = str(status)
        lines.append(f"- {q}: {st}")
    if not state.confirmed:
        lines.append("- No questions were asked or answered.")
    return "\n".join(lines)