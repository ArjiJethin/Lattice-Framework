"""Canonical optimizer contract.

The optimizer is pure: it receives immutable evidence and returns a decision.
Persistence is the optimization service's responsibility, and the optimizer
never writes to the database or the runtime.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class Constraint:
    metric: str
    operator: str  # "<=", ">=", "=="
    value: float
    unit: str | None = None


@dataclass(frozen=True)
class EvidencePolicy:
    max_age_hours: float = 168.0
    min_successful_repetitions: int = 1
    require_current_workload_snapshot: bool = True
    allow_estimated_metrics: bool = False
    allow_test_only_evidence: bool = False
    allowed_run_statuses: tuple[str, ...] = ("completed", "partial")


@dataclass
class MetricEvidence:
    metric_name: str
    value: float | None
    unit: str | None
    status: str
    sample_count: int
    method: str | None = None
    reason: str | None = None


@dataclass
class CandidateEvidence:
    """Everything the optimizer may use for one candidate configuration."""

    configuration_id: str
    run_id: str | None = None
    run_status: str | None = None
    finished_at: datetime | None = None
    workload_snapshot_hash: str | None = None
    protocol_version: str | None = None
    model_identity: dict[str, Any] = field(default_factory=dict)
    runtime: dict[str, Any] = field(default_factory=dict)
    hardware_class: str | None = None
    successful_repetitions: int = 0
    metrics: dict[str, MetricEvidence] = field(default_factory=dict)
    warnings: list[dict[str, Any]] = field(default_factory=list)
    incompatible_reason: str | None = None
    test_only: bool = False


@dataclass(frozen=True)
class OptimizationObjective:
    name: str
    weights: dict[str, float] = field(default_factory=dict)


@dataclass
class OptimizationRequest:
    workload_id: str
    workload_snapshot_hash: str
    candidates: list[CandidateEvidence]
    constraints: list[Constraint]
    objective: OptimizationObjective
    evidence_policy: EvidencePolicy
    switching_overhead_ms: float | None = None


@dataclass
class ConstraintEvaluation:
    metric: str
    operator: str
    threshold: float
    unit: str | None
    actual_value: float | None
    actual_unit: str | None
    metric_status: str | None
    outcome: str  # pass | fail | unknown
    reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "metric": self.metric,
            "operator": self.operator,
            "threshold": self.threshold,
            "unit": self.unit,
            "actual_value": self.actual_value,
            "actual_unit": self.actual_unit,
            "metric_status": self.metric_status,
            "outcome": self.outcome,
            "reason": self.reason,
        }


@dataclass
class CandidateEvaluation:
    configuration_id: str
    feasibility: str
    rejection_reasons: list[dict[str, Any]] = field(default_factory=list)
    constraint_results: list[ConstraintEvaluation] = field(default_factory=list)
    objective_values: dict[str, float | None] = field(default_factory=dict)
    score_components: dict[str, float | None] = field(default_factory=dict)
    score: float | None = None
    rank: int | None = None
    evidence_run_ids: list[str] = field(default_factory=list)
    warnings: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class OptimizationResult:
    status: str
    selected_configuration_id: str | None
    no_selection_reason: str | None
    explanation: str
    candidates: list[CandidateEvaluation]
    feasible_configuration_ids: list[str] = field(default_factory=list)
    evidence_run_ids: list[str] = field(default_factory=list)
    algorithm: str = "baseline-lexicographic-v1"
    algorithm_version: str = "1.0.0"
    duration_ms: float | None = None


class BaseOptimizer(ABC):
    name: str = "base"
    version: str = "0.0.0"

    @abstractmethod
    def optimize(self, request: OptimizationRequest) -> OptimizationResult:
        """Return a deterministic decision for the supplied evidence."""
