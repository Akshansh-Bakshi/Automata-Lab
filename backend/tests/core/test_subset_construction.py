import json
from collections import deque
from dataclasses import asdict
from itertools import product

import pytest

from automatalab.core.limits import MAX_DFA_STATES
from automatalab.core.models import Dfa, Nfa, NfaTransition
from automatalab.core.simulation import compare
from automatalab.core.subset_construction import DfaStateLimitError, convert


def _reachable_state_ids(dfa: Dfa) -> set[str]:
    adjacency: dict[str, set[str]] = {}
    for transition in dfa.transitions:
        adjacency.setdefault(transition.source, set()).add(transition.target)
    seen = {dfa.initial_state}
    queue = deque([dfa.initial_state])
    while queue:
        source = queue.popleft()
        for target in adjacency.get(source, set()):
            if target not in seen:
                seen.add(target)
                queue.append(target)
    return seen


def test_i1_every_dfa_state_is_a_distinct_canonical_subset(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    order = {state: index for index, state in enumerate(blueprint_nfa.states)}

    assert len({state.subset for state in dfa.states}) == len(dfa.states)
    assert all(
        state.subset == tuple(sorted(set(state.subset), key=order.__getitem__))
        for state in dfa.states
    )


def test_i2_initial_dfa_state_is_exactly_initial_nfa_singleton(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa

    assert dfa.initial_state == "D0"
    assert dfa.states[0].subset == (blueprint_nfa.initial_state,)
    assert [state.id for state in dfa.states if state.is_initial] == ["D0"]


def test_i3_dfa_transition_function_is_total(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa

    assert len(dfa.transitions) == len(dfa.states) * len(dfa.alphabet)
    assert {(item.source, item.symbol) for item in dfa.transitions} == {
        (state.id, symbol) for state in dfa.states for symbol in dfa.alphabet
    }


def test_i4_every_generated_dfa_state_is_reachable(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa

    assert _reachable_state_ids(dfa) == {state.id for state in dfa.states}


def test_i5_acceptance_matches_subset_intersection(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    accepting = set(blueprint_nfa.accepting_states)

    assert all(state.is_accepting == bool(set(state.subset) & accepting) for state in dfa.states)
    assert dfa.accepting_states == tuple(
        state.id for state in dfa.states if state.is_accepting
    )


def test_i6_each_target_is_the_union_of_nfa_targets(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    transition_map = {
        (item.source, item.symbol): set(item.targets) for item in blueprint_nfa.transitions
    }
    state_by_id = {state.id: state for state in dfa.states}

    for transition in dfa.transitions:
        source_subset = state_by_id[transition.source].subset
        expected = set().union(
            *(
                transition_map.get((state, transition.symbol), set())
                for state in source_subset
            )
        )
        assert set(state_by_id[transition.target].subset) == expected


def test_i7_dead_state_exists_only_when_reached_and_loops(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa
    dead = [state for state in dfa.states if state.is_dead]

    assert len(dead) == 1
    assert dead[0].subset == ()
    assert not dead[0].is_accepting
    assert all(
        transition.target == dead[0].id
        for transition in dfa.transitions
        if transition.source == dead[0].id
    )

    total_nfa = Nfa(
        ("only",),
        ("x",),
        "only",
        (),
        (NfaTransition("only", "x", ("only",)),),
    )
    assert not any(state.is_dead for state in convert(total_nfa).dfa.states)


def test_i8_identical_input_produces_byte_identical_output(blueprint_nfa: Nfa) -> None:
    first = convert(blueprint_nfa)
    second = convert(blueprint_nfa)

    assert first == second
    serialize = lambda value: json.dumps(  # noqa: E731
        asdict(value), ensure_ascii=False, separators=(",", ":")
    ).encode()
    assert serialize(first) == serialize(second)


def test_i9_nfa_and_dfa_agree_exhaustively(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa

    for length in range(6):
        for symbols in product(blueprint_nfa.alphabet, repeat=length):
            assert compare(blueprint_nfa, dfa, "".join(symbols)).agree


def test_bfs_discovery_and_transition_order_are_stable(blueprint_nfa: Nfa) -> None:
    dfa = convert(blueprint_nfa).dfa

    assert [(state.id, state.subset) for state in dfa.states] == [
        ("D0", ("q0",)),
        ("D1", ("q1", "q2")),
        ("D2", ()),
        ("D3", ("q0", "q1", "q2")),
    ]
    assert [(item.source, item.symbol, item.target) for item in dfa.transitions] == [
        ("D0", "a", "D1"),
        ("D0", "b", "D2"),
        ("D1", "a", "D0"),
        ("D1", "b", "D3"),
        ("D2", "a", "D2"),
        ("D2", "b", "D2"),
        ("D3", "a", "D3"),
        ("D3", "b", "D3"),
    ]


def test_generated_state_limit_is_checked_before_adding_state(blueprint_nfa: Nfa) -> None:
    with pytest.raises(DfaStateLimitError) as error:
        convert(blueprint_nfa, max_dfa_states=1)

    assert error.value.code == "LIMIT_EXCEEDED"
    assert error.value.limit == 1


@pytest.mark.parametrize("limit", [0, MAX_DFA_STATES + 1])
def test_generated_state_limit_override_stays_within_defined_bounds(
    blueprint_nfa: Nfa, limit: int
) -> None:
    with pytest.raises(ValueError, match="between 1 and 512"):
        convert(blueprint_nfa, max_dfa_states=limit)

