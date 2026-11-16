from dataclasses import replace

import pytest

from automatalab.core.limits import MAX_INPUT_LENGTH
from automatalab.core.models import Nfa
from automatalab.core.simulation import (
    SimulationInputError,
    compare,
    simulate_dfa,
    simulate_nfa,
)
from automatalab.core.subset_construction import convert
from automatalab.core.validation import InvalidNfaError


def test_empty_string_has_one_step_and_uses_initial_acceptance(accepts_empty_nfa: Nfa) -> None:
    dfa = convert(accepts_empty_nfa).dfa

    nfa_run = simulate_nfa(accepts_empty_nfa, "")
    dfa_run = simulate_dfa(dfa, "")

    assert nfa_run.accepted and dfa_run.accepted
    assert [(step.position, step.symbol, step.active_states) for step in nfa_run.steps] == [
        (0, None, ("start",))
    ]
    assert [(step.position, step.symbol, step.state) for step in dfa_run.steps] == [
        (0, None, "D0")
    ]


def test_simulation_tracks_active_sets_and_single_dfa_state(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    result = compare(blueprint_nfa, dfa, "ab")

    assert result.agree
    assert result.nfa.accepted and result.dfa.accepted
    assert [step.active_states for step in result.nfa.steps] == [
        ("q0",),
        ("q1", "q2"),
        ("q0", "q1", "q2"),
    ]
    assert [step.state for step in result.dfa.steps] == ["D0", "D1", "D3"]


def test_missing_nfa_move_and_dead_state_remain_rejected(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    result = compare(blueprint_nfa, dfa, "bbb")

    assert result.agree
    assert not result.nfa.accepted and not result.dfa.accepted
    assert result.nfa.steps[-1].active_states == ()
    assert result.dfa.steps[-1].state == "D2"


def test_symbol_outside_alphabet_reports_zero_based_position(blueprint_nfa: Nfa) -> None:
    with pytest.raises(SimulationInputError) as error:
        simulate_nfa(blueprint_nfa, "abx")

    assert error.value.issue.code == "SYMBOL_NOT_IN_ALPHABET"
    assert error.value.issue.path == "input[2]"
    assert "position 2" in str(error.value)


def test_dfa_simulation_validates_input_independently(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa

    with pytest.raises(SimulationInputError) as error:
        simulate_dfa(dfa, "x")

    assert error.value.issue.path == "input[0]"


def test_input_length_limit_is_enforced(accepts_empty_nfa: Nfa) -> None:
    with pytest.raises(SimulationInputError) as error:
        simulate_nfa(accepts_empty_nfa, "x" * (MAX_INPUT_LENGTH + 1))

    assert error.value.issue.code == "LIMIT_EXCEEDED"
    assert error.value.issue.path == "input"


def test_nfa_is_validated_before_simulation() -> None:
    invalid = Nfa((), (), "missing", (), ())

    with pytest.raises(InvalidNfaError):
        simulate_nfa(invalid, "")


def test_incomplete_dfa_is_rejected_during_simulation(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    incomplete = replace(dfa, transitions=())

    with pytest.raises(ValueError, match="incomplete"):
        simulate_dfa(incomplete, "a")


def test_compare_can_report_disagreement_for_a_tampered_dfa(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    tampered = replace(dfa, accepting_states=())

    assert not compare(blueprint_nfa, tampered, "a").agree

