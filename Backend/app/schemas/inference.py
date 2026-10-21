"""Inference API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field, field_validator, model_validator

from app.core.validation import validate_generation_parameters
from app.schemas.common import APIModel, Page


class InferenceCreate(APIModel):
    configuration_id: str | None = None
    decision_id: str | None = None
    prompt: str = Field(min_length=1, max_length=64_000)
    system_prompt: str | None = Field(default=None, max_length=16_000)
    generation_parameters: dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: float | None = Field(default=None, gt=0, le=3600)
    retain_output: bool = False

    @field_validator("generation_parameters")
    @classmethod
    def _generation(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_generation_parameters(value, max_output_tokens=2_147_483_647)

    @model_validator(mode="after")
    def _exactly_one_target(self) -> InferenceCreate:
        provided = [self.configuration_id, self.decision_id]
        if sum(1 for item in provided if item) != 1:
            raise ValueError("provide exactly one of configuration_id or decision_id")
        return self


class InferenceAccepted(APIModel):
    execution_id: str
    job_id: str
    status: str
    output_retention_policy: str
    test_only: bool = False
    message: str


class InferenceRead(APIModel):
    id: str
    job_id: str
    configuration_id: str
    decision_id: str | None
    status: str
    configuration_snapshot: dict[str, Any]
    generation_parameters: dict[str, Any]
    runtime_metadata: dict[str, Any]
    hardware_snapshot: dict[str, Any]
    input_tokens: int | None
    output_tokens: int | None
    token_count_source: str | None
    latency_ms: float | None
    ttft_ms: float | None
    output_throughput_tps: float | None
    peak_process_rss_mb: float | None
    metrics_json: dict[str, Any]
    validation_status: str
    constraint_results: list[dict[str, Any]]
    output_retention_policy: str
    retained_output: str | None = None
    prompt_retained: bool
    test_only: bool
    error_code: str | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    duration_ms: float | None


class InferencePage(Page[InferenceRead]):
    pass
