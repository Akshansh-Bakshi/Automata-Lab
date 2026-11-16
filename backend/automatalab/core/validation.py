"""Semantic NFA validation with stable, JSON-addressable issues."""

import re
from dataclasses import dataclass

from automatalab.core.limits import MAX_ALPHABET_SIZE, MAX_NFA_STATES, MAX_STATE_ID_LENGTH
from automatalab.core.models import Nfa

STATE_ID_PATTERN = re.compile(rf"^[A-Za-z0-9_]{{1,{MAX_STATE_ID_LENGTH}}}$")


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    """One semantic validation failure."""

    code: str
    path: str
    message: str


class InvalidNfaError(ValueError):
    """Raised when an algorithm is asked to operate on an invalid NFA."""

    def __init__(self, issues: list[ValidationIssue]) -> None:
        self.issues = tuple(issues)
        super().__init__(f"Invalid NFA: {len(issues)} validation issue(s).")


def validate_nfa(nfa: Nfa) -> list[ValidationIssue]:
    """Return all semantic issues in deterministic input order; never raise."""

    issues: list[ValidationIssue] = []

    if not nfa.states:
        issues.append(
            ValidationIssue("EMPTY_STATE_SET", "states", "At least one state is required.")
        )
    if len(nfa.states) > MAX_NFA_STATES:
        issues.append(
            ValidationIssue(
                "LIMIT_EXCEEDED",
                "states",
                f"At most {MAX_NFA_STATES} NFA states are allowed.",
            )
        )

    seen_states: set[str] = set()
    for index, state in enumerate(nfa.states):
        path = f"states[{index}]"
        if not STATE_ID_PATTERN.fullmatch(state):
            issues.append(
                ValidationIssue(
                    "INVALID_STATE_NAME",
                    path,
                    f"State IDs must match [A-Za-z0-9_]{{1,{MAX_STATE_ID_LENGTH}}}.",
                )
            )
        if state in seen_states:
            issues.append(
                ValidationIssue("DUPLICATE_STATE", path, f"State '{state}' appears more than once.")
            )
        seen_states.add(state)

    if not nfa.alphabet:
        issues.append(
            ValidationIssue("EMPTY_ALPHABET", "alphabet", "At least one symbol is required.")
        )
    if len(nfa.alphabet) > MAX_ALPHABET_SIZE:
        issues.append(
            ValidationIssue(
                "LIMIT_EXCEEDED",
                "alphabet",
                f"At most {MAX_ALPHABET_SIZE} alphabet symbols are allowed.",
            )
        )

    seen_symbols: set[str] = set()
    for index, symbol in enumerate(nfa.alphabet):
        path = f"alphabet[{index}]"
        if len(symbol) != 1 or symbol.isspace():
            issues.append(
                ValidationIssue(
                    "INVALID_SYMBOL",
                    path,
                    "Alphabet symbols must be exactly one non-whitespace character.",
                )
            )
        if symbol in seen_symbols:
            issues.append(
                ValidationIssue(
                    "DUPLICATE_SYMBOL", path, f"Symbol '{symbol}' appears more than once."
                )
            )
        seen_symbols.add(symbol)

    state_set = set(nfa.states)
    alphabet_set = set(nfa.alphabet)
    if nfa.initial_state not in state_set:
        issues.append(
            ValidationIssue(
                "UNKNOWN_STATE_REFERENCE",
                "initialState",
                f"Initial state '{nfa.initial_state}' is not in states.",
            )
        )

    seen_accepting: set[str] = set()
    for index, state in enumerate(nfa.accepting_states):
        path = f"acceptingStates[{index}]"
        if state not in state_set:
            issues.append(
                ValidationIssue(
                    "UNKNOWN_STATE_REFERENCE", path, f"State '{state}' is not in states."
                )
            )
        if state in seen_accepting:
            issues.append(
                ValidationIssue(
                    "DUPLICATE_STATE", path, f"Accepting state '{state}' appears more than once."
                )
            )
        seen_accepting.add(state)

    seen_transition_pairs: set[tuple[str, str]] = set()
    for transition_index, transition in enumerate(nfa.transitions):
        base_path = f"transitions[{transition_index}]"
        if transition.source not in state_set:
            issues.append(
                ValidationIssue(
                    "UNKNOWN_STATE_REFERENCE",
                    f"{base_path}.from",
                    f"State '{transition.source}' is not in states.",
                )
            )
        if transition.symbol not in alphabet_set:
            issues.append(
                ValidationIssue(
                    "UNKNOWN_SYMBOL",
                    f"{base_path}.symbol",
                    f"Symbol '{transition.symbol}' is not in alphabet.",
                )
            )

        pair = (transition.source, transition.symbol)
        if pair in seen_transition_pairs:
            issues.append(
                ValidationIssue(
                    "DUPLICATE_TRANSITION",
                    base_path,
                    (
                        f"Transition ({transition.source}, {transition.symbol}) "
                        "is defined more than once."
                    ),
                )
            )
        seen_transition_pairs.add(pair)

        if not transition.targets:
            issues.append(
                ValidationIssue(
                    "EMPTY_TRANSITION_TARGETS",
                    f"{base_path}.to",
                    "Omit missing transitions instead of providing an empty target array.",
                )
            )

        seen_targets: set[str] = set()
        for target_index, target in enumerate(transition.targets):
            target_path = f"{base_path}.to[{target_index}]"
            if target not in state_set:
                issues.append(
                    ValidationIssue(
                        "UNKNOWN_STATE_REFERENCE",
                        target_path,
                        f"State '{target}' is not in states.",
                    )
                )
            if target in seen_targets:
                issues.append(
                    ValidationIssue(
                        "DUPLICATE_TARGET",
                        target_path,
                        f"Target state '{target}' appears more than once in this transition.",
                    )
                )
            seen_targets.add(target)

    return issues


def require_valid_nfa(nfa: Nfa) -> None:
    """Raise a structured error if semantic validation fails."""

    issues = validate_nfa(nfa)
    if issues:
        raise InvalidNfaError(issues)

