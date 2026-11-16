from fastapi import APIRouter

from automatalab.api.errors import COMMON_ERROR_RESPONSES
from automatalab.api.examples import load_examples
from automatalab.api.schemas import ExamplesResponse

router = APIRouter(tags=["examples"])


@router.get(
    "/examples",
    response_model=ExamplesResponse,
    response_model_exclude_none=True,
    responses=COMMON_ERROR_RESPONSES,
)
def examples() -> ExamplesResponse:
    """Return the stable collection of curated, validated NFAs."""

    return ExamplesResponse(examples=list(load_examples()))

