"""End-to-end smoke test with the TEST-ONLY fake runtime.

This proves the API, SQLite persistence, job worker, benchmark engine, decision
engine and inference path are wired together.  It does NOT measure real model
performance and never touches the configured production database.

Run from Backend/:

    python scripts/smoke_fake_runtime.py
"""

from __future__ import annotations

import json
import sys
import tempfile
import time
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.settings import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from app.runtime.fake import FakeRuntimeProfile  # noqa: E402
from app.runtime.registry import RuntimeRegistry  # noqa: E402


def wait_for_job(client: TestClient, job_id: str, timeout: float = 30.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        payload = client.get(f"/api/v1/jobs/{job_id}").json()
        if payload["status"] in {"completed", "failed", "cancelled", "interrupted"}:
            return payload
        time.sleep(0.02)
    raise SystemExit(f"job {job_id} did not finish in time")


def main() -> int:
    temp = Path(tempfile.mkdtemp(prefix="lattice-smoke-"))
    models = temp / "models"
    models.mkdir()
    model = models / "smoke.gguf"
    model.write_bytes(b"smoke-test-model" * 32)

    settings = Settings(
        database_url=f"sqlite:///{(temp / 'smoke.db').as_posix()}",
        model_roots=[models],
        runtime_adapter="fake",
        runtime_allow_fake=True,
        gpu_telemetry_enabled=False,
        job_max_workers=1,
        benchmark_default_repetitions=3,
        benchmark_default_warmups=1,
        log_level="WARNING",
    )
    registry = RuntimeRegistry(
        settings,
        fake_profile=FakeRuntimeProfile(generation_delay_ms=2, ttft_delay_ms=1, output_tokens=10),
    )
    app = create_app(settings, runtime_registry=registry)
    print("TEST-ONLY fake runtime: no real model is loaded and no real performance is measured")

    with TestClient(app) as client:
        health = client.get("/api/v1/health")
        print("health:", health.status_code, health.json()["status"])

        configuration = client.post(
            "/api/v1/configurations",
            json={
                "name": "smoke-config",
                "model_id": "smoke-model",
                "model_format": "gguf",
                "quantization": "q4_k_m",
                "model_path": str(model),
                "context_length": 2048,
                "runtime_adapter": "fake",
                "generation_defaults": {"max_tokens": 10},
            },
        )
        assert configuration.status_code == 201, configuration.text
        configuration_id = configuration.json()["id"]
        print("configuration:", configuration_id)

        workload = client.post(
            "/api/v1/workloads",
            json={
                "name": "smoke-workload",
                "workload_type": "generation",
                "input_spec": {"prompt": "Smoke test prompt."},
                "output_tokens_target": 10,
                "context_requirement": 256,
            },
        )
        assert workload.status_code == 201, workload.text
        workload_id = workload.json()["id"]
        print("workload:", workload_id)

        accepted = client.post(
            "/api/v1/benchmarks",
            json={"configuration_id": configuration_id, "workload_id": workload_id},
        )
        assert accepted.status_code == 202, accepted.text
        job_id = accepted.json()["job_id"]
        run_id = accepted.json()["benchmark_run_id"]
        job = wait_for_job(client, job_id)
        print("benchmark job:", job["status"])

        run = client.get(f"/api/v1/benchmarks/{run_id}").json()
        print(
            "run:",
            run["status"],
            "reps=",
            run["completed_repetitions"],
            "failed=",
            run["failed_repetitions"],
            "test_only=",
            run["test_only"],
        )
        summaries = {item["metric_name"]: item for item in run["metric_summaries"]}
        print(
            "latency summary:",
            summaries["latency_ms"]["status"],
            summaries["latency_ms"]["mean"],
            summaries["latency_ms"]["unit"],
            "n=",
            summaries["latency_ms"]["sample_count"],
        )
        assert summaries["latency_ms"]["mean"] is not None
        assert summaries["ttft_ms"]["status"] == "measured"

        decision = client.post(
            "/api/v1/optimization/decisions",
            json={
                "workload_id": workload_id,
                "candidate_configuration_ids": [configuration_id],
                "constraints": [
                    {"metric": "latency_ms", "operator": "<=", "value": 100000, "unit": "ms"}
                ],
                "objective": "minimize_latency",
                "evidence_policy": {"allow_test_only_evidence": True},
            },
        )
        assert decision.status_code == 201, decision.text
        decision_body = decision.json()["decision"]
        print(
            "decision:",
            decision_body["status"],
            "selected=",
            decision_body["selected_configuration_id"],
        )
        assert decision_body["status"] == "selected"

        execution = client.post(
            f"/api/v1/optimization/decisions/{decision_body['id']}/execute",
            json={
                "prompt": "Execute the selected configuration.",
                "generation_parameters": {"max_tokens": 5},
            },
        )
        assert execution.status_code == 202, execution.text
        execution_body = execution.json()
        wait_for_job(client, execution_body["job_id"])
        inference = client.get(
            f"/api/v1/inference/{execution_body['inference_execution_id']}"
        ).json()
        print(
            "inference:",
            inference["status"],
            "prompt_retained=",
            inference["prompt_retained"],
            "validation=",
            inference["validation_status"],
        )

        export = client.get("/api/v1/history/export", params={"include_test_only": True})
        lines = [line for line in export.text.splitlines() if line.strip()]
        assert lines and json.loads(lines[0])["run"]["id"] == run_id
        print("jsonl export lines:", len(lines))
        print("smoke test finished successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
