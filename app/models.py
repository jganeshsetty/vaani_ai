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


# --- CallSession: dual-mode voice call sessions ----------------------------------


class CallMode(str, Enum):
    OUTBOUND = "outbound"
    INBOUND = "inbound"


class CallStatus(str, Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class CallSessionCreate(BaseModel):
    """Request body for POST /api/calls (create a call session)."""

    mode: CallMode = CallMode.OUTBOUND
    target_number: Optional[str] = None
    context_prompt: str = Field(..., min_length=1, max_length=2000)
    language: Language = Language.KANNADA
    target_name: Optional[str] = None


class CallSessionOut(BaseModel):
    """A dual-mode voice call session."""

    id: str
    room_id: str
    mode: CallMode
    target_number: Optional[str] = None
    target_name: Optional[str] = None
    context_prompt: str
    status: CallStatus = CallStatus.PENDING
    transcript: list[dict] = Field(default_factory=list)
    summary: Optional[str] = None
    recording_url: Optional[str] = None
    language: Language = Language.KANNADA
    created_at: datetime
    updated_at: datetime


class CallStartRequest(BaseModel):
    """Request body for POST /api/calls/start (legacy compatibility)."""

    task_id: str = Field(..., description="Task id returned from POST /api/tasks")
    language: Optional[Language] = None
    target_number: Optional[str] = None


class CallOut(BaseModel):
    """Legacy call response (kept for backwards compatibility)."""

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