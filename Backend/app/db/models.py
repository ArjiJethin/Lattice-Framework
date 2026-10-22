"""SQLAlchemy persistence models.

Design notes
------------
* SQLite stores enum values as plain strings so migrations stay trivial.
* JSON snapshot columns are versioned and hashed; completed historical rows are
  never mutated by later edits to a configuration or workload.
* Foreign keys use deliberate ``ON DELETE`` behaviour: history-bearing rows
  reference configurations/workloads with ``RESTRICT``; child rows of a run are
  ``CASCADE``.  Application-level soft delete is preferred for resources that
  are referenced by history.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.core.enums import (
    ConstraintOperator,
    DecisionStatus,
    FeasibilityStatus,
    InferenceValidationStatus,
    JobStatus,
    MetricStatus,
    Objective,
    RepetitionStatus,
    RunStatus,
    ValidationState,
)
from app.core.time import ensure_utc, utcnow


class UTCDateTime(TypeDecorator[datetime]):
    """SQLite drops tzinfo; always hand timezone-aware UTC back to callers."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:  # noqa: ARG002
        return ensure_utc(value)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:  # noqa: ARG002
        return ensure_utc(value)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# Configuration profiles
# ---------------------------------------------------------------------------
class Configuration(TimestampMixin, Base):
    __tablename__ = "configurations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    model_id: Mapped[str] = mapped_column(String(200), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(100))
    model_format: Mapped[str] = mapped_column(String(40), nullable=False, default="gguf")
    quantization: Mapped[str | None] = mapped_column(String(60))
    model_path: Mapped[str] = mapped_column(Text, nullable=False)
    context_length: Mapped[int] = mapped_column(Integer, nullable=False)
    runtime_adapter: Mapped[str] = mapped_column(String(60), nullable=False, default="auto")
    runtime_parameters: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    generation_defaults: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    thread_count: Mapped[int | None] = mapped_column(Integer)
    batch_size: Mapped[int | None] = mapped_column(Integer)
    gpu_layers: Mapped[int | None] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    validation_state: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ValidationState.UNVALIDATED.value
    )
    validation_summary: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict, name="metadata_json"
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    revisions: Mapped[list[ConfigurationRevision]] = relationship(
        back_populates="configuration",
        cascade="all, delete-orphan",
        order_by="ConfigurationRevision.revision",
    )

    __table_args__ = (Index("ix_configurations_enabled", "enabled"),)


class ConfigurationRevision(Base):
    __tablename__ = "configuration_revisions"
    __table_args__ = (
        UniqueConstraint("configuration_id", "revision", name="uq_configuration_revision"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    configuration_id: Mapped[str] = mapped_column(
        ForeignKey("configurations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)

    configuration: Mapped[Configuration] = relationship(back_populates="revisions")


# ---------------------------------------------------------------------------
# Workload profiles
# ---------------------------------------------------------------------------
class Workload(TimestampMixin, Base):
    __tablename__ = "workloads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    workload_type: Mapped[str] = mapped_column(String(60), nullable=False)
    input_spec: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    output_tokens_target: Mapped[int] = mapped_column(Integer, nullable=False, default=128)
    output_tokens_min: Mapped[int | None] = mapped_column(Integer)
    output_tokens_max: Mapped[int | None] = mapped_column(Integer)
    context_requirement: Mapped[int] = mapped_column(Integer, nullable=False, default=1024)
    dataset_reference: Mapped[str | None] = mapped_column(String(300))
    protocol_reference: Mapped[str | None] = mapped_column(String(120))
    quality_evaluator: Mapped[str | None] = mapped_column(String(60))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict, name="metadata_json"
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    revisions: Mapped[list[WorkloadRevision]] = relationship(
        back_populates="workload",
        cascade="all, delete-orphan",
        order_by="WorkloadRevision.revision",
    )


class WorkloadRevision(Base):
    __tablename__ = "workload_revisions"
    __table_args__ = (UniqueConstraint("workload_id", "revision", name="uq_workload_revision"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workload_id: Mapped[str] = mapped_column(
        ForeignKey("workloads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)

    workload: Mapped[Workload] = relationship(back_populates="revisions")


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------
class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        UniqueConstraint("job_type", "request_id", name="uq_jobs_job_type_request_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=JobStatus.QUEUED.value, index=True
    )
    progress: Mapped[float | None] = mapped_column(Float)
    resource_type: Mapped[str | None] = mapped_column(String(60))
    resource_id: Mapped[str | None] = mapped_column(String(36), index=True)
    result_summary: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    request_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, nullable=False, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    benchmark_runs: Mapped[list[BenchmarkRun]] = relationship(back_populates="job")


# ---------------------------------------------------------------------------
# Benchmark runs and measurements
# ---------------------------------------------------------------------------
class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    configuration_id: Mapped[str] = mapped_column(
        ForeignKey("configurations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    workload_id: Mapped[str] = mapped_column(
        ForeignKey("workloads.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=RunStatus.QUEUED.value, index=True
    )
    protocol_version: Mapped[str] = mapped_column(String(60), nullable=False)
    snapshot_schema_version: Mapped[str] = mapped_column(
        String(40), nullable=False, default="lattice.benchmark-snapshot/1"
    )
    configuration_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    workload_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    protocol_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    snapshot_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    requested_warmups: Mapped[int] = mapped_column(Integer, nullable=False)
    requested_repetitions: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_repetitions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_repetitions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_warmups: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    runtime_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    model_identity: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    hardware_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    software_versions: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    aggregate_summary: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    quality_result: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    feasibility_result: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    test_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, nullable=False, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    duration_ms: Mapped[float | None] = mapped_column(Float)

    job: Mapped[Job] = relationship(back_populates="benchmark_runs")
    measurements: Mapped[list[BenchmarkMeasurement]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="BenchmarkMeasurement.sequence"
    )
    metric_summaries: Mapped[list[BenchmarkMetricSummary]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_benchmark_runs_config_created", "configuration_id", "created_at"),
        Index("ix_benchmark_runs_workload_created", "workload_id", "created_at"),
    )


class BenchmarkMeasurement(Base):
    __tablename__ = "benchmark_measurements"
    __table_args__ = (
        UniqueConstraint("run_id", "sequence", name="uq_benchmark_measurement_sequence"),
        Index("ix_benchmark_measurements_run_kind", "run_id", "kind"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        ForeignKey("benchmark_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    repetition_index: Mapped[int | None] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    token_count_source: Mapped[str | None] = mapped_column(String(80))
    ttft_ms: Mapped[float | None] = mapped_column(Float)
    latency_ms: Mapped[float | None] = mapped_column(Float)
    generation_duration_ms: Mapped[float | None] = mapped_column(Float)
    time_per_output_token_ms: Mapped[float | None] = mapped_column(Float)
    output_throughput_tps: Mapped[float | None] = mapped_column(Float)
    peak_process_rss_mb: Mapped[float | None] = mapped_column(Float)
    system_ram_used_mb: Mapped[float | None] = mapped_column(Float)
    gpu_device_memory_used_mb: Mapped[float | None] = mapped_column(Float)
    gpu_utilization_pct: Mapped[float | None] = mapped_column(Float)
    metrics_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)
    runtime_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    run: Mapped[BenchmarkRun] = relationship(back_populates="measurements")


class BenchmarkMetricSummary(Base):
    __tablename__ = "benchmark_metric_summaries"
    __table_args__ = (UniqueConstraint("run_id", "metric_name", name="uq_run_metric_summary"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        ForeignKey("benchmark_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_name: Mapped[str] = mapped_column(String(80), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    method: Mapped[str | None] = mapped_column(String(160))
    reason: Mapped[str | None] = mapped_column(Text)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    invalid_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mean: Mapped[float | None] = mapped_column(Float)
    median: Mapped[float | None] = mapped_column(Float)
    minimum: Mapped[float | None] = mapped_column(Float)
    maximum: Mapped[float | None] = mapped_column(Float)
    stddev: Mapped[float | None] = mapped_column(Float)
    p90: Mapped[float | None] = mapped_column(Float)
    p95: Mapped[float | None] = mapped_column(Float)

    run: Mapped[BenchmarkRun] = relationship(back_populates="metric_summaries")


# ---------------------------------------------------------------------------
# Optimization decisions
# ---------------------------------------------------------------------------
class OptimizationDecision(Base):
    __tablename__ = "optimization_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), index=True
    )
    workload_id: Mapped[str] = mapped_column(
        ForeignKey("workloads.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    workload_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    constraint_specification: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    objective: Mapped[str] = mapped_column(
        String(60), nullable=False, default=Objective.MINIMIZE_LATENCY.value
    )
    weights: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    evidence_policy: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    candidate_configuration_ids: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    feasible_configuration_ids: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    evidence_run_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    selected_configuration_id: Mapped[str | None] = mapped_column(
        ForeignKey("configurations.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[str] = mapped_column(
        String(40), nullable=False, default=DecisionStatus.PENDING_EVIDENCE.value, index=True
    )
    no_selection_reason: Mapped[str | None] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    algorithm: Mapped[str] = mapped_column(String(80), nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String(40), nullable=False)
    switching_overhead_considered: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    duration_ms: Mapped[float | None] = mapped_column(Float)
    execution_job_id: Mapped[str | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), index=True
    )
    snapshot_schema_version: Mapped[str] = mapped_column(
        String(40), nullable=False, default="lattice.decision/1"
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, nullable=False, index=True
    )

    candidates: Mapped[list[DecisionCandidate]] = relationship(
        back_populates="decision", cascade="all, delete-orphan"
    )


class DecisionCandidate(Base):
    __tablename__ = "decision_candidates"
    __table_args__ = (
        UniqueConstraint("decision_id", "configuration_id", name="uq_decision_candidate"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    decision_id: Mapped[str] = mapped_column(
        ForeignKey("optimization_decisions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    configuration_id: Mapped[str] = mapped_column(
        ForeignKey("configurations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    feasibility: Mapped[str] = mapped_column(
        String(40), nullable=False, default=FeasibilityStatus.INSUFFICIENT_EVIDENCE.value
    )
    rejection_reasons: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    constraint_results: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    objective_values: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    score_components: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    score: Mapped[float | None] = mapped_column(Float)
    rank: Mapped[int | None] = mapped_column(Integer)
    evidence_run_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    warnings: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)

    decision: Mapped[OptimizationDecision] = relationship(back_populates="candidates")


# ---------------------------------------------------------------------------
# Inference executions
# ---------------------------------------------------------------------------
class InferenceExecution(Base):
    __tablename__ = "inference_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    configuration_id: Mapped[str] = mapped_column(
        ForeignKey("configurations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    decision_id: Mapped[str | None] = mapped_column(
        ForeignKey("optimization_decisions.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=RunStatus.QUEUED.value)
    configuration_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    generation_parameters: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    runtime_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    hardware_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    token_count_source: Mapped[str | None] = mapped_column(String(80))
    latency_ms: Mapped[float | None] = mapped_column(Float)
    ttft_ms: Mapped[float | None] = mapped_column(Float)
    output_throughput_tps: Mapped[float | None] = mapped_column(Float)
    peak_process_rss_mb: Mapped[float | None] = mapped_column(Float)
    metrics_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    validation_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=InferenceValidationStatus.NOT_EVALUATED.value
    )
    constraint_results: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    output_retention_policy: Mapped[str] = mapped_column(String(40), nullable=False, default="none")
    retained_output: Mapped[str | None] = mapped_column(Text)
    prompt_retained: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    test_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, nullable=False, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    duration_ms: Mapped[float | None] = mapped_column(Float)


__all__ = [
    "Base",
    "BenchmarkMeasurement",
    "BenchmarkMetricSummary",
    "BenchmarkRun",
    "Configuration",
    "ConfigurationRevision",
    "ConstraintOperator",
    "DecisionCandidate",
    "InferenceExecution",
    "Job",
    "MetricStatus",
    "OptimizationDecision",
    "RepetitionStatus",
    "Workload",
    "WorkloadRevision",
]
