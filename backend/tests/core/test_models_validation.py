from dataclasses import FrozenInstanceError

import pytest

from automatalab.core.limits import MAX_ALPHABET_SIZE, MAX_NFA_STATES
from automatalab.core.models import Nfa, NfaTransition, subset_label
from automatalab.core.validation import InvalidNfaError, require_valid_nfa, validate_nfa


def test_models_are_immutable(blueprint_nfa: Nfa) -> None:
    with pytest.raises(FrozenInstanceError):
        blueprint_nfa.initial_state = "q1"  # type: ignore[misc]


def test_subset_labels_cover_empty_and_nonempty_subsets() -> None:
    assert subset_label(()) == "∅"
    assert subset_label(("q0", "q2")) == "{q0,q2}"


def test_valid_nfa_has_no_semantic_issues(blueprint_nfa: Nfa) -> None:
    assert validate_nfa(blueprint_nfa) == []
    assert require_valid_nfa(blueprint_nfa) is None


def test_empty_states_and_alphabet_are_rejected() -> None:
    nfa = Nfa((), (), "missing", (), ())

    issues = validate_nfa(nfa)

    assert [(issue.code, issue.path) for issue in issues] == [
        ("EMPTY_STATE_SET", "states"),
        ("EMPTY_ALPHABET", "alphabet"),
        ("UNKNOWN_STATE_REFERENCE", "initialState"),
    ]


def test_duplicate_and_invalid_state_ids_are_rejected() -> None:
    nfa = Nfa(("q0", "bad-name", "q0"), ("a",), "q0", (), ())

    issues = validate_nfa(nfa)

    assert ("INVALID_STATE_NAME", "states[1]") in {
        (issue.code, issue.path) for issue in issues
    }
    assert ("DUPLICATE_STATE", "states[2]") in {
        (issue.code, issue.path) for issue in issues
    }


def test_duplicate_and_invalid_symbols_are_rejected() -> None:
    nfa = Nfa(("q0",), ("a", " ", "a", "long"), "q0", (), ())

    issues = validate_nfa(nfa)
    issue_keys = {(issue.code, issue.path) for issue in issues}

    assert ("INVALID_SYMBOL", "alphabet[1]") in issue_keys
    assert ("DUPLICATE_SYMBOL", "alphabet[2]") in issue_keys
    assert ("INVALID_SYMBOL", "alphabet[3]") in issue_keys


def test_unknown_and_duplicate_accepting_states_are_rejected() -> None:
    nfa = Nfa(("q0",), ("a",), "q0", ("q0", "q0", "q9"), ())

    issue_keys = {(issue.code, issue.path) for issue in validate_nfa(nfa)}

    assert ("DUPLICATE_STATE", "acceptingStates[1]") in issue_keys
    assert ("UNKNOWN_STATE_REFERENCE", "acceptingStates[2]") in issue_keys


def test_invalid_transition_definitions_report_precise_paths() -> None:
    nfa = Nfa(
        ("q0", "q1"),
        ("a",),
        "q0",
        (),
        (
            NfaTransition("missing", "z", ("q9", "q9")),
            NfaTransition("missing", "z", ()),
        ),
    )

    issue_keys = {(issue.code, issue.path) for issue in validate_nfa(nfa)}

    assert ("UNKNOWN_STATE_REFERENCE", "transitions[0].from") in issue_keys
    assert ("UNKNOWN_SYMBOL", "transitions[0].symbol") in issue_keys
    assert ("UNKNOWN_STATE_REFERENCE", "transitions[0].to[0]") in issue_keys
    assert ("DUPLICATE_TARGET", "transitions[0].to[1]") in issue_keys
    assert ("DUPLICATE_TRANSITION", "transitions[1]") in issue_keys
    assert ("EMPTY_TRANSITION_TARGETS", "transitions[1].to") in issue_keys


def test_nfa_resource_limits_are_enforced() -> None:
    states = tuple(f"q{index}" for index in range(MAX_NFA_STATES + 1))
    alphabet = tuple(chr(ord("a") + index) for index in range(MAX_ALPHABET_SIZE + 1))
    nfa = Nfa(states, alphabet, states[0], (), ())

    issues = validate_nfa(nfa)

    assert sum(issue.code == "LIMIT_EXCEEDED" for issue in issues) == 2
    assert {issue.path for issue in issues if issue.code == "LIMIT_EXCEEDED"} == {
        "states",
        "alphabet",
    }


def test_require_valid_nfa_raises_with_structured_issues() -> None:
    nfa = Nfa((), (), "missing", (), ())

    with pytest.raises(InvalidNfaError) as error:
        require_valid_nfa(nfa)

    assert error.value.issues[0].code == "EMPTY_STATE_SET"
    assert "3 validation issue(s)" in str(error.value)

