from fastapi import APIRouter

from automatalab import __version__
from automatalab.api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Report whether the API process is ready to serve requests."""

    return HealthResponse(status="ok", version=__version__)

