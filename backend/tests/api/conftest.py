from typing import Any

import pytest
from fastapi.testclient import TestClient

from automatalab.api.main import create_app


@pytest.fixture
def client() -> TestClient:
    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture
def valid_nfa_payload() -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "name": "Blueprint NFA",
        "alphabet": ["a", "b"],
        "states": ["q0", "q1", "q2"],
        "initialState": "q0",
        "acceptingStates": ["q2"],
        "transitions": [
            {"from": "q0", "symbol": "a", "to": ["q1", "q2"]},
            {"from": "q1", "symbol": "b", "to": ["q1", "q2"]},
            {"from": "q2", "symbol": "a", "to": ["q0"]},
            {"from": "q2", "symbol": "b", "to": ["q0", "q2"]},
        ],
        "layout": {
            "q0": {"x": 80, "y": 120},
            "q1": {"x": 280, "y": 60},
            "q2": {"x": 280, "y": 180},
        },
    }

