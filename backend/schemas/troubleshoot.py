from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Mode = Literal["beginner", "developer"]
Status = Literal["in_progress", "resolved", "not_fixed"]
Outcome = Literal["pending", "fixed", "not_fixed"]


class Step(BaseModel):
    step: int = 0
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    command: Optional[str] = Field(default=None, max_length=500)
    expected_result: str = Field(default="", max_length=1000)
    risky: bool = False  # set by the backend, never trusted from the model

    @field_validator("command", mode="before")
    @classmethod
    def _blank_command(cls, v):
        if v is None:
            return None
        v = str(v).strip()
        return v or None


class Diagnosis(BaseModel):
    detected_issue: str = Field(min_length=1, max_length=400)
    root_cause: str = Field(min_length=1, max_length=2000)
    why_this_happened: str = Field(min_length=1, max_length=2000)
    beginner_explanation: str = Field(min_length=1, max_length=3000)
    technical_explanation: str = Field(min_length=1, max_length=3000)
    confidence: int = Field(ge=0, le=100)
    category: str = Field(default="Other", max_length=60)
    steps: list[Step] = Field(min_length=1, max_length=10)
    expected_result: str = Field(default="", max_length=1000)
    verification: str = Field(min_length=1, max_length=1500)
    alternative_strategy: str = Field(min_length=1, max_length=1500)
    strategy_label: str = Field(default="Initial diagnosis", max_length=120)

    @field_validator("confidence", mode="before")
    @classmethod
    def _normalise_confidence(cls, v):
        try:
            f = float(v)
        except (TypeError, ValueError):
            return 50
        if 0 < f <= 1:  # model answered 0.85 instead of 85
            f *= 100
        return max(0, min(100, round(f)))


class Attempt(BaseModel):
    number: int
    created_at: str
    provider: Literal["claude", "mock"]
    diagnosis: Diagnosis
    outcome: Outcome = "pending"
    user_feedback: Optional[str] = None


class Session(BaseModel):
    id: str
    created_at: str
    updated_at: str
    problem: str
    error_message: str = ""
    context: str = ""
    mode: Mode = "beginner"
    status: Status = "in_progress"
    category: str = "Other"
    detected_issue: str = ""
    has_screenshot: bool = False
    screenshot_analyzed: bool = False
    screenshot_note: Optional[str] = None
    attempts: list[Attempt] = Field(default_factory=list)


class SessionSummary(BaseModel):
    id: str
    created_at: str
    problem: str
    mode: Mode
    status: Status
    category: str
    detected_issue: str
    attempts_count: int
    has_screenshot: bool


class CategoryCount(BaseModel):
    name: str
    count: int


class Stats(BaseModel):
    total: int
    resolved: int
    in_progress: int
    not_fixed: int
    success_rate: Optional[int]  # percent; None when there are no sessions
    categories: list[CategoryCount]
    recent: list[SessionSummary]


class RetryRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)


class VerifyRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    fixed: bool
    feedback: Optional[str] = Field(default=None, max_length=2000)
