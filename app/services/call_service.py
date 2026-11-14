"""Legacy call lifecycle service (kept for backwards compatibility).

Newer dual-mode sessions live in call_session_service.py; this module
continues to support the legacy /api/tasks + /api/calls flow.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorCollection

from app.models import CallOut, CallStatus, ConfirmationStatus, Language
from app.database import calls_collection


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_call(doc: dict) -> CallOut:
    return CallOut(
        id=str(doc["_id"]),
        task_id=doc["task_id"],
        status=CallStatus(doc.get("status", CallStatus.INITIATED.value)),
        target_number=doc.get("target_number"),
        exotel_call_sid=doc.get("exotel_call_sid"),
        exotel_media_sid=doc.get("exotel_media_sid"),
        transcript=doc.get("transcript", []),
        summary=doc.get("summary"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def create_call(task_id: str, language: Optional[Language] = None, target_number: Optional[str] = None) -> CallOut:
    """Create a call record for a task."""
    col: AsyncIOMotorCollection = calls_collection()
    now = _now()
    doc = {
        "task_id": task_id,
        "status": CallStatus.INITIATED.value,
        "target_number": target_number,
        "transcript": [],
        "verification": {},
        "language_detected": language.value if language else None,
        "created_at": now,
        "updated_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return _serialize_call(doc)


async def get_call(call_id: str) -> Optional[CallOut]:
    from bson import ObjectId
    col: AsyncIOMotorCollection = calls_collection()
    try:
        doc = await col.find_one({"_id": ObjectId(call_id)})
    except Exception:
        doc = await col.find_one({"_id": call_id})
    if doc is None:
        return None
    return _serialize_call(doc)


async def get_call_by_exotel_sid(call_sid: str) -> Optional[CallOut]:
    col: AsyncIOMotorCollection = calls_collection()
    doc = await col.find_one({"exotel_call_sid": call_sid})
    if doc is None:
        return None
    return _serialize_call(doc)


async def get_latest_active_call() -> Optional[CallOut]:
    col: AsyncIOMotorCollection = calls_collection()
    doc = await col.find_one(
        {"status": {"$in": [CallStatus.INITIATED.value, CallStatus.IN_PROGRESS.value]}},
        sort=[("created_at", -1)],
    )
    if doc is None:
        doc = await col.find_one({}, sort=[("created_at", -1)])
    if doc is None:
        return None
    return _serialize_call(doc)


async def set_call_exotel(call_id: str, call_sid: str, media_sid: str) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = calls_collection()
    await col.update_one(
        {"_id": ObjectId(call_id)},
        {
            "$set": {
                "exotel_call_sid": call_sid,
                "exotel_media_sid": media_sid,
                "status": CallStatus.IN_PROGRESS.value,
                "updated_at": _now(),
            }
        },
    )


async def append_transcript(call_id: str, entry: dict) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = calls_collection()
    await col.update_one(
        {"_id": ObjectId(call_id)},
        {"$push": {"transcript": entry}, "$set": {"updated_at": _now()}},
    )


async def set_verification(call_id: str, question: str, status: ConfirmationStatus) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = calls_collection()
    await col.update_one(
        {"_id": ObjectId(call_id)},
        {"$set": {f"verification.{question}": status.value, "updated_at": _now()}},
    )


async def set_call_summary(call_id: str, summary: str) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = calls_collection()
    await col.update_one(
        {"_id": ObjectId(call_id)},
        {"$set": {"summary": summary, "status": CallStatus.COMPLETED.value, "updated_at": _now()}},
    )


async def set_call_failed(call_id: str, error: str) -> None:
    from bson import ObjectId
    col: AsyncIOMotorCollection = calls_collection()
    await col.update_one(
        {"_id": ObjectId(call_id)},
        {"$set": {"summary": error, "status": CallStatus.FAILED.value, "updated_at": _now()}},
    )


async def list_calls(task_id: Optional[str] = None) -> list[CallOut]:
    col: AsyncIOMotorCollection = calls_collection()
    query: dict = {}
    if task_id:
        query["task_id"] = task_id
    docs = []
    async for doc in col.find(query).sort("created_at", -1):
        docs.append(_serialize_call(doc))
    return docs