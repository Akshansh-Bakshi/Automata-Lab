from fastapi import APIRouter

from automatalab.api.errors import COMMON_ERROR_RESPONSES
from automatalab.api.schemas import SimulationRequest, SimulationResponse
from automatalab.api.services import simulate_nfa_request

router = APIRouter(tags=["simulation"])


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def simulate(payload: SimulationRequest) -> SimulationResponse:
    """Convert the supplied NFA internally and simulate both machines."""

    return simulate_nfa_request(payload.nfa, payload.input)

