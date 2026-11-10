"""REST endpoints for tasks and calls."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models import CallOut, CallStartRequest, CallStatus, Language, TaskCreate, TaskOut, TaskStatus
from app.services import call_service, task_service

logger = logging.getLogger("vaani.api")

router = APIRouter(prefix="/api", tags=["tasks"])


@router.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(payload: TaskCreate) -> TaskOut:
    task = await task_service.create_task(payload)
    return task


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(user_id: str | None = None) -> list[TaskOut]:
    return await task_service.list_tasks(user_id=user_id)


@router.get("/tasks/{task_id}", response_model=TaskOut)
async def get_task(task_id: str) -> TaskOut:
    task = await task_service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/calls/start", response_model=CallOut, status_code=201)
async def start_call(payload: CallStartRequest) -> CallOut:
    """Create a call record and (optionally) trigger Exotel in a background task."""
    from app.services.exotel_service import trigger_exotel_call

    task = await task_service.get_task(payload.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    language = payload.language or task.language
    target = payload.target_number or task.target_number

    call = await call_service.create_call(task.id, language=language)
    await task_service.update_task_status(task.id, TaskStatus.CALLING)

    # Trigger Exotel asynchronously (fire and forget).
    try:
        await trigger_exotel_call(call.id, task, target_number=target, language=language)
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Exotel trigger failed for call %s", call.id)
        await call_service.set_call_failed(call.id, str(exc))

    return call


@router.get("/calls/{call_id}", response_model=CallOut)
async def get_call(call_id: str) -> CallOut:
    call = await call_service.get_call(call_id)
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.get("/calls", response_model=list[CallOut])
async def list_calls(task_id: str | None = None) -> list[CallOut]:
    return await call_service.list_calls(task_id=task_id)


@router.post("/calls/{call_id}/complete")
async def complete_call(call_id: str, summary: str = "") -> JSONResponse:
    await call_service.set_call_summary(call_id, summary)
    return JSONResponse({"status": "ok", "call_id": call_id})