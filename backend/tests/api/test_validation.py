from typing import Any

from fastapi.testclient import TestClient


def test_validate_returns_deterministic_nonblocking_warnings(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    valid_nfa_payload["states"].append("unused")
    valid_nfa_payload["alphabet"].append("c")

    response = client.post("/api/nfa/validate", json={"nfa": valid_nfa_payload})

    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "warnings": [
            {
                "code": "UNREACHABLE_STATE",
                "path": "states[3]",
                "message": "State 'unused' is unreachable from the initial state.",
            },
            {
                "code": "UNUSED_SYMBOL",
                "path": "alphabet[2]",
                "message": "Symbol 'c' is not used by any explicit transition.",
            },
        ],
    }


def test_semantically_invalid_nfa_uses_structured_error_envelope(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    valid_nfa_payload["states"].append("q0")

    response = client.post("/api/nfa/validate", json={"nfa": valid_nfa_payload})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "DUPLICATE_STATE"
    assert payload["error"]["issues"][0]["path"] == "states[3]"


def test_layout_rejects_unknown_state_reference(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    valid_nfa_payload["layout"]["q9"] = {"x": 1, "y": 2}

    response = client.post("/api/nfa/validate", json={"nfa": valid_nfa_payload})

    assert response.status_code == 422
    assert response.json()["error"]["issues"] == [
        {
            "code": "UNKNOWN_STATE_REFERENCE",
            "path": "layout.q9",
            "message": "Layout state 'q9' is not in states.",
        }
    ]


def test_schema_rejects_unknown_fields(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    valid_nfa_payload["unexpected"] = True

    response = client.post("/api/nfa/validate", json={"nfa": valid_nfa_payload})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "SCHEMA_VIOLATION"
    assert payload["error"]["issues"][0]["path"] == "nfa.unexpected"


def test_schema_reports_nested_missing_field_path(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    del valid_nfa_payload["transitions"][0]["symbol"]

    response = client.post("/api/nfa/convert", json={"nfa": valid_nfa_payload})

    assert response.status_code == 422
    assert response.json()["error"]["issues"][0]["path"] == "nfa.transitions[0].symbol"


def test_schema_rejects_missing_required_field_and_wrong_version(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    del valid_nfa_payload["initialState"]
    valid_nfa_payload["schemaVersion"] = 2

    response = client.post("/api/nfa/validate", json={"nfa": valid_nfa_payload})

    assert response.status_code == 422
    paths = {issue["path"] for issue in response.json()["error"]["issues"]}
    assert paths == {"nfa.schemaVersion", "nfa.initialState"}


def test_malformed_json_returns_400(client: TestClient) -> None:
    response = client.post(
        "/api/nfa/convert",
        content=b'{"nfa":',
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json()["error"] == {
        "code": "MALFORMED_JSON",
        "message": "Request body is not valid JSON.",
        "issues": [
            {
                "code": "MALFORMED_JSON",
                "path": "body",
                "message": "Request body is not valid JSON.",
            }
        ],
    }


def test_nfa_state_resource_limit_is_semantic_error(client: TestClient) -> None:
    states = [f"q{index}" for index in range(21)]
    nfa = {
        "schemaVersion": 1,
        "alphabet": ["a"],
        "states": states,
        "initialState": "q0",
        "acceptingStates": [],
        "transitions": [],
    }

    response = client.post("/api/nfa/convert", json={"nfa": nfa})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "LIMIT_EXCEEDED"
    assert response.json()["error"]["issues"][0]["path"] == "states"

