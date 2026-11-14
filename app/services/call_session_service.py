"""CallSession lifecycle service backed by MongoDB.

A CallSession represents a dual-mode voice call:
  - outbound: an AI agent initiates a conversation via WhatsApp Magic Link
  - inbound: a user configures a screening/busy-mode prompt

Each session has a unique room_id (UUID) used as the WebSocket path.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorCollection

from app.models import CallMode, CallSessionOut, CallStatus, Language
from app.database import call_sessions_collection


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_session(doc: dict) -> CallSessionOut:
    return CallSessionOut(
        id=str(doc["_id"]),
        room_id=doc["room_id"],
        mode=CallMode(doc.get("mode", CallMode.OUTBOUND.value)),
        target_number=doc.get("target_number"),
        target_name=doc.get("target_name"),
        context_prompt=doc.get("context_prompt", ""),
        status=CallStatus(doc.get("status", CallStatus.PENDING.value)),
        transcript=doc.get("transcript", []),
        summary=doc.get("summary"),
        recording_url=doc.get("recording_url"),
        language=Language(doc.get("language", Language.KANNADA.value)),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def create_session(
    *,
    mode: CallMode = CallMode.OUTBOUND,
    target_number: Optional[str] = None,
    context_prompt: str,
    language: Language = Language.KANNADA,
    target_name: Optional[str] = None,
) -> CallSessionOut:
    """Create a new CallSession with a fresh UUID room_id."""
    col: AsyncIOMotorCollection = call_sessions_collection()
    room_id = str(uuid.uuid4())
    now = _now()
    doc = {
        "room_id": room_id,
        "mode": mode.value,
        "target_number": target_number,
        "target_name": target_name,
        "context_prompt": context_prompt,
        "status": CallStatus.PENDING.value,
        "transcript": [],
        "summary": None,
        "recording_url": None,
        "language": language.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return _serialize_session(doc)


async def get_session_by_room(room_id: str) -> Optional[CallSessionOut]:
    """Fetch a session by its room_id (UUID)."""
    col: AsyncIOMotorCollection = call_sessions_collection()
    doc = await col.find_one({"room_id": room_id})
    if doc is None:
        return None
    return _serialize_session(doc)


async def get_session_by_id(session_id: str) -> Optional[CallSessionOut]:
    col: AsyncIOMotorCollection = call_sessions_collection()
    from bson import ObjectId
    try:
        doc = await col.find_one({"_id": ObjectId(session_id)})
    except Exception:
        doc = await col.find_one({"_id": session_id})
    if doc is None:
        return None
    return _serialize_session(doc)


async def set_session_status(session_id: str, status: CallStatus) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = call_sessions_collection()
    try:
        await col.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"status": status.value, "updated_at": _now()}},
        )
    except Exception:
        await col.update_one(
            {"_id": session_id},
            {"$set": {"status": status.value, "updated_at": _now()}},
        )


async def append_transcript(session_id: str, entry: dict) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = call_sessions_collection()
    try:
        await col.update_one(
            {"_id": ObjectId(session_id)},
            {"$push": {"transcript": entry}, "$set": {"updated_at": _now()}},
        )
    except Exception:
        await col.update_one(
            {"_id": session_id},
            {"$push": {"transcript": entry}, "$set": {"updated_at": _now()}},
        )


async def set_call_summary(session_id: str, summary: str) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = call_sessions_collection()
    try:
        await col.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"summary": summary, "status": CallStatus.COMPLETED.value, "updated_at": _now()}},
        )
    except Exception:
        await col.update_one(
            {"_id": session_id},
            {"$set": {"summary": summary, "status": CallStatus.COMPLETED.value, "updated_at": _now()}},
        )


async def set_recording_url(session_id: str, url: str) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = call_sessions_collection()
    try:
        await col.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"recording_url": url, "updated_at": _now()}},
        )
    except Exception:
        await col.update_one(
            {"_id": session_id},
            {"$set": {"recording_url": url, "updated_at": _now()}},
        )


async def list_sessions() -> list[CallSessionOut]:
    col: AsyncIOMotorCollection = call_sessions_collection()
    sessions: list[CallSessionOut] = []
    async for doc in col.find().sort("created_at", -1):
        sessions.append(_serialize_session(doc))
    return sessions