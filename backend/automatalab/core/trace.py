"""Deterministic conversion trace records and independent DFA replay."""

from dataclasses import dataclass
from typing import TypeAlias

from automatalab.core.models import Dfa, DfaState, DfaTransition, subset_label


@dataclass(frozen=True, slots=True)
class TransitionLookup:
    nfa_state: str
    targets: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class InitStep:
    index: int
    dfa_state: str
    subset: tuple[str, ...]
    worklist: tuple[str, ...]
    explanation: str
    type: str = "INIT"


@dataclass(frozen=True, slots=True)
class ProcessSymbolStep:
    index: int
    dfa_state: str
    symbol: str
    lookups: tuple[TransitionLookup, ...]
    result: tuple[str, ...]
    target_dfa_state: str
    is_new: bool
    worklist: tuple[str, ...]
    explanation: str
    type: str = "PROCESS_SYMBOL"


@dataclass(frozen=True, slots=True)
class StateCompleteStep:
    index: int
    dfa_state: str
    is_accepting: bool
    worklist: tuple[str, ...]
    explanation: str
    type: str = "STATE_COMPLETE"


@dataclass(frozen=True, slots=True)
class FinishStep:
    index: int
    dfa_state_count: int
    worklist: tuple[str, ...]
    explanation: str
    type: str = "FINISH"


TraceStep: TypeAlias = InitStep | ProcessSymbolStep | StateCompleteStep | FinishStep


@dataclass(frozen=True, slots=True)
class ConversionTrace:
    steps: tuple[TraceStep, ...]


class TraceReplayError(ValueError):
    """Raised when a trace is not internally replayable."""


def replay(trace: ConversionTrace) -> Dfa:
    """Rebuild a DFA from trace records without using a conversion result."""

    if not trace.steps or not isinstance(trace.steps[0], InitStep):
        raise TraceReplayError("Trace must start with INIT.")
    if not isinstance(trace.steps[-1], FinishStep):
        raise TraceReplayError("Trace must end with FINISH.")
    for expected_index, step in enumerate(trace.steps):
        if step.index != expected_index:
            raise TraceReplayError("Trace indexes must be contiguous and zero-based.")

    init = trace.steps[0]
    state_subsets: dict[str, tuple[str, ...]] = {init.dfa_state: init.subset}
    completion: dict[str, bool] = {}
    alphabet: list[str] = []
    transitions: list[DfaTransition] = []
    transition_keys: set[tuple[str, str]] = set()

    for step in trace.steps[1:-1]:
        if isinstance(step, ProcessSymbolStep):
            if step.dfa_state not in state_subsets:
                raise TraceReplayError(f"Unknown source DFA state '{step.dfa_state}'.")
            key = (step.dfa_state, step.symbol)
            if key in transition_keys:
                raise TraceReplayError("Trace contains a duplicate DFA transition.")
            transition_keys.add(key)
            if step.symbol not in alphabet:
                alphabet.append(step.symbol)

            known_subset = state_subsets.get(step.target_dfa_state)
            if step.is_new:
                if known_subset is not None:
                    raise TraceReplayError("A newly discovered DFA state already exists.")
                state_subsets[step.target_dfa_state] = step.result
            elif known_subset is None:
                raise TraceReplayError("A reused DFA state has not been discovered.")
            elif known_subset != step.result:
                raise TraceReplayError("A DFA state ID maps to inconsistent subsets.")
            transitions.append(
                DfaTransition(step.dfa_state, step.symbol, step.target_dfa_state)
            )
        elif isinstance(step, StateCompleteStep):
            if step.dfa_state not in state_subsets:
                raise TraceReplayError(f"Unknown completed DFA state '{step.dfa_state}'.")
            if step.dfa_state in completion:
                raise TraceReplayError("A DFA state is completed more than once.")
            completion[step.dfa_state] = step.is_accepting
        else:
            raise TraceReplayError("INIT and FINISH may only occur at the trace boundaries.")

    finish = trace.steps[-1]
    if finish.dfa_state_count != len(state_subsets):
        raise TraceReplayError("FINISH state count does not match discovered states.")
    if set(completion) != set(state_subsets):
        raise TraceReplayError("Every discovered DFA state must be completed exactly once.")
    expected_transition_count = len(state_subsets) * len(alphabet)
    if len(transitions) != expected_transition_count:
        raise TraceReplayError("Replayed DFA transition function is not complete.")

    initial_state = init.dfa_state
    states = tuple(
        DfaState(
            id=state_id,
            subset=subset,
            label=subset_label(subset),
            is_initial=state_id == initial_state,
            is_accepting=completion[state_id],
            is_dead=not subset,
        )
        for state_id, subset in state_subsets.items()
    )
    accepting_states = tuple(state.id for state in states if state.is_accepting)
    return Dfa(tuple(alphabet), states, initial_state, accepting_states, tuple(transitions))

