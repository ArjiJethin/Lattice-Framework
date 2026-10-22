from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.db.models import BenchmarkRun, OptimizationDecision
from app.services.optimization import OptimizationService
from tests.conftest import wait_for_job

ALLOW_FAKE_EVIDENCE = {"allow_test_only_evidence": True}


def decision_payload(workload_id: str, configuration_id: str, **overrides):
    payload = {
        "workload_id": workload_id,
        "candidate_configuration_ids": [configuration_id],
        "constraints": [],
        "objective": "minimize_latency",
        "evidence_policy": ALLOW_FAKE_EVIDENCE,
    }
    payload.update(overrides)
    return payload


def test_decision_selected_from_compatible_evidence(client: TestClient, run_benchmark):
    configuration, workload, run, _job = run_benchmark()
    response = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            constraints=[{"metric": "latency_ms", "operator": "<=", "value": 10000, "unit": "ms"}],
        ),
    )
    assert response.status_code == 201
    body = response.json()
    decision = body["decision"]
    assert body["job_id"] is None
    assert decision["status"] == "selected"
    assert decision["selected_configuration_id"] == configuration["id"]
    assert decision["evidence_run_ids"] == [run["id"]]
    assert decision["algorithm"] == "baseline-feasibility-v1"
    candidate = decision["candidates"][0]
    assert candidate["feasibility"] == "feasible"
    assert candidate["score"] == 0.0
    assert candidate["rank"] == 1
    assert any(warning["code"] == "test_only_evidence" for warning in candidate["warnings"])
    assert candidate["constraint_results"][0]["outcome"] == "pass"

    fetched = client.get(f"/api/v1/optimization/decisions/{decision['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["selected_configuration_id"] == configuration["id"]
    listed = client.get("/api/v1/optimization/decisions").json()
    assert listed["total"] >= 1


def test_test_only_evidence_is_rejected_by_default(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    response = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            evidence_policy={"allow_test_only_evidence": False},
        ),
    )
    assert response.status_code == 201
    decision = response.json()["decision"]
    assert decision["status"] == "insufficient_evidence"
    assert decision["selected_configuration_id"] is None
    assert decision["candidates"][0]["feasibility"] == "insufficient_evidence"


def test_hard_constraint_violation_is_no_feasible_candidate(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    response = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            constraints=[
                {"metric": "latency_ms", "operator": "<=", "value": 0.000001, "unit": "ms"}
            ],
        ),
    )
    decision = response.json()["decision"]
    assert decision["status"] == "no_feasible_candidate"
    assert decision["selected_configuration_id"] is None
    assert decision["candidates"][0]["feasibility"] == "infeasible"
    assert any(
        reason["code"] == "hard_constraint_violated"
        for reason in decision["candidates"][0]["rejection_reasons"]
    )


def test_unknown_required_metric_is_insufficient_evidence(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    response = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            constraints=[
                {"metric": "exact_match_accuracy", "operator": ">=", "value": 0.8, "unit": "ratio"}
            ],
        ),
    )
    decision = response.json()["decision"]
    assert decision["status"] == "insufficient_evidence"
    assert decision["candidates"][0]["constraint_results"][0]["outcome"] == "unknown"


def test_execute_refuses_infeasible_decision(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            constraints=[
                {"metric": "latency_ms", "operator": "<=", "value": 0.000001, "unit": "ms"}
            ],
        ),
    ).json()["decision"]
    response = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "hello"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "decision_not_executable"


def test_execute_selected_decision_creates_inference(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(workload["id"], configuration["id"]),
    ).json()["decision"]
    response = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "execute me", "generation_parameters": {"max_tokens": 4}},
    )
    assert response.status_code == 202
    body = response.json()
    job = wait_for_job(client, body["job_id"])
    assert job["status"] == "completed"
    execution = client.get(f"/api/v1/inference/{body['inference_execution_id']}").json()
    assert execution["status"] == "completed"
    assert execution["decision_id"] == decision["id"]
    fetched = client.get(f"/api/v1/optimization/decisions/{decision['id']}").json()
    assert fetched["execution_job_id"] == body["job_id"]


def test_execution_outcome_reports_constraints_met(client: TestClient, run_benchmark):
    configuration, workload, run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            constraints=[{"metric": "latency_ms", "operator": "<=", "value": 10000, "unit": "ms"}],
        ),
    ).json()["decision"]
    execution = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "outcome probe", "generation_parameters": {"max_tokens": 4}},
    ).json()
    wait_for_job(client, execution["job_id"])

    response = client.get(f"/api/v1/optimization/decisions/{decision['id']}/execution")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["verdict"] == "constraints_met"
    assert body["constraints_satisfied"] is True
    assert body["executed"] is True
    assert body["execution_count"] == 1
    assert body["execution_status"] == "completed"
    assert body["inference_execution_id"] == execution["inference_execution_id"]
    assert body["execution_job_id"] == execution["job_id"]
    assert body["baseline_run_id"] == run["id"]
    assert body["baseline_available"] is True
    assert body["actual_metrics_available"] is True
    assert body["validation_status"] == "passed"
    assert body["constraint_results"][0]["outcome"] == "pass"

    latency = next(item for item in body["metrics"] if item["metric"] == "latency_ms")
    assert latency["direction"] == "minimize"
    assert latency["baseline_value"] is not None
    assert latency["actual_value"] is not None
    assert latency["absolute_delta"] == pytest.approx(
        round(latency["actual_value"] - latency["baseline_value"], 6)
    )
    assert latency["improved"] in (True, False)
    assert latency["baseline_status"] in {"measured", "derived"}
    assert any("test-only" in note for note in body["notes"])


def test_execution_outcome_before_execution_is_not_executed(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(workload["id"], configuration["id"]),
    ).json()["decision"]
    body = client.get(f"/api/v1/optimization/decisions/{decision['id']}/execution").json()
    assert body["verdict"] == "not_executed"
    assert body["executed"] is False
    assert body["execution_count"] == 0
    assert body["constraints_satisfied"] is None
    # Baseline evidence is still reported even though nothing was executed.
    assert body["baseline_available"] is True
    assert all(item["actual_value"] is None for item in body["metrics"])


def test_execution_outcome_reports_violated_constraint(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            constraints=[{"metric": "latency_ms", "operator": "<=", "value": 10000, "unit": "ms"}],
        ),
    ).json()["decision"]
    # Tighten the persisted constraint after the decision was made: the decision
    # stays feasible on its recorded evidence, but the execution must report the
    # real post-execution verdict instead of reusing the decision's optimism.
    container = client.app.state.container
    with container.session_factory() as session:
        stored = session.get(OptimizationDecision, decision["id"])
        stored.constraint_specification = {
            "constraints": [{"metric": "latency_ms", "operator": "<=", "value": 0.0, "unit": "ms"}]
        }
        session.commit()

    execution = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "tight constraint", "generation_parameters": {"max_tokens": 4}},
    ).json()
    wait_for_job(client, execution["job_id"])
    body = client.get(f"/api/v1/optimization/decisions/{decision['id']}/execution").json()
    assert body["verdict"] == "constraints_violated"
    assert body["constraints_satisfied"] is False
    assert body["constraint_results"][0]["outcome"] == "fail"


def test_evidence_from_different_hardware_is_flagged(client: TestClient, run_benchmark):
    configuration, workload, run, _job = run_benchmark()
    container = client.app.state.container
    with container.session_factory() as session:
        stored = session.get(BenchmarkRun, run["id"])
        stored.hardware_snapshot = {
            "system": {"os": {"value": "TestOS-9"}},
            "cpu": {"model": {"value": "Test CPU 9000"}},
            "gpu": {"devices": []},
        }
        session.commit()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(workload["id"], configuration["id"]),
    ).json()["decision"]
    warnings = decision["candidates"][0]["warnings"]
    assert any(warning["code"] == "evidence_hardware_mismatch" for warning in warnings)


def test_decision_requires_evidence_for_the_requested_workload(
    client: TestClient, run_benchmark, make_workload
):
    """A run collected for workload A must never justify a decision for workload B."""
    configuration, _workload_a, run, _job = run_benchmark()
    other_workload = make_workload(name=f"other-workload-{run['id'][:8]}")
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(other_workload["id"], configuration["id"]),
    ).json()["decision"]
    assert decision["status"] == "insufficient_evidence"
    assert decision["selected_configuration_id"] is None
    candidate = decision["candidates"][0]
    assert candidate["feasibility"] == "insufficient_evidence"
    assert candidate["evidence_run_ids"] == []
    reasons = {reason["code"] for reason in candidate["rejection_reasons"]}
    assert "incompatible_evidence" in reasons
    messages = " ".join(reason["message"] for reason in candidate["rejection_reasons"])
    assert "no compatible benchmark evidence" in messages
    # The run for workload A exists but must not be used here.
    assert run["id"] not in decision["evidence_run_ids"]


def test_repeated_execution_is_counted_and_latest_reported(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(workload["id"], configuration["id"]),
    ).json()["decision"]
    first = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "first execution", "generation_parameters": {"max_tokens": 4}},
    ).json()
    wait_for_job(client, first["job_id"])
    second = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "second execution", "generation_parameters": {"max_tokens": 4}},
    ).json()
    wait_for_job(client, second["job_id"])

    outcome = client.get(f"/api/v1/optimization/decisions/{decision['id']}/execution").json()
    assert outcome["execution_count"] == 2
    assert outcome["inference_execution_id"] == second["inference_execution_id"]
    assert outcome["execution_job_id"] == second["job_id"]
    # This decision declared no hard constraints, so there is nothing to verify:
    # the honest verdict is "completed, unverified", not "constraints met".
    assert outcome["verdict"] == "completed_unverified"
    assert outcome["constraints_satisfied"] is None
    assert any("declared no hard constraints" in note for note in outcome["notes"])
    assert any("2 inference executions" in note for note in outcome["notes"])


def test_execution_outcome_reports_failed_execution(client: TestClient, run_benchmark):
    from app.runtime.fake import FakeRuntimeProfile
    from app.runtime.registry import RuntimeRegistry

    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(workload["id"], configuration["id"]),
    ).json()["decision"]
    container = client.app.state.container
    # Swap in a runtime that fails every generation: the execution must be
    # reported as failed, never as a constraint pass.
    container.runtime_registry = RuntimeRegistry(
        container.settings,
        fake_profile=FakeRuntimeProfile(generation_delay_ms=0, fail_on_calls={1}),
    )
    execution = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "this will fail", "generation_parameters": {"max_tokens": 4}},
    ).json()
    job = wait_for_job(client, execution["job_id"])
    assert job["status"] == "failed"

    outcome = client.get(f"/api/v1/optimization/decisions/{decision['id']}/execution").json()
    assert outcome["verdict"] == "failed"
    assert outcome["constraints_satisfied"] is None
    assert outcome["execution_status"] == "failed"
    assert outcome["execution_error_code"]
    assert any("error code" in note for note in outcome["notes"])
    # Memory sampling can still have produced values, but latency must not be
    # invented for a repetition that never completed.
    latency = next(item for item in outcome["metrics"] if item["metric"] == "latency_ms")
    assert latency["actual_value"] is None
    assert latency["improved"] is None
    assert latency["reason"]


def test_execution_outcome_survives_a_missing_execution_row(client: TestClient, run_benchmark):
    from app.db.models import InferenceExecution

    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(workload["id"], configuration["id"]),
    ).json()["decision"]
    execution = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "delete me", "generation_parameters": {"max_tokens": 4}},
    ).json()
    wait_for_job(client, execution["job_id"])

    container = client.app.state.container
    with container.session_factory() as session:
        row = session.get(InferenceExecution, execution["inference_execution_id"])
        assert row is not None
        session.delete(row)
        session.commit()

    response = client.get(f"/api/v1/optimization/decisions/{decision['id']}/execution")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["verdict"] == "execution_missing"
    assert body["inference_execution_id"] is None
    assert body["constraints_satisfied"] is None
    assert any("no longer exists" in note for note in body["notes"])


def test_evidence_policy_rejects_unsupported_run_statuses(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    response = client.post(
        "/api/v1/optimization/decisions",
        json=decision_payload(
            workload["id"],
            configuration["id"],
            evidence_policy={"allowed_run_statuses": ["running"]},
        ),
    )
    assert response.status_code == 422
    assert "allowed_run_statuses" in response.text


def test_failed_optimization_job_does_not_strand_the_decision(
    client: TestClient, make_workload, monkeypatch: pytest.MonkeyPatch
):
    """A worker crash must terminalise the decision, never leave it pending forever."""
    workload = make_workload()
    container = client.app.state.container
    with container.session_factory() as session:
        session.add(
            OptimizationDecision(
                id="decision-orphaned",
                workload_id=workload["id"],
                workload_snapshot={},
                constraint_specification={"constraints": []},
                objective="minimize_latency",
                weights={},
                evidence_policy={},
                candidate_configuration_ids=[],
                feasible_configuration_ids=[],
                evidence_run_ids=[],
                status="pending_evidence",
                algorithm="baseline-feasibility-v1",
                algorithm_version="1.0.0",
            )
        )
        session.commit()
        service = OptimizationService(
            session,
            settings=container.settings,
            runtime_registry=container.runtime_registry,
            hardware_service=container.hardware_service,
            quality_registry=container.quality_registry,
            job_manager=container.job_manager,
            runtime_locks=container.runtime_locks,
            session_factory=container.session_factory,
            optimizer=container.optimizer,
        )

    def _explode(workload_row):  # pragma: no cover - deterministic failure injection
        raise RuntimeError("simulated worker crash while collecting evidence")

    monkeypatch.setattr("app.services.optimization.build_workload_snapshot", _explode)
    with pytest.raises(RuntimeError):
        service.run_decision_job("decision-orphaned")

    with container.session_factory() as session:
        stored = session.get(OptimizationDecision, "decision-orphaned")
        assert stored.status == "failed"
        assert "optimization job failed" in stored.no_selection_reason
        assert stored.explanation == stored.no_selection_reason


def test_alias_routes_match_canonical_routes(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    response = client.post(
        "/api/v1/optimization", json=decision_payload(workload["id"], configuration["id"])
    )
    assert response.status_code == 201
    decision_id = response.json()["decision"]["id"]
    alias = client.get(f"/api/v1/optimization/{decision_id}")
    assert alias.status_code == 200
    assert alias.json()["id"] == decision_id


def test_fresh_benchmarking_requires_runtime(client: TestClient, make_configuration, make_workload):
    configuration = make_configuration()
    workload = make_workload()
    # No benchmark evidence exists; fresh benchmarking is requested. Because the
    # fake runtime is available here, this creates a job rather than failing, but
    # the API must not silently run benchmarks without returning a job id.
    response = client.post(
        "/api/v1/optimization/decisions",
        json={
            "workload_id": workload["id"],
            "candidate_configuration_ids": [configuration["id"]],
            "objective": "minimize_latency",
            "evidence_policy": ALLOW_FAKE_EVIDENCE,
            "allow_fresh_benchmarking": True,
        },
    )
    assert response.status_code == 202
    body = response.json()
    assert body["job_id"]
    job = wait_for_job(client, body["job_id"], timeout_seconds=30)
    assert job["status"] == "completed"
    decision = client.get(f"/api/v1/optimization/decisions/{body['decision']['id']}").json()
    assert decision["status"] in {"selected", "no_feasible_candidate", "insufficient_evidence"}
    runs = client.get("/api/v1/benchmarks", params={"include_test_only": True}).json()
    assert runs["total"] >= 1
