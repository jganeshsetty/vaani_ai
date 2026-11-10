"""VaaniCall AI backend entry point.

Run with: uvicorn app.main:app --reload
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import health_router, media_router, tasks_router
from app.config import settings
from app.database import close_mongo_connection, connect_to_mongo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vaani")


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    logger.info("VaaniCall AI starting on %s:%s", settings.host, settings.port)
    try:
        await connect_to_mongo()
    except Exception as exc:
        logger.warning("Could not connect to MongoDB on startup: %s", exc)
    yield
    logger.info("VaaniCall AI shutting down")
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers.
app.include_router(health_router)
app.include_router(tasks_router)
app.include_router(media_router)