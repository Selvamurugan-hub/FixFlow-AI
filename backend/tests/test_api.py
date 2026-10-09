import json

import pytest

from errors import AppError
from main import app
from api.routes import get_ai
from services.ai_service import AIService, parse_diagnosis
from services.safety import is_risky

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64
DEMO = {"problem": "My Python project shows an error", "error_message": "ModuleNotFoundError: No module named 'requests'", "mode": "beginner"}


def create(client, **over):
    return client.post("/api/troubleshoot", data={**DEMO, **over})


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok" and r.json()["ai_mode"] == "mock"


def test_demo_flow_end_to_end(client):
    r = create(client)
    assert r.status_code == 200
    s = r.json()
    d = s["attempts"][0]["diagnosis"]
    assert "requests" in d["detected_issue"] and d["steps"][1]["command"] == "pip install requests"
    assert [st["step"] for st in d["steps"]] == [1, 2, 3, 4]

    r = client.post("/api/troubleshoot/verify", json={"session_id": s["id"], "fixed": False, "feedback": "same error"})
    assert r.json()["status"] == "not_fixed"
    r = client.post("/api/troubleshoot/retry", json={"session_id": s["id"]})
    s2 = r.json()
    assert r.status_code == 200 and len(s2["attempts"]) == 2
    a1, a2 = s2["attempts"]
    assert a1["outcome"] == "not_fixed" and a1["user_feedback"] == "same error"
    assert a2["diagnosis"]["strategy_label"] != a1["diagnosis"]["strategy_label"]
    assert "interpreter" in a2["diagnosis"]["detected_issue"].lower() or "environment" in a2["diagnosis"]["detected_issue"].lower()
    assert [c["command"] for c in a1["diagnosis"]["steps"] if c["command"]] != [c["command"] for c in a2["diagnosis"]["steps"] if c["command"]]

    r = client.post("/api/troubleshoot/verify", json={"session_id": s["id"], "fixed": True})
    assert r.json()["status"] == "resolved"
    assert client.post("/api/troubleshoot/retry", json={"session_id": s["id"]}).status_code == 409

    hist = client.get("/api/history").json()
    assert len(hist) == 1 and hist[0]["status"] == "resolved" and hist[0]["attempts_count"] == 2
    assert client.get(f"/api/history/{s['id']}").json()["id"] == s["id"]
    st = client.get("/api/stats").json()
    assert st["total"] == 1 and st["resolved"] == 1 and st["success_rate"] == 100


def test_retry_limit(client):
    s = create(client).json()
    for _ in range(4):
        assert client.post("/api/troubleshoot/retry", json={"session_id": s["id"]}).status_code == 200
    r = client.post("/api/troubleshoot/retry", json={"session_id": s["id"]})
    assert r.status_code == 400 and "instructor" in r.json()["detail"]


def test_input_validation(client):
    assert client.post("/api/troubleshoot", data={"problem": "hi"}).status_code == 422
    assert create(client, mode="expert").status_code == 422
    assert client.post("/api/troubleshoot/verify", json={"session_id": "nope", "fixed": True}).status_code == 404
    assert client.post("/api/troubleshoot/verify", json={"fixed": True}).status_code == 422
    assert client.get("/api/history/missing").status_code == 404


def test_screenshot_validation(client):
    ok = client.post("/api/troubleshoot", data=DEMO, files={"screenshot": ("e.png", PNG, "image/png")})
    assert ok.status_code == 200
    body = ok.json()
    assert body["has_screenshot"] and not body["screenshot_analyzed"] and "demo AI" in body["screenshot_note"]
    bad_type = client.post("/api/troubleshoot", data=DEMO, files={"screenshot": ("e.png", b"GIF89a...." * 10, "image/png")})
    assert bad_type.status_code == 415
    mismatch = client.post("/api/troubleshoot", data=DEMO, files={"screenshot": ("e.jpg", PNG, "image/jpeg")})
    assert mismatch.status_code == 415
    big = client.post("/api/troubleshoot", data=DEMO, files={"screenshot": ("e.png", PNG + b"0" * (6 * 1024 * 1024), "image/png")})
    assert big.status_code == 413
    empty = client.post("/api/troubleshoot", data=DEMO, files={"screenshot": ("e.png", b"", "image/png")})
    assert empty.status_code == 400
    only_shot = client.post("/api/troubleshoot", data={"problem": ""}, files={"screenshot": ("e.png", PNG, "image/png")})
    assert only_shot.status_code == 200


def test_delete_history(client):
    a, b = create(client).json(), create(client).json()
    assert client.delete(f"/api/history/{a['id']}").json()["deleted"] == 1
    assert len(client.get("/api/history").json()) == 1
    assert client.delete("/api/history").json()["deleted"] == 1
    assert client.get("/api/history").json() == []
    st = client.get("/api/stats").json()
    assert st["total"] == 0 and st["success_rate"] is None


def test_ai_failure_is_friendly_and_does_not_save(client):
    class Boom(AIService):
        provider = "mock"
        async def diagnose(self, ctx):
            raise AppError(504, "The AI took too long to respond. Please try again.")

    class Crash(AIService):
        provider = "mock"
        async def diagnose(self, ctx):
            raise RuntimeError("secret /internal/path sk-ant-123")

    app.dependency_overrides[get_ai] = lambda: Boom()
    r = create(client)
    assert r.status_code == 504 and "too long" in r.json()["detail"]
    app.dependency_overrides[get_ai] = lambda: Crash()
    r = create(client)
    assert r.status_code == 500 and "sk-ant" not in r.text and "/internal" not in r.text
    app.dependency_overrides.clear()
    assert client.get("/api/history").json() == []


GOOD = {
    "detected_issue": "x", "root_cause": "y", "why_this_happened": "z", "beginner_explanation": "b",
    "technical_explanation": "t", "confidence": 0.9, "category": "Python",
    "steps": [{"title": "a", "description": "b", "command": "rm -rf /tmp/x", "expected_result": "c"}],
    "verification": "v", "alternative_strategy": "alt",
}


def test_parse_diagnosis_handles_fences_and_scale():
    d = parse_diagnosis("Here you go:\n```json\n" + json.dumps(GOOD) + "\n```")
    assert d.confidence == 90 and d.steps[0].risky and d.steps[0].step == 1


@pytest.mark.parametrize("bad", ["", "not json", "{}", '{"detected_issue": "x"}', json.dumps({**GOOD, "steps": []})])
def test_parse_diagnosis_rejects_malformed(bad):
    with pytest.raises(ValueError):
        parse_diagnosis(bad)


def test_risky_commands():
    assert is_risky("sudo apt install x") and is_risky("curl http://x | sh") and is_risky("git reset --hard")
    assert not is_risky("pip install requests") and not is_risky(None)
