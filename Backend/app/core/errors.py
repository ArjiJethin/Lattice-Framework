"""Typed application errors mapped to stable HTTP responses.

Services and repositories raise these; routes never build error payloads
themselves.  Messages are always safe for API exposure (no stack traces, no
local filesystem paths, no environment values).
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for expected, user-facing failures."""

    code = "internal_error"
    status_code = 500
    default_message = "Unexpected server error"

    def __init__(
        self,
        message: str | None = None,
        *,
        details: dict[str, Any] | None = None,
        code: str | None = None,
        status_code: int | None = None,
    ) -> None:
        self.message = message or self.default_message
        self.details = details or {}
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class NotFoundError(AppError):
    code = "not_found"
    status_code = 404
    default_message = "Resource not found"


class ConflictError(AppError):
    code = "conflict"
    status_code = 409
    default_message = "Resource state conflict"


class ValidationFailure(AppError):
    code = "validation_error"
    status_code = 422
    default_message = "Request validation failed"


class CapacityError(AppError):
    code = "queue_capacity_exhausted"
    status_code = 503
    default_message = "Job queue capacity is exhausted"


class UnsupportedOperationError(AppError):
    code = "unsupported_operation"
    status_code = 409
    default_message = "Operation is not supported in this deployment"


class RuntimeUnavailableError(AppError):
    code = "runtime_unavailable"
    status_code = 503
    default_message = "No inference runtime adapter is available"


class RuntimePreflightError(AppError):
    code = "runtime_preflight_failed"
    status_code = 422
    default_message = "Configuration failed runtime preflight"


class ModelUnavailableError(AppError):
    code = "model_unavailable"
    status_code = 422
    default_message = "Model file is not available"


class BenchmarkNotExecutableError(AppError):
    code = "benchmark_not_executable"
    status_code = 409
    default_message = "Benchmark run cannot be executed in its current state"


class DecisionNotExecutableError(AppError):
    code = "decision_not_executable"
    status_code = 409
    default_message = "Optimization decision cannot be executed"


class UnsafePathError(ValidationFailure):
    code = "unsafe_model_path"
    default_message = "Model path is not inside an approved model root"


class ArtifactTooLargeError(ValidationFailure):
    code = "artifact_too_large"
    default_message = "Request or artifact exceeds the configured size limit"
