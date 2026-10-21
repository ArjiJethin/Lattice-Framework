"""Job API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.schemas.common import APIModel, Page


class JobRead(APIModel):
    id: str
    job_type: str
    status: str
    progress: float | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    result_summary: dict[str, Any] | None = None
    error_code: str | None = None
    error_message: str | None = None
    attempt: int = 1
    request_id: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: float | None = None
    benchmark_run_id: str | None = None
    inference_execution_id: str | None = None


class JobPage(Page[JobRead]):
    pass
