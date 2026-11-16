"""Application services that keep HTTP route handlers declarative."""

from automatalab.api.mappers import (
    conversion_to_schema,
    issue_to_schema,
    nfa_to_core,
    simulation_to_schema,
)
from automatalab.api.schemas import (
    ConversionResponse,
    NfaSchema,
    SimulationResponse,
    ValidationResponse,
)
from automatalab.api.validation import nfa_warnings, validate_api_nfa
from automatalab.core.models import Nfa
from automatalab.core.simulation import compare
from automatalab.core.subset_construction import convert
from automatalab.core.validation import InvalidNfaError


def validated_nfa(schema: NfaSchema) -> Nfa:
    nfa = nfa_to_core(schema)
    issues = validate_api_nfa(schema, nfa)
    if issues:
        raise InvalidNfaError(issues)
    return nfa


def validate_nfa_request(schema: NfaSchema) -> ValidationResponse:
    nfa = validated_nfa(schema)
    return ValidationResponse(
        warnings=[issue_to_schema(issue) for issue in nfa_warnings(nfa)]
    )


def convert_nfa_request(schema: NfaSchema) -> ConversionResponse:
    nfa = validated_nfa(schema)
    result = convert(nfa)
    return conversion_to_schema(result, nfa_state_count=len(nfa.states))


def simulate_nfa_request(schema: NfaSchema, input_string: str) -> SimulationResponse:
    nfa = validated_nfa(schema)
    conversion = convert(nfa)
    comparison = compare(nfa, conversion.dfa, input_string)
    return simulation_to_schema(
        comparison,
        conversion.dfa,
        nfa_state_count=len(nfa.states),
    )

