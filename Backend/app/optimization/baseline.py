"""Deterministic baseline optimizer.

Algorithm (``baseline-feasibility-v1``):
1. Filter candidates by evidence compatibility, freshness and successful
   repetition count.  Candidates without suitable evidence are
   ``insufficient_evidence`` - they are never treated as passing.
2. Evaluate every hard constraint independently (pass/fail/unknown).
   A single failed constraint makes a candidate infeasible regardless of any
   objective score.  Unknown required metrics make it evidence-insufficient.
3. Min-max normalize objective metrics across eligible candidates so that
   ``0`` is best, then apply weights (normalised to sum to 1).  Lower scores
   rank better; ties break on configuration id ascending.
4. Persist nothing: the service layer stores the returned decision.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta

from app.core.enums import (
    ConstraintOperator,
    ConstraintOutcome,
    DecisionStatus,
    FeasibilityStatus,
    MetricStatus,
)
from app.core.time import monotonic, utcnow
from app.optimization.contracts import (
    BaseOptimizer,
    CandidateEvaluation,
    CandidateEvidence,
    Constraint,
    ConstraintEvaluation,
    OptimizationRequest,
    OptimizationResult,
)

ALGORITHM_NAME = "baseline-feasibility-v1"
ALGORITHM_VERSION = "1.0.0"

#: Metric direction used by the weighted score.  Unknown metrics default to
#: "minimize" and are documented as such.
METRIC_DIRECTIONS: dict[str, str] = {
    "latency_ms": "minimize",
    "time_per_output_token_ms": "minimize",
    "output_throughput_tps": "maximize",
    "decode_throughput_tps": "maximize",
    "ttft_ms": "minimize",
    "peak_process_rss_mb": "minimize",
    "peak_system_ram_used_mb": "minimize",
    "peak_gpu_device_memory_used_mb": "minimize",
    "peak_gpu_utilization_pct": "minimize",
    "input_tokens": "minimize",
    "output_tokens": "minimize",
    "switching_overhead_ms": "minimize",
}

OBJECTIVE_METRICS: dict[str, str] = {
    "minimize_latency": "latency_ms",
    "maximize_throughput": "output_throughput_tps",
}

_COMPARATORS = {
    ConstraintOperator.LTE.value: lambda actual, threshold: actual <= threshold,
    ConstraintOperator.GTE.value: lambda actual, threshold: actual >= threshold,
    ConstraintOperator.EQ.value: lambda actual, threshold: actual == threshold,
}


def _is_numeric_evidence(metric: dict | None, allow_estimated: bool) -> bool:
    if not metric:
        return False
    status = metric.get("status")
    if status == MetricStatus.MEASURED.value or status == MetricStatus.DERIVED.value:
        return True
    if status == MetricStatus.ESTIMATED.value and allow_estimated:
        return True
    return False


class BaselineOptimizer(BaseOptimizer):
    name = ALGORITHM_NAME
    version = ALGORITHM_VERSION

    def optimize(self, request: OptimizationRequest) -> OptimizationResult:
        start = monotonic()
        now = utcnow()
        evaluations: list[CandidateEvaluation] = []

        for candidate in request.candidates:
            evaluations.append(self._evaluate_candidate(candidate, request, now))

        # Ranking only happens after feasibility filtering.
        eligible = [
            item for item in evaluations if item.feasibility == FeasibilityStatus.FEASIBLE.value
        ]
        if eligible:
            self._rank(eligible, request)

        feasible_ids = [item.configuration_id for item in eligible]
        evidence_run_ids: list[str] = []
        for candidate in request.candidates:
            if candidate.run_id and candidate.run_id not in evidence_run_ids:
                evidence_run_ids.append(candidate.run_id)

        selected: str | None = None
        no_selection_reason: str | None = None
        if eligible:
            ranked = sorted(
                eligible,
                key=lambda item: (
                    item.score if item.score is not None else math.inf,
                    item.configuration_id,
                ),
            )
            selected = ranked[0].configuration_id
            status = DecisionStatus.SELECTED.value
            explanation = (
                f"Selected configuration {selected} with score "
                f"{ranked[0].score:.6f} after filtering out infeasible and "
                f"evidence-insufficient candidates."
                if ranked[0].score is not None
                else f"Selected configuration {selected} as the only eligible candidate."
            )
        else:
            any_failed = any(
                any(
                    constraint.outcome == ConstraintOutcome.FAIL.value
                    for constraint in item.constraint_results
                )
                for item in evaluations
            )
            if any_failed:
                status = DecisionStatus.NO_FEASIBLE_CANDIDATE.value
                no_selection_reason = "every candidate violates at least one hard constraint"
            else:
                status = DecisionStatus.INSUFFICIENT_EVIDENCE.value
                no_selection_reason = (
                    "no candidate has compatible, sufficient benchmark evidence for "
                    "all required metrics"
                )
            explanation = no_selection_reason

        return OptimizationResult(
            status=status,
            selected_configuration_id=selected,
            no_selection_reason=no_selection_reason,
            explanation=explanation,
            candidates=evaluations,
            feasible_configuration_ids=feasible_ids,
            evidence_run_ids=evidence_run_ids,
            algorithm=self.name,
            algorithm_version=self.version,
            duration_ms=max(0.001, (monotonic() - start) * 1000.0),
        )

    # ------------------------------------------------------------------
    def _evaluate_candidate(
        self,
        candidate: CandidateEvidence,
        request: OptimizationRequest,
        now: datetime,
    ) -> CandidateEvaluation:
        policy = request.evidence_policy
        result = CandidateEvaluation(
            configuration_id=candidate.configuration_id,
            feasibility=FeasibilityStatus.INSUFFICIENT_EVIDENCE.value,
            warnings=list(candidate.warnings),
            evidence_run_ids=[candidate.run_id] if candidate.run_id else [],
        )
        if candidate.test_only and not policy.allow_test_only_evidence:
            result.rejection_reasons.append(
                {
                    "code": "test_only_evidence",
                    "message": "fake-runtime evidence cannot be used for optimization",
                }
            )
            return result
        if candidate.incompatible_reason:
            result.rejection_reasons.append(
                {
                    "code": "incompatible_evidence",
                    "message": candidate.incompatible_reason,
                }
            )
            return result
        if not candidate.run_id:
            result.rejection_reasons.append(
                {
                    "code": "no_compatible_evidence",
                    "message": (
                        "no compatible completed benchmark run exists for this configuration"
                    ),
                }
            )
            return result
        if candidate.run_status not in policy.allowed_run_statuses:
            result.rejection_reasons.append(
                {
                    "code": "run_status_not_allowed",
                    "message": f"benchmark run status '{candidate.run_status}' is not allowed "
                    f"by the evidence policy ({', '.join(policy.allowed_run_statuses)})",
                }
            )
            return result
        if candidate.successful_repetitions < policy.min_successful_repetitions:
            result.rejection_reasons.append(
                {
                    "code": "insufficient_repetitions",
                    "message": (
                        f"only {candidate.successful_repetitions} successful repetitions; "
                        f"policy requires {policy.min_successful_repetitions}"
                    ),
                }
            )
            return result
        if candidate.finished_at is not None:
            finished = candidate.finished_at
            if finished.tzinfo is None:
                from app.core.time import ensure_utc

                finished = ensure_utc(finished) or finished
            if now - finished > timedelta(hours=policy.max_age_hours):
                result.rejection_reasons.append(
                    {
                        "code": "stale_evidence",
                        "message": f"benchmark evidence is older than {policy.max_age_hours} hours",
                    }
                )
                return result

        # --- Hard constraints -----------------------------------------
        failed = False
        unknown = False
        for constraint in request.constraints:
            evaluation = self._evaluate_constraint(
                constraint, candidate.metrics, policy.allow_estimated_metrics
            )
            result.constraint_results.append(evaluation)
            if evaluation.outcome == ConstraintOutcome.FAIL.value:
                failed = True
                result.rejection_reasons.append(
                    {
                        "code": "hard_constraint_violated",
                        "message": (
                            f"{constraint.metric} {constraint.operator} {constraint.value}"
                            f"{(' ' + constraint.unit) if constraint.unit else ''} "
                            f"was {evaluation.actual_value}"
                        ),
                        "metric": constraint.metric,
                    }
                )
            elif evaluation.outcome == ConstraintOutcome.UNKNOWN.value:
                unknown = True
                result.rejection_reasons.append(
                    {
                        "code": "unknown_required_metric",
                        "message": evaluation.reason
                        or f"required metric '{constraint.metric}' has no usable evidence",
                        "metric": constraint.metric,
                    }
                )
        if failed:
            result.feasibility = FeasibilityStatus.INFEASIBLE.value
            return result
        if unknown:
            return result

        # --- Objective values -----------------------------------------
        metrics_needed = self._objective_metrics(request)
        for metric_name in metrics_needed:
            metric = candidate.metrics.get(metric_name)
            if metric is None and metric_name == "switching_overhead_ms":
                result.objective_values[metric_name] = request.switching_overhead_ms
                continue
            if not _is_numeric_evidence(
                metric.__dict__ if metric else None, policy.allow_estimated_metrics
            ):
                result.feasibility = FeasibilityStatus.INSUFFICIENT_EVIDENCE.value
                result.rejection_reasons.append(
                    {
                        "code": "missing_objective_metric",
                        "message": f"objective metric '{metric_name}' has no usable evidence",
                        "metric": metric_name,
                    }
                )
                return result
            result.objective_values[metric_name] = float(metric.value)  # type: ignore[union-attr]
        result.feasibility = FeasibilityStatus.FEASIBLE.value
        return result

    @staticmethod
    def _evaluate_constraint(
        constraint: Constraint,
        metrics: dict,
        allow_estimated: bool,
    ) -> ConstraintEvaluation:
        comparator = _COMPARATORS.get(constraint.operator)
        if comparator is None:
            return ConstraintEvaluation(
                metric=constraint.metric,
                operator=constraint.operator,
                threshold=constraint.value,
                unit=constraint.unit,
                actual_value=None,
                actual_unit=None,
                metric_status=None,
                outcome=ConstraintOutcome.UNKNOWN.value,
                reason=f"unsupported operator '{constraint.operator}'",
            )
        metric = metrics.get(constraint.metric)
        if metric is None:
            return ConstraintEvaluation(
                metric=constraint.metric,
                operator=constraint.operator,
                threshold=constraint.value,
                unit=constraint.unit,
                actual_value=None,
                actual_unit=None,
                metric_status=None,
                outcome=ConstraintOutcome.UNKNOWN.value,
                reason=f"no evidence for metric '{constraint.metric}'",
            )
        payload = metric.__dict__ if hasattr(metric, "__dict__") else metric
        unit = payload.get("unit")
        if constraint.unit and unit and constraint.unit != unit:
            return ConstraintEvaluation(
                metric=constraint.metric,
                operator=constraint.operator,
                threshold=constraint.value,
                unit=constraint.unit,
                actual_value=None,
                actual_unit=unit,
                metric_status=payload.get("status"),
                outcome=ConstraintOutcome.UNKNOWN.value,
                reason=(
                    f"unit mismatch: constraint uses '{constraint.unit}' but evidence uses '{unit}'"
                ),
            )
        if not _is_numeric_evidence(payload, allow_estimated) or payload.get("value") is None:
            return ConstraintEvaluation(
                metric=constraint.metric,
                operator=constraint.operator,
                threshold=constraint.value,
                unit=constraint.unit,
                actual_value=None,
                actual_unit=unit,
                metric_status=payload.get("status"),
                outcome=ConstraintOutcome.UNKNOWN.value,
                reason=(
                    payload.get("reason")
                    or f"metric '{constraint.metric}' is not available as measured evidence"
                ),
            )
        actual = float(payload["value"])
        outcome = (
            ConstraintOutcome.PASS.value
            if comparator(actual, constraint.value)
            else ConstraintOutcome.FAIL.value
        )
        return ConstraintEvaluation(
            metric=constraint.metric,
            operator=constraint.operator,
            threshold=constraint.value,
            unit=constraint.unit,
            actual_value=actual,
            actual_unit=unit,
            metric_status=payload.get("status"),
            outcome=outcome,
        )

    # ------------------------------------------------------------------
    @staticmethod
    def _objective_metrics(request: OptimizationRequest) -> list[str]:
        if request.objective.name in OBJECTIVE_METRICS:
            return [OBJECTIVE_METRICS[request.objective.name]]
        return sorted(request.objective.weights)

    def _rank(self, eligible: list[CandidateEvaluation], request: OptimizationRequest) -> None:
        metrics = self._objective_metrics(request)
        weights = self._weights(request, metrics)
        best: dict[str, float] = {}
        worst: dict[str, float] = {}
        for metric in metrics:
            values = [
                float(item.objective_values[metric])
                for item in eligible
                if item.objective_values.get(metric) is not None
            ]
            if not values:
                continue
            best[metric] = min(values)
            worst[metric] = max(values)
        for item in eligible:
            components: dict[str, float | None] = {}
            total = 0.0
            for metric in metrics:
                value = item.objective_values.get(metric)
                if value is None:
                    components[metric] = None
                    continue
                low, high = best.get(metric), worst.get(metric)
                if low is None or high is None or high == low:
                    normalized = 0.0
                else:
                    direction = METRIC_DIRECTIONS.get(metric, "minimize")
                    if direction == "maximize":
                        normalized = (high - float(value)) / (high - low)
                    else:
                        normalized = (float(value) - low) / (high - low)
                normalized = min(1.0, max(0.0, normalized))
                components[metric] = round(normalized, 9)
                total += weights[metric] * normalized
            item.score_components = components
            item.score = round(total, 9)
        ordered = sorted(
            eligible,
            key=lambda item: (
                item.score if item.score is not None else math.inf,
                item.configuration_id,
            ),
        )
        for index, item in enumerate(ordered, start=1):
            item.rank = index

    @staticmethod
    def _weights(request: OptimizationRequest, metrics: list[str]) -> dict[str, float]:
        if request.objective.name in OBJECTIVE_METRICS:
            return {metrics[0]: 1.0}
        raw = {metric: float(request.objective.weights.get(metric, 0.0)) for metric in metrics}
        total = sum(raw.values())
        if total <= 0:
            # Defensive: API validation requires positive weights.
            return {metric: 1.0 / len(metrics) for metric in metrics}
        return {metric: value / total for metric, value in raw.items()}


__all__ = ["ALGORITHM_NAME", "ALGORITHM_VERSION", "BaselineOptimizer", "METRIC_DIRECTIONS"]
