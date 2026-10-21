from __future__ import annotations

from fastapi.testclient import TestClient

from app.db.models import BenchmarkRun
from app.runtime.fake import FakeRuntimeProfile
from app.runtime.registry import RuntimeRegistry
from tests.conftest import wait_for_job


def _run(client: TestClient, configuration_id: str, workload_id: str, **overrides) -> dict:
    payload = {
        "configuration_id": configuration_id,
        "workload_id": workload_id,
        "warmup_iterations": 1,
        "repetitions": 2,
    }
    payload.update(overrides)
    accepted = client.post("/api/v1/benchmarks", json=payload)
    assert accepted.status_code == 202, accepted.text
    job = wait_for_job(client, accepted.json()["job_id"])
    assert job["status"] == "completed", job
    run = client.get(f"/api/v1/benchmarks/{accepted.json()['benchmark_run_id']}").json()
    return run


def _mark_research_runs(client: TestClient, run_ids: list[str]) -> None:
    with client.app.state.container.session_factory() as session:
        for run_id in run_ids:
            run = session.get(BenchmarkRun, run_id)
            assert run is not None
            run.test_only = False
        session.commit()


def test_identical_runs_are_comparable_and_expose_metric_methods(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration()
    workload = make_workload()
    first = _run(client, configuration["id"], workload["id"])
    second = _run(client, configuration["id"], workload["id"])
    # Fake runs are tagged test-only; clear that flag only to exercise the
    # compatibility rules themselves.  The values still are not real model data.
    _mark_research_runs(client, [first["id"], second["id"]])

    response = client.get(
        "/api/v1/benchmarks/compare",
        params=[("run_ids", first["id"]), ("run_ids", second["id"])],
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["comparable"] is True
    assert body["warnings"] == []
    latency = body["metrics"]["latency_ms"]
    assert latency["unit"] == "ms"
    assert latency["method"]
    assert set(latency["values"]) == {first["id"], second["id"]}
    assert latency["values"][first["id"]]["sample_count"] == 2
    assert latency["values"][second["id"]]["mean"] is not None


def test_model_mismatch_blocks_comparison_and_reports_reason(
    client: TestClient, make_configuration, make_workload
):
    workload = make_workload()
    first_config = make_configuration(model_id="model-a")
    second_config = make_configuration(model_id="model-b")
    first = _run(client, first_config["id"], workload["id"])
    second = _run(client, second_config["id"], workload["id"])

    body = client.get(
        "/api/v1/benchmarks/compare",
        params=[("run_ids", first["id"]), ("run_ids", second["id"])],
    ).json()
    assert body["comparable"] is False
    codes = {warning["code"] for warning in body["warnings"]}
    assert "different_models" in codes
    assert "test_only_evidence" in codes
    assert any(warning["severity"] == "blocker" for warning in body["warnings"])


def test_exact_match_quality_is_measured_with_evaluator_metadata(
    client: TestClient, make_configuration, make_workload
):
    client.app.state.container.runtime_registry = RuntimeRegistry(
        client.app.state.container.settings,
        fake_profile=FakeRuntimeProfile(
            generation_delay_ms=0,
            ttft_delay_ms=0,
            output_tokens=3,
            fixed_text="Paris",
        ),
    )
    configuration = make_configuration()
    workload = make_workload(
        workload_type="exact_match",
        input_spec={"prompt": "Capital of France?", "expected_output": "Paris"},
        quality_evaluator="exact_match",
    )
    run = _run(client, configuration["id"], workload["id"])

    quality = run["quality_result"]
    assert quality["status"] == "available"
    assert quality["score"] == 1.0
    assert quality["evaluator"] == "exact_match"
    assert quality["metric_name"] == "exact_match_accuracy"
    assert quality["scale"] == "ratio (0.0-1.0)"
    summaries = {item["metric_name"]: item for item in run["metric_summaries"]}
    assert summaries["exact_match_accuracy"]["status"] == "measured"
    assert summaries["exact_match_accuracy"]["mean"] == 1.0


def test_missing_quality_evaluator_stays_unavailable(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration()
    workload = make_workload()
    run = _run(client, configuration["id"], workload["id"])
    quality = run["quality_result"]
    assert quality["status"] == "unavailable"
    assert quality["score"] is None
    summaries = {item["metric_name"]: item for item in run["metric_summaries"]}
    assert summaries["quality_score"]["status"] == "unavailable"
    assert summaries["quality_score"]["mean"] is None
