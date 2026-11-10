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
    return TaskCreate(
        user_id="u1",
        description="Call the store and ask if my laptop is dispatched",
        language=Language.KANNADA,
        target_number="+919999999999",
        constraints=["be polite"],
        questions_to_ask=["Is my laptop dispatched?", "When will it arrive?"],
        **kwargs,
    )


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