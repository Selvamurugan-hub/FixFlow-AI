"""Flags potentially destructive commands. Commands are NEVER executed by FixFlow."""
from __future__ import annotations

import re

from schemas.troubleshoot import Diagnosis

_RISKY = [
    r"\brm\s+-[a-z]*[rf]", r"\bsudo\b", r"\bmkfs", r"\bdd\s+if=", r"\|\s*(sudo\s+)?(ba|z)?sh\b",
    r"chmod\s+-R\s+777", r"\bdel\s+/[sqf]", r"\brmdir\s+/s", r"\bformat\s+[a-z]:", r">\s*/dev/sd",
    r"\breg\s+delete", r"git\s+reset\s+--hard", r"git\s+clean\s+-[a-z]*f", r"remove-item.*-recurse",
    r"drop\s+(table|database)", r"\bkill(all)?\s+-9", r"\btaskkill\b", r"set-executionpolicy",
]
_RISKY_RE = re.compile("|".join(_RISKY), re.IGNORECASE)


def is_risky(command: str | None) -> bool:
    return bool(command and _RISKY_RE.search(command))


def finalize(diagnosis: Diagnosis) -> Diagnosis:
    """Renumber steps and set the `risky` flag server-side."""
    for i, step in enumerate(diagnosis.steps, start=1):
        step.step = i
        step.risky = is_risky(step.command)
    return diagnosis
