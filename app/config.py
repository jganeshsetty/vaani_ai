"""Application configuration loaded from environment / .env file."""
from __future__ import annotations

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    """All configuration for the VaaniCall AI backend."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="VAANI_", extra="ignore")

    # --- MongoDB ---
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "vaani_ai"

    # --- Hugging Face Inference (Evon v3.3) ---
    huggingface_api_key: str = ""
    huggingface_model: str = "gnani/gnani-evon-v3.3-30B-A3B"

    # --- Gnani Speech APIs (STT / TTS) ---
    gnani_api_key: str = ""
    gnani_prisma_ws_url: str = "wss://api.vachana.ai/stt/v3/stream"
    gnani_timbre_ws_url: str = "wss://api.vachana.ai/api/v1/tts"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- CORS ---
    cors_origins: str = "*"

    # --- Free-Tier Token & Call Duration Optimization ---
    vad_enabled: bool = True
    vad_energy_threshold: int = 350
    max_call_turns: int = 4
    enable_tts_cache: bool = True
    concise_mode: bool = True

    @model_validator(mode="after")
    def populate_fallbacks(self) -> Settings:
        """Allow variables with or without VAANI_ prefix."""
        if not self.huggingface_api_key:
            self.huggingface_api_key = os.environ.get("HUGGINGFACE_API_KEY") or os.environ.get("VAANI_HUGGINGFACE_API_KEY") or ""
        if not self.gnani_api_key:
            self.gnani_api_key = os.environ.get("GNANI_API_KEY") or os.environ.get("VAANI_GNANI_API_KEY") or ""
        if self.mongodb_uri == "mongodb://localhost:27017":
            env_uri = os.environ.get("MONGODB_URI") or os.environ.get("VAANI_MONGODB_URI")
            if env_uri:
                self.mongodb_uri = env_uri
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()