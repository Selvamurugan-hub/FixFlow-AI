"""Deterministic mock AI so the full workflow runs without an API key.
It returns canned templates keyed off simple pattern matching. It does NOT read
screenshots and does not tailor wording to Beginner/Developer mode (live Claude does)."""
from __future__ import annotations

import asyncio
import re

from models.context import TroubleshootContext
from schemas.troubleshoot import Diagnosis, Step
from services.ai_service import AIService
from services.safety import finalize

_PIP_NAMES = {
    "cv2": "opencv-python", "PIL": "Pillow", "sklearn": "scikit-learn", "yaml": "PyYAML",
    "bs4": "beautifulsoup4", "dotenv": "python-dotenv", "dateutil": "python-dateutil",
}


def _s(title, description, command=None, expected=""):
    return Step(title=title, description=description, command=command, expected_result=expected)


def _module_attempts(module: str) -> list[Diagnosis]:
    top = module.split(".")[0]
    pkg = _PIP_NAMES.get(top, top)
    first = Diagnosis(
        detected_issue=f"Missing Python package: {top}",
        root_cause=f"The '{pkg}' package is not installed in the Python environment that is running your program.",
        why_this_happened=f"Your code says `import {top}`, but Python looked through its installed packages and could not find it. Packages are installed per environment, so a fresh machine or new virtual environment starts without them.",
        beginner_explanation=f"Your program wants to borrow a ready-made toolkit called '{pkg}', but that toolkit has not been downloaded onto this computer yet. Installing it with pip (Python's package installer) fixes this.",
        technical_explanation=f"The import system searched sys.path and found no distribution providing the top-level module '{top}', raising ModuleNotFoundError. The package is absent from the active interpreter's site-packages.",
        steps=[
            _s("Check which Python you are using", "Confirm Python is available and note the version. You will compare it later if the install does not help.", "python --version", "A version such as Python 3.12.x"),
            _s(f"Install {pkg}", "pip downloads the package from PyPI and places it in your environment.", f"pip install {pkg}", f"Successfully installed {pkg}"),
            _s("Confirm Python can import it", "This quick test proves the module is now visible to Python.", f"python -c \"import {top}; print('import ok')\"", "It prints: import ok"),
            _s("Run your project again", "Start your program the same way you did before.", None, "The ModuleNotFoundError no longer appears."),
        ],
        expected_result=f"The package installs and your program imports {top} without errors.",
        verification="Run your program again. If the same ModuleNotFoundError appears, choose 'Still Not Fixed'.",
        alternative_strategy="Check that pip and python belong to the same environment (interpreter or virtual environment mismatch).",
        strategy_label="Install the missing package", category="Python", confidence=92,
    )
    second = Diagnosis(
        detected_issue="pip and python point to different environments",
        root_cause=f"'{pkg}' was probably installed into a different Python than the one running your program (system Python vs. virtual environment, or the wrong IDE interpreter).",
        why_this_happened="Computers often have several Pythons. The `pip` command can belong to one while `python` or your editor's Run button uses another, so the install 'worked' but in the wrong place.",
        beginner_explanation="Think of two toolboxes: you put the tool in one, but your program is reaching into the other. We will find which toolbox your program uses and put the tool there.",
        technical_explanation="`pip` resolves via PATH and may be bound to a different interpreter than the one executing the script. Using `python -m pip` guarantees the installer matches the interpreter. IDEs (VS Code, PyCharm) also pin their own interpreter.",
        category="Python", confidence=84,
        steps=[
            _s("Find the interpreter that runs your code", "Print the exact Python executable in use.", "python -c \"import sys; print(sys.executable)\"", "A file path to python, e.g. a .venv folder or system install"),
            _s("See where pip installs", "Compare this location with the previous step. If they differ, that is the mismatch.", "python -m pip --version", "A path that ends in the same environment as step 1"),
            _s("Install using that exact interpreter", "`python -m pip` always installs for the python you just checked.", f"python -m pip install {pkg}", f"Successfully installed {pkg} (or 'Requirement already satisfied')"),
            _s("Activate your virtual environment (if you use one)", "On Windows run the first command from your project folder; on macOS/Linux use `source .venv/bin/activate`.", ".venv\\Scripts\\activate", "Your prompt starts with (.venv)"),
            _s("Select the same interpreter in your editor", "In VS Code: Ctrl+Shift+P, type 'Python: Select Interpreter' and choose the one from step 1.", None, "The status bar shows the matching interpreter."),
        ],
        expected_result="Your editor, terminal and pip all use one environment, so the import succeeds.",
        verification="Run your program using the same interpreter you configured.",
        alternative_strategy=f"Look for a local file named {top}.py that shadows the real package, or reinstall it cleanly.",
        strategy_label="Fix interpreter mismatch",
    )
    third = Diagnosis(
        detected_issue="Shadowed or corrupted package install",
        root_cause=f"A file or folder in your project named '{top}' may be hiding the real package, or the installed copy is damaged.",
        why_this_happened="Python searches your project folder first. A file such as requests.py in your project is imported instead of the real library, and a half-finished install can leave broken files behind.",
        beginner_explanation="Python may be opening the wrong thing with the same name, like a note on your desk called 'Dictionary' that you grab instead of the real dictionary. We will check and clean this up.",
        technical_explanation=f"sys.path[0] is the script directory, so a local {top}.py or {top}/ package takes precedence over site-packages. A partially installed distribution may also leave metadata without importable modules.",
        category="Python", confidence=68,
        steps=[
            _s("See which file Python imports", "If this prints a path inside your project, a local file is shadowing the package.", f"python -c \"import {top}; print({top}.__file__)\"", "A path inside site-packages, not your project folder"),
            _s("Rename any conflicting local file", f"If you have {top}.py or a {top} folder in your project, rename it (for example to my_{top}.py) and delete the __pycache__ folder beside it.", None, "No file in your project shares the package name."),
            _s("Reinstall the package cleanly", "Forces a fresh download and replaces any damaged files.", f"python -m pip install --force-reinstall {pkg}", f"Successfully installed {pkg}"),
            _s("Run your program again", "Start the program from the same terminal.", None, "The import works."),
        ],
        expected_result="Python imports the real package from site-packages.",
        verification="Run your program. If it still fails, share the full error and Python version with your instructor or team.",
        alternative_strategy="Share the complete traceback and the output of `python -m pip list` with someone who can inspect your machine.",
        strategy_label="Check shadowing and reinstall",
    )
    return [first, second, third]


def _port_attempts(port: str) -> list[Diagnosis]:
    a = Diagnosis(
        detected_issue=f"Port {port} is already in use", category="Operating System", confidence=90,
        root_cause=f"Another program is already listening on port {port}, so your server cannot start there.",
        why_this_happened="Only one program can use a network port at a time. A previous run of your server is often still alive in the background.",
        beginner_explanation=f"Port {port} is like a single-lane door. Something is already standing in it, so your app cannot get through. We will find what is using it.",
        technical_explanation=f"bind() on :{port} fails with EADDRINUSE because another socket is in LISTEN state, commonly a stale dev server.",
        steps=[
            _s("Find what is using the port (Windows)", "Lists the process ID (PID) that owns the port.", f"netstat -ano | findstr :{port}", "A line ending in a PID number"),
            _s("Find what is using the port (macOS/Linux)", "Same idea on Unix-like systems.", f"lsof -i :{port}", "A process name and PID"),
            _s("Close that program normally", "Prefer closing the old terminal or app. Only end the process by PID if you recognise it.", None, "The port is free."),
            _s("Start your app again", "Run your usual start command.", None, "The server starts without EADDRINUSE."),
        ],
        expected_result="Your server starts on the original port.",
        verification="Start the server again and open it in your browser.",
        alternative_strategy="Run your app on a different, unused port.", strategy_label="Free the port",
    )
    b = Diagnosis(
        detected_issue="Use a different port", category="Operating System", confidence=80,
        root_cause="The conflicting program cannot be closed or identified, so the simplest fix is to use another port.",
        why_this_happened="Some background services keep ports reserved, or the owning process is not yours to stop.",
        beginner_explanation="If the door is blocked and you cannot move what is in it, simply use a different door.",
        technical_explanation="Binding to an alternate port avoids the conflict without terminating unknown processes.",
        steps=[
            _s("Pick an unused port", "Common choices are 3001, 5174 or 8001.", None, "A port number you have not used"),
            _s("Start your app on it", "Check your framework docs for the exact flag; for Vite it looks like this.", "npm run dev -- --port 5174", "The terminal prints the new address"),
            _s("Open the new address", "Use the URL printed in the terminal.", None, "Your app loads."),
        ],
        expected_result="The app runs on the new port.", verification="Open the printed URL in your browser.",
        alternative_strategy="Restart your computer to clear stuck processes, then retry.", strategy_label="Switch ports",
    )
    return [a, b]


def _generic_attempts(problem: str) -> list[Diagnosis]:
    short = (problem.strip().splitlines() or ["your problem"])[0][:90]
    a = Diagnosis(
        detected_issue=f"General troubleshooting: {short}", category="Other", confidence=45,
        root_cause="There is not enough detail to pinpoint one cause. Mock mode only recognises a few well-known errors.",
        why_this_happened="Many problems share symptoms. Collecting exact error text and recent changes narrows down the cause.",
        beginner_explanation="I cannot be certain yet. The steps below collect the clues that usually reveal what went wrong.",
        technical_explanation="Insufficient signal for a specific root cause. Gather the full error output, versions, and the last change before the failure.",
        steps=[
            _s("Copy the exact error message", "The precise wording is the most useful clue. Include the whole message, not a summary.", None, "You have the complete error text"),
            _s("Note what changed recently", "Updates, new installs or settings changes are the most common triggers.", None, "A short list of recent changes"),
            _s("Restart the affected app or device", "A clean restart clears many temporary faults.", None, "The problem either disappears or stays the same"),
            _s("Search the exact error text", "Put the error in quotes in a search engine and prefer official docs.", None, "A page describing the same error"),
        ],
        expected_result="You have clearer information about the cause, or the problem is resolved.",
        verification="Check whether the original problem still happens.",
        alternative_strategy="Reproduce the problem in a minimal setup to isolate the cause.", strategy_label="Gather clues",
    )
    b = Diagnosis(
        detected_issue="Isolate the problem with a minimal test", category="Other", confidence=50,
        root_cause="The cause may be a conflict with your current setup or settings.",
        why_this_happened="Extensions, saved settings and background apps often interfere with one another.",
        beginner_explanation="We will try the simplest possible version of what you were doing. If that works, something extra was causing the trouble.",
        technical_explanation="Bisecting the environment (clean profile, safe mode, minimal reproduction) isolates the interfering component.",
        steps=[
            _s("Try in a clean setup", "Use a private window, a new user profile or safe mode, depending on the app.", None, "Clear whether your normal setup is the cause"),
            _s("Turn off add-ons one at a time", "Disable extensions or plugins and retry after each one.", None, "The problem stops after one specific change"),
            _s("Ask for help with your findings", "Share the exact error and what you tested with your instructor or IT contact.", None, "Someone can help with specific facts"),
        ],
        expected_result="You identify which component causes the problem.",
        verification="Repeat the original action.",
        alternative_strategy="Share the full error and your test results with a person who can inspect your device.",
        strategy_label="Isolate with a clean setup",
    )
    return [a, b]


def pick_attempts(ctx: TroubleshootContext) -> list[Diagnosis]:
    text = f"{ctx.problem}\n{ctx.error_message}\n{ctx.context}"
    if m := re.search(r"No module named ['\"]([\w.\-]+)['\"]", text):
        return _module_attempts(m.group(1))
    if m := re.search(r"(?:EADDRINUSE|address already in use|port\s+(\d{2,5})\s+is already in use)[^\d]*(\d{2,5})?", text, re.I):
        return _port_attempts(m.group(2) or m.group(1) or "3000")
    return _generic_attempts(ctx.problem)


class MockService(AIService):
    provider = "mock"

    def __init__(self, delay: float = 1.8):
        self._delay = delay

    async def diagnose(self, ctx: TroubleshootContext) -> Diagnosis:
        if self._delay:
            await asyncio.sleep(self._delay)
        options = pick_attempts(ctx)
        index = min(len(ctx.previous_attempts), len(options) - 1)
        diagnosis = options[index].model_copy(deep=True)
        if len(ctx.previous_attempts) >= len(options):
            diagnosis.alternative_strategy = "Automatic suggestions are exhausted in demo mode. Share the full error with an instructor or IT contact."
        return finalize(diagnosis)
