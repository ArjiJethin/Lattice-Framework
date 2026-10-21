from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_and_update_workload_bumps_version(client: TestClient, make_workload):
    workload = make_workload()
    assert workload["version"] == 1
    updated = client.patch(
        f"/api/v1/workloads/{workload['id']}",
        json={"input_spec": {"prompt": "A different prompt"}, "output_tokens_target": 20},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["version"] == 2
    assert body["input_spec"]["prompt"] == "A different prompt"
    assert body["snapshot_hash"] != workload["snapshot_hash"]


def test_invalid_workload_is_rejected(client: TestClient):
    missing_prompt = client.post(
        "/api/v1/workloads",
        json={
            "name": "no-prompt",
            "workload_type": "generation",
            "input_spec": {},
            "output_tokens_target": 10,
            "context_requirement": 128,
        },
    )
    assert missing_prompt.status_code == 422

    exact_match_without_reference = client.post(
        "/api/v1/workloads",
        json={
            "name": "no-reference",
            "workload_type": "exact_match",
            "input_spec": {"prompt": "2+2?"},
            "output_tokens_target": 10,
            "context_requirement": 128,
        },
    )
    assert exact_match_without_reference.status_code == 422

    impossible_target = client.post(
        "/api/v1/workloads",
        json={
            "name": "bad-target",
            "workload_type": "generation",
            "input_spec": {"prompt": "x"},
            "output_tokens_target": 100,
            "output_tokens_max": 10,
            "context_requirement": 128,
        },
    )
    assert impossible_target.status_code == 422


def test_workload_delete_soft_with_history(client: TestClient, run_benchmark):
    _configuration, workload, _run, _job = run_benchmark()
    deleted = client.delete(f"/api/v1/workloads/{workload['id']}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] == "soft"
    assert client.get(f"/api/v1/workloads/{workload['id']}").status_code == 404


def test_benchmark_snapshot_is_not_affected_by_later_edits(client: TestClient, run_benchmark):
    _configuration, workload, run, _job = run_benchmark()
    original_prompt = run["workload_snapshot"]["input_spec"]["prompt"]
    updated = client.patch(
        f"/api/v1/workloads/{workload['id']}",
        json={"input_spec": {"prompt": "Mutated after the benchmark"}},
    )
    assert updated.status_code == 200
    fetched = client.get(f"/api/v1/benchmarks/{run['id']}").json()
    assert fetched["workload_snapshot"]["input_spec"]["prompt"] == original_prompt
    assert fetched["workload_snapshot"]["content_hash"] == run["workload_snapshot"]["content_hash"]


def test_unknown_workload_404(client: TestClient):
    response = client.get("/api/v1/workloads/nope")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
