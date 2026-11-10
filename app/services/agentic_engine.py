"""Agentic conversation engine.

Consumes STT transcripts from Gnani Prisma, decides what to say next based on
the user's task instructions and constraints, and hands text to Gnani Timbre
for synthesis. Converses naturally and informally without AI clichés.
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
_ENGLISH_WORDS = {"yes", "no", "hello", "ok", "sure", "dispatched", "shipped", "done", "complete"}


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
    r"\b(yes|yeah|yep|sure|dispatched|shipped|sent|confirmed|available|done|okay|ok|complete|completed|finish|finished|ಹೌದು|ಆಗಿದೆ|ಮುಗಿದಿದೆ|ಇದೆ|ಸರಿ|ರೆಡಿ)\b",
    re.IGNORECASE,
)
_NEGATIVE_MARKERS = re.compile(
    r"\b(no|not yet|dont|don't|not sure|unclear|maybe|later|cannot|can't|waiting|ಇಲ್ಲ|ಆಗಿಲ್ಲ|ಇನ್ನೂ ಇಲ್ಲ)\b",
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


def clean_topic_instruction(text: str) -> str:
    """Clean the user instruction by stripping persona wrappers and boilerplate."""
    if not text:
        return ""
    # Strip persona prefix
    cleaned = re.sub(r"\[CALLER_PERSONA:[^\]]+\]", "", text).strip()
    # Strip leading phrases like "Call ... and ask if / whether / to"
    cleaned = re.sub(
        r"^(?:please\s+)?(?:call|ask|check with|tell)\s+(?:the\s+)?(?:[A-Za-z0-9]+\s+)?(?:and\s+)?(?:ask|check)?\s*(?:if|about|whether)?\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    return cleaned if cleaned else text


def extract_caller_name(state: AgentState) -> Optional[str]:
    """Extract a human person name to speak as, strictly avoiding robotic or AI mentions."""
    desc = state.task.description or ""
    # Look for explicit name patterns
    m = re.search(r"\b(?:i am|name[:\s]+|from|as|call as|speak as)\s+([A-Za-z]+)", desc, re.IGNORECASE)
    if m:
        candidate = m.group(1).capitalize()
        if candidate.lower() not in ("a", "an", "the", "store", "order", "delivery", "person"):
            return candidate
    uid = getattr(state.task, "user_id", "") or ""
    if uid and uid.lower() not in ("u1", "anonymous", "user", "default", "test"):
        clean_name = uid.split("_")[0].split("@")[0].capitalize()
        if len(clean_name) >= 3:
            return clean_name
    return None


def pick_next_question(state: AgentState) -> Optional[str]:
    """Return the next question to ask, falling back to task description."""
    remaining = state.remaining_questions
    if remaining:
        return remaining[0]
    main_desc = clean_topic_instruction(state.task.description or "")
    if main_desc and main_desc not in state.asked:
        return main_desc
    return None


def build_opening_greeting(state: AgentState) -> str:
    """Build an informal, friendly greeting starting with Hello/ಹಲೋ without introducing as an AI."""
    lang = state.language
    caller_name = extract_caller_name(state)

    if settings.concise_mode:
        if lang == Language.KANNADA:
            if caller_name:
                return f"ಹಲೋ, ನಮಸ್ತೆ! ನಾನು {caller_name}."
            return "ಹಲೋ, ನಮಸ್ತೆ! ಸಣ್ಣ ವಿಷಯ ಕೇಳ್ಬೇಕಿತ್ತು."
        if lang == Language.KANGLISH:
            if caller_name:
                return f"Hello! {caller_name} illi."
            return "Hello, namaskara! Quick check."
        if caller_name:
            return f"Hello! This is {caller_name}."
        return "Hello! Quick check regarding this."

    topic = pick_next_question(state) or clean_topic_instruction(state.task.description or "")
    if topic:
        state.mark_asked(topic)

    if lang == Language.KANNADA:
        if caller_name and topic:
            return f"ಹಲೋ, ನಮಸ್ತೆ! ನಾನು {caller_name}. {topic} ಅಂತ ಕೇಳ್ಬೇಕಿತ್ತು."
        if caller_name:
            return f"ಹಲೋ, ನಮಸ್ತೆ! ನಾನು {caller_name}, ಸಣ್ಣ ವಿಷಯ ಕೇಳ್ಬೇಕಿತ್ತು."
        return f"ಹಲೋ, ನಮಸ್ತೆ! {topic} ಅಂತ ಕೇಳ್ಬೇಕಿತ್ತು." if topic else "ಹಲೋ, ನಮಸ್ತೆ! ಒಂದು ಸಣ್ಣ ವಿಷಯ ಕೇಳ್ಬೇಕಿತ್ತು."

    if lang == Language.KANGLISH:
        if caller_name and topic:
            return f"Hello, namaskara! {caller_name} illi. {topic} check madbekittu."
        if caller_name:
            return f"Hello, namaskara! {caller_name} illi. Quick check madbekittu."
        return f"Hello, namaskara! {topic} check madbekittu." if topic else "Hello, namaskara! Just a quick check."

    # English default
    if caller_name and topic:
        return f"Hello! This is {caller_name}. Just calling to check: {topic}."
    if caller_name:
        return f"Hello! This is {caller_name}. Just calling for a quick check."
    return f"Hello! Just calling to check: {topic}." if topic else "Hello! Just calling for a quick check."


def build_followup(state: AgentState, callee_text: str) -> Optional[str]:
    """Decide the next informal agent utterance after a callee response.

    When the callee says hello or initiates the conversation, the agent starts
    with 'Hello' / 'ಹಲೋ' and continues addressing the user's custom instruction.
    """
    state.turn += 1
    if state.turn >= state.max_turns:
        state.done = True
        return None

    caller_name = extract_caller_name(state)
    lang = state.language
    callee_said_hello = bool(_GREETING_MARKERS.search(callee_text)) or "ಹಲೋ" in callee_text or "hello" in callee_text.lower()
    topic = clean_topic_instruction(state.task.description or "")

    # 1. If callee said "Hello" / "ಹಲೋ", respond starting with "Hello" and continue
    if callee_said_hello and state.turn <= 2:
        question = pick_next_question(state) or topic
        state.mark_asked(question)
        if lang == Language.KANNADA:
            intro = f"ಹಲೋ, ನಮಸ್ತೆ! ನಾನು {caller_name}. " if caller_name else "ಹಲೋ, ನಮಸ್ತೆ! "
            return f"{intro}{question} ಅಂತ ಕೇಳ್ಬೇಕಿತ್ತು?"
        if lang == Language.KANGLISH:
            intro = f"Hello, namaskara! {caller_name} illi. " if caller_name else "Hello! "
            return f"{intro}{question}?"
        intro = f"Hello! This is {caller_name}. " if caller_name else "Hello! "
        return f"{intro}Just wanted to check: {question}?"

    # 2. Check if callee is asking who is speaking
    if any(w in callee_text.lower() for w in ["who is this", "ಯಾರು", "yaaru", "who"]):
        if lang == Language.KANNADA:
            return f"ನಾನು {caller_name or 'ಸ್ನೇಹಿತರು'} ಮಾತಾಡ್ತಿರೋದು. {topic} ವಿಷಯಕ್ಕೆ ಕಾಲ್ ಮಾಡಿದ್ದೆ."
        if lang == Language.KANGLISH:
            return f"{caller_name or 'Friend'} illi matadtirodu. {topic} bagge call madidde."
        return f"This is {caller_name or 'a caller'}. I was calling regarding: {topic}."

    # 3. If callee answered or confirmed
    status = classify_response(callee_text, topic)
    state.mark_confirmed(topic, status)

    # Wrap up naturally
    state.done = True
    if lang == Language.KANNADA:
        return "ತುಂಬಾ ಸಂತೋಷ, ವಿವರ ತಿಳಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು! ಕರೆ ಮುಕ್ತಾಯ ಮಾಡ್ತಿದ್ದೀನಿ, ನಮಸ್ಕಾರ."
    if lang == Language.KANGLISH:
        return "Super, got it! Thank you so much for the info pa. Take care, bye!"
    return "Great, thank you so much for confirming! Have a great day, bye!"


def build_summary(state: AgentState) -> str:
    """Build a final summary of the call based on the user's task and the callee's response."""
    lines = [f"Call Task: {state.task.description}"]
    for q, status in state.confirmed.items():
        st = status.value if isinstance(status, ConfirmationStatus) else str(status)
        lines.append(f"Outcome ({q}): {st}")
    if not state.confirmed:
        lines.append("Call completed with callee.")
    return "\n".join(lines)
