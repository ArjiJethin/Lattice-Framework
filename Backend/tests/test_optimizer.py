from __future__ import annotations

from datetime import timedelta

from app.core.time import utcnow
from app.optimization.baseline import BaselineOptimizer
from app.optimization.contracts import (
    CandidateEvidence,
    Constraint,
    EvidencePolicy,
    MetricEvidence,
    OptimizationObjective,
    OptimizationRequest,
)


def evidence(
    configuration_id: str,
    *,
    latency_ms: float | None = 100.0,
    throughput: float | None = 40.0,
    quality: float | None = None,
    run_id: str | None = None,
    status: str = "completed",
    test_only: bool = False,
    finished_at=None,
    reps: int = 3,
    extra_metrics: dict[str, MetricEvidence] | None = None,
) -> CandidateEvidence:
    metrics: dict[str, MetricEvidence] = {
        "latency_ms": MetricEvidence(
            metric_name="latency_ms",
            value=latency_ms,
            unit="ms",
            status="measured" if latency_ms is not None else "unavailable",
            sample_count=reps if latency_ms is not None else 0,
        ),
        "output_throughput_tps": MetricEvidence(
            metric_name="output_throughput_tps",
            value=throughput,
            unit="tokens/s",
            status="derived" if throughput is not None else "unavailable",
            sample_count=reps if throughput is not None else 0,
        ),
    }
    if quality is not None:
        metrics["exact_match_accuracy"] = MetricEvidence(
            metric_name="exact_match_accuracy",
            value=quality,
            unit="ratio",
            status="measured",
            sample_count=reps,
        )
    if extra_metrics:
        metrics.update(extra_metrics)
    return CandidateEvidence(
        configuration_id=configuration_id,
        run_id=run_id or f"run-{configuration_id}",
        run_status=status,
        finished_at=finished_at or utcnow(),
        protocol_version="lattice.benchmark/1.0.0",
        successful_repetitions=reps,
        metrics=metrics,
        test_only=test_only,
    )


def request(
    candidates: list[CandidateEvidence],
    *,
    constraints: list[Constraint] | None = None,
    objective: OptimizationObjective | None = None,
    policy: EvidencePolicy | None = None,
) -> OptimizationRequest:
    return OptimizationRequest(
        workload_id="wl",
        workload_snapshot_hash="hash",
        candidates=candidates,
        constraints=constraints or [],
        objective=objective or OptimizationObjective(name="minimize_latency"),
        evidence_policy=policy or EvidencePolicy(),
    )


def test_hard_constraint_failure_excludes_fastest_candidate():
    fast = evidence("cfg-fast", latency_ms=10.0)
    slow = evidence("cfg-slow", latency_ms=100.0)
    result = BaselineOptimizer().optimize(
        request([fast, slow], constraints=[Constraint("latency_ms", "<=", 50.0, "ms")])
    )
    assert result.status == "selected"
    assert result.selected_configuration_id == "cfg-fast"
    fast_eval = next(item for item in result.candidates if item.configuration_id == "cfg-fast")
    slow_eval = next(item for item in result.candidates if item.configuration_id == "cfg-slow")
    assert fast_eval.feasibility == "feasible"
    assert slow_eval.feasibility == "infeasible"
    assert any(
        reason["code"] == "hard_constraint_violated" for reason in slow_eval.rejection_reasons
    )


def test_quality_constraint_excludes_best_latency_regardless_of_score():
    fast_low_quality = evidence("cfg-a", latency_ms=10.0, quality=0.2)
    slow_high_quality = evidence("cfg-b", latency_ms=200.0, quality=0.95)
    result = BaselineOptimizer().optimize(
        request(
            [fast_low_quality, slow_high_quality],
            constraints=[Constraint("exact_match_accuracy", ">=", 0.8, "ratio")],
        )
    )
    assert result.selected_configuration_id == "cfg-b"
    evaluation = next(item for item in result.candidates if item.configuration_id == "cfg-a")
    assert evaluation.feasibility == "infeasible"


def test_unknown_required_metric_is_insufficient_not_feasible():
    candidate = evidence("cfg-a", quality=None)
    result = BaselineOptimizer().optimize(
        request(
            [candidate],
            constraints=[Constraint("exact_match_accuracy", ">=", 0.8, "ratio")],
        )
    )
    assert result.status == "insufficient_evidence"
    assert result.selected_configuration_id is None
    evaluation = result.candidates[0]
    assert evaluation.feasibility == "insufficient_evidence"
    assert evaluation.constraint_results[0].outcome == "unknown"


def test_unit_mismatch_is_unknown_evidence():
    candidate = evidence("cfg-a", latency_ms=10.0)
    result = BaselineOptimizer().optimize(
        request([candidate], constraints=[Constraint("latency_ms", "<=", 50.0, "seconds")])
    )
    assert result.candidates[0].constraint_results[0].outcome == "unknown"
    assert "unit mismatch" in result.candidates[0].constraint_results[0].reason


def test_no_evidence_reports_insufficient_evidence():
    candidate = CandidateEvidence(configuration_id="cfg-a")
    result = BaselineOptimizer().optimize(request([candidate]))
    assert result.status == "insufficient_evidence"
    assert result.candidates[0].rejection_reasons[0]["code"] == "no_compatible_evidence"


def test_all_candidates_infeasible_reports_no_feasible_candidate():
    result = BaselineOptimizer().optimize(
        request(
            [
                evidence("cfg-a", latency_ms=100.0),
                evidence("cfg-b", latency_ms=200.0),
            ],
            constraints=[Constraint("latency_ms", "<=", 10.0, "ms")],
        )
    )
    assert result.status == "no_feasible_candidate"
    assert result.selected_configuration_id is None
    assert result.no_selection_reason


def test_tie_break_is_deterministic_on_configuration_id():
    low = evidence("cfg-a", latency_ms=50.0)
    high = evidence("cfg-z", latency_ms=50.0)
    result = BaselineOptimizer().optimize(request([high, low]))
    assert [item.rank for item in result.candidates if item.configuration_id == "cfg-a"] == [1]
    again = BaselineOptimizer().optimize(request([high, low]))
    assert again.selected_configuration_id == "cfg-a"


def test_maximize_throughput_picks_highest():
    result = BaselineOptimizer().optimize(
        request(
            [
                evidence("cfg-a", throughput=10.0),
                evidence("cfg-b", throughput=90.0),
            ],
            objective=OptimizationObjective(name="maximize_throughput"),
        )
    )
    assert result.selected_configuration_id == "cfg-b"
    scores = {item.configuration_id: item.score for item in result.candidates}
    assert scores["cfg-b"] == 0.0
    assert scores["cfg-a"] == 1.0


def test_weighted_score_normalises_metrics():
    candidate_a = evidence("cfg-a", latency_ms=10.0, throughput=10.0)
    candidate_b = evidence("cfg-b", latency_ms=20.0, throughput=20.0)
    result = BaselineOptimizer().optimize(
        request(
            [candidate_a, candidate_b],
            objective=OptimizationObjective(
                name="minimize_weighted_score",
                weights={"latency_ms": 0.5, "output_throughput_tps": 0.5},
            ),
        )
    )
    # cfg-a is best latency (0) and worst throughput (1) => 0.5
    # cfg-b is worst latency (1) and best throughput (0) => 0.5
    scores = {item.configuration_id: item.score for item in result.candidates}
    assert scores["cfg-a"] == 0.5
    assert scores["cfg-b"] == 0.5
    # deterministic tie-break
    assert result.selected_configuration_id == "cfg-a"


def test_stale_evidence_is_rejected():
    stale = evidence("cfg-a", finished_at=utcnow() - timedelta(days=30))
    result = BaselineOptimizer().optimize(request([stale], policy=EvidencePolicy(max_age_hours=1)))
    assert result.status == "insufficient_evidence"
    assert any(
        reason["code"] == "stale_evidence" for reason in result.candidates[0].rejection_reasons
    )


def test_test_only_evidence_rejected_by_default_but_explicitly_allowed():
    fake = evidence("cfg-a", test_only=True)
    denied = BaselineOptimizer().optimize(request([fake]))
    assert denied.status == "insufficient_evidence"
    allowed = BaselineOptimizer().optimize(
        request([fake], policy=EvidencePolicy(allow_test_only_evidence=True))
    )
    assert allowed.status == "selected"
    assert allowed.selected_configuration_id == "cfg-a"
