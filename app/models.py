"""Pydantic models for the API layer."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Language(str, Enum):
    """Supported conversation languages."""

    KANNADA = "kannada"
    ENGLISH = "english"
    KANGLISH = "kanglish"  # Kannada + English mix


class TaskStatus(str, Enum):
    PENDING = "pending"
    CALLING = "calling"
    COMPLETED = "completed"
    FAILED = "failed"


class ConfirmationStatus(str, Enum):
    """How a piece of information extracted from the call should be treated."""

    CONFIRMED = "confirmed"  # explicitly stated by callee
    UNCLEAR = "unclear"  # ambiguous / hedged
    NOT_ASKED = "not_asked"  # agent never asked


class TaskCreate(BaseModel):
    """Request body for POST /api/tasks."""

    user_id: str = Field(..., description="User identifier")
    description: str = Field(..., min_length=1, max_length=2000)
    language: Language = Language.KANNADA
    target_number: Optional[str] = Field(None, description="E.164 phone number to call")
    constraints: list[str] = Field(default_factory=list)
    questions_to_ask: list[str] = Field(default_factory=list)


class TaskOut(BaseModel):
    """Task as returned by the API."""

    id: str
    user_id: str
    description: str
    language: Language
    target_number: Optional[str] = None
    constraints: list[str] = Field(default_factory=list)
    questions_to_ask: list[str] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime
    updated_at: datetime


class CallStartRequest(BaseModel):
    """Request body for POST /api/calls/start."""

    task_id: str = Field(..., description="Task id returned from POST /api/tasks")
    language: Optional[Language] = None
    target_number: Optional[str] = None


class CallStatus(str, Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class CallOut(BaseModel):
    """Call as returned by the API."""

    id: str
    task_id: str
    status: CallStatus = CallStatus.INITIATED
    target_number: Optional[str] = None
    exotel_call_sid: Optional[str] = None
    exotel_media_sid: Optional[str] = None
    transcript: list[dict] = Field(default_factory=list)
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CallDetailOut(CallOut):
    """Extended call response with per-question verification."""

    verification: dict[str, ConfirmationStatus] = Field(default_factory=dict)
    language_detected: Optional[Language] = None