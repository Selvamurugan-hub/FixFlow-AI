from __future__ import annotations

import uuid
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter, Depends, File, Form, UploadFile

from config import Settings, get_settings
from errors import AppError
from models.context import ImageInput, TroubleshootContext
from schemas.troubleshoot import (
    Attempt, RetryRequest, Session, SessionSummary, Stats, VerifyRequest,
)
from services.ai_service import AIService, ClaudeService
from services.image_utils import validate_image
from services.mock_ai import MockService
from storage.repository import SessionRepository, SQLiteRepository

router = APIRouter(prefix="/api")

MAX_PROBLEM = 4000


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@lru_cache
def _repo_for(path: str) -> SessionRepository:
    return SQLiteRepository(path)


def get_repo(settings: Settings = Depends(get_settings)) -> SessionRepository:
    return _repo_for(str(settings.database_path))


def get_ai(settings: Settings = Depends(get_settings)) -> AIService:
    if settings.resolved_ai_mode == "mock":
        return MockService(settings.mock_delay_seconds)
    return ClaudeService(settings)


def _clean(value: str, limit: int = MAX_PROBLEM) -> str:
    return (value or "").strip()[:limit]


@router.get("/health")
def health(settings: Settings = Depends(get_settings)):
    mode = settings.resolved_ai_mode
    return {
        "status": "ok",
        "ai_mode": mode,
        "model": settings.anthropic_model if mode == "live" else None,
        "max_image_mb": settings.max_image_bytes // (1024 * 1024),
        "max_attempts": settings.max_attempts,
        "version": "1.0.0",
    }


@router.post("/troubleshoot", response_model=Session)
async def troubleshoot(
    problem: str = Form(""),
    error_message: str = Form(""),
    context: str = Form(""),
    mode: str = Form("beginner"),
    screenshot: UploadFile | None = File(None),
    settings: Settings = Depends(get_settings),
    repo: SessionRepository = Depends(get_repo),
    ai: AIService = Depends(get_ai),
):
    problem, error_message, context = _clean(problem), _clean(error_message), _clean(context)
    if mode not in ("beginner", "developer"):
        raise AppError(422, "Mode must be 'beginner' or 'developer'.")

    image: ImageInput | None = None
    if screenshot is not None and (screenshot.filename or "") != "":
        data = await screenshot.read(settings.max_image_bytes + 1)
        image = ImageInput(data=data, media_type=validate_image(data, screenshot.filename, settings.max_image_bytes))

    if len(problem) < 5 and len(error_message) < 5 and image is None:
        raise AppError(422, "Please describe the problem, paste the error message, or attach a screenshot.")
    if not problem:
        problem = error_message.splitlines()[0][:200] if error_message else "Problem shown in screenshot"

    ctx = TroubleshootContext(problem=problem, error_message=error_message, context=context, mode=mode, image=image)
    diagnosis = await ai.diagnose(ctx)

    note = None
    analyzed = False
    if image is not None:
        if ai.supports_vision:
            analyzed = True
        else:
            note = ("Screenshot received and validated, but the demo AI cannot read images. "
                    "Configure ANTHROPIC_API_KEY to enable screenshot analysis.")

    ts = now()
    session = Session(
        id=uuid.uuid4().hex[:12], created_at=ts, updated_at=ts, problem=problem,
        error_message=error_message, context=context, mode=mode, status="in_progress",
        category=diagnosis.category, detected_issue=diagnosis.detected_issue,
        has_screenshot=image is not None, screenshot_analyzed=analyzed, screenshot_note=note,
        attempts=[Attempt(number=1, created_at=ts, provider=ai.provider, diagnosis=diagnosis)],  # type: ignore[arg-type]
    )
    repo.save(session)
    return session


def _load(repo: SessionRepository, session_id: str) -> Session:
    session = repo.get(session_id)
    if session is None:
        raise AppError(404, "That troubleshooting session was not found.")
    return session


@router.post("/troubleshoot/verify", response_model=Session)
def verify(body: VerifyRequest, repo: SessionRepository = Depends(get_repo)):
    session = _load(repo, body.session_id)
    last = session.attempts[-1]
    last.outcome = "fixed" if body.fixed else "not_fixed"
    if body.feedback and not body.fixed:
        last.user_feedback = body.feedback.strip() or None
    session.status = "resolved" if body.fixed else "not_fixed"
    session.updated_at = now()
    repo.save(session)
    return session


@router.post("/troubleshoot/retry", response_model=Session)
async def retry(
    body: RetryRequest,
    settings: Settings = Depends(get_settings),
    repo: SessionRepository = Depends(get_repo),
    ai: AIService = Depends(get_ai),
):
    session = _load(repo, body.session_id)
    if session.status == "resolved":
        raise AppError(409, "This session is already marked as fixed.")
    if len(session.attempts) >= settings.max_attempts:
        raise AppError(400, f"We have tried {settings.max_attempts} different approaches. "
                            "Please share the full error with an instructor or IT contact.")
    if session.attempts[-1].outcome == "pending":
        session.attempts[-1].outcome = "not_fixed"

    ctx = TroubleshootContext(
        problem=session.problem, error_message=session.error_message, context=session.context,
        mode=session.mode, previous_attempts=list(session.attempts),
    )
    diagnosis = await ai.diagnose(ctx)
    ts = now()
    session.attempts.append(Attempt(number=len(session.attempts) + 1, created_at=ts,
                                    provider=ai.provider, diagnosis=diagnosis))  # type: ignore[arg-type]
    session.status = "in_progress"
    session.detected_issue = diagnosis.detected_issue
    session.updated_at = ts
    repo.save(session)
    return session


@router.get("/history", response_model=list[SessionSummary])
def history(repo: SessionRepository = Depends(get_repo)):
    return repo.summaries()


@router.get("/history/{session_id}", response_model=Session)
def history_item(session_id: str, repo: SessionRepository = Depends(get_repo)):
    return _load(repo, session_id)


@router.delete("/history")
def clear_history(repo: SessionRepository = Depends(get_repo)):
    return {"deleted": repo.delete_all()}


@router.delete("/history/{session_id}")
def delete_item(session_id: str, repo: SessionRepository = Depends(get_repo)):
    if not repo.delete(session_id):
        raise AppError(404, "That troubleshooting session was not found.")
    return {"deleted": 1}


@router.get("/stats", response_model=Stats)
def stats(repo: SessionRepository = Depends(get_repo)):
    return repo.stats()
