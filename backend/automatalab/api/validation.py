"""API-adjacent semantic checks and non-blocking NFA diagnostics."""

from collections import deque

from automatalab.api.schemas import NfaSchema
from automatalab.core.models import Nfa
from automatalab.core.validation import ValidationIssue, validate_nfa


def validate_api_nfa(schema: NfaSchema, nfa: Nfa) -> list[ValidationIssue]:
    """Run core validation plus API-only layout reference checks."""

    issues = validate_nfa(nfa)
    state_set = set(nfa.states)
    for state in schema.layout or {}:
        if state not in state_set:
            issues.append(
                ValidationIssue(
                    "UNKNOWN_STATE_REFERENCE",
                    f"layout.{state}",
                    f"Layout state '{state}' is not in states.",
                )
            )
    return issues


def nfa_warnings(nfa: Nfa) -> list[ValidationIssue]:
    """Return deterministic, non-blocking reachability and usage warnings."""

    adjacency: dict[str, set[str]] = {state: set() for state in nfa.states}
    used_symbols: set[str] = set()
    for transition in nfa.transitions:
        adjacency[transition.source].update(transition.targets)
        used_symbols.add(transition.symbol)

    reachable = {nfa.initial_state}
    queue = deque([nfa.initial_state])
    while queue:
        source = queue.popleft()
        for target in adjacency[source]:
            if target not in reachable:
                reachable.add(target)
                queue.append(target)

    warnings = [
        ValidationIssue(
            "UNREACHABLE_STATE",
            f"states[{index}]",
            f"State '{state}' is unreachable from the initial state.",
        )
        for index, state in enumerate(nfa.states)
        if state not in reachable
    ]
    warnings.extend(
        ValidationIssue(
            "UNUSED_SYMBOL",
            f"alphabet[{index}]",
            f"Symbol '{symbol}' is not used by any explicit transition.",
        )
        for index, symbol in enumerate(nfa.alphabet)
        if symbol not in used_symbols
    )
    return warnings

