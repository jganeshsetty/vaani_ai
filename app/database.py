"""MongoDB async connection via Motor."""
from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """Open the Motor client and verify the connection."""
    global _client, _db
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
    )
    _db = _client[settings.mongodb_db]
    # Verify connectivity.
    await _client.admin.command("ping")


async def close_mongo_connection() -> None:
    """Close the Motor client."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None


def get_database() -> AsyncIOMotorDatabase:
    """Return the active database instance."""
    if _db is None:
        raise RuntimeError("MongoDB not connected. Call connect_to_mongo() first.")
    return _db


# Convenience collection accessors -------------------------------------------------

def users_collection():
    return get_database()["users"]


def tasks_collection():
    return get_database()["tasks"]


def calls_collection():
    return get_database()["calls"]


def transcripts_collection():
    return get_database()["transcripts"]