from __future__ import annotations

from fastapi.testclient import TestClient

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
