from itertools import product

from hypothesis import given, settings
from hypothesis import strategies as st

from automatalab.core.models import Nfa, NfaTransition
from automatalab.core.simulation import compare
from automatalab.core.subset_construction import convert


@st.composite
def small_nfas(draw: st.DrawFn) -> Nfa:
    state_count = draw(st.integers(min_value=1, max_value=4))
    states = tuple(f"q{index}" for index in range(state_count))
    accepting = tuple(
        draw(st.lists(st.sampled_from(states), unique=True, max_size=state_count))
    )
    transitions: list[NfaTransition] = []
    for state, symbol in product(states, ("a", "b")):
        targets = draw(st.lists(st.sampled_from(states), unique=True, max_size=state_count))
        if targets:
            transitions.append(NfaTransition(state, symbol, tuple(targets)))
    return Nfa(states, ("a", "b"), states[0], accepting, tuple(transitions))


@given(nfa=small_nfas(), symbols=st.lists(st.sampled_from(("a", "b")), max_size=5))
@settings(max_examples=80, deadline=None)
def test_randomized_nfa_and_dfa_language_agreement(nfa: Nfa, symbols: list[str]) -> None:
    dfa = convert(nfa).dfa

    assert compare(nfa, dfa, "".join(symbols)).agree


@given(nfa=small_nfas())
@settings(max_examples=50, deadline=None)
def test_randomized_conversion_is_deterministic_and_complete(nfa: Nfa) -> None:
    first = convert(nfa)
    second = convert(nfa)

    assert first == second
    assert len(first.dfa.transitions) == len(first.dfa.states) * len(first.dfa.alphabet)

