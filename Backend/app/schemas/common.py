"""Shared API schema primitives."""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import AvailabilityStatus, MetricStatus

T = TypeVar("T")


class APIModel(BaseModel):
    """Strict API model: rejects unknown fields and non-finite numbers."""

    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
        allow_inf_nan=False,
        str_strip_whitespace=True,
    )


class Page(APIModel, Generic[T]):
    items: list[T]
    limit: int
    offset: int
    total: int


class MetricValue(APIModel):
    name: str
    value: float | None = None
    unit: str | None = None
    status: MetricStatus
    method: str
    reason: str | None = None
    sample_count: int | None = None


class HardwareValue(APIModel):
    value: float | int | str | bool | None = None
    unit: str | None = None
    status: AvailabilityStatus
    method: str
    reason: str | None = None
    source_version: str | None = None


class MetricSummary(APIModel):
    metric_name: str
    unit: str | None
    status: MetricStatus
    method: str | None = None
    reason: str | None = None
    sample_count: int
    failed_count: int
    invalid_count: int
    mean: float | None = None
    median: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    stddev: float | None = None
    p90: float | None = None
    p95: float | None = None


class ErrorDetail(APIModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(APIModel):
    error: ErrorDetail
    request_id: str


class DeleteResponse(APIModel):
    id: str
    deleted: str = Field(description="'hard' or 'soft' (soft keeps history interpretable)")
    message: str


class Timestamps(APIModel):
    created_at: str
    updated_at: str | None = None


class Pagination(APIModel):
    """Resolved pagination values echoed back inside list responses."""

    limit: int
    offset: int
    total: int
