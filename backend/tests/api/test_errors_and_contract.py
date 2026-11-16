from typing import Any

from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from automatalab.api.main import create_app
from automatalab.api.middleware import MAX_REQUEST_BODY_BYTES
from automatalab.core.models import Nfa
from automatalab.core.subset_construction import DfaStateLimitError


def test_oversized_request_body_returns_413(client: TestClient) -> None:
    response = client.post(
        "/api/nfa/convert",
        content=b"x" * (MAX_REQUEST_BODY_BYTES + 1),
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "LIMIT_EXCEEDED"
    assert response.json()["error"]["issues"][0]["path"] == "body"


def test_generated_dfa_limit_uses_structured_error(
    client: TestClient,
    valid_nfa_payload: dict[str, Any],
    monkeypatch: MonkeyPatch,
) -> None:
    def fail_conversion(nfa: Nfa) -> None:
        del nfa
        raise DfaStateLimitError(512)

    monkeypatch.setattr("automatalab.api.services.convert", fail_conversion)

    response = client.post("/api/nfa/convert", json={"nfa": valid_nfa_payload})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "LIMIT_EXCEEDED"


def test_internal_exception_is_sanitized(
    valid_nfa_payload: dict[str, Any], monkeypatch: MonkeyPatch
) -> None:
    def fail(_: object) -> None:
        raise RuntimeError("private implementation detail")

    monkeypatch.setattr("automatalab.api.routes.nfa.convert_nfa_request", fail)
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        response = client.post("/api/nfa/convert", json={"nfa": valid_nfa_payload})

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "private implementation detail" not in response.text


def test_unknown_route_uses_structured_error(client: TestClient) -> None:
    response = client.get("/api/not-a-route")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_openapi_contract_contains_all_routes_and_camel_case_schemas(
    client: TestClient,
) -> None:
    document = client.get("/openapi.json").json()

    assert set(document["paths"]) >= {
        "/api/health",
        "/api/examples",
        "/api/nfa/validate",
        "/api/nfa/convert",
        "/api/simulate",
    }
    nfa_schema = document["components"]["schemas"]["NfaSchema"]
    assert nfa_schema["additionalProperties"] is False
    assert set(nfa_schema["properties"]) >= {
        "schemaVersion",
        "initialState",
        "acceptingStates",
    }
    transition_schema = document["components"]["schemas"]["DfaTransitionSchema"]
    assert set(transition_schema["properties"]) == {"from", "symbol", "to"}

