"""CallSession lifecycle service backed by MongoDB.

A CallSession represents a dual-mode voice call:
  - outbound: an AI agent initiates a conversation
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
        caller_name=doc.get("caller_name", "Ganesh"),
        context_prompt=doc.get("context_prompt", ""),
        voice_tone=doc.get("voice_tone", "natural"),
        status=CallStatus(doc.get("status", CallStatus.PENDING.value)),
        transcript=doc.get("transcript", []),
        summary=doc.get("summary"),
        action_items=doc.get("action_items", []),
        scheduled_time=doc.get("scheduled_time"),
        language=Language(doc.get("language", Language.ENGLISH.value)),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        speaker_id=doc.get("speaker_id"),
    )


async def create_session(
    *,
    mode: CallMode = CallMode.OUTBOUND,
    target_number: Optional[str] = None,
    context_prompt: str,
    language: Language = Language.ENGLISH,
    target_name: Optional[str] = None,
    caller_name: Optional[str] = "Ganesh",
    voice_tone: Optional[str] = "natural",
    scheduled_time: Optional[datetime] = None,
    speaker_id: Optional[str] = None,
    room_id: Optional[str] = None,
) -> CallSessionOut:
    """Create a new CallSession with a fresh UUID or specified room_id."""
    col: AsyncIOMotorCollection = call_sessions_collection()
    session_room_id = room_id or str(uuid.uuid4())
    now = _now()
    initial_status = CallStatus.SCHEDULED.value if scheduled_time and scheduled_time > now else CallStatus.PENDING.value
    doc = {
        "room_id": session_room_id,
        "mode": mode.value,
        "target_number": target_number,
        "target_name": target_name,
        "caller_name": caller_name or "Ganesh",
        "context_prompt": context_prompt,
        "voice_tone": voice_tone or "natural",
        "status": initial_status,
        "transcript": [],
        "summary": None,
        "action_items": [],
        "scheduled_time": scheduled_time,
        "language": language.value,
        "speaker_id": speaker_id,
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


async def set_call_summary(session_id: str, summary: str, action_items: Optional[list[str]] = None) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = call_sessions_collection()
    update_data = {
        "summary": summary,
        "status": CallStatus.COMPLETED.value,
        "updated_at": _now()
    }
    if action_items is not None:
        update_data["action_items"] = action_items
    try:
        await col.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update_data},
        )
    except Exception:
        await col.update_one(
            {"_id": session_id},
            {"$set": update_data},
        )


async def set_scheduled_time(session_id: str, scheduled_time: Optional[datetime]) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = call_sessions_collection()
    try:
        await col.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"scheduled_time": scheduled_time, "updated_at": _now()}},
        )
    except Exception:
        await col.update_one(
            {"_id": session_id},
            {"$set": {"scheduled_time": scheduled_time, "updated_at": _now()}},
        )


async def list_sessions() -> list[CallSessionOut]:
    col: AsyncIOMotorCollection = call_sessions_collection()
    sessions: list[CallSessionOut] = []
    async for doc in col.find().sort("created_at", -1):
        sessions.append(_serialize_session(doc))
    return sessions


async def get_user_profile(user_id: str = "default_user") -> dict:
    from app.database import get_database
    db = get_database()
    col = db["user_profiles"]
    doc = await col.find_one({"user_id": user_id})
    if doc:
        doc["_id"] = str(doc["_id"])
        return doc
    return {
        "user_id": user_id,
        "user_name": "Ganesh",
        "persona": "Personal autonomous voice assistant representing Ganesh",
        "base_instructions": "Speak politely and warmly on behalf of Ganesh. Greet the caller, identify why they called, answer questions naturally, and inform them Ganesh will follow up if urgent.",
        "voice_id": "Aarohi",
        "speaker_id": None,
        "phone": "+918660039103",
        "permanent_room_id": f"p-ganesh",
    }


async def save_user_profile(data: dict, user_id: str = "default_user") -> dict:
    from app.database import get_database
    db = get_database()
    col = db["user_profiles"]
    now = _now()
    clean_name = data.get("user_name", "Ganesh").strip()
    slug = "".join(c.lower() if c.isalnum() else "-" for c in clean_name).strip("-") or "user"
    permanent_room_id = f"p-{slug}"

    update_payload = {
        "user_id": user_id,
        "user_name": clean_name,
        "persona": data.get("persona", "Personal autonomous voice assistant"),
        "base_instructions": data.get("base_instructions", ""),
        "voice_id": data.get("voice_id", "Aarohi"),
        "speaker_id": data.get("speaker_id"),
        "phone": data.get("phone", ""),
        "permanent_room_id": permanent_room_id,
        "updated_at": now,
    }
    await col.update_one(
        {"user_id": user_id},
        {"$set": update_payload, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    # Ensure a persistent session document exists for the permanent link
    sessions_col = db["call_sessions"]
    await sessions_col.update_one(
        {"room_id": permanent_room_id},
        {
            "$set": {
                "room_id": permanent_room_id,
                "mode": CallMode.INBOUND.value,
                "target_name": clean_name,
                "caller_name": clean_name,
                "context_prompt": f"[PERMANENT AUTO-RESPONDER FOR {clean_name.upper()}]: {update_payload['base_instructions']}",
                "language": Language.ENGLISH.value,
                "speaker_id": update_payload["speaker_id"],
                "status": CallStatus.PENDING.value,
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
                "transcript": [],
                "summary": None,
                "action_items": [],
            }
        },
        upsert=True,
    )

    return update_payload
