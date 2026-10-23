"""Duplicate-submission protection (X-Request-ID as an idempotency key).

A replayed request must return the work that was already accepted, and must
never create a second job, benchmark run or inference execution.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core.idempotency import is_job_idempotency_conflict
from app.db.models import Job
from tests.conftest import wait_for_job


def _benchmark_payload(configuration: dict, workload: dict) -> dict:
    return {"configuration_id": configuration["id"], "workload_id": workload["id"]}


def test_job_idempotency_constraint_scopes_keys_and_allows_nulls(client: TestClient):
    factory = client.app.state.container.session_factory
    with factory() as session:
        session.add_all(
            [
                Job(id="null-job-1", job_type="benchmark", request_id=None),
                Job(id="null-job-2", job_type="benchmark", request_id=None),
                Job(id="type-job-1", job_type="benchmark", request_id="shared-key"),
                Job(id="type-job-2", job_type="inference", request_id="shared-key"),
            ]
        )
        session.commit()

        session.add(Job(id="duplicate-job", job_type="benchmark", request_id="shared-key"))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

        assert session.query(Job).count() == 4


def test_unrelated_integrity_errors_are_not_idempotency_conflicts():
    assert not is_job_idempotency_conflict(
        IntegrityError("insert", {}, ValueError("UNIQUE constraint failed: configurations.name"))
    )


def test_repeated_request_id_replays_benchmark_submission(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration()
    workload = make_workload()
    headers = {"X-Request-ID": "idempotent-benchmark-1"}
    payload = _benchmark_payload(configuration, workload)

    first = client.post("/api/v1/benchmarks", json=payload, headers=headers)
    second = client.post("/api/v1/benchmarks", json=payload, headers=headers)

    assert first.status_code == 202, first.text
    assert second.status_code == 202, second.text
    assert first.json()["duplicate"] is False
    assert second.json()["duplicate"] is True
    assert first.json()["job_id"] == second.json()["job_id"]
    assert first.json()["benchmark_run_id"] == second.json()["benchmark_run_id"]
    assert second.json()["message"].startswith("Duplicate submission replayed")

    wait_for_job(client, first.json()["job_id"])
    runs = client.get("/api/v1/benchmarks", params={"include_test_only": True}).json()
    assert runs["total"] == 1
    jobs = client.get("/api/v1/jobs", params={"job_type": "benchmark"}).json()
    assert jobs["total"] == 1


def test_concurrent_identical_submissions_create_one_run(
    client: TestClient, make_configuration, make_workload
):
    """The replay check and the insert must be atomic under concurrency.

    Eight simultaneous requests carrying the same ``X-Request-ID`` used to pass
    the replay check before any of them had committed, creating eight runs.
    """
    configuration = make_configuration()
    workload = make_workload()
    payload = _benchmark_payload(configuration, workload)
    headers = {"X-Request-ID": "concurrent-benchmark-key"}

    def submit(_index: int):
        return client.post("/api/v1/benchmarks", json=payload, headers=headers)

    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(submit, range(8)))

    assert [response.status_code for response in responses] == [202] * 8
    run_ids = {response.json()["benchmark_run_id"] for response in responses}
    job_ids = {response.json()["job_id"] for response in responses}
    assert len(run_ids) == 1, f"concurrent submissions created {len(run_ids)} runs"
    assert len(job_ids) == 1, f"concurrent submissions created {len(job_ids)} jobs"
    assert sum(1 for response in responses if response.json()["duplicate"]) == 7

    runs = client.get("/api/v1/benchmarks", params={"include_test_only": True}).json()
    assert runs["total"] == 1
    wait_for_job(client, next(iter(job_ids)))


def test_concurrent_identical_inference_submissions_create_one_execution(
    client: TestClient, make_configuration
):
    configuration = make_configuration()
    payload = {
        "configuration_id": configuration["id"],
        "prompt": "concurrent",
        "generation_parameters": {"max_tokens": 4},
    }
    headers = {"X-Request-ID": "concurrent-inference-key"}

    def submit(_index: int):
        return client.post("/api/v1/inference", json=payload, headers=headers)

    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(submit, range(8)))

    assert [response.status_code for response in responses] == [202] * 8
    execution_ids = {response.json()["execution_id"] for response in responses}
    assert len(execution_ids) == 1, (
        f"concurrent submissions created {len(execution_ids)} executions"
    )
    executions = client.get("/api/v1/inference").json()
    assert executions["total"] == 1
    wait_for_job(client, responses[0].json()["job_id"])


def test_different_request_ids_create_distinct_runs(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration()
    workload = make_workload()
    payload = _benchmark_payload(configuration, workload)
    first = client.post("/api/v1/benchmarks", json=payload, headers={"X-Request-ID": "distinct-1"})
    second = client.post("/api/v1/benchmarks", json=payload, headers={"X-Request-ID": "distinct-2"})
    assert first.json()["benchmark_run_id"] != second.json()["benchmark_run_id"]
    assert second.json()["duplicate"] is False
    wait_for_job(client, first.json()["job_id"])
    wait_for_job(client, second.json()["job_id"])
    runs = client.get("/api/v1/benchmarks", params={"include_test_only": True}).json()
    assert runs["total"] == 2


def test_repeated_decision_execution_replays_the_same_execution(client: TestClient, run_benchmark):
    configuration, workload, _run, _job = run_benchmark()
    decision = client.post(
        "/api/v1/optimization/decisions",
        json={
            "workload_id": workload["id"],
            "candidate_configuration_ids": [configuration["id"]],
            "objective": "minimize_latency",
            "evidence_policy": {"allow_test_only_evidence": True},
        },
    ).json()["decision"]
    headers = {"X-Request-ID": "decision-execution-key"}
    body = {"prompt": "execute once", "generation_parameters": {"max_tokens": 4}}
    first = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute", json=body, headers=headers
    )
    second = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute", json=body, headers=headers
    )
    assert first.status_code == 202, first.text
    assert second.status_code == 202, second.text
    assert first.json()["duplicate"] is False
    assert second.json()["duplicate"] is True
    assert first.json()["inference_execution_id"] == second.json()["inference_execution_id"]
    assert first.json()["job_id"] == second.json()["job_id"]
    assert second.json()["message"].startswith("Duplicate execution replayed")
    wait_for_job(client, first.json()["job_id"])
    executions = client.get("/api/v1/inference").json()
    assert executions["total"] == 1


def test_repeated_request_id_with_different_target_is_rejected(
    client: TestClient, make_configuration, make_workload
):
    first_configuration = make_configuration()
    second_configuration = make_configuration()
    workload = make_workload()
    headers = {"X-Request-ID": "conflicting-benchmark"}
    client.post(
        "/api/v1/benchmarks",
        json=_benchmark_payload(first_configuration, workload),
        headers=headers,
    )
    conflict = client.post(
        "/api/v1/benchmarks",
        json=_benchmark_payload(second_configuration, workload),
        headers=headers,
    )
    assert conflict.status_code == 409
    body = conflict.json()
    assert body["error"]["code"] == "conflict"
    # Details identify the existing run so the client can reconcile.
    assert body["error"]["details"]["existing_configuration_id"] == first_configuration["id"]


def test_repeated_request_id_replays_inference_submission(client: TestClient, make_configuration):
    configuration = make_configuration()
    headers = {"X-Request-ID": "idempotent-inference-1"}
    payload = {
        "configuration_id": configuration["id"],
        "prompt": "repeat me",
        "generation_parameters": {"max_tokens": 4},
    }
    first = client.post("/api/v1/inference", json=payload, headers=headers)
    second = client.post("/api/v1/inference", json=payload, headers=headers)
    assert first.status_code == 202, first.text
    assert second.status_code == 202, second.text
    assert second.json()["duplicate"] is True
    assert first.json()["execution_id"] == second.json()["execution_id"]
    wait_for_job(client, first.json()["job_id"])
    executions = client.get("/api/v1/inference").json()
    assert executions["total"] == 1


def test_repeated_request_id_with_different_configuration_is_rejected(
    client: TestClient, make_configuration
):
    first_configuration = make_configuration()
    second_configuration = make_configuration()
    headers = {"X-Request-ID": "conflicting-inference"}
    client.post(
        "/api/v1/inference",
        json={"configuration_id": first_configuration["id"], "prompt": "a"},
        headers=headers,
    )
    conflict = client.post(
        "/api/v1/inference",
        json={"configuration_id": second_configuration["id"], "prompt": "a"},
        headers=headers,
    )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "conflict"


def test_repeated_request_id_replays_fresh_optimization_request(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration()
    workload = make_workload()
    headers = {"X-Request-ID": "idempotent-optimization-1"}
    payload = {
        "workload_id": workload["id"],
        "candidate_configuration_ids": [configuration["id"]],
        "objective": "minimize_latency",
        "evidence_policy": {"allow_test_only_evidence": True},
        "allow_fresh_benchmarking": True,
    }
    first = client.post("/api/v1/optimization/decisions", json=payload, headers=headers)
    second = client.post("/api/v1/optimization/decisions", json=payload, headers=headers)
    assert first.status_code == 202, first.text
    assert second.status_code == 200, second.text
    assert second.json()["duplicate"] is True
    assert first.json()["decision"]["id"] == second.json()["decision"]["id"]
    assert first.json()["job_id"] == second.json()["job_id"]
    wait_for_job(client, first.json()["job_id"])
    decisions = client.get("/api/v1/optimization/decisions").json()
    assert decisions["total"] == 1
    jobs = client.get("/api/v1/jobs", params={"job_type": "optimization"}).json()
    assert jobs["total"] == 1
