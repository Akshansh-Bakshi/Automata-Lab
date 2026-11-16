"""Strict Pydantic v2 schemas for the public AutomataLab API."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Base schema enforcing the public camelCase, no-extra-fields contract."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        frozen=True,
        populate_by_name=True,
        strict=True,
    )


class HealthResponse(ApiModel):
    status: Literal["ok"]
    version: str


class LayoutPositionSchema(ApiModel):
    x: float
    y: float


class NfaTransitionSchema(ApiModel):
    source: str = Field(validation_alias="from", serialization_alias="from")
    symbol: str
    targets: list[str] = Field(validation_alias="to", serialization_alias="to")


class NfaSchema(ApiModel):
    schema_version: Literal[1]
    name: str | None = Field(default=None, max_length=80)
    alphabet: list[str]
    states: list[str]
    initial_state: str
    accepting_states: list[str]
    transitions: list[NfaTransitionSchema]
    layout: dict[str, LayoutPositionSchema] | None = None


class NfaRequest(ApiModel):
    nfa: NfaSchema


class SimulationRequest(ApiModel):
    nfa: NfaSchema
    input: str


class IssueSchema(ApiModel):
    code: str
    path: str
    message: str


class ValidationResponse(ApiModel):
    valid: Literal[True] = True
    warnings: list[IssueSchema]


class DfaStateSchema(ApiModel):
    id: str
    subset: list[str]
    label: str
    is_initial: bool
    is_accepting: bool
    is_dead: bool


class DfaTransitionSchema(ApiModel):
    source: str = Field(validation_alias="from", serialization_alias="from")
    symbol: str
    target: str = Field(validation_alias="to", serialization_alias="to")


class DfaStatsSchema(ApiModel):
    nfa_states: int
    dfa_states: int
    dfa_transitions: int
    has_dead_state: bool


class DfaSchema(ApiModel):
    alphabet: list[str]
    states: list[DfaStateSchema]
    initial_state: str
    accepting_states: list[str]
    transitions: list[DfaTransitionSchema]
    stats: DfaStatsSchema


class TransitionLookupSchema(ApiModel):
    nfa_state: str
    targets: list[str]


class InitStepSchema(ApiModel):
    index: int
    type: Literal["INIT"]
    dfa_state: str
    subset: list[str]
    worklist: list[str]
    explanation: str


class ProcessSymbolStepSchema(ApiModel):
    index: int
    type: Literal["PROCESS_SYMBOL"]
    dfa_state: str
    symbol: str
    lookups: list[TransitionLookupSchema]
    result: list[str]
    target_dfa_state: str
    is_new: bool
    worklist: list[str]
    explanation: str


class StateCompleteStepSchema(ApiModel):
    index: int
    type: Literal["STATE_COMPLETE"]
    dfa_state: str
    is_accepting: bool
    worklist: list[str]
    explanation: str


class FinishStepSchema(ApiModel):
    index: int
    type: Literal["FINISH"]
    dfa_state_count: int
    worklist: list[str]
    explanation: str


TraceStepSchema = Annotated[
    InitStepSchema | ProcessSymbolStepSchema | StateCompleteStepSchema | FinishStepSchema,
    Field(discriminator="type"),
]


class ConversionTraceSchema(ApiModel):
    steps: list[TraceStepSchema]


class ConversionResponse(ApiModel):
    dfa: DfaSchema
    trace: ConversionTraceSchema


class NfaSimulationStepSchema(ApiModel):
    position: int
    symbol: str | None
    active_states: list[str]


class DfaSimulationStepSchema(ApiModel):
    position: int
    symbol: str | None
    state: str


class NfaSimulationSchema(ApiModel):
    accepted: bool
    steps: list[NfaSimulationStepSchema]


class DfaSimulationSchema(ApiModel):
    accepted: bool
    steps: list[DfaSimulationStepSchema]


class SimulationSchema(ApiModel):
    input: str
    nfa: NfaSimulationSchema
    dfa: DfaSimulationSchema
    agree: bool


class SimulationResponse(ApiModel):
    simulation: SimulationSchema
    dfa: DfaSchema


class ExampleSchema(ApiModel):
    id: str
    name: str
    description: str
    nfa: NfaSchema


class ExamplesResponse(ApiModel):
    examples: list[ExampleSchema]


class ErrorDetailSchema(ApiModel):
    code: str
    message: str
    issues: list[IssueSchema]


class ErrorResponse(ApiModel):
    error: ErrorDetailSchema

