import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["AI_MODE"] = "mock"
os.environ["MOCK_DELAY_SECONDS"] = "0"
os.environ["DATABASE_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")
os.environ["ANTHROPIC_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def client():
    c = TestClient(app, raise_server_exceptions=False)
    c.delete("/api/history")
    return c
