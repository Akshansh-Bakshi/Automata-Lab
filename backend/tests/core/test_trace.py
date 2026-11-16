from dataclasses import replace

import pytest

from automatalab.core.models import Nfa
from automatalab.core.subset_construction import convert
from automatalab.core.trace import (
    ConversionTrace,
    FinishStep,
    InitStep,
    ProcessSymbolStep,
    StateCompleteStep,
    TraceReplayError,
    replay,
)


def test_i10_replaying_trace_independently_reconstructs_dfa(blueprint_nfa: Nfa) -> None:
    result = convert(blueprint_nfa)
    replayed = replay(result.trace)

    assert replayed == result.dfa
    assert replayed is not result.dfa
    assert replayed.states is not result.dfa.states


def test_trace_has_contiguous_indexes_and_blueprint_step_count(blueprint_nfa: Nfa) -> None:
    result = convert(blueprint_nfa)
    steps = result.trace.steps

    assert [step.index for step in steps] == list(range(len(steps)))
    assert len(steps) == 2 + len(result.dfa.states) * (len(result.dfa.alphabet) + 1)
    assert isinstance(steps[0], InitStep)
    assert isinstance(steps[-1], FinishStep)


def test_process_step_records_lookups_result_worklist_and_explanation(
    blueprint_nfa: Nfa,
) -> None:
    step = convert(blueprint_nfa).trace.steps[1]

    assert isinstance(step, ProcessSymbolStep)
    assert step.dfa_state == "D0"
    assert step.symbol == "a"
    assert [(lookup.nfa_state, lookup.targets) for lookup in step.lookups] == [
        ("q0", ("q1", "q2"))
    ]
    assert step.result == ("q1", "q2")
    assert step.target_dfa_state == "D1"
    assert step.is_new
    assert step.worklist == ("D1",)
    assert step.explanation == (
        "On a, q0 moves to {q1,q2}. Union = {q1,q2}. New subset: add D1 and "
        "transition D0 –a→ D1."
    )


def test_trace_explains_missing_moves_dead_state_reuse_and_acceptance(
    blueprint_nfa: Nfa,
) -> None:
    steps = convert(blueprint_nfa).trace.steps
    process_steps = [step for step in steps if isinstance(step, ProcessSymbolStep)]
    complete_steps = [step for step in steps if isinstance(step, StateCompleteStep)]

    assert any("has no move" in step.explanation for step in process_steps)
    assert any("empty subset has no NFA moves" in step.explanation for step in process_steps)
    assert any("already exists" in step.explanation for step in process_steps)
    assert any("is accepting" in step.explanation for step in complete_steps)
    assert any("is not accepting" in step.explanation for step in complete_steps)


def test_replay_rejects_missing_or_misplaced_boundaries(blueprint_nfa: Nfa) -> None:
    trace = convert(blueprint_nfa).trace

    with pytest.raises(TraceReplayError, match="start"):
        replay(ConversionTrace(trace.steps[1:]))
    with pytest.raises(TraceReplayError, match="end"):
        replay(ConversionTrace(trace.steps[:-1]))
    misplaced_finish = replace(trace.steps[-1], index=2)
    with pytest.raises(TraceReplayError, match="boundaries"):
        replay(
            ConversionTrace(
                (trace.steps[0], replace(trace.steps[0], index=1), misplaced_finish)
            )
        )


def test_replay_rejects_noncontiguous_indexes(blueprint_nfa: Nfa) -> None:
    trace = convert(blueprint_nfa).trace
    steps = list(trace.steps)
    steps[1] = replace(steps[1], index=99)

    with pytest.raises(TraceReplayError, match="contiguous"):
        replay(ConversionTrace(tuple(steps)))


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda step: replace(step, dfa_state="unknown"), "Unknown source"),
        (lambda step: replace(step, is_new=False, target_dfa_state="unknown"), "reused"),
        (lambda step: replace(step, is_new=True, target_dfa_state="D0"), "already exists"),
        (lambda step: replace(step, is_new=False, target_dfa_state="D0"), "inconsistent"),
    ],
)
def test_replay_rejects_invalid_process_state_references(
    blueprint_nfa: Nfa, mutation: object, message: str
) -> None:
    trace = convert(blueprint_nfa).trace
    steps = list(trace.steps)
    first_process = steps[1]
    assert isinstance(first_process, ProcessSymbolStep)
    steps[1] = mutation(first_process)  # type: ignore[operator]

    with pytest.raises(TraceReplayError, match=message):
        replay(ConversionTrace(tuple(steps)))


def test_replay_rejects_duplicate_transition(blueprint_nfa: Nfa) -> None:
    trace = convert(blueprint_nfa).trace
    steps = list(trace.steps)
    first = steps[1]
    second = steps[2]
    assert isinstance(first, ProcessSymbolStep)
    assert isinstance(second, ProcessSymbolStep)
    steps[2] = replace(second, symbol=first.symbol)

    with pytest.raises(TraceReplayError, match="duplicate DFA transition"):
        replay(ConversionTrace(tuple(steps)))


def test_replay_rejects_invalid_completion_records(blueprint_nfa: Nfa) -> None:
    trace = convert(blueprint_nfa).trace
    steps = list(trace.steps)
    first_complete_index = next(
        index for index, step in enumerate(steps) if isinstance(step, StateCompleteStep)
    )
    complete = steps[first_complete_index]
    assert isinstance(complete, StateCompleteStep)

    unknown_steps = steps.copy()
    unknown_steps[first_complete_index] = replace(complete, dfa_state="unknown")
    with pytest.raises(TraceReplayError, match="Unknown completed"):
        replay(ConversionTrace(tuple(unknown_steps)))

    duplicate_steps = steps.copy()
    later_complete_index = next(
        index
        for index, step in enumerate(steps[first_complete_index + 1 :], first_complete_index + 1)
        if isinstance(step, StateCompleteStep)
    )
    later_complete = steps[later_complete_index]
    assert isinstance(later_complete, StateCompleteStep)
    duplicate_steps[later_complete_index] = replace(later_complete, dfa_state=complete.dfa_state)
    with pytest.raises(TraceReplayError, match="more than once"):
        replay(ConversionTrace(tuple(duplicate_steps)))


def test_replay_rejects_invalid_finish_metadata(blueprint_nfa: Nfa) -> None:
    trace = convert(blueprint_nfa).trace
    steps = list(trace.steps)
    finish = steps[-1]
    assert isinstance(finish, FinishStep)
    steps[-1] = replace(finish, dfa_state_count=99)

    with pytest.raises(TraceReplayError, match="state count"):
        replay(ConversionTrace(tuple(steps)))


def test_replay_rejects_missing_completion_or_transition(blueprint_nfa: Nfa) -> None:
    trace = convert(blueprint_nfa).trace
    steps = list(trace.steps)
    complete_index = next(
        index for index, step in enumerate(steps) if isinstance(step, StateCompleteStep)
    )
    without_complete = steps[:complete_index] + steps[complete_index + 1 :]
    without_complete = [replace(step, index=index) for index, step in enumerate(without_complete)]
    with pytest.raises(TraceReplayError, match="completed exactly once"):
        replay(ConversionTrace(tuple(without_complete)))

    process_index = max(
        index for index, step in enumerate(steps) if isinstance(step, ProcessSymbolStep)
    )
    without_process = steps[:process_index] + steps[process_index + 1 :]
    without_process = [replace(step, index=index) for index, step in enumerate(without_process)]
    with pytest.raises(TraceReplayError, match="not complete"):
        replay(ConversionTrace(tuple(without_process)))

