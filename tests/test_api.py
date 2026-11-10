"""API tests using FastAPI TestClient with a mocked Mongo layer."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Language


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_create_task(client: TestClient) -> None:
    payload = {
        "user_id": "u1",
        "description": "Call the store",
        "language": "kannada",
        "target_number": "+919999999999",
        "questions_to_ask": ["Is my order ready?"],
    }
    with patch("app.api.routers.tasks.task_service.create_task", new=AsyncMock(return_value=_stub_task(payload))):
        resp = client.post("/api/tasks", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["description"] == "Call the store"
    assert body["language"] == "kannada"


def test_get_task_404(client: TestClient) -> None:
    with patch("app.api.routers.tasks.task_service.get_task", new=AsyncMock(return_value=None)):
        resp = client.get("/api/tasks/nope")
    assert resp.status_code == 404


def test_list_tasks(client: TestClient) -> None:
    with patch("app.api.routers.tasks.task_service.list_tasks", new=AsyncMock(return_value=[])):
        resp = client.get("/api/tasks")
    assert resp.status_code == 200
    assert resp.json() == []


def test_auth_login_and_me(client: TestClient) -> None:
    # 1. Login with demo credentials
    resp = client.post("/api/auth/login", json={"email": "demo@vaanicall.ai", "password": "demo123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "demo@vaanicall.ai"
    token = data["access_token"]

    # 2. Access /me with token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "demo@vaanicall.ai"

    # 3. Demo shortcut
    demo_resp = client.post("/api/auth/demo")
    assert demo_resp.status_code == 200
    assert "access_token" in demo_resp.json()


def _stub_task(payload: dict) -> dict:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    return {
        "id": "abc",
        "user_id": payload["user_id"],
        "description": payload["description"],
        "language": payload["language"],
        "target_number": payload.get("target_number"),
        "constraints": payload.get("constraints", []),
        "questions_to_ask": payload.get("questions_to_ask", []),
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }