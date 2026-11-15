"""VaaniCall AI backend entry point.

Run with: uvicorn app.main:app --reload
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import auth_router, health_router, tasks_router, call_sessions_router, voice_cloning_router
from app.api.routers.call_sessions import call_websocket
from app.config import settings
from app.database import close_mongo_connection, connect_to_mongo

logger = logging.getLogger("vaani")


def _start_scheduler(app):
    """Start background scheduler that promotes scheduled sessions to pending."""
    import asyncio

    async def promote_scheduled():
        from app.database import call_sessions_collection
        from datetime import datetime, timezone

        col = call_sessions_collection()
        now = datetime.now(timezone.utc)
        # Find all scheduled sessions due now
        async for doc in col.find(
            {"status": "scheduled", "scheduled_time": {"$lte": now}}
        ):
            await col.update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": "pending", "updated_at": now}},
            )

    scheduler = BackgroundScheduler()
    scheduler.add_job(promote_scheduled, IntervalTrigger(seconds=60))
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("APScheduler started - checking for scheduled sessions every 60s")


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    logger.info("VaaniCall AI starting on %s:%s", settings.host, settings.port)
    try:
        await connect_to_mongo()
    except Exception as exc:
        logger.warning("Could not connect to MongoDB on startup: %s", exc)

    # Start background scheduler for promoting scheduled sessions
    _start_scheduler(app_instance)

    yield

    logger.info("VaaniCall AI shutting down")
    # Shutdown scheduler
    if hasattr(app_instance.state, "scheduler"):
        app_instance.state.scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
    try:
        await close_mongo_connection()
    except Exception:
        pass


app = FastAPI(
    title="VaaniCall AI",
    version="1.0.0",
    description="Multilingual autonomous voice calling assistant backend",
    lifespan=lifespan,
)

# CORS so a separate frontend can connect.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https?://.*" if settings.cors_origins.strip() == "*" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers.
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(call_sessions_router)
app.include_router(voice_cloning_router)

# Direct WebSocket bindings for multi-path compatibility
app.websocket("/ws/{room_id}")(call_websocket)
app.websocket("/ws/call/{room_id}")(call_websocket)