# FixFlow AI

**Understand the problem. Follow the fix. Get back to work.**

FixFlow AI is an AI-powered troubleshooting assistant that turns confusing technical errors into plain-language explanations and guided, verifiable fixes.

## Problem

Troubleshooting information is scattered across documentation, forum threads, videos and raw error messages, and most of it is written for people who already know the vocabulary. Beginners and non-technical users are left stuck on three questions:

1. What actually went wrong?
2. Why did it happen?
3. What exactly should I do next, and did it work?

## Solution

You describe a problem, paste the error message and optionally attach a screenshot. FixFlow AI asks Claude (through a FastAPI backend) for a structured diagnosis, walks you through the fix one step at a time, asks whether it worked, and, if it didn't, asks for a **different** strategy using everything it already knows about your case.

## Features

- **New troubleshooting**: problem description, error message, optional screenshot (drag and drop, file picker or paste), extra context, Beginner/Developer mode.
- **Structured diagnosis**: detected issue, root cause, why it happened, beginner explanation, technical explanation, confidence, recommended solution.
- **Guided fix**: step-by-step with copyable commands and "what you should see". Progress is remembered per attempt in the browser.
- **Verification and adaptive retry**: *Yes, it's fixed* or *Still not fixed*. The second sends the original problem, previous diagnoses, attempted steps and your feedback back to the AI for a different approach (up to 5 attempts).
- **History**: every session with date, status, detected issue and attempts; open, search, filter and delete.
- **Dashboard**: total sessions, problems solved, success rate, recent sessions and common categories, computed from stored sessions. With no data it shows an empty state, not invented numbers.
- **Settings**: light/dark/system theme, default Beginner/Developer mode, clear history, app info.
- **Friendly error handling** for backend offline, timeouts, invalid input, invalid screenshots, empty or malformed AI output and AI provider failures.

## Innovation

- **Adaptive troubleshooting loop.** "Still not fixed" is a first-class input, not a dead end. The backend sends the full attempt history plus your feedback and instructs the model to target a different likely cause and avoid repeating earlier steps.
- **Mode-aware explanations.** The Beginner/Developer mode is sent with every AI request and changes the explanation style.
- **Safety by design.** Commands are only ever displayed. The backend flags potentially destructive commands (for example `rm -rf`, `sudo`, `git reset --hard`, piping downloads into a shell) and the UI shows a warning on them.

## How It Works

```
Problem + error + optional screenshot
        |
React frontend  --POST /api/troubleshoot-->  FastAPI backend --> Claude (server-side key)
        |                                          |
 Diagnosis -> Guided fix -> Verification          validate JSON, flag risky commands, save to SQLite
        |
  Fixed -> resolved + History
  Still not fixed -> POST /api/troubleshoot/verify + /retry -> new strategy -> repeat
```

## Architecture

| Layer | Responsibility |
|---|---|
| `frontend/` | React SPA. Talks only to `/api/*`. Holds no secrets. In dev, Vite proxies `/api` to the backend. |
| `backend/api` | FastAPI routes, request validation, safe error responses. |
| `backend/services` | `ClaudeService` (Anthropic SDK, vision input, JSON validation with one automatic repair attempt), `MockService` (demo AI), screenshot validation, command safety flags. |
| `backend/storage` | `SessionRepository` interface and a `SQLiteRepository` implementation, so PostgreSQL/Supabase can be added later without touching routes. |
| `backend/schemas`, `backend/models` | Pydantic API schemas and the domain object passed to the AI layer. |

### API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status, AI mode (`live` or `mock`), limits |
| POST | `/api/troubleshoot` | Create a session and first diagnosis (multipart form, optional `screenshot`) |
| POST | `/api/troubleshoot/verify` | Record `fixed: true/false` (+ optional feedback) |
| POST | `/api/troubleshoot/retry` | Generate a different strategy for an unresolved session |
| GET | `/api/history`, `/api/history/{id}` | List sessions / get one with all attempts |
| DELETE | `/api/history`, `/api/history/{id}` | Clear all / delete one |
| GET | `/api/stats` | Dashboard numbers |

Interactive docs are available at `http://127.0.0.1:8000/api/docs` while the backend runs.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS 3, Framer Motion, React Router, lucide-react icons
- **Backend:** Python 3.10+, FastAPI, Uvicorn, Pydantic v2, Anthropic Python SDK
- **Storage:** SQLite (Python standard library)
- **Tests:** pytest (backend), Vitest + Testing Library (UI flow)

## Project Structure

```
FixFlow-AI/
├── README.md
├── .env.example
├── .gitignore
├── backend/
│   ├── main.py                  # app, CORS, safe error handlers
│   ├── config.py                # environment settings
│   ├── errors.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── api/routes.py
│   ├── services/                # ai_service.py, mock_ai.py, image_utils.py, safety.py
│   ├── schemas/troubleshoot.py
│   ├── models/context.py
│   ├── storage/repository.py
│   └── tests/
└── frontend/
    ├── package.json, package-lock.json, vite.config.ts, tailwind.config.js, ...
    └── src/
        ├── pages/               # Landing, Dashboard, NewSession, Diagnosis, GuidedFix, Verification, History, Settings
        ├── components/          # Layout, UI kit, Analyzing, session helpers
        ├── context/AppContext.tsx
        ├── lib/                 # api client, types, utils
        └── test/demoFlow.test.tsx
```

## Setup

Requirements: **Python 3.10 or newer**, **Node.js 18 or newer**.

### Environment Variables

Copy `.env.example` to `.env` in the project root (the backend also reads `backend/.env`):

```bat
copy .env.example .env
```

Then edit `.env` and set your key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | (empty) | Claude API key. **Backend only.** |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Model used for diagnosis. Use a vision-capable model for screenshots. Change it here if your account uses a different model name. |
| `AI_MODE` | `auto` | `auto`: Claude if a key is set, otherwise the demo (mock) AI. `live`: always Claude. `mock`: always demo AI. |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |
| `MAX_IMAGE_MB` | `5` | Screenshot size limit |
| `AI_TIMEOUT_SECONDS` | `60` | AI request timeout |
| `MAX_ATTEMPTS` | `5` | Maximum adaptive retries per session |
| `MOCK_DELAY_SECONDS` | `1.8` | Artificial delay in mock mode so the analyzing animation is visible |
| `DATABASE_PATH` | `backend/data/fixflow.db` | SQLite file |

With no API key the app still runs end to end in **demo (mock) mode**. The header shows a "Demo AI (mock)" badge so this is never hidden.

### Running Backend (Windows)

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Running Frontend (Windows)

Open a second terminal:

```bat
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

macOS/Linux: use `python3 -m venv .venv`, `source .venv/bin/activate` and `cp .env.example .env`; everything else is identical.

### Testing

```bat
:: Backend unit/API tests (mock AI and a fake Anthropic client, no network needed)
cd backend
pip install -r requirements-dev.txt
python -m pytest -q

:: Frontend type check + production build
cd ..\frontend
npm run build
```

UI flow test (renders the real app and drives the demo against a running backend in mock mode). In one terminal:

```bat
cd backend
set AI_MODE=mock
set MOCK_DELAY_SECONDS=0.2
uvicorn main:app --host 127.0.0.1 --port 8000
```

In another:

```bat
cd frontend
npm run test:flow
```

This test **clears the history** of the backend it runs against.

## Demo Flow

1. Open the app and click **Start Troubleshooting**, then **Try the demo problem** (fills in `ModuleNotFoundError: No module named 'requests'`).
2. Optionally attach a screenshot, then click **Analyze Problem** and watch the analyzing state.
3. Read the **Diagnosis**: detected issue, root cause, why, plain-language and technical explanation, confidence.
4. Click **Start guided fix** and step through `pip install requests`.
5. At **Verification**, click **Still not fixed**, add a note and click **Find a different approach**.
6. A new strategy appears (check the Python interpreter / virtual environment). Run through it, then click **Yes, it's fixed**.
7. See the success screen, then open **History** to see the resolved session with 2 attempts.

## Target Users

College students, beginners, non-technical computer users, and small teams without dedicated IT support.

## Social Impact

Being able to fix your own computer shouldn't depend on already speaking the language of error messages. FixFlow AI lowers the barrier to technical problem solving by turning confusing errors into understandable explanations and guided actions. It matters most to learners and to people with no technical support to ask.

## Future Enhancements

- User accounts and per-user history (history is currently shared by everyone using one backend)
- PostgreSQL/Supabase repository behind the existing `SessionRepository` interface
- Re-sending the screenshot on retries (currently only the first diagnosis sees the image)
- Streaming responses, and more languages
- Optional "ask a follow-up question" chat on a diagnosis
- Deployment configuration (Docker, serving the built frontend from the backend)

## Security Notes

- The Anthropic API key is read only by the backend from environment variables. It is never sent to or bundled into the frontend, and `.env` is git-ignored. Only `.env.example` (placeholders) is committed.
- AI-generated commands are **never executed** by FixFlow. They are displayed for review, and destructive-looking commands are flagged.
- Screenshots are validated by size and by real file signature (PNG, JPEG, WEBP), must match their extension, are held in memory only, and are **not stored**.
- User text is passed to the model as delimited data with instructions not to follow instructions inside it. This reduces, but cannot eliminate, prompt-injection risk.
- Errors returned to the browser are friendly generic messages. Stack traces and internal details stay in server logs.
- CORS is limited to the configured origins. There is no authentication in this version, so don't expose the backend to the public internet as-is.

## Testing Status and Known Limitations

What has been verified:

- **Backend (25 pytest tests, passing):** health, full create → verify → retry → resolve flow, retry limit, input validation, screenshot validation (type, signature mismatch, size, empty), history/delete/stats, AI-failure handling (no internals leaked), JSON parsing/repair, risky-command flagging. The Claude service is tested with a **fake Anthropic client** (prompt contents, image block, malformed-output repair, error mapping).
- **UI flow (4 Vitest tests, passing):** the real React app driven in jsdom against the real FastAPI backend in **mock** mode: demo analyze → diagnosis → guided fix → still not fixed → adaptive retry → fixed → history, plus empty-submission, invalid-screenshot and backend-unreachable states.
- `tsc` type check and production `vite build` succeed.

What has **not** been verified:

- **Live Claude calls were not tested** (no API key was available in the build environment). Prompting, the default model name and real screenshot (vision) analysis are untested against the live API.
- The UI was **not checked in a real browser or on a phone**. Layout was built responsively but only exercised through jsdom.
- **Demo (mock) AI** only recognises a few errors (Python `ModuleNotFoundError`, port already in use) plus a generic fallback. It cannot read screenshots and doesn't change wording by Beginner/Developer mode.

Other limitations: the history has no per-user separation; retries don't resend the screenshot; fonts load from Google Fonts (system fonts are used as a fallback if offline).
