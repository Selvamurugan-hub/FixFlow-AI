"""Domain object handed to the AI layer (kept separate from API schemas)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from schemas.troubleshoot import Attempt


@dataclass
class ImageInput:
    data: bytes
    media_type: str


@dataclass
class TroubleshootContext:
    problem: str
    error_message: str = ""
    context: str = ""
    mode: str = "beginner"
    image: Optional[ImageInput] = None
    previous_attempts: list[Attempt] = field(default_factory=list)
