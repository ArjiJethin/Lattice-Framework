"""History, comparison and import/export schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.schemas.benchmark import BenchmarkRunRead, ComparisonWarning, MeasurementRead
from app.schemas.common import APIModel
from app.schemas.resources import ConfigurationCreate


class HistoryCounts(APIModel):
    configurations: int
    workloads: int
    jobs: int
    benchmark_runs: int
    optimization_decisions: int
    inference_executions: int
    failed_jobs: int


class HistoryRecordSummary(APIModel):
    id: str
    kind: str
    status: str
    created_at: datetime
    title: str | None = None
    summary: dict[str, Any] = Field(default_factory=dict)


class MetricAggregate(APIModel):
    metric_name: str
    unit: str | None
    sample_count: int
    mean: float | None
    median: float | None
    minimum: float | None
    maximum: float | None


class HistorySummary(APIModel):
    counts: HistoryCounts
    latest_runs: list[HistoryRecordSummary]
    latest_decisions: list[HistoryRecordSummary]
    latest_inference: list[HistoryRecordSummary]
    latest_metric_aggregates: list[MetricAggregate]
    null_metric_reason: str | None = None


class HistoryBenchmarkResponse(APIModel):
    run: BenchmarkRunRead
    measurements: list[MeasurementRead]
    measurement_total: int
    decisions_referencing: list[str]


class HistoryConfigurationResponse(APIModel):
    configuration_id: str
    runs: list[BenchmarkRunRead]
    decisions: list[HistoryRecordSummary]
    inference_executions: list[HistoryRecordSummary]


class ComparisonResponse(APIModel):
    comparable: bool
    warnings: list[ComparisonWarning]
    run_ids: list[str]
    metrics: dict[str, Any]
    checked_fields: dict[str, Any]


class ConfigurationExportRecord(APIModel):
    name: str
    description: str | None = None
    model_id: str
    model_version: str | None = None
    model_format: str = "gguf"
    quantization: str | None = None
    model_path: str | None = None
    context_length: int
    runtime_adapter: str = "auto"
    runtime_parameters: dict[str, Any] = Field(default_factory=dict)
    generation_defaults: dict[str, Any] = Field(default_factory=dict)
    thread_count: int | None = None
    batch_size: int | None = None
    gpu_layers: int | None = None
    enabled: bool = True
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ConfigurationExportEnvelope(APIModel):
    schema_version: str
    exported_at: datetime
    count: int
    includes_model_paths: bool
    configurations: list[ConfigurationExportRecord]


class ImportIssue(APIModel):
    index: int | None
    code: str
    message: str
    field: str | None = None


class ImportRequest(APIModel):
    schema_version: str = "lattice.configurations/1"
    configurations: list[dict[str, Any]] = Field(min_length=1, max_length=500)
    dry_run: bool = False
    conflict_policy: Literal["error", "skip", "rename"] = "error"


class ImportResponse(APIModel):
    dry_run: bool
    total: int
    imported: int
    skipped: int
    failed: int
    errors: list[ImportIssue] = Field(default_factory=list)
    warnings: list[ImportIssue] = Field(default_factory=list)
    records: list[ConfigurationCreate] = Field(default_factory=list)


class ExperimentExportEnvelope(APIModel):
    schema_version: str
    exported_at: datetime
    record_type: str
    run: BenchmarkRunRead
    measurements: list[MeasurementRead]
    metric_summaries: list[dict[str, Any]]
    decision_references: list[str]
