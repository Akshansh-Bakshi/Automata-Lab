"""Independent NFA and DFA string simulators."""

from dataclasses import dataclass

from automatalab.core.limits import MAX_INPUT_LENGTH
from automatalab.core.models import Dfa, Nfa
from automatalab.core.validation import ValidationIssue, require_valid_nfa


@dataclass(frozen=True, slots=True)
class NfaSimulationStep:
    position: int
    symbol: str | None
    active_states: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class DfaSimulationStep:
    position: int
    symbol: str | None
    state: str


@dataclass(frozen=True, slots=True)
class NfaSimulation:
    input: str
    accepted: bool
    steps: tuple[NfaSimulationStep, ...]


@dataclass(frozen=True, slots=True)
class DfaSimulation:
    input: str
    accepted: bool
    steps: tuple[DfaSimulationStep, ...]


@dataclass(frozen=True, slots=True)
class SimulationComparison:
    input: str
    nfa: NfaSimulation
    dfa: DfaSimulation
    agree: bool


class SimulationInputError(ValueError):
    """A structured string-input validation failure."""

    def __init__(self, issue: ValidationIssue) -> None:
        self.issue = issue
        super().__init__(issue.message)


def simulate_nfa(nfa: Nfa, input_string: str) -> NfaSimulation:
    """Simulate an NFA by tracking a canonical active-state set."""

    require_valid_nfa(nfa)
    _validate_input(input_string, nfa.alphabet)
    order = {state: index for index, state in enumerate(nfa.states)}
    transition_map = {
        (transition.source, transition.symbol): transition.targets
        for transition in nfa.transitions
    }
    active: tuple[str, ...] = (nfa.initial_state,)
    steps = [NfaSimulationStep(0, None, active)]
    for position, symbol in enumerate(input_string, start=1):
        targets = {
            target
            for state in active
            for target in transition_map.get((state, symbol), ())
        }
        active = tuple(sorted(targets, key=order.__getitem__))
        steps.append(NfaSimulationStep(position, symbol, active))
    accepted = bool(set(active) & set(nfa.accepting_states))
    return NfaSimulation(input_string, accepted, tuple(steps))


def simulate_dfa(dfa: Dfa, input_string: str) -> DfaSimulation:
    """Simulate a complete DFA by tracking exactly one state."""

    _validate_input(input_string, dfa.alphabet)
    transition_map = {
        (transition.source, transition.symbol): transition.target
        for transition in dfa.transitions
    }
    state = dfa.initial_state
    steps = [DfaSimulationStep(0, None, state)]
    for position, symbol in enumerate(input_string, start=1):
        try:
            state = transition_map[(state, symbol)]
        except KeyError as error:
            raise ValueError("DFA transition function is incomplete.") from error
        steps.append(DfaSimulationStep(position, symbol, state))
    return DfaSimulation(input_string, state in dfa.accepting_states, tuple(steps))


def compare(nfa: Nfa, dfa: Dfa, input_string: str) -> SimulationComparison:
    """Run independent simulations and report language agreement."""

    nfa_result = simulate_nfa(nfa, input_string)
    dfa_result = simulate_dfa(dfa, input_string)
    return SimulationComparison(
        input_string,
        nfa_result,
        dfa_result,
        nfa_result.accepted == dfa_result.accepted,
    )


def _validate_input(input_string: str, alphabet: tuple[str, ...]) -> None:
    if len(input_string) > MAX_INPUT_LENGTH:
        raise SimulationInputError(
            ValidationIssue(
                "LIMIT_EXCEEDED",
                "input",
                f"Input may contain at most {MAX_INPUT_LENGTH} symbols.",
            )
        )
    alphabet_set = set(alphabet)
    for position, symbol in enumerate(input_string):
        if symbol not in alphabet_set:
            raise SimulationInputError(
                ValidationIssue(
                    "SYMBOL_NOT_IN_ALPHABET",
                    f"input[{position}]",
                    f"Symbol '{symbol}' at position {position} is not in the alphabet.",
                )
            )

