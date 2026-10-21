# Implementation Decisions and Known Limitations

Recorded per contract A2. Decisions are ordered roughly by impact.

---

## D1. Extend the existing package, keep names and layout

The repository's `Backend/app` contained only the Phase 0 skeleton
(`main.py` with `/health`) and empty package folders. There was no working
persistence, API, runtime or benchmark code to preserve. We kept the `Backend`
folder name, `app.main:app` import path, the existing `/health` route and the
existing `pyproject.toml`/`requirements.txt` toolchain, and added modules around
them. `Frontend` was not modified.

Consequence: `docs/setup-windows.md` and `docs/development-workflow.md` still use
lower-case `backend/` paths written in Phase 0; the actual directory is
`Backend/`. `Backend/README.md` and the root README use the real path. Renaming
the directory was explicitly out of scope.

## D2. Single settings entry point with legacy aliases

`app/core/settings.py` is the only place environment variables are read
(pydantic-settings, `LATTICE_` prefix). Phase 0's unprefixed `HOST`, `PORT`,
`DEBUG`, `ENVIRONMENT` and `CORS_ORIGINS` remain accepted via explicit alias
fields so the old launcher keeps working. Business code receives `Settings` via
the container, never `os.getenv`.

## D3. Schema creation at startup plus Alembic

`LATTICE_AUTO_CREATE_SCHEMA=true` (default) runs `create_all` for missing tables.
This never drops or rewrites existing data and makes a fresh clone runnable with
one command. Alembic is configured (`Backend/alembic/`) with an initial revision
`0001_initial` for operators who want explicit migrations; setting
`LATTICE_AUTO_CREATE_SCHEMA=false` makes Alembic authoritative. Tests create
fresh temporary databases per test.

SQLite PRAGMAs on **every** connection: `foreign_keys=ON`, `busy_timeout`,
`journal_mode=WAL`, `synchronous=NORMAL`.

## D4. Synchronous SQLAlchemy inside async routes

FastAPI routes are `def` (threadpool), and the job manager uses worker threads.
A synchronous engine/session keeps transaction boundaries obvious and avoids
async-session mistakes. No session is held during inference or benchmark
execution: each persistence step uses `session_scope(...)`. The event loop is
never blocked by model work.

## D5. In-process bounded job manager, single worker by default

`app/jobs/manager.py` implements a bounded queue (`job_max_workers=1`,
`job_max_pending=16`) with persistent jobs created before scheduling, atomic
queued→running→terminal transitions, exception capture, and rejection with `503`
when the queue is full. A distributed queue (Redis/Celery) was explicitly not
added. Limitations: worker memory is shared with the API process; graceful
shutdown waits `LATTICE_JOB_SHUTDOWN_GRACE_SECONDS` and then records the job as
interrupted; a hard kill cannot be recovered.

Restart recovery marks jobs left `running` as `interrupted` (they cannot be
resumed safely with a native runtime load). `queued` jobs at shutdown are marked
`interrupted` rather than silently requeued, because the API process restart does
not prove it is safe to re-run side-effecting work.

## D6. Cancellation is partial by design

`POST /benchmarks/{id}/cancel` only succeeds for a run whose job is still
`queued` (the worker checks a cancellation flag before starting). Once native
inference is running, Python threads cannot safely kill llama.cpp work; the
endpoint returns `409` with an explanation instead of claiming success. This is
intentional truthfulness, not a missing feature.

## D7. Runtime adapters: optional llama.cpp, test-only fake

`app/runtime/base.py` defines the typed protocol. `LlamaCppRuntime` lazy-imports
`llama_cpp`; absence yields `not_installed` capabilities and controlled errors,
never an import crash. It does not shell out and does not download models. Model
lifecycle is single-handle with a cache size of 1 by default; loading a second
model unloads the first and records switch overhead.

`FakeRuntime` is deterministic, records real monotonic timings for its own work,
and is selectable only when both `LATTICE_RUNTIME_ADAPTER=fake` and
`LATTICE_RUNTIME_ALLOW_FAKE=true` are set (tests inject it directly). Every run it
produces is `test_only=true`. It is excluded from history summaries, exports and
comparisons by default, and rejected as optimization evidence unless the request
explicitly opts in **and** `LATTICE_ALLOW_TEST_ONLY_OPTIMIZATION_EVIDENCE=true`.
Fake numbers are never real model performance and docs label them as such.

The adapter reports `supports_streaming`/`supports_token_counts` from the actual
build; TTFT is only measured when stream chunks arrive. Otherwise TTFT is
unavailable.

## D8. Model path policy

Paths are resolved (`Path.resolve`) and must be inside one of
`LATTICE_MODEL_ROOTS` unless `LATTICE_ALLOW_UNROOTED_MODEL_PATHS=true` (default
false). Traversal, URLs/other schemes, NUL bytes and symlinks escaping the roots
are rejected. Absolute paths are never returned by the API; only the file name
and stat fields. `nvidia-smi` is the only subprocess used and only with fixed
arguments and `shell=False`.

## D9. Snapshots and history integrity

Configuration/workload edits append immutable revision rows and bump
`revision`/`version`. Benchmark runs copy configuration, workload and protocol
snapshots plus a content hash before execution. Deletion is soft when the record
is referenced by runs/decisions/executions (`deleted_at`, `enabled=false`) and
hard otherwise; routes return `409` only when a hard delete would orphan history.
This is a documented soft-delete policy, chosen over blocking deletion forever.

Historical JSON uses `snapshot_schema_version` and `schema_version` fields so
future code can interpret old records.

## D10. Metrics: explicit statuses, no fabricated values

Every metric is a `MetricSummary` with name, unit, value, status (`measured`,
`derived`, `estimated`, `unavailable`, `failed`, `not_applicable`), method,
sample count and reason. Missing values are `null`, never zero. Throughput uses
the generation window when TTFT exists, otherwise total request latency, and the
metric name/method records which one was used. Token counts prefer runtime usage,
then the exact model tokenizer (`token_count_source`); if neither is available
they are `unavailable`, never estimated from character counts. Estimated values
are rejected by the optimizer unless `allow_estimated_metrics=true`.

TTFT is unavailable for non-streaming runtimes. We did not approximate it from
latency.

## D11. Statistics conventions

`n=0` produces no summary; `n=1` produces mean/median/min/max and `stddev=null`;
stddev is the sample standard deviation (`n-1`). Percentiles (p90/p95) are only
emitted for `n>=5` using linear interpolation, documented in
`docs/benchmarking.md`. Warmups never enter aggregates; failures are counted and
reported separately.

## D12. Quality evaluation is evaluator-defined

`exact_match` is the only built-in evaluator. Missing evaluator or references
yields `quality.status="unavailable"`/`"failed"` with no score. No generic LLM
judge or paid API is used, and a run without quality evidence cannot satisfy a
quality constraint.

## D13. Optimizer is a deterministic baseline, not a research optimizer

`app/optimization/baseline.py` implements `baseline-feasibility-v1`: hard
constraints are evaluated independently as pass/fail/unknown, any failure or
unknown excludes the candidate from ranking, objective scores are normalized
min-max over *eligible* candidates with a deterministic fallback when all values
are equal, and ties break by configuration ID. The interface accepts future
algorithms; Optuna is not a dependency. Weighted score is only used for
`minimize_weighted_score`, after hard constraints.

Constraint units must match the evidence unit exactly; mismatch is `unknown`, not
a pass. Estimated metrics are rejected unless `allow_estimated_metrics=true`.

## D14. Fresh benchmarking opt-in and pending decisions

A decision request never benchmarks implicitly. With
`allow_fresh_benchmarking=true` and insufficient compatible evidence, the service
persists a `pending_evidence` decision, queues benchmark jobs for candidates
lacking evidence, and returns `202`. The worker finalizes the decision when the
runs finish. With the flag false and no evidence, the decision is persisted as
`insufficient_evidence` with per-candidate reasons. This distinction is exposed
in responses and history.

## D15. Privacy defaults

Prompts/system prompts are never persisted. The worker receives prompts through a
process-local hand-off map removed in `finally`. Generated output is stored only
when the request sets `retain_output=true` **and**
`LATTICE_ALLOW_OUTPUT_RETENTION=true`; otherwise the request is rejected rather
than silently dropped. Logs include IDs and codes, not prompt content, full model
paths or environment values. Request IDs are generated/propagated and included in
error bodies.

## D16. Aliases to satisfy both contracts

The prompt's Section 5 paths and the v2 contract paths differ. We implemented one
canonical handler and thin aliases instead of duplicate logic:

- `/configurations/import` + `/import/configurations`
- `/configurations/export` + `/export/configurations`
- `/optimization/decisions...` + `/optimization` + `/optimization/{id}`
- `/health`, `/ready` + `/api/v1/health`, `/api/v1/ready`
- `/history` + `/history/summary`

OpenAPI documents both; docs mark the canonical form.

## D17. Compatibility is conservative

Blocking differences: workload snapshot hash, protocol version, model identity
(model id/version/format/quantization/file size), runtime adapter, token-count
method, and mixing test-only with real evidence. Hardware, runtime version,
execution mode, sample size and partial status are warnings. Metrics from
incompatible runs are never pooled.

## Known limitations / not implemented

- No real model benchmark was executed in this environment (no GGUF model, no
  `llama-cpp-python`); all end-to-end verification used the injected fake
  runtime. The real adapter is implemented against `llama-cpp-python` but not
  exercised here.
- Cancellation of running native inference is not supported; queued-only.
- Per-process GPU VRAM attribution is usually unavailable (Windows), and
  AMD/Intel/Apple GPU telemetry is not implemented (`unsupported`).
- Memory estimation is a coarse file-size heuristic without KV-cache modelling.
- No thermal/power/NUMA telemetry, no distributed queue, no auth/TLS.
- Quality evaluation has only `exact_match`; no dataset download/management.
- Fresh benchmarking finalization depends on the in-process worker; a crash
  between job completion and decision finalization leaves the decision
  `pending_evidence` (it is recoverable by re-requesting, not automatically).
- `docs/setup-windows.md`/`development-workflow.md` retain Phase 0 lowercase
  `backend/` paths (see D1).

## Deviations from the letter of the prompt

- Route prefixes differ between the two prompt sections; aliases are documented
  in D16.
- `DELETE /workloads/{id}` was added (v2 contract) though Section 5 omitted it.
- `GET /configurations/{id}/revisions` and `GET /inference` were added for
  history/usability; they are additive.
- Percentiles are only exposed for `n>=5` rather than always, because smaller
  samples make them misleading; the contract permits this ("may be added if
  implemented correctly").
