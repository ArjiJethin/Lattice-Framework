"""Canonical string enums shared by persistence, services and API schemas.

All values are stable, lower-case strings: they are persisted verbatim in
SQLite and are part of the public API contract.
"""

from __future__ import annotations

from enum import StrEnum


class JobType(StrEnum):
    BENCHMARK = "benchmark"
    INFERENCE = "inference"
    OPTIMIZATION = "optimization"


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    INTERRUPTED = "interrupted"


TERMINAL_JOB_STATUSES: frozenset[JobStatus] = frozenset(
    {
        JobStatus.COMPLETED,
        JobStatus.FAILED,
        JobStatus.CANCELLED,
        JobStatus.INTERRUPTED,
    }
)


class RunStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"
    CANCELLED = "cancelled"
    INTERRUPTED = "interrupted"


TERMINAL_RUN_STATUSES: frozenset[RunStatus] = frozenset(
    {
        RunStatus.COMPLETED,
        RunStatus.PARTIAL,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
        RunStatus.INTERRUPTED,
    }
)

SUCCESSFUL_RUN_STATUSES: frozenset[RunStatus] = frozenset({RunStatus.COMPLETED, RunStatus.PARTIAL})


class MetricStatus(StrEnum):
    """Availability/quality of a single metric value.

    ``measured`` values come from a clock or counter, ``derived`` values are
    computed from measured values by a documented formula, ``estimated``
    values come from a heuristic.  ``unavailable``, ``failed`` and
    ``not_applicable`` never carry a numeric value.
    """

    MEASURED = "measured"
    DERIVED = "derived"
    ESTIMATED = "estimated"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"
    NOT_APPLICABLE = "not_applicable"


NUMERIC_METRIC_STATUSES: frozenset[MetricStatus] = frozenset(
    {MetricStatus.MEASURED, MetricStatus.DERIVED, MetricStatus.ESTIMATED}
)


class AvailabilityStatus(StrEnum):
    """Why a hardware/environment value is or is not present.

    None of the non-available states may ever be rendered as numeric zero.
    """

    AVAILABLE = "available"
    UNSUPPORTED = "unsupported"
    NOT_INSTALLED = "not_installed"
    NOT_DETECTED = "not_detected"
    PERMISSION_DENIED = "permission_denied"
    TEMPORARILY_UNAVAILABLE = "temporarily_unavailable"
    NOT_APPLICABLE = "not_applicable"
    COLLECTION_ERROR = "collection_error"


class ExecutionMode(StrEnum):
    CPU = "cpu"
    GPU = "gpu"
    HYBRID = "hybrid"
    UNKNOWN = "unknown"


class ConstraintOperator(StrEnum):
    LTE = "<="
    GTE = ">="
    EQ = "=="


class FeasibilityStatus(StrEnum):
    FEASIBLE = "feasible"
    INFEASIBLE = "infeasible"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class ConstraintOutcome(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    UNKNOWN = "unknown"


class Objective(StrEnum):
    MINIMIZE_LATENCY = "minimize_latency"
    MAXIMIZE_THROUGHPUT = "maximize_throughput"
    MINIMIZE_WEIGHTED_SCORE = "minimize_weighted_score"


class DecisionStatus(StrEnum):
    SELECTED = "selected"
    NO_FEASIBLE_CANDIDATE = "no_feasible_candidate"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    PENDING_EVIDENCE = "pending_evidence"
    FAILED = "failed"


class ValidationState(StrEnum):
    UNVALIDATED = "unvalidated"
    VALID = "valid"
    INVALID = "invalid"


class MeasurementKind(StrEnum):
    WARMUP = "warmup"
    MEASURED = "measured"


class RepetitionStatus(StrEnum):
    COMPLETED = "completed"
    FAILED = "failed"


class QualityStatus(StrEnum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"


class InferenceValidationStatus(StrEnum):
    NOT_EVALUATED = "not_evaluated"
    PASSED = "passed"
    FAILED = "failed"
