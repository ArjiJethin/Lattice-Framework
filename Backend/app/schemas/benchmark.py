"""Benchmark API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field, field_validator

from app.core.validation import validate_generation_parameters
from app.schemas.common import APIModel, MetricSummary, Page


class BenchmarkCreate(APIModel):
    configuration_id: str
    workload_id: str
    warmup_iterations: int | None = Field(default=None, ge=0, le=100)
    repetitions: int | None = Field(default=None, ge=1, le=1000)
    timeout_seconds: float | None = Field(default=None, gt=0, le=86_400)
    generation_parameters: dict[str, Any] = Field(default_factory=dict)
    collect_memory: bool = True
    memory_sampling_interval_ms: int | None = Field(default=None, ge=10, le=5000)
    quality_evaluator: str | None = Field(default=None, max_length=60)
    protocol_version: str | None = Field(default=None, max_length=60)

    @field_validator("generation_parameters")
    @classmethod
    def _generation(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_generation_parameters(value, max_output_tokens=2_147_483_647)


class BenchmarkAccepted(APIModel):
    job_id: str
    benchmark_run_id: str
    status: str
    message: str
    test_only: bool = False
    #: True when an ``X-Request-ID`` replay returned an already-persisted
    #: submission instead of creating a second run.
    duplicate: bool = False


class MeasurementRead(APIModel):
    id: str
    run_id: str
    sequence: int
    repetition_index: int | None
    kind: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    input_tokens: int | None
    output_tokens: int | None
    token_count_source: str | None
    ttft_ms: float | None
    latency_ms: float | None
    generation_duration_ms: float | None
    time_per_output_token_ms: float | None
    output_throughput_tps: float | None
    peak_process_rss_mb: float | None
    system_ram_used_mb: float | None
    gpu_device_memory_used_mb: float | None
    gpu_utilization_pct: float | None
    metrics_json: dict[str, Any]
    error_code: str | None
    error_message: str | None
    runtime_metadata: dict[str, Any]


class MeasurementPage(Page[MeasurementRead]):
    pass


class BenchmarkRunRead(APIModel):
    id: str
    job_id: str
    configuration_id: str
    workload_id: str
    status: str
    protocol_version: str
    snapshot_schema_version: str
    snapshot_hash: str
    requested_warmups: int
    requested_repetitions: int
    completed_repetitions: int
    failed_repetitions: int
    completed_warmups: int
    runtime_metadata: dict[str, Any]
    model_identity: dict[str, Any]
    hardware_snapshot: dict[str, Any]
    software_versions: dict[str, Any]
    configuration_snapshot: dict[str, Any]
    workload_snapshot: dict[str, Any]
    protocol_snapshot: dict[str, Any]
    aggregate_summary: dict[str, Any]
    metric_summaries: list[MetricSummary] = Field(default_factory=list)
    quality_result: dict[str, Any] | None
    feasibility_result: dict[str, Any] | None
    test_only: bool
    error_code: str | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    duration_ms: float | None


class BenchmarkRunPage(Page[BenchmarkRunRead]):
    pass


class BenchmarkDetail(BenchmarkRunRead):
    measurements_count: int
    warmup_count: int
    measured_count: int


class ComparisonWarning(APIModel):
    code: str
    severity: str
    message: str
    run_ids: list[str] = Field(default_factory=list)


class ComparisonMetric(APIModel):
    metric_name: str
    unit: str | None
    values: dict[str, MetricSummary | None]


class RunComparison(APIModel):
    comparable: bool
    warnings: list[ComparisonWarning]
    run_ids: list[str]
    metric_sections: list[ComparisonMetric] = Field(default_factory=list)
    checked_fields: dict[str, Any] = Field(default_factory=dict)


class BenchmarkCancelResponse(APIModel):
    benchmark_run_id: str
    job_id: str
    status: str
    message: str
