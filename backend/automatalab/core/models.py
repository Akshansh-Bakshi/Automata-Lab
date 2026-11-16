"""Immutable mathematical models for epsilon-free NFAs and complete DFAs."""

from dataclasses import dataclass
from typing import TypeAlias

CanonicalSubset: TypeAlias = tuple[str, ...]


@dataclass(frozen=True, slots=True)
class NfaTransition:
    """One explicitly defined NFA transition."""

    source: str
    symbol: str
    targets: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Nfa:
    """An epsilon-free nondeterministic finite automaton.

    Tuple order is meaningful for states and alphabet. Missing transition pairs
    represent the empty set.
    """

    states: tuple[str, ...]
    alphabet: tuple[str, ...]
    initial_state: str
    accepting_states: tuple[str, ...]
    transitions: tuple[NfaTransition, ...]


@dataclass(frozen=True, slots=True)
class DfaState:
    """A reachable canonical NFA-state subset with a stable external ID."""

    id: str
    subset: CanonicalSubset
    label: str
    is_initial: bool
    is_accepting: bool
    is_dead: bool


@dataclass(frozen=True, slots=True)
class DfaTransition:
    """One entry in a complete DFA transition function."""

    source: str
    symbol: str
    target: str


@dataclass(frozen=True, slots=True)
class Dfa:
    """A deterministic finite automaton in stable discovery order."""

    alphabet: tuple[str, ...]
    states: tuple[DfaState, ...]
    initial_state: str
    accepting_states: tuple[str, ...]
    transitions: tuple[DfaTransition, ...]


def subset_label(subset: CanonicalSubset) -> str:
    """Return the deterministic display label for a canonical subset."""

    if not subset:
        return "∅"
    return "{" + ",".join(subset) + "}"

