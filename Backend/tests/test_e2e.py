from __future__ import annotations

import json

from fastapi.testclient import TestClient

from tests.conftest import wait_for_job


def test_full_workflow_build_benchmark_decide_execute_and_export(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration(name="e2e-config")
    workload = make_workload(name="e2e-workload")

    # 1. Benchmark through the bounded job manager.
    accepted = client.post(
        "/api/v1/benchmarks",
        json={
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
            "warmup_iterations": 1,
            "repetitions": 3,
        },
    )
    assert accepted.status_code == 202
    accepted_body = accepted.json()
    assert accepted_body["test_only"] is True
    benchmark_job = wait_for_job(client, accepted_body["job_id"])
    assert benchmark_job["status"] == "completed"

    run = client.get(f"/api/v1/benchmarks/{accepted_body['benchmark_run_id']}").json()
    assert run["status"] == "completed"
    assert run["snapshot_hash"]
    assert run["protocol_version"] == "lattice.benchmark/1.0.0"
    assert run["model_identity"]["model_id"] == "tiny-test-model"

    # 2. Raw repetitions remain individually queryable.
    measurements = client.get(
        f"/api/v1/benchmarks/{run['id']}/measurements", params={"kind": "measured"}
    ).json()
    assert measurements["total"] == 3
    for item in measurements["items"]:
        assert item["metrics_json"]["latency_ms"]["status"] == "measured"
        assert item["metrics_json"]["output_tokens"]["value"] == 10
        assert item["token_count_source"] == "runtime"

    # 3. Persisted decision uses compatible evidence; fake evidence is explicitly allowed.
    decision_response = client.post(
        "/api/v1/optimization/decisions",
        json={
            "workload_id": workload["id"],
            "candidate_configuration_ids": [configuration["id"]],
            "constraints": [
                {"metric": "latency_ms", "operator": "<=", "value": 100000, "unit": "ms"}
            ],
            "objective": "minimize_latency",
            "evidence_policy": {"allow_test_only_evidence": True},
        },
    )
    assert decision_response.status_code == 201
    decision = decision_response.json()["decision"]
    assert decision["status"] == "selected"
    assert decision["selected_configuration_id"] == configuration["id"]
    assert decision["evidence_run_ids"] == [run["id"]]

    # 4. Execute only the persisted feasible decision as a new inference job.
    execution_response = client.post(
        f"/api/v1/optimization/decisions/{decision['id']}/execute",
        json={"prompt": "Summarize the result.", "generation_parameters": {"max_tokens": 5}},
    )
    assert execution_response.status_code == 202
    execution_ref = execution_response.json()
    inference_job = wait_for_job(client, execution_ref["job_id"])
    assert inference_job["status"] == "completed"
    execution = client.get(f"/api/v1/inference/{execution_ref['inference_execution_id']}").json()
    assert execution["status"] == "completed"
    assert execution["validation_status"] == "passed"
    assert execution["prompt_retained"] is False
    assert execution["retained_output"] is None

    # 5. History remains interpretable and exportable with provenance.
    history = client.get("/api/v1/history").json()
    assert history["counts"]["benchmark_runs"] >= 1
    assert history["counts"]["optimization_decisions"] >= 1
    assert history["counts"]["inference_executions"] >= 1

    configuration_history = client.get(
        f"/api/v1/history/configurations/{configuration['id']}"
    ).json()
    assert any(item["id"] == run["id"] for item in configuration_history["runs"])
    assert any(item["id"] == decision["id"] for item in configuration_history["decisions"])

    export = client.get("/api/v1/history/export", params={"include_test_only": True})
    lines = [line for line in export.text.splitlines() if line.strip()]
    assert len(lines) == 1
    payload = json.loads(lines[0])
    assert payload["run"]["id"] == run["id"]
    assert payload["measurements"]
    assert payload["decision_references"] == [decision["id"]]
    assert payload["provenance"]["test_only"] is True

    # 6. Decision is reconstructable from stored inputs and evidence.
    refetched = client.get(f"/api/v1/optimization/decisions/{decision['id']}").json()
    assert (
        refetched["constraint_specification"]["constraints"]
        == decision["constraint_specification"]["constraints"]
    )
    assert refetched["evidence_policy"]["allow_test_only_evidence"] is True
    assert refetched["candidates"][0]["evidence_run_ids"] == [run["id"]]

    # 7. Config/workload snapshots survive later edits.
    client.patch(f"/api/v1/configurations/{configuration['id']}", json={"description": "edited"})
    client.patch(
        f"/api/v1/workloads/{workload['id']}",
        json={"input_spec": {"prompt": "edited prompt"}},
    )
    stored = client.get(f"/api/v1/benchmarks/{run['id']}").json()
    assert (
        stored["configuration_snapshot"]["content_hash"]
        == run["configuration_snapshot"]["content_hash"]
    )
    assert stored["workload_snapshot"]["content_hash"] == run["workload_snapshot"]["content_hash"]
