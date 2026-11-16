"""Small ASGI middleware used by the public API."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from automatalab.api.errors import error_content
from automatalab.core.validation import ValidationIssue

MAX_REQUEST_BODY_BYTES = 256 * 1024


class RequestBodyTooLarge(Exception):
    """Raised while receiving a streamed request that crosses the body limit."""


class RequestBodyLimitMiddleware:
    """Reject request bodies above the blueprint's 256 KB limit."""

    def __init__(self, app: ASGIApp, max_body_bytes: int = MAX_REQUEST_BODY_BYTES) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length is not None:
            try:
                if int(content_length) > self.max_body_bytes:
                    await self._send_limit_response(scope, receive, send)
                    return
            except ValueError:
                pass

        received_bytes = 0
        response_started = False

        async def limited_receive() -> Message:
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_body_bytes:
                    raise RequestBodyTooLarge
            return message

        async def tracked_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracked_send)
        except RequestBodyTooLarge:
            if response_started:
                raise
            await self._send_limit_response(scope, receive, send)

    async def _send_limit_response(self, scope: Scope, receive: Receive, send: Send) -> None:
        issue = ValidationIssue(
            "LIMIT_EXCEEDED",
            "body",
            f"Request body may not exceed {self.max_body_bytes} bytes.",
        )
        response = JSONResponse(
            status_code=413,
            content=error_content(issue.code, issue.message, [issue]),
        )
        await response(scope, receive, send)

