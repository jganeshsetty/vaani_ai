"""MongoDB async connection via Motor with resilient In-Memory fallback for cloud deployment."""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("vaani.database")

_client: AsyncIOMotorClient | None = None
_db: Any | None = None
_is_mock: bool = False


class InMemoryInsertResult:
    def __init__(self, inserted_id: Any):
        self.inserted_id = inserted_id


class InMemoryCursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = docs
        self._index = 0

    def sort(self, key_or_list: Any, direction: int = 1) -> "InMemoryCursor":
        if isinstance(key_or_list, list):
            key, direction = key_or_list[0]
        else:
            key = key_or_list
        reverse = direction == -1
        self._docs.sort(key=lambda d: d.get(key, 0) or 0, reverse=reverse)
        return self

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index < len(self._docs):
            doc = self._docs[self._index]
            self._index += 1
            return deepcopy(doc)
        raise StopAsyncIteration


class InMemoryCollection:
    def __init__(self, name: str):
        self.name = name
        self._docs: List[Dict[str, Any]] = []

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "_id":
                target_str = str(v)
                doc_str = str(doc.get("_id", ""))
                if doc_str != target_str:
                    return False
            elif isinstance(v, dict):
                if "$in" in v:
                    val = doc.get(k)
                    allowed = [str(x) for x in v["$in"]]
                    if str(val) not in allowed:
                        return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    async def insert_one(self, doc: Dict[str, Any]) -> InMemoryInsertResult:
        doc_copy = deepcopy(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = ObjectId()
        self._docs.append(doc_copy)
        return InMemoryInsertResult(doc_copy["_id"])

    async def find_one(self, query: Optional[Dict[str, Any]] = None, sort: Any = None) -> Optional[Dict[str, Any]]:
        matching = []
        for d in self._docs:
            if not query or self._matches(d, query):
                matching.append(d)
        if not matching:
            return None
        if sort:
            cursor = InMemoryCursor(matching).sort(sort[0][0] if isinstance(sort, list) else sort,
                                                   sort[0][1] if isinstance(sort, list) else 1)
            matching = cursor._docs
        return deepcopy(matching[0])

    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any]) -> None:
        target = None
        for d in self._docs:
            if self._matches(d, filter):
                target = d
                break
        if not target:
            return

        if "$set" in update:
            for k, v in update["$set"].items():
                if "." in k:
                    parts = k.split(".")
                    curr = target
                    for p in parts[:-1]:
                        if p not in curr or not isinstance(curr[p], dict):
                            curr[p] = {}
                        curr = curr[p]
                    curr[parts[-1]] = deepcopy(v)
                else:
                    target[k] = deepcopy(v)

        if "$push" in update:
            for k, v in update["$push"].items():
                if k not in target or not isinstance(target[k], list):
                    target[k] = []
                target[k].append(deepcopy(v))

    def find(self, query: Optional[Dict[str, Any]] = None) -> InMemoryCursor:
        matching = [d for d in self._docs if not query or self._matches(d, query)]
        return InMemoryCursor(matching)


class InMemoryDatabase:
    def __init__(self):
        self._collections: Dict[str, InMemoryCollection] = {}

    def __getitem__(self, name: str) -> InMemoryCollection:
        if name not in self._collections:
            self._collections[name] = InMemoryCollection(name)
        return self._collections[name]


async def connect_to_mongo() -> None:
    """Open the Motor client or fallback gracefully to In-Memory DB."""
    global _client, _db, _is_mock

    # If mock forced via environment
    if os.getenv("VAANI_MOCK_MONGO", "").lower() in ("true", "1", "yes"):
        logger.info("Using In-Memory Database (forced by VAANI_MOCK_MONGO)")
        _db = InMemoryDatabase()
        _is_mock = True
        return

    try:
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=2000,
        )
        _db = _client[settings.mongodb_db]
        # Verify connectivity with strict timeout
        await asyncio.wait_for(_client.admin.command("ping"), timeout=2.0)
        _is_mock = False
        logger.info("Connected to MongoDB at %s (%s)", settings.mongodb_uri, settings.mongodb_db)
    except Exception as exc:
        logger.warning(
            "Could not connect to MongoDB (%s). Activating resilient In-Memory DB for zero-config cloud deployment.",
            exc,
        )
        _db = InMemoryDatabase()
        _is_mock = True


async def close_mongo_connection() -> None:
    """Close the Motor client."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
    _db = None


def get_database() -> Any:
    """Return the active database instance."""
    global _db
    if _db is None:
        _db = InMemoryDatabase()
    return _db


# Convenience collection accessors -------------------------------------------------

def users_collection() -> Any:
    return get_database()["users"]


def tasks_collection() -> Any:
    return get_database()["tasks"]


def calls_collection() -> Any:
    return get_database()["calls"]


def call_sessions_collection() -> Any:
    """Collection for dual-mode CallSession documents (room_id, mode, etc.)."""
    return get_database()["call_sessions"]


def transcripts_collection() -> Any:
    return get_database()["transcripts"]