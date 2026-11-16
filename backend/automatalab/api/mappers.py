"""Explicit adapters between API schemas and the framework-free core."""

from automatalab.api.schemas import (
    ConversionResponse,
    ConversionTraceSchema,
    DfaSchema,
    DfaSimulationSchema,
    DfaSimulationStepSchema,
    DfaStateSchema,
    DfaStatsSchema,
    DfaTransitionSchema,
    FinishStepSchema,
    InitStepSchema,
    IssueSchema,
    NfaSchema,
    NfaSimulationSchema,
    NfaSimulationStepSchema,
    ProcessSymbolStepSchema,
    SimulationResponse,
    SimulationSchema,
    StateCompleteStepSchema,
    TraceStepSchema,
    TransitionLookupSchema,
)
from automatalab.core.models import Dfa, Nfa, NfaTransition
from automatalab.core.simulation import SimulationComparison
from automatalab.core.subset_construction import ConversionResult
from automatalab.core.trace import (
    FinishStep,
    InitStep,
    ProcessSymbolStep,
    StateCompleteStep,
    TraceStep,
)
from automatalab.core.validation import ValidationIssue


def nfa_to_core(schema: NfaSchema) -> Nfa:
    """Drop API-only metadata and build an immutable core NFA."""

    return Nfa(
        states=tuple(schema.states),
        alphabet=tuple(schema.alphabet),
        initial_state=schema.initial_state,
        accepting_states=tuple(schema.accepting_states),
        transitions=tuple(
            NfaTransition(item.source, item.symbol, tuple(item.targets))
            for item in schema.transitions
        ),
    )


def issue_to_schema(issue: ValidationIssue) -> IssueSchema:
    return IssueSchema(code=issue.code, path=issue.path, message=issue.message)


def dfa_to_schema(dfa: Dfa, *, nfa_state_count: int) -> DfaSchema:
    states = [
        DfaStateSchema(
            id=state.id,
            subset=list(state.subset),
            label=state.label,
            is_initial=state.is_initial,
            is_accepting=state.is_accepting,
            is_dead=state.is_dead,
        )
        for state in dfa.states
    ]
    transitions = [
        DfaTransitionSchema(
            source=transition.source,
            symbol=transition.symbol,
            target=transition.target,
        )
        for transition in dfa.transitions
    ]
    return DfaSchema(
        alphabet=list(dfa.alphabet),
        states=states,
        initial_state=dfa.initial_state,
        accepting_states=list(dfa.accepting_states),
        transitions=transitions,
        stats=DfaStatsSchema(
            nfa_states=nfa_state_count,
            dfa_states=len(states),
            dfa_transitions=len(transitions),
            has_dead_state=any(state.is_dead for state in dfa.states),
        ),
    )


def trace_step_to_schema(step: TraceStep) -> TraceStepSchema:
    if isinstance(step, InitStep):
        return InitStepSchema(
            index=step.index,
            type="INIT",
            dfa_state=step.dfa_state,
            subset=list(step.subset),
            worklist=list(step.worklist),
            explanation=step.explanation,
        )
    if isinstance(step, ProcessSymbolStep):
        return ProcessSymbolStepSchema(
            index=step.index,
            type="PROCESS_SYMBOL",
            dfa_state=step.dfa_state,
            symbol=step.symbol,
            lookups=[
                TransitionLookupSchema(
                    nfa_state=lookup.nfa_state,
                    targets=list(lookup.targets),
                )
                for lookup in step.lookups
            ],
            result=list(step.result),
            target_dfa_state=step.target_dfa_state,
            is_new=step.is_new,
            worklist=list(step.worklist),
            explanation=step.explanation,
        )
    if isinstance(step, StateCompleteStep):
        return StateCompleteStepSchema(
            index=step.index,
            type="STATE_COMPLETE",
            dfa_state=step.dfa_state,
            is_accepting=step.is_accepting,
            worklist=list(step.worklist),
            explanation=step.explanation,
        )
    if isinstance(step, FinishStep):
        return FinishStepSchema(
            index=step.index,
            type="FINISH",
            dfa_state_count=step.dfa_state_count,
            worklist=list(step.worklist),
            explanation=step.explanation,
        )
    raise TypeError(f"Unsupported trace step: {type(step).__name__}")


def conversion_to_schema(
    result: ConversionResult, *, nfa_state_count: int
) -> ConversionResponse:
    return ConversionResponse(
        dfa=dfa_to_schema(result.dfa, nfa_state_count=nfa_state_count),
        trace=ConversionTraceSchema(
            steps=[trace_step_to_schema(step) for step in result.trace.steps]
        ),
    )


def simulation_to_schema(
    comparison: SimulationComparison,
    dfa: Dfa,
    *,
    nfa_state_count: int,
) -> SimulationResponse:
    nfa_simulation = NfaSimulationSchema(
        accepted=comparison.nfa.accepted,
        steps=[
            NfaSimulationStepSchema(
                position=step.position,
                symbol=step.symbol,
                active_states=list(step.active_states),
            )
            for step in comparison.nfa.steps
        ],
    )
    dfa_simulation = DfaSimulationSchema(
        accepted=comparison.dfa.accepted,
        steps=[
            DfaSimulationStepSchema(
                position=step.position,
                symbol=step.symbol,
                state=step.state,
            )
            for step in comparison.dfa.steps
        ],
    )
    return SimulationResponse(
        simulation=SimulationSchema(
            input=comparison.input,
            nfa=nfa_simulation,
            dfa=dfa_simulation,
            agree=comparison.agree,
        ),
        dfa=dfa_to_schema(dfa, nfa_state_count=nfa_state_count),
    )

