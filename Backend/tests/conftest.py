"""Shared test fixtures.

The default suite is CPU-only, offline, model-free and uses a temporary SQLite
database plus the explicitly test-only fake runtime adapter.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app
from app.runtime.fake import FakeRuntimeProfile
from app.runtime.registry import RuntimeRegistry


def build_settings(tmp_path: Path, model_root: Path, **overrides: Any) -> Settings:
    values: dict[str, Any] = {
        "database_url": f"sqlite:///{(tmp_path / 'lattice-test.db').as_posix()}",
        "model_roots": [model_root],
        "runtime_allow_fake": True,
        "runtime_adapter": "fake",
        "gpu_telemetry_enabled": False,
        "job_max_workers": 1,
        "job_max_pending": 8,
        "benchmark_default_repetitions": 3,
        "benchmark_default_warmups": 1,
        "log_level": "WARNING",
    }
    values.update(overrides)
    return Settings(**values)


@pytest.fixture
def model_root(tmp_path: Path) -> Path:
    root = tmp_path / "models"
    root.mkdir()
    (root / "tiny.gguf").write_bytes(b"fake-model-bytes" * 64)
    return root


@pytest.fixture
def fake_profile() -> FakeRuntimeProfile:
    return FakeRuntimeProfile(
        generation_delay_ms=1.0,
        ttft_delay_ms=1.0,
        output_tokens=10,
    )


@pytest.fixture
def test_settings(tmp_path: Path, model_root: Path) -> Settings:
    return build_settings(tmp_path, model_root)


@pytest.fixture
def app(test_settings: Settings, fake_profile: FakeRuntimeProfile):
    registry = RuntimeRegistry(test_settings, fake_profile=fake_profile)
    application = create_app(test_settings, runtime_registry=registry)
    yield application
    application.state.container.close()


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def model_path(model_root: Path) -> Path:
    return model_root / "tiny.gguf"


@pytest.fixture
def make_configuration(client: TestClient, model_path: Path):
    def _make(**overrides: Any) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "name": f"config-{time.time_ns()}",
            "model_id": "tiny-test-model",
            "model_format": "gguf",
            "quantization": "q4_k_m",
            "model_path": str(model_path),
            "context_length": 2048,
            "runtime_adapter": "fake",
            "generation_defaults": {"max_tokens": 10, "temperature": 0.2},
            "metadata_json": {"suite": "pytest"},
        }
        payload.update(overrides)
        response = client.post("/api/v1/configurations", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make


@pytest.fixture
def make_workload(client: TestClient):
    def _make(**overrides: Any) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "name": f"workload-{time.time_ns()}",
            "workload_type": "generation",
            "input_spec": {"prompt": "Explain the concept of a cache in one sentence."},
            "output_tokens_target": 10,
            "context_requirement": 512,
        }
        payload.update(overrides)
        response = client.post("/api/v1/workloads", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make


def wait_for_job(client: TestClient, job_id: str, timeout_seconds: float = 20.0) -> dict:
    deadline = time.monotonic() + timeout_seconds
    terminal = {"completed", "failed", "cancelled", "interrupted"}
    last: dict = {}
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/jobs/{job_id}")
        assert response.status_code == 200, response.text
        last = response.json()
        if last.get("status") in terminal:
            return last
        time.sleep(0.01)
    raise AssertionError(f"job {job_id} did not reach a terminal state: {last}")


@pytest.fixture
def run_benchmark(client: TestClient, make_configuration, make_workload):
    def _run(
        *,
        config_overrides: dict[str, Any] | None = None,
        workload_overrides: dict[str, Any] | None = None,
        benchmark_overrides: dict[str, Any] | None = None,
    ) -> tuple[dict, dict, dict, dict]:
        configuration = make_configuration(**(config_overrides or {}))
        workload = make_workload(**(workload_overrides or {}))
        payload = {
            "configuration_id": configuration["id"],
            "workload_id": workload["id"],
        }
        payload.update(benchmark_overrides or {})
        response = client.post("/api/v1/benchmarks", json=payload)
        assert response.status_code == 202, response.text
        accepted = response.json()
        job = wait_for_job(client, accepted["job_id"])
        run = client.get(f"/api/v1/benchmarks/{accepted['benchmark_run_id']}").json()
        return configuration, workload, run, job

    return _run
