"""Screenshot validation: size + real file signature (not just the extension)."""
from __future__ import annotations

from errors import AppError

ALLOWED = {"image/png", "image/jpeg", "image/webp"}
_EXT = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


def sniff_media_type(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_image(data: bytes, filename: str | None, max_bytes: int) -> str:
    if not data:
        raise AppError(400, "The screenshot file is empty.")
    if len(data) > max_bytes:
        raise AppError(413, f"The screenshot is too large. Please use an image under {max_bytes // (1024 * 1024)} MB.")
    detected = sniff_media_type(data)
    if detected is None or detected not in ALLOWED:
        raise AppError(415, "Unsupported or corrupted image. Please upload a PNG, JPG, JPEG or WEBP screenshot.")
    name = (filename or "").lower()
    ext = next((e for e in _EXT if name.endswith(e)), None)
    if ext and _EXT[ext] != detected:
        raise AppError(415, "The file extension does not match the image contents. Please re-export the screenshot.")
    return detected
