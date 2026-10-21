"""Centralized error handling.

Every error body has the same shape::

    {"error": {"code": "...", "message": "...", "details": {...}},
     "request_id": "..."}

Stack traces, local paths, environment values and raw exception internals are
never returned to clients.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import AppError
from app.core.logging import get_logger, get_request_id

logger = get_logger(__name__)


def _error_response(status_code: int, code: str, message: str, details: dict | None = None):
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {"code": code, "message": message, "details": details or {}},
            "request_id": get_request_id() or "",
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):  # noqa: ARG001
        return _error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):  # noqa: ARG001
        fields = []
        for error in exc.errors():
            location = [str(part) for part in error.get("loc", ()) if part != "body"]
            fields.append(
                {
                    "field": ".".join(location),
                    "message": str(error.get("msg", "invalid value")),
                    "type": str(error.get("type", "value_error")),
                }
            )
        return _error_response(
            422,
            "validation_error",
            "Request validation failed",
            {"fields": fields},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):  # noqa: ARG001
        code = {
            404: "not_found",
            405: "method_not_allowed",
            409: "conflict",
            429: "rate_limited",
            503: "service_unavailable",
        }.get(exc.status_code, "http_error")
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return _error_response(exc.status_code, code, detail)

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception):  # noqa: ARG001
        logger.exception("unhandled exception")
        return _error_response(
            500,
            "internal_error",
            "Unexpected server error; the request ID can be used to locate server logs",
        )
