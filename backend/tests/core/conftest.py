import pytest

from automatalab.core.models import Nfa, NfaTransition


@pytest.fixture
def blueprint_nfa() -> Nfa:
    return Nfa(
        states=("q0", "q1", "q2"),
        alphabet=("a", "b"),
        initial_state="q0",
        accepting_states=("q2",),
        transitions=(
            NfaTransition("q0", "a", ("q1", "q2")),
            NfaTransition("q1", "b", ("q1", "q2")),
            NfaTransition("q2", "a", ("q0",)),
            NfaTransition("q2", "b", ("q0", "q2")),
        ),
    )


@pytest.fixture
def accepts_empty_nfa() -> Nfa:
    return Nfa(
        states=("start",),
        alphabet=("x",),
        initial_state="start",
        accepting_states=("start",),
        transitions=(NfaTransition("start", "x", ("start",)),),
    )

