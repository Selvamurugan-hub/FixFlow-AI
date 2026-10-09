"""Runtime configuration, read from environment variables (.env supported)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

_PLACEHOLDERS = {"", "your_api_key_here", "changeme"}


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str
    anthropic_model: str
    ai_mode: str  # auto | live | mock
    cors_origins: list[str]
    database_path: Path
    max_image_bytes: int
    ai_timeout_seconds: float
    mock_delay_seconds: float
    max_attempts: int

    @property
    def resolved_ai_mode(self) -> str:
        if self.ai_mode in ("live", "mock"):
            return self.ai_mode
        return "live" if self.anthropic_api_key else "mock"


def get_settings() -> Settings:
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if key.lower() in _PLACEHOLDERS:
        key = ""
    origins = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    db = os.getenv("DATABASE_PATH", "").strip()
    return Settings(
        anthropic_api_key=key,
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5").strip(),
        ai_mode=os.getenv("AI_MODE", "auto").strip().lower(),
        cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
        database_path=Path(db) if db else BASE_DIR / "data" / "fixflow.db",
        max_image_bytes=int(os.getenv("MAX_IMAGE_MB", "5")) * 1024 * 1024,
        ai_timeout_seconds=float(os.getenv("AI_TIMEOUT_SECONDS", "60")),
        mock_delay_seconds=float(os.getenv("MOCK_DELAY_SECONDS", "1.8")),
        max_attempts=int(os.getenv("MAX_ATTEMPTS", "5")),
    )
