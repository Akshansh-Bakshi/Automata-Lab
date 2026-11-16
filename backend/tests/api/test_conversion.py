from typing import Any

from fastapi.testclient import TestClient


def test_convert_returns_complete_canonical_dfa_and_replayable_trace(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    response = client.post("/api/nfa/convert", json={"nfa": valid_nfa_payload})

    assert response.status_code == 200
    payload = response.json()
    dfa = payload["dfa"]
    assert [(state["id"], state["subset"]) for state in dfa["states"]] == [
        ("D0", ["q0"]),
        ("D1", ["q1", "q2"]),
        ("D2", []),
        ("D3", ["q0", "q1", "q2"]),
    ]
    assert dfa["initialState"] == "D0"
    assert dfa["acceptingStates"] == ["D1", "D3"]
    assert len(dfa["transitions"]) == len(dfa["states"]) * len(dfa["alphabet"])
    assert dfa["stats"] == {
        "nfaStates": 3,
        "dfaStates": 4,
        "dfaTransitions": 8,
        "hasDeadState": True,
    }

    steps = payload["trace"]["steps"]
    assert [step["index"] for step in steps] == list(range(14))
    assert steps[0]["type"] == "INIT"
    assert steps[-1] == {
        "index": 13,
        "type": "FINISH",
        "dfaStateCount": 4,
        "worklist": [],
        "explanation": "The worklist is empty. The DFA has 4 states and 8 transitions.",
    }


def test_convert_serialization_is_byte_stable(
    client: TestClient, valid_nfa_payload: dict[str, Any]
) -> None:
    request = {"nfa": valid_nfa_payload}

    first = client.post("/api/nfa/convert", json=request)
    second = client.post("/api/nfa/convert", json=request)

    assert first.status_code == second.status_code == 200
    assert first.content == second.content

