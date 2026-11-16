"""Structured API error responses and exception-handler registration."""

import logging
from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHttpException

from automatalab.api.schemas import ErrorResponse
from automatalab.core.simulation import SimulationInputError
from automatalab.core.subset_construction import DfaStateLimitError
from automatalab.core.validation import InvalidNfaError, ValidationIssue

logger = logging.getLogger(__name__)

COMMON_ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorResponse, "description": "Malformed JSON"},
    413: {"model": ErrorResponse, "description": "Request body limit exceeded"},
    422: {"model": ErrorResponse, "description": "Invalid request content"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}


def error_content(
    code: str,
    message: str,
    issues: Sequence[ValidationIssue],
) -> dict[str, object]:
    return {
        "error": {
            "code": code,
            "message": message,
            "issues": [
                {"code": issue.code, "path": issue.path, "message": issue.message}
                for issue in issues
            ],
        }
    }


def register_exception_handlers(application: FastAPI) -> None:
    """Install deterministic handlers without exposing internal tracebacks."""

    @application.exception_handler(RequestValidationError)
    async def request_validation_handler(
        request: Request, exception: RequestValidationError
    ) -> JSONResponse:
        del request
        errors = exception.errors()
        if any(error.get("type") == "json_invalid" for error in errors):
            issue = ValidationIssue(
                "MALFORMED_JSON", "body", "Request body is not valid JSON."
            )
            return JSONResponse(
                status_code=400,
                content=error_content(issue.code, issue.message, [issue]),
            )

        issues = [
            ValidationIssue(
                "SCHEMA_VIOLATION",
                _validation_path(error.get("loc", ())),
                str(error.get("msg", "Request schema validation failed.")),
            )
            for error in errors
        ]
        return JSONResponse(
            status_code=422,
            content=error_content(
                "SCHEMA_VIOLATION", "Request schema validation failed.", issues
            ),
        )

    @application.exception_handler(InvalidNfaError)
    async def invalid_nfa_handler(
        request: Request, exception: InvalidNfaError
    ) -> JSONResponse:
        del request
        issues = list(exception.issues)
        first = issues[0]
        return JSONResponse(
            status_code=422,
            content=error_content(first.code, first.message, issues),
        )

    @application.exception_handler(SimulationInputError)
    async def simulation_input_handler(
        request: Request, exception: SimulationInputError
    ) -> JSONResponse:
        del request
        issue = exception.issue
        return JSONResponse(
            status_code=422,
            content=error_content(issue.code, issue.message, [issue]),
        )

    @application.exception_handler(DfaStateLimitError)
    async def dfa_limit_handler(
        request: Request, exception: DfaStateLimitError
    ) -> JSONResponse:
        del request
        issue = ValidationIssue("LIMIT_EXCEEDED", "nfa", str(exception))
        return JSONResponse(
            status_code=422,
            content=error_content(issue.code, issue.message, [issue]),
        )

    @application.exception_handler(StarletteHttpException)
    async def http_error_handler(
        request: Request, exception: StarletteHttpException
    ) -> JSONResponse:
        del request
        code = "NOT_FOUND" if exception.status_code == 404 else "HTTP_ERROR"
        message = str(exception.detail)
        issue = ValidationIssue(code, "request", message)
        return JSONResponse(
            status_code=exception.status_code,
            content=error_content(code, message, [issue]),
        )

    @application.exception_handler(Exception)
    async def internal_error_handler(request: Request, exception: Exception) -> JSONResponse:
        logger.error(
            "Unhandled API exception for %s %s",
            request.method,
            request.url.path,
            exc_info=(type(exception), exception, exception.__traceback__),
        )
        issue = ValidationIssue(
            "INTERNAL_ERROR", "request", "An unexpected internal error occurred."
        )
        return JSONResponse(
            status_code=500,
            content=error_content(issue.code, issue.message, [issue]),
        )


def _validation_path(location: object) -> str:
    if not isinstance(location, (tuple, list)):
        return "body"
    path = ""
    for part in location:
        if part == "body":
            continue
        if isinstance(part, int):
            path += f"[{part}]"
        else:
            path += ("." if path else "") + str(part)
    return path or "body"

