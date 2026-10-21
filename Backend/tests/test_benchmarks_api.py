from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from app.runtime.fake import FakeRuntimeProfile
from app.runtime.registry import RuntimeRegistry
from tests.conftest import build_settings, wait_for_job


def test_repetition_and_timeout_bounds_are_rejected(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration()
    workload = make_workload()
    too_many = client.post(
        "/api/v1/benchmarks",
        json={
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
            "repetitions": 999,
        },
    )
    assert too_many.status_code == 422
    too_long = client.post(
        "/api/v1/benchmarks",
        json={
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
            "timeout_seconds": 99999,
        },
    )
    assert too_long.status_code == 422
    bad_warmups = client.post(
        "/api/v1/benchmarks",
        json={
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
            "warmup_iterations": 50,
        },
    )
    assert bad_warmups.status_code == 422
    unknown_evaluator = client.post(
        "/api/v1/benchmarks",
        json={
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
            "quality_evaluator": "does-not-exist",
        },
    )
    assert unknown_evaluator.status_code == 422


def test_workload_context_above_configuration_is_rejected(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration(context_length=512)
    workload = make_workload(context_requirement=4096)
    response = client.post(
        "/api/v1/benchmarks",
        json={"configuration_id": configuration["id"], "workload_id": workload["id"]},
    )
    assert response.status_code == 422
    assert "context" in response.json()["error"]["message"].lower()


def test_benchmark_executes_warmups_and_measured_repetitions(client: TestClient, run_benchmark):
    _configuration, _workload, run, job = run_benchmark(
        benchmark_overrides={"warmup_iterations": 1, "repetitions": 3}
    )
    assert job["status"] == "completed"
    assert run["status"] == "completed"
    assert run["test_only"] is True
    assert run["completed_warmups"] == 1
    assert run["completed_repetitions"] == 3
    assert run["failed_repetitions"] == 0
    measurements = client.get(f"/api/v1/benchmarks/{run['id']}/measurements").json()
    assert measurements["total"] == 4
    kinds = [item["kind"] for item in measurements["items"]]
    assert kinds.count("warmup") == 1
    assert kinds.count("measured") == 3
    summaries = {item["metric_name"]: item for item in run["metric_summaries"]}
    assert summaries["latency_ms"]["sample_count"] == 3
    assert summaries["latency_ms"]["status"] == "measured"
    assert summaries["latency_ms"]["mean"] is not None
    assert summaries["ttft_ms"]["status"] == "measured"
    assert summaries["output_throughput_tps"]["status"] == "derived"
    assert summaries["output_throughput_tps"]["unit"] == "tokens/s"
    assert summaries["peak_gpu_device_memory_used_mb"]["status"] in {
        "unavailable",
        "not_detected",
        "not_applicable",
    }
    assert summaries["peak_gpu_device_memory_used_mb"]["mean"] is None
    assert summaries["model_load_ms"]["status"] == "measured"


def test_ttft_unavailable_without_streaming(client: TestClient, make_configuration, make_workload):
    configuration = make_configuration()
    workload = make_workload()
    registry = RuntimeRegistry(
        client.app.state.container.settings,
        fake_profile=FakeRuntimeProfile(
            supports_streaming=False, generation_delay_ms=0, output_tokens=5
        ),
    )
    client.app.state.container.runtime_registry = registry
    accepted = client.post(
        "/api/v1/benchmarks",
        json={"configuration_id": configuration["id"], "workload_id": workload["id"]},
    ).json()
    wait_for_job(client, accepted["job_id"])
    run = client.get(f"/api/v1/benchmarks/{accepted['benchmark_run_id']}").json()
    summaries = {item["metric_name"]: item for item in run["metric_summaries"]}
    assert summaries["ttft_ms"]["status"] == "unavailable"
    assert summaries["ttft_ms"]["mean"] is None
    assert summaries["latency_ms"]["status"] == "measured"


def test_partial_run_preserves_failures(client: TestClient, make_configuration, make_workload):
    configuration = make_configuration()
    workload = make_workload()
    registry = RuntimeRegistry(
        client.app.state.container.settings,
        fake_profile=FakeRuntimeProfile(
            generation_delay_ms=0,
            ttft_delay_ms=0,
            output_tokens=6,
            fail_on_calls={2},
        ),
    )
    client.app.state.container.runtime_registry = registry
    accepted = client.post(
        "/api/v1/benchmarks",
        json={
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
            "warmup_iterations": 1,
            "repetitions": 3,
        },
    ).json()
    job = wait_for_job(client, accepted["job_id"])
    run = client.get(f"/api/v1/benchmarks/{accepted['benchmark_run_id']}").json()
    assert job["status"] == "completed"
    assert run["status"] == "partial"
    assert run["completed_repetitions"] == 2
    assert run["failed_repetitions"] == 1
    summaries = {item["metric_name"]: item for item in run["metric_summaries"]}
    assert summaries["latency_ms"]["sample_count"] == 2
    assert summaries["latency_ms"]["failed_count"] == 1
    measurements = client.get(f"/api/v1/benchmarks/{run['id']}/measurements").json()
    failed = [item for item in measurements["items"] if item["status"] == "failed"]
    assert len(failed) == 1
    assert failed[0]["error_code"] == "inference_failed"
    assert failed[0]["latency_ms"] is None


def test_all_failed_run_is_failed_not_success(
    client: TestClient, make_configuration, make_workload
):
    configuration = make_configuration()
    workload = make_workload()
    registry = RuntimeRegistry(
        client.app.state.container.settings,
        fake_profile=FakeRuntimeProfile(
            generation_delay_ms=0,
            fail_on_calls={1, 2, 3, 4},
        ),
    )
    client.app.state.container.runtime_registry = registry
    accepted = client.post(
        "/api/v1/benchmarks",
        json={
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
            "warmup_iterations": 1,
            "repetitions": 3,
        },
    ).json()
    job = wait_for_job(client, accepted["job_id"])
    run = client.get(f"/api/v1/benchmarks/{accepted['benchmark_run_id']}").json()
    assert job["status"] == "failed"
    assert job["error_code"] == "all_repetitions_failed"
    assert run["status"] == "failed"
    assert run["completed_repetitions"] == 0
    assert run["failed_repetitions"] == 3
    measurements = client.get(f"/api/v1/benchmarks/{run['id']}/measurements").json()
    assert measurements["total"] == 4
    summaries = {item["metric_name"]: item for item in run["metric_summaries"]}
    assert summaries["latency_ms"]["mean"] is None


def test_model_load_failure_is_recorded(client: TestClient, make_configuration, make_workload):
    configuration = make_configuration()
    workload = make_workload()
    registry = RuntimeRegistry(
        client.app.state.container.settings,
        fake_profile=FakeRuntimeProfile(load_error=True),
    )
    client.app.state.container.runtime_registry = registry
    accepted = client.post(
        "/api/v1/benchmarks",
        json={"configuration_id": configuration["id"], "workload_id": workload["id"]},
    ).json()
    job = wait_for_job(client, accepted["job_id"])
    run = client.get(f"/api/v1/benchmarks/{accepted['benchmark_run_id']}").json()
    assert job["status"] == "failed"
    assert run["status"] == "failed"
    assert run["error_code"] in {"model_load_failed", "simulated_model_load_failure"}
    assert run["configuration_snapshot"]
    assert run["hardware_snapshot"]
    assert run["test_only"] is True


def test_compare_flags_test_only_and_protocol_mismatch(client: TestClient, run_benchmark):
    _c1, _w1, run1, _j1 = run_benchmark()
    _c2, _w2, run2, _j2 = run_benchmark(
        benchmark_overrides={"repetitions": 2, "warmup_iterations": 0}
    )
    response = client.get(
        "/api/v1/benchmarks/compare",
        params=[("run_ids", run1["id"]), ("run_ids", run2["id"])],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["comparable"] is False
    codes = {warning["code"] for warning in body["warnings"]}
    assert "test_only_evidence" in codes or "different_protocol_snapshots" in codes
    assert all("severity" in warning for warning in body["warnings"])


def test_benchmark_requires_runtime_when_runtime_is_absent(tmp_path, model_root, model_path):
    settings = build_settings(
        tmp_path, model_root, runtime_allow_fake=False, runtime_adapter="auto"
    )
    # Force the optional llama.cpp adapter to report itself absent.
    import app.runtime.llamacpp as llamacpp_module

    original = llamacpp_module._import_llama_cpp
    llamacpp_module._import_llama_cpp = lambda: None
    try:
        app = create_app(settings, runtime_registry=RuntimeRegistry(settings))
        with TestClient(app) as client:
            configuration = client.post(
                "/api/v1/configurations",
                json={
                    "name": "no-runtime",
                    "model_id": "tiny",
                    "model_format": "gguf",
                    "model_path": str(model_path),
                    "context_length": 512,
                },
            )
            assert configuration.status_code == 201, configuration.text
            workload = client.post(
                "/api/v1/workloads",
                json={
                    "name": "wl",
                    "input_spec": {"prompt": "hello"},
                    "output_tokens_target": 5,
                    "context_requirement": 128,
                },
            )
            assert workload.status_code == 201, workload.text
            response = client.post(
                "/api/v1/benchmarks",
                json={
                    "configuration_id": configuration.json()["id"],
                    "workload_id": workload.json()["id"],
                },
            )
            assert response.status_code == 503
            assert response.json()["error"]["code"] == "runtime_unavailable"
            # Health and non-runtime endpoints remain usable.
            assert client.get("/api/v1/health").status_code == 200
            ready = client.get("/api/v1/ready")
            assert ready.status_code == 200
    finally:
        llamacpp_module._import_llama_cpp = original


def test_health_capabilities_and_readiness(client: TestClient):
    health = client.get("/health").json()
    assert health["status"] == "ok"
    assert health["service"] == "lattice-backend"
    ready = client.get("/api/v1/ready").json()
    assert ready["status"] == "ready"
    assert ready["checks"]["database"]["status"] == "ready"
    assert ready["checks"]["runtime"]["status"] == "available"
    capabilities = client.get("/api/v1/capabilities").json()
    adapter_ids = [item["adapter_id"] for item in capabilities["runtime"]["adapters"]]
    assert "fake" in adapter_ids
    assert capabilities["features"]["test_runtime_enabled"] is True
    assert "ttft_ms" in [metric["name"] for metric in capabilities["benchmark_metrics"]]
    assert capabilities["hardware"]["gpu"]["device_count"]["value"] is None or (
        capabilities["hardware"]["gpu"]["device_count"]["status"] == "available"
    )
