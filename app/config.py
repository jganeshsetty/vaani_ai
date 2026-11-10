"""Application configuration loaded from environment / .env file."""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration for the VaaniCall AI backend."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="VAANI_", extra="ignore")

    # --- MongoDB ---
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "vaani_ai"

    # --- Exotel Connect Voice AI ---
    exotel_api_key: str = ""
    exotel_token: str = ""
    exotel_base_url: str = "https://api.exotel.com/v1"
    exotel_voice_ai_sid: str = ""
    exotel_media_ws_path: str = "/media"

    # --- Gnani Prisma (STT) + Timbre (TTS) ---
    gnani_prisma_ws_url: str = ""
    gnani_timbre_ws_url: str = ""
    gnani_api_key: str = ""

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- CORS ---
    cors_origins: str = "*"

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def media_ws_path(self) -> str:
        path = self.exotel_media_ws_path or "/media"
        return path if path.startswith("/") else f"/{path}"


settings = Settings()