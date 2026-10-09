"""Tests ClaudeService with a fake Anthropic client (no network, no real key)."""
import asyncio
import json
from types import SimpleNamespace

import anthropic
import httpx
import pytest

from config import get_settings
from errors import AppError
from models.context import ImageInput, TroubleshootContext
from services.ai_service import ClaudeService, build_user_text
from tests.test_api import GOOD


def settings(**kw):
    import dataclasses
    return dataclasses.replace(get_settings(), anthropic_api_key="test-key-not-real", **kw)


def reply(text):
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)])


class FakeMessages:
    def __init__(self, outputs):
        self.outputs, self.calls = list(outputs), []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        out = self.outputs.pop(0)
        if isinstance(out, Exception):
            raise out
        return reply(out)


def service(outputs):
    svc = ClaudeService(settings())
    svc._client = SimpleNamespace(messages=FakeMessages(outputs))
    return svc


def run(coro):
    return asyncio.run(coro)


def req():
    return httpx.Request("POST", "https://api.anthropic.com/v1/messages")


def test_requires_key():
    import dataclasses
    with pytest.raises(AppError) as e:
        ClaudeService(dataclasses.replace(get_settings(), anthropic_api_key=""))
    assert e.value.status_code == 503


def test_success_with_image_block():
    svc = service([json.dumps(GOOD)])
    ctx = TroubleshootContext(problem="p", image=ImageInput(b"\x89PNG", "image/png"))
    d = run(svc.diagnose(ctx))
    assert d.detected_issue == "x"
    content = svc._client.messages.calls[0]["messages"][0]["content"]
    assert content[0]["type"] == "image" and content[0]["source"]["media_type"] == "image/png"
    assert "test-key" not in json.dumps(svc._client.messages.calls[0], default=str)


def test_malformed_then_repaired():
    svc = service(["sorry, here is text", json.dumps(GOOD)])
    assert run(svc.diagnose(TroubleshootContext(problem="p"))).root_cause == "y"
    assert len(svc._client.messages.calls) == 2


def test_malformed_twice_is_friendly_error():
    with pytest.raises(AppError) as e:
        run(service(["nope", "still nope"]).diagnose(TroubleshootContext(problem="p")))
    assert e.value.status_code == 502


def test_empty_response():
    with pytest.raises(AppError) as e:
        run(service([""]).diagnose(TroubleshootContext(problem="p")))
    assert "empty" in e.value.message


@pytest.mark.parametrize("exc,status", [
    (anthropic.APITimeoutError(request=req()), 504),
    (anthropic.APIConnectionError(request=req()), 502),
    (anthropic.RateLimitError("x", response=httpx.Response(429, request=req()), body=None), 429),
    (anthropic.AuthenticationError("x", response=httpx.Response(401, request=req()), body=None), 502),
    (anthropic.InternalServerError("x", response=httpx.Response(500, request=req()), body=None), 502),
])
def test_provider_errors_are_mapped(exc, status):
    with pytest.raises(AppError) as e:
        run(service([exc]).diagnose(TroubleshootContext(problem="p")))
    assert e.value.status_code == status and "key" not in e.value.message.lower().replace("api key", "")


def test_retry_prompt_contains_history_and_feedback():
    from schemas.troubleshoot import Attempt, Diagnosis
    d = Diagnosis.model_validate(GOOD)
    att = Attempt(number=1, created_at="t", provider="claude", diagnosis=d, outcome="not_fixed", user_feedback="same error again")
    text = build_user_text(TroubleshootContext(problem="p", mode="developer", previous_attempts=[att]))
    assert "<previous_attempts>" in text and "same error again" in text and "DIFFERENT" in text and "MODE: developer" in text
