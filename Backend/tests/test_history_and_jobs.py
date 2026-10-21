from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.core.errors import CapacityError
from app.db.models import Job


def test_jobs_list_filters_and_errors(client: TestClient, run_benchmark):
    _configuration, _workload, run, job = run_benchmark()
    listed = client.get("/api/v1/jobs", params={"status": "completed"}).json()
    assert listed["total"] >= 1
    assert any(item["id"] == job["id"] for item in listed["items"])
    assert all(item["status"] == "completed" for item in listed["items"])
    benchmark_jobs = client.get("/api/v1/jobs", params={"job_type": "benchmark"}).json()
    assert any(item["benchmark_run_id"] == run["id"] for item in benchmark_jobs["items"])
    assert client.get("/api/v1/jobs/unknown").status_code == 404
    assert client.get("/api/v1/jobs", params={"limit": 0}).status_code == 422
    assert client.get("/api/v1/jobs", params={"limit": 100000}).status_code == 422


def test_history_summary_and_views(client: TestClient, run_benchmark):
    configuration, workload, run, _job = run_benchmark()
    summary = client.get("/api/v1/history").json()
    assert summary["counts"]["benchmark_runs"] >= 1
    assert summary["counts"]["jobs"] >= 1
    # Fake-runtime runs are excluded from research summaries by default.
    assert summary["latest_runs"] == []
    assert summary["null_metric_reason"]

    benchmark = client.get(f"/api/v1/history/benchmarks/{run['id']}")
    assert benchmark.status_code == 200
    body = benchmark.json()
    assert body["run"]["id"] == run["id"]
    assert body["measurement_total"] == 4
    assert len(body["measurements"]) == 4

    configuration_history = client.get(f"/api/v1/history/configurations/{configuration['id']}")
    assert configuration_history.status_code == 200
    assert any(item["id"] == run["id"] for item in configuration_history.json()["runs"])

    assert client.get("/api/v1/history/benchmarks/unknown").status_code == 404
    assert client.get("/api/v1/history/configurations/unknown").status_code == 404
    assert client.get("/api/v1/history/decisions/unknown").status_code == 404


def test_jsonl_export_is_parseable_and_provenance_complete(client: TestClient, run_benchmark):
    _configuration, _workload, run, _job = run_benchmark()
    default_export = client.get("/api/v1/history/export")
    assert default_export.status_code == 200
    assert default_export.text == ""

    export = client.get("/api/v1/history/export", params={"include_test_only": True})
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("application/x-ndjson")
    lines = [line for line in export.text.splitlines() if line.strip()]
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert record["schema_version"] == "lattice.experiment-export/1"
    assert record["record_type"] == "benchmark_run"
    assert record["run"]["id"] == run["id"]
    assert record["run"]["test_only"] is True
    assert len(record["measurements"]) == 4
    assert record["provenance"]["hardware_snapshot"]
    assert record["provenance"]["protocol_snapshot"]
    assert record["provenance"]["configuration_snapshot"]
    assert record["provenance"]["workload_snapshot"]
    assert all(
        summary["metric_name"] and summary["status"] for summary in record["metric_summaries"]
    )

    filtered = client.get(
        "/api/v1/history/export",
        params={"include_test_only": True, "run_id": run["id"]},
    )
    assert len(filtered.text.splitlines()) == 1
    bad_format = client.get("/api/v1/history/export", params={"format": "csv"})
    assert bad_format.status_code == 422


def test_queue_capacity_is_bounded(client: TestClient):
    container = client.app.state.container
    reserved = 0
    try:
        for _ in range(container.job_manager.max_pending):
            container.job_manager.reserve()
            reserved += 1
        try:
            container.job_manager.reserve()
        except CapacityError as exc:
            assert exc.code == "queue_capacity_exhausted"
        else:  # pragma: no cover - defensive
            raise AssertionError("capacity limit was not enforced")
    finally:
        for _ in range(reserved):
            container.job_manager.release()


def test_cancel_only_queued_jobs(client: TestClient):
    container = client.app.state.container
    with container.session_factory() as session:
        queued = Job(id="queued-job", job_type="benchmark", status="queued")
        running = Job(id="running-job", job_type="benchmark", status="running")
        session.add_all([queued, running])
        session.commit()
    assert container.job_manager.cancel("queued-job") is True
    assert container.job_manager.cancel("queued-job") is False
    assert container.job_manager.cancel("running-job") is False
    with container.session_factory() as session:
        assert session.get(Job, "queued-job").status == "cancelled"
