"""FastAPI Authentication Router for VaaniCall AI."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, EmailStr

logger = logging.getLogger("vaani.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = "vaanicall-ai-secret-jwt-key-2025"


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4)) if len(data) % 4 != 0 else ""
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def create_jwt(payload: dict[str, Any], expires_in_seconds: int = 86400 * 7) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = dict(payload)
    now = int(time.time())
    payload_copy["exp"] = now + expires_in_seconds
    payload_copy["iat"] = now

    h_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64url_encode(json.dumps(payload_copy, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(JWT_SECRET.encode("utf-8"), f"{h_b64}.{p_b64}".encode("utf-8"), hashlib.sha256).digest()
    s_b64 = _b64url_encode(sig)
    return f"{h_b64}.{p_b64}.{s_b64}"


def verify_jwt(token: str) -> dict[str, Any] | None:
    parts = token.split(".")
    if len(parts) != 3:
        return None
    h_b64, p_b64, s_b64 = parts
    try:
        sig = hmac.new(JWT_SECRET.encode("utf-8"), f"{h_b64}.{p_b64}".encode("utf-8"), hashlib.sha256).digest()
        actual_sig = _b64url_decode(s_b64)
        if not hmac.compare_digest(sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(p_b64).decode("utf-8"))
        if "exp" in payload and time.time() > payload["exp"]:
            return None
        return payload
    except Exception:
        return None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest) -> AuthResponse:
    email = req.email.strip().lower()
    pwd = req.password.strip()

    if not email or not pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    # Demo credentials or any regular user credentials
    is_demo = email == "demo@vaanicall.ai"
    user_id = "user_demo" if is_demo else f"usr_{hashlib.md5(email.encode()).hexdigest()[:10]}"
    name = "Demo User" if is_demo else email.split("@")[0].title()

    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": "user",
    }
    token = create_jwt(payload)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={"id": user_id, "email": email, "name": name},
    )


@router.post("/signup", response_model=AuthResponse)
async def signup(req: LoginRequest) -> AuthResponse:
    return await login(req)


@router.post("/demo", response_model=AuthResponse)
async def demo_login() -> AuthResponse:
    return await login(LoginRequest(email="demo@vaanicall.ai", password="demo123"))


@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return payload
