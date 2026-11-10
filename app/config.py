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
    exotel_api_key: str = "3a9f53bea4c7a04c863d1863ac2725c75ae8e568ac26e681"
    exotel_token: str = "9a9238a891f31a360c25610cb06d5a70db318164fe0974bd"
    exotel_base_url: str = "https://api.exotel.com/v1"
    exotel_voice_ai_sid: str = "student1873"
    exotel_caller_id: str = "08047290621"
    exotel_app_id: str = "1380428"
    exotel_stream_url: str = ""
    exotel_media_ws_path: str = "/media"

    # --- Gnani Prisma (STT) + Timbre (TTS) ---
    # Default to Gnani's official Vachana AI endpoints; only VAANI_GNANI_API_KEY is required.
    gnani_prisma_ws_url: str = "wss://api.vachana.ai/stt/v3/stream"
    gnani_timbre_ws_url: str = "wss://api.vachana.ai/api/v1/tts"
    gnani_api_key: str = "vach_1ytE2CY5X2F6sbHMHvTww0sEc1q2o0iPvkX66VvZHhJbRcwP8ShfGHP8MG5LPTF5GfJPz526ll6Ih5DotVJ29BAtdB97MTvM_54d47d884359842b9d2df6b7e24ccc44"

    # --- Free-Tier Token & Call Duration Optimization ---
    vad_enabled: bool = True
    vad_energy_threshold: int = 350
    max_call_turns: int = 4
    enable_tts_cache: bool = True
    concise_mode: bool = True

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