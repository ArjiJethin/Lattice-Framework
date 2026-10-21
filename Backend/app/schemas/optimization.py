"""Optimization decision API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field, field_validator, model_validator

from app.core.enums import ConstraintOperator, Objective
from app.core.validation import validate_generation_parameters  # noqa: F401  (reexported usage)
from app.schemas.common import APIModel, Page


class ConstraintSpec(APIModel):
    metric: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_]+$")
    operator: ConstraintOperator
    value: float
    unit: str | None = Field(default=None, max_length=40)

    @field_validator("value")
    @classmethod
    def _finite(cls, value: float) -> float:
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError("constraint value must be finite")
        return value


class EvidencePolicy(APIModel):
    max_age_hours: float = Field(default=168.0, gt=0, le=24 * 365 * 10)
    min_successful_repetitions: int = Field(default=1, ge=1, le=1000)
    require_current_workload_snapshot: bool = True
    allow_estimated_metrics: bool = False
    allow_test_only_evidence: bool = False
    allowed_run_statuses: list[str] = Field(default_factory=lambda: ["completed", "partial"])


class OptimizationCreate(APIModel):
    workload_id: str
    candidate_configuration_ids: list[str] = Field(min_length=1, max_length=50)
    constraints: list[ConstraintSpec] = Field(default_factory=list, max_length=20)
    objective: Objective = Objective.MINIMIZE_LATENCY
    weights: dict[str, float] = Field(default_factory=dict)
    evidence_policy: EvidencePolicy = Field(default_factory=EvidencePolicy)
    allow_fresh_benchmarking: bool = False
    switching_overhead_ms: float | None = Field(default=None, ge=0)

    @field_validator("candidate_configuration_ids")
    @classmethod
    def _unique_candidates(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("candidate_configuration_ids must be unique")
        return value

    @field_validator("weights")
    @classmethod
    def _weights(cls, value: dict[str, float]) -> dict[str, float]:
        for key, weight in value.items():
            if weight != weight or weight in (float("inf"), float("-inf")):
                raise ValueError(f"weight for '{key}' must be finite")
            if weight <= 0:
                raise ValueError(f"weight for '{key}' must be > 0")
        return value

    @model_validator(mode="after")
    def _objective_inputs(self) -> OptimizationCreate:
        if self.objective == Objective.MINIMIZE_WEIGHTED_SCORE and not self.weights:
            raise ValueError("weights are required when objective is minimize_weighted_score")
        metrics = [constraint.metric for constraint in self.constraints]
        if len(set(metrics)) != len(metrics):
            raise ValueError("each metric may appear in at most one constraint")
        return self


class ConstraintResult(APIModel):
    metric: str
    operator: str
    threshold: float
    unit: str | None
    actual_value: float | None
    actual_unit: str | None
    metric_status: str | None
    outcome: str
    reason: str | None = None


class DecisionCandidateRead(APIModel):
    configuration_id: str
    feasibility: str
    rejection_reasons: list[dict[str, Any]]
    constraint_results: list[ConstraintResult]
    objective_values: dict[str, float | None]
    score_components: dict[str, float | None]
    score: float | None
    rank: int | None
    evidence_run_ids: list[str]
    warnings: list[dict[str, Any]]


class DecisionRead(APIModel):
    id: str
    job_id: str | None
    workload_id: str
    workload_snapshot: dict[str, Any]
    constraint_specification: dict[str, Any]
    objective: str
    weights: dict[str, float]
    evidence_policy: dict[str, Any]
    candidate_configuration_ids: list[str]
    feasible_configuration_ids: list[str]
    evidence_run_ids: list[str]
    selected_configuration_id: str | None
    status: str
    no_selection_reason: str | None
    explanation: str | None
    algorithm: str
    algorithm_version: str
    switching_overhead_considered: bool
    duration_ms: float | None
    execution_job_id: str | None
    candidates: list[DecisionCandidateRead] = Field(default_factory=list)
    created_at: datetime


class DecisionPage(Page[DecisionRead]):
    pass


class DecisionAccepted(APIModel):
    decision_id: str
    job_id: str | None
    status: str
    message: str


class DecisionCreationResponse(APIModel):
    """Returned by POST /optimization/decisions (201 sync, 202 async)."""

    decision: DecisionRead
    job_id: str | None = None
    message: str


class DecisionExecuteRequest(APIModel):
    prompt: str = Field(min_length=1, max_length=64_000)
    system_prompt: str | None = Field(default=None, max_length=16_000)
    generation_parameters: dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: float | None = Field(default=None, gt=0, le=3600)
    retain_output: bool = False


class DecisionExecuteResponse(APIModel):
    decision_id: str
    job_id: str
    inference_execution_id: str
    status: str
    configuration_id: str
    message: str
