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
_KANNADA_WORDS = {"ನಮಸ್ತೆ", "ಹೌದು", "ಇಲ್ಲ", "ಇದೆ", "ಧನ್ಯವಾದ", "ಕನ್ನಡ", "ಹಲೋ"}
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

# Greeting markers: when callee picks up and says hello/greetings
_GREETING_MARKERS = re.compile(
    r"\b(hello|helo|hi|hey|hai|ಹಲೋ|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|ಹೇಳಿ|speaking|tell me)\b",
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


def extract_caller_name(state: AgentState) -> Optional[str]:
    """Extract a human person name to speak as, strictly avoiding robotic or AI mentions."""
    desc = state.task.description or ""
    # Look for explicit name patterns like "call as Ganesh", "I am Sunil", "from Rahul", etc.
    m = re.search(r"\b(?:i am|name[:\s]+|from|as|call as)\s+([A-Za-z]+)", desc, re.IGNORECASE)
    if m:
        candidate = m.group(1).capitalize()
        if candidate.lower() not in ("a", "an", "the", "store", "order", "delivery"):
            return candidate
    uid = getattr(state.task, "user_id", "") or ""
    if uid and uid.lower() not in ("u1", "anonymous", "user", "default", "test"):
        clean_name = uid.split("_")[0].split("@")[0].capitalize()
        if len(clean_name) >= 3:
            return clean_name
    return None


def build_opening_greeting(state: AgentState) -> str:
    """Build an informal, friendly greeting starting with Hello/ಹಲೋ without introducing as an AI."""
    lang = state.language
    caller_name = extract_caller_name(state)

    if lang == Language.KANNADA:
        if caller_name:
            return f"ಹಲೋ, ನಮಸ್ತೆ! ನಾನು {caller_name}, ಸಣ್ಣ ವಿಷಯ ಕೇಳ್ಬೇಕಿತ್ತು."
        return "ಹಲೋ, ನಮಸ್ತೆ! ಒಂದು ಸಣ್ಣ ವಿಷಯ ಕೇಳ್ಬೇಕಿತ್ತು."

    if lang == Language.KANGLISH:
        if caller_name:
            return f"Hello, namaskara! {caller_name} illi. Quick check madbekittu."
        return "Hello, namaskara! Just a quick check madbekittu."

    if caller_name:
        return f"Hello! This is {caller_name}. Just calling for a quick check."
    return "Hello! Just calling for a quick check regarding this."


def pick_next_question(state: AgentState) -> Optional[str]:
    """Return the next question to ask, or None if all questions have been asked."""
    remaining = state.remaining_questions
    if not remaining:
        return None
    return remaining[0]


def build_followup(state: AgentState, callee_text: str) -> Optional[str]:
    """Decide the next informal agent utterance after a callee response.

    When the callee says hello or initiates the conversation, the agent starts
    with 'Hello' / 'ಹಲೋ' and seamlessly continues the conversation.
    """
    state.turn += 1
    if state.turn >= state.max_turns:
        state.done = True
        return None

    caller_name = extract_caller_name(state)
    lang = state.language
    callee_said_hello = bool(_GREETING_MARKERS.search(callee_text)) or "ಹಲೋ" in callee_text

    # If we have outstanding questions, ask the next one informally.
    question = pick_next_question(state)
    if question is not None:
        state.mark_asked(question)
        status = classify_response(callee_text, question)
        state.mark_confirmed(question, status)

        # If the opposite person said hello or it's the opening turn, start with Hello and continue!
        if callee_said_hello or state.turn <= 1:
            if lang == Language.KANNADA:
                intro = f"ಹಲೋ, ನಮಸ್ತೆ! ನಾನು {caller_name}, " if caller_name else "ಹಲೋ, ನಮಸ್ತೆ! "
                return f"{intro}{_translit(question)}?"
            if lang == Language.KANGLISH:
                intro = f"Hello, namaskara! {caller_name} illi. " if caller_name else "Hello! "
                return f"{intro}{question}?"
            intro = f"Hello! This is {caller_name}. " if caller_name else "Hello! "
            return f"{intro}Just wanted to ask: {question}?"

        # Ongoing conversation turns
        if lang == Language.KANNADA:
            return f"ಹೌದಾ? ಸರಿ ಕಣ್ರೀ! {_translit(question)}?"
        if lang == Language.KANGLISH:
            return f"Super, got it! {question}?"
        return f"Got it, thanks! {question}?"

    # No more questions — wrap up informally like a real person.
    state.done = True
    if state.language == Language.KANNADA:
        return "ಓಕೆ ಕಣ್ರೀ, ತುಂಬಾ ಧನ್ಯವಾದಗಳು! ಸರಿ ಬಾಯ್."
    if state.language == Language.KANGLISH:
        return "Okay pa, thank you so much! Take care, bye."
    return "Awesome, thanks a lot! Take care, bye."


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
