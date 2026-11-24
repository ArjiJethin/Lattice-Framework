"""End-to-end smoke test over real HTTP against a running server.

Unlike `smoke_fake_runtime.py` (in-process, fake runtime), this script talks to a
live uvicorn instance and, when the server is configured with the llama.cpp
adapter, exercises the real model path.  It creates its own configuration and
workload, so point it at a throwaway database:

    cd Backend
    set LATTICE_DATABASE_URL=sqlite:///C:/Temp/lattice-try.db
    set LATTICE_MODEL_ROOTS=../models
    set LATTICE_RUNTIME_ADAPTER=llamacpp
    .venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010

then, in another window:

    cd Backend
    .venv\\Scripts\\python.exe scripts\\smoke_http.py --base http://127.0.0.1:8010/api/v1

Exit code 0 means every check passed.
"""

from __future__ import annotations

import argparse
import sys
import time
import uuid
from typing import Any, Callable

import httpx

TERMINAL = {"completed", "failed", "cancelled", "interrupted"}
CHECKS: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    CHECKS.append((name, bool(ok), detail))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))
    return bool(ok)


def expect(name: str, response: httpx.Response, code: int | set[int]) -> bool:
    wanted = {code} if isinstance(code, int) else code
    snippet = response.text[:160].replace("\n", " ")
    return check(name, response.status_code in wanted, f"{response.status_code} {snippet}")


def poll_job(client: httpx.Client, job_id: str, timeout: float = 180.0) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    body: dict[str, Any] = {}
    while time.monotonic() < deadline:
        response = client.get(f"/jobs/{job_id}")
        if response.status_code != 200:
            return {"status": f"http_{response.status_code}"}
        body = response.json()
        if body.get("status") in TERMINAL:
            return body
        time.sleep(0.25)
    return {**body, "status": "timeout"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Lattice HTTP smoke test")
    parser.add_argument("--base", default="http://127.0.0.1:8010/api/v1")
    parser.add_argument("--model", default="../models/qwen2.5-0.5b-instruct-q4_k_m.gguf")
    parser.add_argument("--runtime", default="llamacpp")
    parser.add_argument("--timeout", type=float, default=180.0)
    args = parser.parse_args()

    base = args.base.rstrip("/")
    with httpx.Client(base_url=base, timeout=60.0) as client:
        try:
            client.get("/health")
        except httpx.HTTPError as exc:
            print(f"cannot reach {base}: {exc}")
            print("Start the server first (see the docstring at the top of this file).")
            return 2

        # --- health / discovery ------------------------------------------------
        root = base.rsplit("/api/v1", 1)[0]
        expect("GET /health (root alias)", httpx.get(f"{root}/health"), 200)
        health = client.get("/health")
        expect("GET /api/v1/health", health, 200)
        check("health body has status=ok", health.json().get("status") == "ok", str(health.json().get("version")))
        expect("GET /api/v1/ready", client.get("/ready"), 200)
        capabilities = client.get("/capabilities")
        expect("GET /api/v1/capabilities", capabilities, 200)
        adapters = (capabilities.json().get("runtime") or {}).get("adapters") or []
        check(
            "capabilities reports the llama.cpp adapter as available",
            any(item.get("available") for item in adapters if isinstance(item, dict)),
            ", ".join(f"{a.get('adapter_id')}={a.get('status')}" for a in adapters if isinstance(a, dict))[:90],
        )

        # --- configurations ----------------------------------------------------
        name = f"smoke-http-{uuid.uuid4().hex[:8]}"
        created = client.post(
            "/configurations",
            json={
                "name": name,
                "model_id": "qwen2.5-0.5b-instruct",
                "model_format": "gguf",
                "quantization": "q4_k_m",
                "model_path": args.model,
                "context_length": 2048,
                "runtime_adapter": args.runtime,
                "thread_count": 4,
                "generation_defaults": {"max_tokens": 16, "temperature": 0.0},
            },
        )
        if not expect("POST /api/v1/configurations", created, 201):
            print(f"\n  -> {created.text[:400]}")
            print("  A 422 here usually means --model is not under LATTICE_MODEL_ROOTS.")
            return 1
        config = created.json()
        config_id = config["id"]
        check("config response hides absolute model_path", "model_path" not in config, str(list(config))[:90])

        expect("GET /api/v1/configurations/{id}", client.get(f"/configurations/{config_id}"), 200)
        expect("POST /api/v1/configurations/{id}/validate", client.post(f"/configurations/{config_id}/validate"), 200)
        patched = client.patch(f"/configurations/{config_id}", json={"description": "smoke edit"})
        expect("PATCH /api/v1/configurations/{id}", patched, 200)
        check("PATCH bumps revision", patched.json().get("revision") == 2, str(patched.json().get("revision")))
        revisions = client.get(f"/configurations/{config_id}/revisions")
        expect("GET /api/v1/configurations/{id}/revisions", revisions, 200)
        check("revision history has 2 snapshots", len(revisions.json().get("items", [])) == 2)

        listing = client.get("/configurations", params={"limit": 5, "search": "smoke"})
        expect("GET /api/v1/configurations (paginated)", listing, 200)
        check("list uses page envelope", {"items", "limit", "offset", "total"} <= set(listing.json()))

        expect("GET /api/v1/configurations/export", client.get("/configurations/export"), 200)
        expect(
            "POST /api/v1/configurations/import (dry_run)",
            client.post(
                "/configurations/import",
                json={
                    "dry_run": True,
                    "conflict_policy": "rename",
                    "configurations": [
                        {
                            "name": f"{name}-imported",
                            "model_id": "qwen2.5-0.5b-instruct",
                            "model_format": "gguf",
                            "quantization": "q4_k_m",
                            "model_path": args.model,
                            "context_length": 2048,
                            "runtime_adapter": args.runtime,
                        }
                    ],
                },
            ),
            200,
        )

        # --- workloads ---------------------------------------------------------
        workload = client.post(
            "/workloads",
            json={
                "name": f"{name}-workload",
                "workload_type": "generation",
                "input_spec": {"prompt": "Explain a CPU cache in one sentence."},
                "output_tokens_target": 16,
                "context_requirement": 512,
            },
        )
        if not expect("POST /api/v1/workloads", workload, 201):
            return 1
        workload_id = workload.json()["id"]
        expect("GET /api/v1/workloads/{id}", client.get(f"/workloads/{workload_id}"), 200)
        # Regression check: a description-only PATCH must not append a revision.
        wl_patch = client.patch(f"/workloads/{workload_id}", json={"description": "smoke edit"})
        expect("PATCH /api/v1/workloads/{id} (description only)", wl_patch, 200)
        check("description-only PATCH keeps version", wl_patch.json().get("version") == 1, str(wl_patch.json().get("version")))

        # --- benchmarks --------------------------------------------------------
        submit = client.post(
            "/benchmarks",
            json={
                "configuration_id": config_id,
                "workload_id": workload_id,
                "warmup_iterations": 1,
                "repetitions": 2,
                "generation_parameters": {"max_tokens": 16, "temperature": 0.0},
            },
        )
        if submit.status_code == 503:
            print(f"\n  -> 503: {submit.text[:300]}")
            print("  The server has no usable runtime adapter. Restart it with LATTICE_RUNTIME_ADAPTER=llamacpp.")
            return 1
        if not expect("POST /api/v1/benchmarks", submit, 202):
            return 1
        accepted = submit.json()
        job_id, run_id = accepted["job_id"], accepted["benchmark_run_id"]
        check("benchmark accepted is not test_only", accepted.get("test_only") is False, str(accepted.get("test_only")))

        job = poll_job(client, job_id, args.timeout)
        check("benchmark job reaches completed", job.get("status") == "completed", str(job.get("status")))
        expect("GET /api/v1/jobs/{job_id}", client.get(f"/jobs/{job_id}"), 200)
        expect("GET /api/v1/jobs (list)", client.get("/jobs"), 200)

        run = client.get(f"/benchmarks/{run_id}")
        expect("GET /api/v1/benchmarks/{run_id}", run, 200)
        run_body = run.json()
        summaries = {item["metric_name"]: item for item in run_body.get("metric_summaries", [])}
        latency = summaries.get("latency_ms", {})
        check("run has measured latency", latency.get("mean") is not None, f"{latency.get('status')} mean={latency.get('mean')} {latency.get('unit')}")
        check("run reports completed repetitions", (run_body.get("completed_repetitions") or 0) >= 2, str(run_body.get("completed_repetitions")))
        runtime_meta = run_body.get("runtime_metadata") or {}
        check("run reports effective execution mode=cpu", str(runtime_meta.get("effective_execution_mode")) == "cpu", str(runtime_meta.get("effective_execution_mode")))
        check("run carries a hardware snapshot", bool(run_body.get("hardware_snapshot")), str(list(run_body.get("hardware_snapshot") or {}))[:80])

        measurements = client.get(f"/benchmarks/{run_id}/measurements", params={"kind": "measured"})
        expect("GET /api/v1/benchmarks/{run_id}/measurements", measurements, 200)
        check("measurements contain 2 measured repetitions", measurements.json().get("total") == 2, str(measurements.json().get("total")))
        warmups = client.get(f"/benchmarks/{run_id}/measurements", params={"kind": "warmup"})
        check("measurements flag 1 warmup", warmups.json().get("total") == 1, str(warmups.json().get("total")))

        # second run with an identical protocol, so the pair is comparable
        second = client.post(
            "/benchmarks",
            json={
                "configuration_id": config_id,
                "workload_id": workload_id,
                "warmup_iterations": 1,
                "repetitions": 2,
                "generation_parameters": {"max_tokens": 16, "temperature": 0.0},
            },
        )
        second_id = second.json().get("benchmark_run_id") if second.status_code == 202 else None
        if second_id:
            poll_job(client, second.json()["job_id"], args.timeout)
        compare = client.get("/benchmarks/compare", params={"run_ids": [run_id, second_id]}) if second_id else None
        if compare is not None:
            expect("GET /api/v1/benchmarks/compare", compare, 200)
            check("compare of identical protocols is comparable", compare.json().get("comparable") is True, str(compare.json().get("comparable")))

        # X-Request-ID replay collapses to the same run
        rid = uuid.uuid4().hex
        payload = {"configuration_id": config_id, "workload_id": workload_id, "repetitions": 1, "warmup_iterations": 0}
        first = client.post("/benchmarks", json=payload, headers={"X-Request-ID": rid})
        replay = client.post("/benchmarks", json=payload, headers={"X-Request-ID": rid})
        check(
            "X-Request-ID replay returns the same run",
            replay.status_code in {200, 202} and replay.json().get("benchmark_run_id") == first.json().get("benchmark_run_id"),
            f"{first.status_code}/{replay.status_code} duplicate={replay.json().get('duplicate')}",
        )
        if first.status_code == 202:
            poll_job(client, first.json()["job_id"], args.timeout)

        # --- optimization ------------------------------------------------------
        decision = client.post(
            "/optimization/decisions",
            json={
                "workload_id": workload_id,
                "candidate_configuration_ids": [config_id],
                "constraints": [{"metric": "latency_ms", "operator": "<=", "value": 600000, "unit": "ms"}],
                "objective": "minimize_latency",
                "evidence_policy": {"min_successful_repetitions": 1},
            },
        )
        if expect("POST /api/v1/optimization/decisions", decision, {200, 201, 202}):
            body = decision.json()
            decision_body = body.get("decision", body)
            decision_id = decision_body.get("id")
            check("decision selects a configuration", decision_body.get("status") == "selected", f"{decision_body.get('status')} selected={decision_body.get('selected_configuration_id')}")
            if decision_id:
                expect("GET /api/v1/optimization/decisions/{id}", client.get(f"/optimization/decisions/{decision_id}"), 200)
                expect("GET /api/v1/optimization/decisions", client.get("/optimization/decisions"), 200)
                execution = client.post(
                    f"/optimization/decisions/{decision_id}/execute",
                    json={"prompt": "Say hello.", "generation_parameters": {"max_tokens": 8}},
                )
                if expect("POST /optimization/decisions/{id}/execute", execution, 202):
                    exec_body = execution.json()
                    exec_job = poll_job(client, exec_body["job_id"], args.timeout)
                    check("execution job reaches completed", exec_job.get("status") == "completed", str(exec_job.get("status")))
                    outcome = client.get(f"/optimization/decisions/{decision_id}/execution")
                    expect("GET /optimization/decisions/{id}/execution", outcome, 200)
                    check("execution reports a verdict", bool(outcome.json().get("verdict")), str(outcome.json().get("verdict")))

        # --- inference ---------------------------------------------------------
        infer = client.post(
            "/inference",
            json={"configuration_id": config_id, "prompt": "Hello", "generation_parameters": {"max_tokens": 8}},
        )
        if expect("POST /api/v1/inference", infer, 202):
            infer_body = infer.json()
            infer_job = poll_job(client, infer_body["job_id"], args.timeout)
            check("inference job reaches completed", infer_job.get("status") == "completed", str(infer_job.get("status")))
            detail = client.get(f"/inference/{infer_body['execution_id']}")
            expect("GET /api/v1/inference/{execution_id}", detail, 200)
            check("prompt is not retained by default", detail.json().get("prompt_retained") is False)

        # --- history -----------------------------------------------------------
        expect("GET /api/v1/history", client.get("/history"), 200)
        expect("GET /api/v1/history/summary", client.get("/history/summary"), 200)
        expect("GET /api/v1/history/benchmarks/{run_id}", client.get(f"/history/benchmarks/{run_id}"), 200)
        expect("GET /api/v1/history/configurations/{id}", client.get(f"/history/configurations/{config_id}"), 200)
        export = client.get("/history/export", params={"format": "jsonl"})
        expect("GET /api/v1/history/export?format=jsonl", export, 200)
        check("export is ndjson", "ndjson" in export.headers.get("content-type", ""), export.headers.get("content-type", ""))
        check("export has one line per run", len([l for l in export.text.splitlines() if l.strip()]) >= 2, str(len(export.text.splitlines())))

        # --- error contract ----------------------------------------------------
        missing = client.get("/configurations/does-not-exist")
        check("unknown id -> 404 with error envelope", missing.status_code == 404 and "error" in missing.json(), str(missing.status_code))
        invalid = client.post("/workloads", json={"name": ""})
        check("invalid body -> 422", invalid.status_code == 422, str(invalid.status_code))
        check("422 carries request_id", "request_id" in invalid.json(), str(list(invalid.json()))[:80])
        check("compare needs 2..10 ids", client.get("/benchmarks/compare", params={"run_ids": [run_id]}).status_code == 422)
        check("inference needs a target", client.post("/inference", json={"prompt": "x"}).status_code == 422)

    # --- summary ---------------------------------------------------------------
    failed = [name for name, ok, _ in CHECKS if not ok]
    print("\n" + "=" * 62)
    print(f"{len(CHECKS) - len(failed)}/{len(CHECKS)} checks passed")
    if failed:
        print("failed:")
        for name in failed:
            print(f"  - {name}")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
