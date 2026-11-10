"""Task CRUD service backed by MongoDB."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorCollection

from app.config import settings
from app.models import Language, TaskCreate, TaskOut, TaskStatus
from app.database import tasks_collection


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_task(doc: dict) -> TaskOut:
    return TaskOut(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        description=doc["description"],
        language=Language(doc["language"]),
        target_number=doc.get("target_number"),
        constraints=doc.get("constraints", []),
        questions_to_ask=doc.get("questions_to_ask", []),
        status=TaskStatus(doc.get("status", TaskStatus.PENDING.value)),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def create_task(payload: TaskCreate) -> TaskOut:
    """Insert a new task and return the created task."""
    col: AsyncIOMotorCollection = tasks_collection()
    now = _now()
    doc = {
        "user_id": payload.user_id,
        "description": payload.description,
        "language": payload.language.value,
        "target_number": payload.target_number,
        "constraints": list(payload.constraints),
        "questions_to_ask": list(payload.questions_to_ask),
        "status": TaskStatus.PENDING.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return _serialize_task(doc)


async def get_task(task_id: str) -> Optional[TaskOut]:
    """Fetch a task by its string id."""
    from bson import ObjectId

    col: AsyncIOMotorCollection = tasks_collection()
    doc = await col.find_one({"_id": ObjectId(task_id)})
    if doc is None:
        return None
    return _serialize_task(doc)


async def update_task_status(task_id: str, status: TaskStatus) -> None:
    """Update a task's status."""
    from bson import ObjectId

    col: AsyncIOMotorCollection = tasks_collection()
    await col.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": status.value, "updated_at": _now()}},
    )


async def list_tasks(user_id: Optional[str] = None) -> list[TaskOut]:
    """List tasks, optionally filtered by user."""
    col: AsyncIOMotorCollection = tasks_collection()
    query: dict = {}
    if user_id:
        query["user_id"] = user_id
    docs = []
    async for doc in col.find(query).sort("created_at", -1):
        docs.append(_serialize_task(doc))
    return docs