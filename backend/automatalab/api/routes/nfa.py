from fastapi import APIRouter

from automatalab.api.errors import COMMON_ERROR_RESPONSES
from automatalab.api.schemas import (
    ConversionResponse,
    NfaRequest,
    ValidationResponse,
)
from automatalab.api.services import convert_nfa_request, validate_nfa_request

router = APIRouter(prefix="/nfa", tags=["nfa"])


@router.post(
    "/validate",
    response_model=ValidationResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def validate_nfa(payload: NfaRequest) -> ValidationResponse:
    """Validate semantic content and report non-blocking warnings."""

    return validate_nfa_request(payload.nfa)


@router.post(
    "/convert",
    response_model=ConversionResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def convert_nfa(payload: NfaRequest) -> ConversionResponse:
    """Convert a valid epsilon-free NFA into a complete DFA and trace."""

    return convert_nfa_request(payload.nfa)

