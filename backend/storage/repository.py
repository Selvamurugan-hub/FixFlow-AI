"""Storage layer. `SessionRepository` is the seam: swap SQLiteRepository for a
PostgreSQL/Supabase implementation later without touching routes or services."""
from __future__ import annotations

import sqlite3
from abc import ABC, abstractmethod
from collections import Counter
from contextlib import closing
from pathlib import Path

from schemas.troubleshoot import (
    Attempt, CategoryCount, Session, SessionSummary, Stats,
)


class SessionRepository(ABC):
    @abstractmethod
    def save(self, session: Session) -> None: ...
    @abstractmethod
    def get(self, session_id: str) -> Session | None: ...
    @abstractmethod
    def list(self) -> list[Session]: ...
    @abstractmethod
    def delete(self, session_id: str) -> bool: ...
    @abstractmethod
    def delete_all(self) -> int: ...

    # Derived views shared by every backend ---------------------------------
    def summaries(self) -> list[SessionSummary]:
        return [to_summary(s) for s in self.list()]

    def stats(self) -> Stats:
        sessions = self.list()
        total = len(sessions)
        resolved = sum(1 for s in sessions if s.status == "resolved")
        cats = Counter(s.category for s in sessions)
        return Stats(
            total=total,
            resolved=resolved,
            in_progress=sum(1 for s in sessions if s.status == "in_progress"),
            not_fixed=sum(1 for s in sessions if s.status == "not_fixed"),
            success_rate=round(resolved * 100 / total) if total else None,
            categories=[CategoryCount(name=n, count=c) for n, c in cats.most_common(6)],
            recent=[to_summary(s) for s in sessions[:5]],
        )


def to_summary(s: Session) -> SessionSummary:
    return SessionSummary(
        id=s.id, created_at=s.created_at, problem=s.problem, mode=s.mode,
        status=s.status, category=s.category, detected_issue=s.detected_issue,
        attempts_count=len(s.attempts), has_screenshot=s.has_screenshot,
    )


_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    problem TEXT NOT NULL,
    error_message TEXT NOT NULL DEFAULT '',
    context TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    category TEXT NOT NULL,
    detected_issue TEXT NOT NULL,
    has_screenshot INTEGER NOT NULL DEFAULT 0,
    screenshot_analyzed INTEGER NOT NULL DEFAULT 0,
    screenshot_note TEXT,
    attempts_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
"""


class SQLiteRepository(SessionRepository):
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as conn:
            conn.executescript(_SCHEMA)
            conn.commit()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    def save(self, s: Session) -> None:
        attempts = "[" + ",".join(a.model_dump_json() for a in s.attempts) + "]"
        with closing(self._connect()) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO sessions
                (id, created_at, updated_at, problem, error_message, context, mode, status,
                 category, detected_issue, has_screenshot, screenshot_analyzed, screenshot_note, attempts_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (s.id, s.created_at, s.updated_at, s.problem, s.error_message, s.context,
                 s.mode, s.status, s.category, s.detected_issue, int(s.has_screenshot),
                 int(s.screenshot_analyzed), s.screenshot_note, attempts),
            )
            conn.commit()

    def get(self, session_id: str) -> Session | None:
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return _row_to_session(row) if row else None

    def list(self) -> list[Session]:
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT * FROM sessions ORDER BY created_at DESC").fetchall()
        return [_row_to_session(r) for r in rows]

    def delete(self, session_id: str) -> bool:
        with closing(self._connect()) as conn:
            cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()
            return cur.rowcount > 0

    def delete_all(self) -> int:
        with closing(self._connect()) as conn:
            cur = conn.execute("DELETE FROM sessions")
            conn.commit()
            return cur.rowcount


def _row_to_session(row: sqlite3.Row) -> Session:
    import json

    return Session(
        id=row["id"], created_at=row["created_at"], updated_at=row["updated_at"],
        problem=row["problem"], error_message=row["error_message"], context=row["context"],
        mode=row["mode"], status=row["status"], category=row["category"],
        detected_issue=row["detected_issue"], has_screenshot=bool(row["has_screenshot"]),
        screenshot_analyzed=bool(row["screenshot_analyzed"]), screenshot_note=row["screenshot_note"],
        attempts=[Attempt(**a) for a in json.loads(row["attempts_json"])],
    )
