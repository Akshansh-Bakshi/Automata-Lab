from typing import Any

from fastapi.testclient import TestClient

from automatalab.core.limits import MAX_INPUT_LENGTH


def test_simulate_converts_internally_and_returns_agreeing_traces(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    response = client.post(
        "/api/simulate", json={"nfa": valid_nfa_payload, "input": "ab"}
    )

    assert response.status_code == 200
    payload = response.json()
    simulation = payload["simulation"]
    assert simulation["input"] == "ab"
    assert simulation["agree"] is True
    assert simulation["nfa"]["accepted"] is True
    assert simulation["dfa"]["accepted"] is True
    assert [step["activeStates"] for step in simulation["nfa"]["steps"]] == [
        ["q0"],
        ["q1", "q2"],
        ["q0", "q1", "q2"],
    ]
    assert [step["state"] for step in simulation["dfa"]["steps"]] == [
        "D0",
        "D1",
        "D3",
    ]
    assert payload["dfa"]["stats"]["dfaTransitions"] == 8


def test_simulate_supports_empty_input(client: TestClient) -> None:
    nfa = {
        "schemaVersion": 1,
        "alphabet": ["x"],
        "states": ["start"],
        "initialState": "start",
        "acceptingStates": ["start"],
        "transitions": [{"from": "start", "symbol": "x", "to": ["start"]}],
    }

    response = client.post("/api/simulate", json={"nfa": nfa, "input": ""})

    assert response.status_code == 200
    simulation = response.json()["simulation"]
    assert simulation["agree"] is True
    assert simulation["nfa"] == {
        "accepted": True,
        "steps": [{"position": 0, "symbol": None, "activeStates": ["start"]}],
    }
    assert simulation["dfa"] == {
        "accepted": True,
        "steps": [{"position": 0, "symbol": None, "state": "D0"}],
    }


def test_simulate_rejects_symbol_outside_alphabet(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    response = client.post(
        "/api/simulate", json={"nfa": valid_nfa_payload, "input": "abx"}
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "SYMBOL_NOT_IN_ALPHABET"
    assert response.json()["error"]["issues"][0]["path"] == "input[2]"


def test_simulate_rejects_input_length_limit(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    response = client.post(
        "/api/simulate",
        json={"nfa": valid_nfa_payload, "input": "a" * (MAX_INPUT_LENGTH + 1)},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "LIMIT_EXCEEDED"
    assert response.json()["error"]["issues"][0]["path"] == "input"

