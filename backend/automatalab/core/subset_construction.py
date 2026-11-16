"""Breadth-first, deterministic NFA-to-DFA subset construction."""

from collections import deque
from dataclasses import dataclass

from automatalab.core.limits import MAX_DFA_STATES
from automatalab.core.models import (
    CanonicalSubset,
    Dfa,
    DfaState,
    DfaTransition,
    Nfa,
    subset_label,
)
from automatalab.core.trace import (
    ConversionTrace,
    FinishStep,
    InitStep,
    ProcessSymbolStep,
    StateCompleteStep,
    TransitionLookup,
)
from automatalab.core.validation import require_valid_nfa


@dataclass(frozen=True, slots=True)
class ConversionResult:
    dfa: Dfa
    trace: ConversionTrace


class DfaStateLimitError(ValueError):
    """Raised before conversion would exceed the generated-state cap."""

    code = "LIMIT_EXCEEDED"

    def __init__(self, limit: int) -> None:
        self.limit = limit
        super().__init__(f"Conversion would exceed the limit of {limit} DFA states.")


def convert(nfa: Nfa, *, max_dfa_states: int = MAX_DFA_STATES) -> ConversionResult:
    """Convert a valid epsilon-free NFA using lazy BFS subset construction."""

    require_valid_nfa(nfa)
    if not 1 <= max_dfa_states <= MAX_DFA_STATES:
        raise ValueError(f"max_dfa_states must be between 1 and {MAX_DFA_STATES}.")

    state_order = {state: index for index, state in enumerate(nfa.states)}
    accepting = set(nfa.accepting_states)
    transition_map = {
        (transition.source, transition.symbol): transition.targets
        for transition in nfa.transitions
    }

    def canonicalize(states: set[str]) -> CanonicalSubset:
        return tuple(sorted(states, key=state_order.__getitem__))

    initial_subset = (nfa.initial_state,)
    discovered: dict[CanonicalSubset, str] = {initial_subset: "D0"}
    queue: deque[CanonicalSubset] = deque([initial_subset])
    dfa_states: list[DfaState] = [
        _make_dfa_state("D0", initial_subset, initial_subset, accepting)
    ]
    dfa_transitions: list[DfaTransition] = []
    steps: list[InitStep | ProcessSymbolStep | StateCompleteStep | FinishStep] = [
        InitStep(
            index=0,
            dfa_state="D0",
            subset=initial_subset,
            worklist=("D0",),
            explanation=(
                "Start with the subset containing only the initial state: "
                f"D0 = {subset_label(initial_subset)}."
            ),
        )
    ]

    while queue:
        source_subset = queue.popleft()
        source_id = discovered[source_subset]
        for symbol in nfa.alphabet:
            lookups = tuple(
                TransitionLookup(
                    state,
                    canonicalize(set(transition_map.get((state, symbol), ()))),
                )
                for state in source_subset
            )
            target_members = {
                target for lookup in lookups for target in lookup.targets
            }
            target_subset = canonicalize(target_members)
            target_id = discovered.get(target_subset)
            is_new = target_id is None
            if is_new:
                if len(discovered) >= max_dfa_states:
                    raise DfaStateLimitError(max_dfa_states)
                target_id = f"D{len(discovered)}"
                discovered[target_subset] = target_id
                queue.append(target_subset)
                dfa_states.append(
                    _make_dfa_state(target_id, target_subset, initial_subset, accepting)
                )

            assert target_id is not None
            dfa_transitions.append(DfaTransition(source_id, symbol, target_id))
            steps.append(
                ProcessSymbolStep(
                    index=len(steps),
                    dfa_state=source_id,
                    symbol=symbol,
                    lookups=lookups,
                    result=target_subset,
                    target_dfa_state=target_id,
                    is_new=is_new,
                    worklist=tuple(discovered[item] for item in queue),
                    explanation=_process_explanation(
                        source_subset,
                        source_id,
                        symbol,
                        lookups,
                        target_subset,
                        target_id,
                        is_new,
                    ),
                )
            )

        is_accepting = bool(set(source_subset) & accepting)
        steps.append(
            StateCompleteStep(
                index=len(steps),
                dfa_state=source_id,
                is_accepting=is_accepting,
                worklist=tuple(discovered[item] for item in queue),
                explanation=_complete_explanation(source_id, is_accepting),
            )
        )

    accepting_states = tuple(state.id for state in dfa_states if state.is_accepting)
    dfa = Dfa(
        alphabet=nfa.alphabet,
        states=tuple(dfa_states),
        initial_state="D0",
        accepting_states=accepting_states,
        transitions=tuple(dfa_transitions),
    )
    steps.append(
        FinishStep(
            index=len(steps),
            dfa_state_count=len(dfa_states),
            worklist=(),
            explanation=(
                f"The worklist is empty. The DFA has {len(dfa_states)} states and "
                f"{len(dfa_transitions)} transitions."
            ),
        )
    )
    return ConversionResult(dfa, ConversionTrace(tuple(steps)))


def _make_dfa_state(
    state_id: str,
    subset: CanonicalSubset,
    initial_subset: CanonicalSubset,
    accepting: set[str],
) -> DfaState:
    return DfaState(
        id=state_id,
        subset=subset,
        label=subset_label(subset),
        is_initial=subset == initial_subset,
        is_accepting=bool(set(subset) & accepting),
        is_dead=not subset,
    )


def _process_explanation(
    source_subset: CanonicalSubset,
    source_id: str,
    symbol: str,
    lookups: tuple[TransitionLookup, ...],
    target_subset: CanonicalSubset,
    target_id: str,
    is_new: bool,
) -> str:
    if source_subset:
        lookup_text = "; ".join(
            (
                f"{lookup.nfa_state} moves to {subset_label(lookup.targets)}"
                if lookup.targets
                else f"{lookup.nfa_state} has no move"
            )
            for lookup in lookups
        )
        beginning = f"On {symbol}, {lookup_text}."
    else:
        beginning = f"On {symbol}, the empty subset has no NFA moves."
    result_text = f" Union = {subset_label(target_subset)}."
    if is_new:
        ending = (
            f" New subset: add {target_id} and transition "
            f"{source_id} –{symbol}→ {target_id}."
        )
    else:
        ending = (
            f" This subset already exists as {target_id}, so add transition "
            f"{source_id} –{symbol}→ {target_id}."
        )
    return beginning + result_text + ending


def _complete_explanation(state_id: str, is_accepting: bool) -> str:
    if is_accepting:
        return (
            f"All symbols processed for {state_id}. It contains an accepting NFA state, "
            f"so {state_id} is accepting."
        )
    return (
        f"All symbols processed for {state_id}. It contains no accepting NFA state, "
        f"so {state_id} is not accepting."
    )

