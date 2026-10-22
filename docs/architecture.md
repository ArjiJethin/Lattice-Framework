# Backend Architecture (Sections 4–6)

Status: implemented and tested. Real llama.cpp execution is verified in this
environment through the HTTP API (CPU-only, Qwen2.5-0.5B-Instruct Q4_K_M); the
default test suite still runs offline with the test-only fake runtime. See
`docs/backend-run.txt` section 11f for the measured results and
`docs/implementation-decisions.md` for the design trade-offs.

---

## 1. Layering

```
Backend/app/
├── main.py                 app factory, CORS, request IDs, error handlers, lifespan
├── core/
│   ├── settings.py         single typed settings model (LATTICE_* env)
│   ├── container.py        composition root + JobDispatcher
│   ├── errors.py           domain errors -> HTTP status mapping
│   ├── enums.py            status/objective/metric enums
│   ├── validation.py       allowlists for runtime/generation parameters
│   ├── paths.py            approved model-root resolution
│   ├── time.py             UTC, monotonic clocks, IDs, hashing
│   └── logging.py          request/correlation-safe logging
├── api/
│   ├── deps.py             FastAPI dependencies (session, services)
│   ├── errors.py           error envelope handlers
│   ├── router.py           /api/v1 assembly
│   └── routes/             health, configurations, workloads, benchmarks,
│                           optimization, inference, jobs, history
├── schemas/                Pydantic request/response models (separate from ORM)
├── db/
│   ├── models.py           SQLAlchemy 2.0 ORM
│   └── session.py          engine, session factory, PRAGMAs, session_scope
├── repositories/           queries only (configurations, workloads, jobs,
│                           benchmarks, decisions, inference)
├── services/               orchestration + validation; no HTTP objects
├── jobs/manager.py         bounded in-process worker queue
├── runtime/                typed contract, llama.cpp adapter, fake adapter, locks
├── hardware/               collectors, snapshot service, telemetry, preflight
├── benchmarking/           protocol, metrics, statistics, quality, comparison
└── optimization/           pure optimizer contract + deterministic baseline
```

Rules enforced by review/tests: routes call services only; repositories never
invoke runtimes; the optimizer never touches the database; benchmark code
persists through `BenchmarkService`; no session is held across model work.

## 2. Request path

```
HTTP request
  → RequestIDMiddleware (X-Request-ID)
  → route (validated Pydantic body/query)
  → Depends(get_container) / get_db_session
  → service method
  → repository/ORM (commit or rollback)
  → Pydantic response model
  → exception handler (DomainError → stable code/status, request_id)
```

`DatabaseSession` yields one `Session` per request and closes it; writes are
committed by the service. Long-running endpoints only persist `queued` rows then
return `202`.

## 3. Composition and lifecycle

`Container` builds settings → engine/session factory → optional schema creation →
runtime registry → hardware service → quality registry → optimizer → lock
manager → `JobManager`. `app.main.create_app()` wires lifespan startup
(runtime probes, interrupted-job recovery) and shutdown (graceful worker drain).

Tests construct the same graph with injected `RuntimeRegistry(FakeRuntimeAdapter)`,
fake hardware/quality services and a temporary SQLite URL via `tests/conftest.py`.

## 4. Persistence

| Table | Purpose | Key invariants |
| --- | --- | --- |
| `configurations` | profile + current state | unique name, revision, soft-delete (`deleted_at`) |
| `configuration_revisions` | immutable snapshots | append-only per revision |
| `workloads` | workload profile | version, content hash, soft-delete |
| `workload_revisions` | immutable snapshots | append-only per version |
| `jobs` | lifecycle | status transitions, terminal immutability, resource link |
| `benchmark_runs` | run metadata | snapshots/hash, hardware, model identity, counts, test_only |
| `benchmark_measurements` | one row per warmup/measured repetition | raw timings, status, errors |
| `benchmark_metric_summaries` | aggregated metrics | count/mean/median/min/max/stddev/p90/p95/status |
| `optimization_decisions` | decision inputs/results | immutable history, selected config nullable |
| `decision_candidates` | per-candidate feasibility | constraint outcomes, score, rejection reasons |
| `inference_executions` | runtime execution | optional decision link, retention policy |

Relationships: `Job 1—N BenchmarkRun`; `BenchmarkRun 1—N measurements` and
`1—N metric summaries`; `OptimizationDecision 1—N decision candidates`;
configurations/workloads are referenced **by ID + snapshot**, not by mutable
foreign keys into history. SQLite foreign keys are enabled on every connection;
deleting a referenced configuration/workload soft-deletes it, otherwise the row
is hard-deleted.

## 5. Job lifecycle

```
queued ──► running ──► completed
   │          ├──────► failed
   │          └──────► cancelled   (only before work starts)
   └──────────────────► failed / interrupted
```

- Persistent row is created before scheduling.
- Atomic `UPDATE ... WHERE status IN (...)` transitions in `services/jobs.py`.
- Bounded queue (`job_max_workers`, `job_max_pending`); overload → `503`.
- Worker catches all exceptions, stores `error_code`/sanitized `error_message`,
  and always releases runtime locks in `finally`.
- `progress` stays `null` when not measurable.
- Startup recovery marks abandoned `running` jobs `interrupted`; queued jobs are
  not silently re-run.

## 6. Runtime lifecycle

```
resolve(adapter) → capabilities() → validate(config)
  → acquire runtime+model lock
  → load(config) → ModelLoadResult (load_ms, effective execution mode)
  → generate(request) (streaming optional) → GenerationResult
  → unload() or keep in single-slot cache
  → release lock
```

`BaseRuntimeAdapter` is the canonical contract. `LlamaCppRuntime` lazily imports
`llama_cpp` and never shells out. `FakeRuntime` is test-only. Runtime metadata
(adapter/version/backend/offload mode) flows into the run snapshot, never into
unrelated endpoints.

## 7. Benchmark flow

1. Route validates schema → `BenchmarkService.provision()` validates profile,
   runtime availability, protocol bounds, path, context; writes queued
   `Job` + `BenchmarkRun` with snapshots, then `JobManager.submit()`.
2. Worker resolves config/workload from the stored snapshot, captures hardware,
   loads the model, runs warmups, then measured repetitions.
3. `measurement.collect_measurement()` produces per-repetition metrics with
   statuses/provenance; `BenchmarkService` persists each row immediately.
4. On completion, `aggregate_measurements()` + `summarize_metric()` build
   summaries (warmups excluded, failures counted), quality evaluator runs (if
   declared), then run/job are finalized in one transaction.
5. `/benchmarks/{id}` and `/measurements` read the persisted rows; comparisons
   apply compatibility rules.

## 8. Optimizer evidence flow

```
request (workload, candidates, constraints, objective, policy)
  → resolve workload snapshot + configuration revisions
  → collect compatible completed/partial runs (protocol, workload hash, freshness,
    repetitions, test-only policy)
  → BaselineOptimizer (pure): constraint gates → feasibility/unknown →
    normalize objective over eligible candidates → rank with ID tie-break
  → persist decision + per-candidate rows + evidence run IDs
  → optional execute endpoint creates inference job for selected config
```

Fresh benchmarking is opt-in only and runs as a separate optimization job that
provisions/executes candidate benchmarks sequentially, then finalizes the
decision. No implicit benchmarking during a decision request.

## 9. Hardware and provenance

Every run/execution stores `hardware_snapshot` (per-field status/reason/method,
collector reports), `runtime_metadata`, `software_versions`, `model_identity`,
and protocol/config/workload snapshots. Comparison reads these fields; see
`docs/hardware-detection.md` and `docs/benchmarking.md`.

## 10. API and docs

Canonical prefix `/api/v1`, health/readiness aliases at root. OpenAPI is
generated from the same Pydantic models used at runtime. Error envelope and
pagination are documented in `docs/api.md`; route aliases are listed in
`docs/implementation-decisions.md` (D16).
