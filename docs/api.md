# Lattice Backend API

Base URL: `http://127.0.0.1:8000`

Interactive OpenAPI: `/docs` — machine-readable: `/openapi.json`

All versioned endpoints live under `/api/v1`. Root `/health` and `/ready` are
aliases of `/api/v1/health` and `/api/v1/ready`.

There is no authentication: this is a **local research API**. Do not expose it
to the public internet without adding auth, TLS and rate limiting.

---

## Conventions

### Timestamps and IDs

- All timestamps are UTC ISO-8601 with `+00:00`.
- Resource IDs are UUIDv4 strings.
- Request IDs are 32-char hex strings, returned in the `X-Request-ID` response
  header and in every error body.

### Error envelope

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": {"fields": [{"field": "repetitions", "message": "must be <= 20"}]}
  },
  "request_id": "0f6d..."
}
```

| Status | When |
| --- | --- |
| `200` | successful read/update/delete/action |
| `201` | resource created (configuration, workload, synchronous decision) |
| `202` | long-running work accepted (benchmark, inference, async decision) |
| `404` | unknown resource ID |
| `409` | conflict/illegal state (duplicate name, terminal job, non-executable decision) |
| `422` | schema or semantic validation error, unsafe path, unsupported runtime option |
| `503` | no runtime adapter available, queue capacity exhausted, database unavailable for readiness |

Stack traces, absolute model paths, environment values and raw exception text
are never returned. Runtime errors are stored with a stable code and a concise
sanitized message.

### Pagination

List responses use:

```json
{"items": [], "limit": 50, "offset": 0, "total": 0}
```

`limit` defaults to 50 and is capped by `LATTICE_PAGINATION_MAX_LIMIT` (200).
Unknown filters are rejected.

### Test-only data

Runs executed with the fake runtime have `test_only: true`. They are excluded
from benchmark/history/export summaries and comparisons by default. Use
`include_test_only=true` only for development inspection.

---

## Endpoints

### Health and discovery

| Method | Path | Response |
| --- | --- | --- |
| GET | `/health` | liveness `{status, service, version, api_version, uptime_seconds}` |
| GET | `/api/v1/health` | same as above |
| GET | `/ready` | database/runtime/job-manager readiness; `503` only if the DB is unusable |
| GET | `/api/v1/ready` | same as above |
| GET | `/api/v1/capabilities` | runtime adapters, hardware snapshot, telemetry status, metric catalogue, quality evaluators, limitations |

```bash
curl -s http://127.0.0.1:8000/api/v1/capabilities
```

### Configurations

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/configurations` | 201 | model path must be under an approved root |
| GET | `/api/v1/configurations` | 200 | filters: `enabled`, `model_id`, `search`, `limit`, `offset` |
| GET | `/api/v1/configurations/{id}` | 200 | absolute model path is never returned |
| PATCH | `/api/v1/configurations/{id}` | 200 | bumps `revision` and appends an immutable snapshot |
| DELETE | `/api/v1/configurations/{id}` | 200 | hard delete if unused; soft delete if referenced by history |
| POST | `/api/v1/configurations/{id}/validate` | 200 | non-destructive path/runtime/preflight checks |
| GET | `/api/v1/configurations/{id}/revisions` | 200 | revision snapshots (newest last) |
| POST | `/api/v1/configurations/import` | 200 | validated import with `dry_run` and conflict policy |
| GET | `/api/v1/configurations/export` | 200 | versioned export; `include_model_paths` defaults to false |

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/configurations \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "qwen-q4km-cpu",
    "model_id": "qwen2.5-7b-instruct",
    "model_format": "gguf",
    "quantization": "q4_k_m",
    "model_path": "C:/models/qwen2.5-7b-instruct-q4_k_m.gguf",
    "context_length": 4096,
    "runtime_adapter": "llamacpp",
    "thread_count": 8,
    "batch_size": 512,
    "gpu_layers": 0,
    "generation_defaults": {"temperature": 0.2, "max_tokens": 128}
  }'
```

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/configurations/$CONFIG_ID/validate
```

Import (dry run):

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/configurations/import \
  -H 'Content-Type: application/json' \
  -d '{"dry_run": true, "conflict_policy": "rename", "configurations": [{...}]}'
```

Aliases: `POST /api/v1/import/configurations`, `GET /api/v1/export/configurations`.

Validation rules include: non-finite numbers rejected; positive/zero bounds for
threads/batch/GPU layers; allowlisted runtime/generation keys; no commands or
paths in runtime parameters; model path inside an approved root and matching the
configured format extension.

### Workloads

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/workloads` | prompt/samples required for generation types; exact_match requires references |
| GET | `/api/v1/workloads` | filters: `workload_type`, `enabled`, `search`, pagination |
| GET | `/api/v1/workloads/{id}` | includes current `snapshot_hash` |
| PATCH | `/api/v1/workloads/{id}` | content edits bump `version` and append a revision |
| DELETE | `/api/v1/workloads/{id}` | hard delete if unused; soft delete with history |

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/workloads \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "short-explanation",
    "workload_type": "generation",
    "input_spec": {"prompt": "Explain virtual memory in two sentences."},
    "output_tokens_target": 128,
    "context_requirement": 1024
  }'
```

### Benchmarks

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/benchmarks` | 202 | returns `job_id`, `benchmark_run_id`, `test_only` |
| GET | `/api/v1/benchmarks` | 200 | filters: `configuration_id`, `workload_id`, `status`, date range, `include_test_only` |
| GET | `/api/v1/benchmarks/compare` | 200 | repeated `run_ids`; returns `comparable`, warnings, per-metric values/methods (`metrics`) and checked fields |
| GET | `/api/v1/benchmarks/{run_id}` | 200 | snapshots, hardware, summaries, quality, counts, status |
| GET | `/api/v1/benchmarks/{run_id}/measurements` | 200 | raw repetitions; `kind=warmup|measured` |
| POST | `/api/v1/benchmarks/{run_id}/cancel` | 200 | queued jobs only; running work returns `409` |

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/benchmarks \
  -H 'Content-Type: application/json' \
  -d '{
    "configuration_id": "'$CONFIG_ID'",
    "workload_id": "'$WORKLOAD_ID'",
    "warmup_iterations": 1,
    "repetitions": 5,
    "timeout_seconds": 120,
    "generation_parameters": {"temperature": 0.0, "max_tokens": 128}
  }'
```

Poll the canonical job view:

```bash
curl -s http://127.0.0.1:8000/api/v1/jobs/$JOB_ID
curl -s http://127.0.0.1:8000/api/v1/benchmarks/$RUN_ID
curl -s http://127.0.0.1:8000/api/v1/benchmarks/$RUN_ID/measurements
```

Request validation rejects repetitions/warmups above configured maxima, invalid
timeouts, context requirements beyond the configuration, unknown quality
evaluators, and unsupported protocol versions. Values are never silently
clamped.

### Optimization

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/optimization/decisions` | 200/201/202 | 201 with compatible evidence; 202 when fresh benchmarking was requested; 200 replays the decision already stored for this `X-Request-ID` |
| GET | `/api/v1/optimization/decisions` | 200 | filters `workload_id`, `status` |
| GET | `/api/v1/optimization/decisions/{id}` | 200 | inputs, evidence, per-candidate feasibility, selected config |
| POST | `/api/v1/optimization/decisions/{id}/execute` | 202 | only a persisted `selected` decision; creates an inference job (a repeated `X-Request-ID` replays it with `duplicate: true`) |
| GET | `/api/v1/optimization/decisions/{id}/execution` | 200 | post-execution outcome derived from persisted rows: job/execution status, constraint results, actual metrics vs baseline evidence |

Aliases: `POST /api/v1/optimization`, `GET /api/v1/optimization/{id}`.

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/optimization/decisions \
  -H 'Content-Type: application/json' \
  -d '{
    "workload_id": "'$WORKLOAD_ID'",
    "candidate_configuration_ids": ["'$CONFIG_A'", "'$CONFIG_B'"],
    "constraints": [
      {"metric": "latency_ms", "operator": "<=", "value": 2500, "unit": "ms"},
      {"metric": "peak_process_rss_mb", "operator": "<=", "value": 8192, "unit": "MB"},
      {"metric": "exact_match_accuracy", "operator": ">=", "value": 0.8, "unit": "ratio"}
    ],
    "objective": "minimize_latency",
    "evidence_policy": {
      "max_age_hours": 168,
      "min_successful_repetitions": 3,
      "require_current_workload_snapshot": true
    }
  }'
```

Execute the selected configuration (only when `status == "selected"`):

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/optimization/decisions/$DECISION_ID/execute \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Say hello.", "generation_parameters": {"max_tokens": 16}}'
```

Read back what the execution actually proved, next to the evidence that justified
the decision:

```bash
curl -s http://127.0.0.1:8000/api/v1/optimization/decisions/$DECISION_ID/execution
```

`verdict` is `not_executed`, `pending`, `constraints_met`, `constraints_violated`,
`completed_unverified`, `failed`, `cancelled`, `interrupted` or
`execution_missing` (the job is terminal but its execution row no longer exists).
`constraints_satisfied` is `null` when the outcome was never evaluated (for
example no constraints were declared). Each entry in `metrics` carries
`direction`, `baseline_value` (mean from the linked evidence run),
`actual_value`, `absolute_delta`, `relative_delta_pct` and `improved`; a missing
measurement stays `null` with a `reason`, and `improved` is never asserted
without values on both sides. Repeated executions of the same decision are
counted (`execution_count`) and the most recent one is reported.

`X-Request-ID` is an idempotency key on benchmark, inference and job-backed
decision submissions: replaying a key returns the existing resource with
`duplicate: true` (HTTP 200 for decisions, 202 for benchmark/inference) instead
of creating a second job, and reusing a key for a different target is
`409 conflict`. Keys are scoped per job type, so the same string used for a
benchmark and for an inference does not merge them. Check-and-create is atomic
within one backend process (the process-local job model); concurrent duplicate
submissions collapse to a single job/run/execution.

Evidence selection: a candidate is evaluated against the **most recent**
benchmark run that matches its workload snapshot, protocol version and run
status, is inside `max_age_hours`, and has at least
`min_successful_repetitions` successes. Older runs are still retrievable through
`/history`, they are simply not the evidence used for the decision.

Hard constraints are gates. A candidate failing any constraint is `infeasible`
regardless of score. Missing required metrics produce `unknown` /
`insufficient_evidence`, never a pass. Unit mismatches are treated as unknown.
Fake-runtime evidence is rejected unless the request explicitly sets
`evidence_policy.allow_test_only_evidence=true` **and** the server setting allows
it.

### Inference

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/inference` | 202 | exactly one of `configuration_id` / `decision_id` |
| GET | `/api/v1/inference` | 200 | filters `configuration_id`, `status` |
| GET | `/api/v1/inference/{execution_id}` | 200 | metrics, constraint validation, retention policy |

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/inference \
  -H 'Content-Type: application/json' \
  -d '{"configuration_id": "'$CONFIG_ID'", "prompt": "Hello", "generation_parameters": {"max_tokens": 32}}'
```

Prompts are not persisted. Generated output is persisted only when the request
sets `retain_output: true` **and** `LATTICE_ALLOW_OUTPUT_RETENTION=true`.
Otherwise `retained_output` is `null` and `prompt_retained` is `false`.

### Jobs

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/jobs` | filters `status`, `job_type`, date range, pagination |
| GET | `/api/v1/jobs/{job_id}` | canonical state/progress/result/error, duration, linked run/execution |

Job statuses: `queued`, `running`, `completed`, `failed`, `cancelled`,
`interrupted`. Terminal states never transition back. `progress` is `null` when
not meaningful.

### History and export

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/history` | counts, latest records, latest metric aggregates (nulls when absent) |
| GET | `/api/v1/history/summary` | alias of `/history` |
| GET | `/api/v1/history/compare` | repeated `run_ids`; compatibility warnings |
| GET | `/api/v1/history/benchmarks/{run_id}` | run + all measurements + referencing decisions |
| GET | `/api/v1/history/decisions/{decision_id}` | decision view |
| GET | `/api/v1/history/inference/{execution_id}` | inference view |
| GET | `/api/v1/history/configurations/{id}` | runs, decisions and inference for a configuration |
| GET | `/api/v1/history/export?format=jsonl` | one independently parseable JSON object per run |

```bash
curl -s "http://127.0.0.1:8000/api/v1/history/export?format=jsonl&created_after=2026-01-01T00:00:00Z"
```

Each JSONL line contains `schema_version`, `exported_at`, `record_type`, `run`,
`measurements`, `metric_summaries`, `decision_references` and a `provenance`
object with hardware/runtime/software/protocol/configuration/workload snapshots.

### Comparison semantics

`comparable: false` is returned when workload snapshots, protocol snapshots,
model identity, runtime adapter or metric methods differ (including mixing
test-only runs). Hardware differences, runtime version differences, execution
mode differences and partial runs are returned as structured warnings. Metrics
are never pooled or silently normalised across incompatible runs.
