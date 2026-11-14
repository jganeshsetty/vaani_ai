"""Tests for the agentic engine and language detection."""
from __future__ import annotations

from app.models import Language, TaskCreate, TaskStatus
from app.services.agentic_engine import (
    AgentState,
    build_opening_greeting,
    build_summary,
    classify_response,
    detect_language,
    pick_next_question,
)


def _make_task(**kwargs) -> TaskCreate:
    defaults = {
        "user_id": "u1",
        "description": "Call the store and ask if my laptop is dispatched",
        "language": Language.KANNADA,
        "target_number": "+919999999999",
        "constraints": ["be polite"],
        "questions_to_ask": ["Is my laptop dispatched?", "When will it arrive?"],
    }
    defaults.update(kwargs)
    return TaskCreate(**defaults)


def test_detect_language_kannada() -> None:
    assert detect_language("ನಮಸ್ತೆ ಇದು ಕನ್ನಡ ಭಾಷೆ") == Language.KANNADA


def test_detect_language_english() -> None:
    assert detect_language("Yes it is dispatched") == Language.ENGLISH


def test_detect_language_kanglish() -> None:
    assert detect_language("Yes, ಅದು dispatch ಆಯಿತು") == Language.KANGLISH


def test_classify_confirmed() -> None:
    assert classify_response("Yes it is dispatched", "q") == "confirmed"


def test_classify_unclear() -> None:
    assert classify_response("Not sure yet", "q") == "unclear"


def test_opening_greeting_kannada() -> None:
    state = AgentState(task=_make_task(), call_id="c1")
    assert "ನಮಸ್ತೆ" in build_opening_greeting(state)


def test_pick_next_question() -> None:
    state = AgentState(task=_make_task(), call_id="c1")
    q = pick_next_question(state)
    assert q == "Is my laptop dispatched?"
    state.mark_asked(q)
    assert pick_next_question(state) == "When will it arrive?"


def test_summary_includes_questions() -> None:
    state = AgentState(task=_make_task(), call_id="c1")
    state.mark_confirmed("Is my laptop dispatched?", "confirmed")
    summary = build_summary(state)
    assert "dispatched" in summary
    assert "confirmed" in summary


def test_calculate_pcm16_rms_silence_vs_sound() -> None:
    """Calculate RMS for silence vs signal."""
    import struct

    def calculate_pcm16_rms(data: bytes) -> float:
        """Compute the root-mean-square of 16-bit PCM samples."""
        if not data:
            return 0.0
        samples = struct.unpack(f"<{len(data) // 2}h", data)
        if not samples:
            return 0.0
        return (sum(s * s for s in samples) / len(samples)) ** 0.5

    # 100 samples of pure silence (0s)
    silence = b"\x00\x00" * 100
    assert calculate_pcm16_rms(silence) == 0.0

    # 100 samples of audible signal (amplitude 2000)
    signal = struct.pack("<100h", *([2000] * 100))
    rms = calculate_pcm16_rms(signal)
    assert rms == 2000.0


def test_concise_mode_token_reduction() -> None:
    state = AgentState(task=_make_task(), call_id="c1")
    greeting = build_opening_greeting(state)
    assert "ನಮಸ್ತೆ" in greeting
    # Concise mode should be crisp (< 50 chars) to save character tokens
    assert len(greeting) <= 50


def test_callee_says_hello_agent_starts_with_hello() -> None:
    from app.services.agentic_engine import build_followup

    # Callee answers saying "Hello?" in English
    state_en = AgentState(task=_make_task(language=Language.ENGLISH, description="Call as Ganesh to ask about laptop"), call_id="c2", language=Language.ENGLISH)
    reply_en = build_followup(state_en, "Hello? Who is this?")
    assert reply_en is not None
    assert reply_en.startswith("Hello!")
    assert "Ganesh" in reply_en

    # Callee answers saying "ಹಲೋ?" in Kannada
    state_kn = AgentState(task=_make_task(language=Language.KANNADA, description="Call as Ganesh to ask about laptop"), call_id="c3", language=Language.KANNADA)
    reply_kn = build_followup(state_kn, "ಹಲೋ, ಹೇಳಿ?")
    assert reply_kn is not None
    assert reply_kn.startswith("ಹಲೋ")
    assert "Ganesh" in reply_kn
