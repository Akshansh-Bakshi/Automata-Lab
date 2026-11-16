from typing import Any

from fastapi.testclient import TestClient

from automatalab.api.mappers import nfa_to_core
from automatalab.api.schemas import NfaSchema
from automatalab.api.validation import validate_api_nfa


def test_examples_endpoint_returns_five_stable_valid_examples(client: TestClient) -> None:
    response = client.get("/api/examples")

    assert response.status_code == 200
    examples: list[dict[str, Any]] = response.json()["examples"]
    assert [example["id"] for example in examples] == [
        "nondeterministic-suffix",
        "missing-moves",
        "multiple-accepting",
        "accepts-empty",
        "contains-ab",
    ]
    for example in examples:
        schema = NfaSchema.model_validate(example["nfa"])
        nfa = nfa_to_core(schema)
        assert validate_api_nfa(schema, nfa) == []


def test_examples_cover_required_teaching_cases(client: TestClient) -> None:
    examples: list[dict[str, Any]] = client.get("/api/examples").json()["examples"]
    nfas = [example["nfa"] for example in examples]

    assert any(
        len(transition["to"]) > 1
        for nfa in nfas
        for transition in nfa["transitions"]
    )
    assert any(
        len(nfa["transitions"]) < len(nfa["states"]) * len(nfa["alphabet"])
        for nfa in nfas
    )
    assert any(len(nfa["acceptingStates"]) > 1 for nfa in nfas)
    assert any(nfa["initialState"] in nfa["acceptingStates"] for nfa in nfas)

    missing_moves = next(item for item in examples if item["id"] == "missing-moves")
    converted = client.post("/api/nfa/convert", json={"nfa": missing_moves["nfa"]})
    assert converted.status_code == 200
    assert converted.json()["dfa"]["stats"]["hasDeadState"] is True

