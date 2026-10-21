# Team Handoff — Backend Sections 4–6

Everything below is implemented and exercised by the test suite unless marked
otherwise. Start with `Backend/README.md` for setup, `docs/api.md` for HTTP,
`docs/architecture.md` for flows and `docs/benchmarking.md` for measurement rules.

Suggested workflow for every owner:

```powershell
cd Backend
.\.venv\Scripts\Activate.ps1
pytest -q
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 1. Runtime owner

**Owns:** `app/runtime/llamacpp.py`, capability/validation details in
`app/runtime/base.py`, runtime metadata and token accounting. Optional dependency
extras in `pyproject.toml`.

**Contract (do not break):**

```python
class BaseRuntimeAdapter(ABC):
    adapter_id: str
    is_test_runtime: bool = False
    def capabilities(self) -> RuntimeCapabilities
    def validate(self, configuration: RuntimeConfiguration) -> ValidationResult
    def load(self, configuration: RuntimeConfiguration) -> ModelLoadResult
    def unload(self) -> None
    def generate(self, request: GenerationRequest) -> GenerationResult
    def cancel(self) -> None            # may raise CancellationUnsupported
    @property
    def is_loaded(self) -> bool
```

- `GenerationResult.first_token_ms` must come from an actual first streamed
  chunk. Do not set it from total latency. `output_tokens`/`input_tokens` must be
  runtime-authoritative or exact tokenizer counts, with `token_count_source`
  describing the method.
- `ModelLoadResult.effective_execution_mode` must reflect actual offload
  (`cpu`/`gpu`/`hybrid`/`unknown`), not GPU presence.
- `capabilities()` must never import optional packages at module import time and
  must return `not_installed` rather than raising.
- `generate()` must be thread-safe w.r.t. the single loaded handle or document
  why not; the engine already serializes per adapter+model path.
- No `shell=True`, no downloading models, no client-supplied commands.

**Tests to extend:** `tests/test_runtime.py` (add one) with a fake `llama_cpp`
module for load/generate/stream/tokenize and an absent-module capability test.
Keep `tests/test_benchmarks_api.py` green.

**Acceptance:** real model load + 1 warmup + 2 measured reps through
`POST /api/v1/benchmarks` on CPU produces `test_only=false`, `model_load_ms`,
`latency_ms`, token counts with source, `ttft_ms` available **only** when
streaming, and hardware execution mode `cpu`; missing packages leave `/health`
and `/capabilities` working.

---

## 2. Benchmarking owner

**Owns:** `app/benchmarking/metrics.py`, `statistics.py`, `quality.py`,
`protocol.py`, `app/services/benchmarks.py` execution/finalization, new metric
collectors and evaluators.

**Contract:**

- One protocol (`PROTOCOL_VERSION`) and one measurement envelope
  (`metric_value` / `MeasurementDraft`). Add metrics to `METRIC_CATALOGUE`,
  `METRIC_UNITS`, `METRIC_METHODS` and, if aggregatable,
  `NUMERIC_SUMMARY_METRICS`.
- Warmups: persisted with `kind="warmup"`, excluded from aggregates. Failures:
  persisted with `status="failed"`, never dropped.
- New quality evaluator: subclass `QualityEvaluator` and register it in
  `QualityRegistry`; declare `name`, `version`, `metric_name`, `scale`,
  `evaluate(...)`. No external API dependency.
- Persist through `BenchmarkService` / repositories only; never write tables from
  the metric collector.
- Do not change existing metric names/units without a protocol version bump and
  compatibility note.

**Tests to extend:** `tests/test_metrics.py`, `tests/test_statistics.py`,
`tests/test_benchmarks_api.py`, `tests/test_comparison.py` (add) for new metric
semantics, partial runs, TTFT absent, zero-token output, timeouts.

**Acceptance:** aggregate statistics match hand-computed values; summaries carry
counts/status/unit/method; no metric is fabricated when unavailable; a partial
run is `partial` and queryable; comparisons flag protocol/metric-method
mismatches.

---

## 3. Optimizer owner

**Owns:** `app/optimization/baseline.py`, `contracts.py`, evidence selection and
ranking policy in `app/services/optimization.py` (only the evidence/algorithm
parts; API/persistence changes coordinate with the API owner).

**Contract:**

```python
class BaselineOptimizer:
    name, version
    def optimize(self, request: OptimizationRequest) -> OptimizationResult
```

`OptimizationRequest` carries candidates (`CandidateEvidence` with per-metric
`MetricEvidence`), hard `Constraint`s, objective/weights, `EvidencePolicy` and
switching overhead. `OptimizationResult` carries status, selected config or
`None`, no-selection reason, explanation, per-candidate feasibility/rejections/
constraint outcomes/score/rank/evidence IDs.

Rules: constraints are gates; unknown evidence cannot pass; unit mismatch =
unknown; normalize only objective values after filtering; deterministic
tie-break by configuration ID; never write the DB or call the runtime; never
silently relax a constraint. Fresh benchmarking is opt-in and must remain a
separate job path.

**Tests to extend:** `tests/test_optimizer.py` (add cases for multi-constraint
gating, stale evidence, unit mismatch, weighted objective, no-feasible),
`tests/test_optimization_api.py` (pending-evidence and execute refusal).

**Acceptance:** decisions are reproducible from persisted inputs + evidence,
history is never overwritten, `selected_configuration_id=null` with a precise
reason when nothing is eligible, and fake-only evidence is rejected by default.

---

## 4. API / persistence owner

**Owns:** `app/db/models.py`, `alembic/`, `app/repositories/*`, `app/schemas/*`,
`app/api/*`, `app/services/io.py`, `app/services/history.py`,
`app/services/comparison.py`, settings/env.

**Contract:** response models are the OpenAPI contract; list responses are
`Page[T]`; errors use `{"error": {"code", "message", "details"}, "request_id"}`;
statuses/IDs/timestamps as documented; route aliases listed in
`docs/implementation-decisions.md` D16.

Schema changes require an Alembic revision and a migration note in
`docs/implementation-decisions.md`; `LATTICE_AUTO_CREATE_SCHEMA=true` remains the
fresh-clone path. Soft-deleted records stay readable through history.

**Tests to extend:** `tests/test_database.py`, `tests/test_configurations_api.py`,
`tests/test_workloads_api.py`, `tests/test_history_and_jobs.py`,
`tests/test_main.py` for new routes/status codes/migrations.

**Acceptance:** `pytest -q` green on a fresh temp DB, OpenAPI includes documented
routes, import/export round trip passes, unknown IDs return 404, conflicts 409,
validation 422, and no raw exception text leaks.

---

## 5. Frontend owner

**Owns:** `Frontend/` only. No backend edits required for the documented flows.

Consume:

- `GET /api/v1/capabilities` for available runtime/hardware/metrics.
- Configurations/workloads CRUD + `/validate` before benchmarking.
- `POST /api/v1/benchmarks` → poll `/api/v1/jobs/{job_id}` and
  `/api/v1/benchmarks/{run_id}`; render `metric_summaries` with status/unit and
  never plot `null` as zero.
- `/api/v1/benchmarks/{run_id}/measurements` for raw repetitions (warmups flagged).
- `/api/v1/history` and `/history/compare` for dashboards; show warnings.
- Optimization create → show feasible/rejected candidates and chosen config;
  enable Execute only for `status="selected"`.
- Inference create → poll job/execution; output is usually not retained, so do
  not expect generated text after the fact.

Show `test_only` prominently when true (fake runtime) and never label it real
performance. `VITE_BACKEND_URL` already points at `http://localhost:8000`.

**Acceptance:** no endpoint calls outside `docs/api.md`; loading/empty/error
states handled; pagination uses `limit`/`offset`; error messages come from the
envelope, not stack traces.

---

## 6. Shared rules

- Do not add a new queue framework, ORM layer or duplicate runtime interface.
- Do not make GPU libraries mandatory; optional collectors only.
- Add dependencies only with an implementation purpose and update both
  `pyproject.toml` and `requirements.txt`.
- Never fake benchmark/inference output; use injected fakes only in tests.
- Preserve aliases and snapshot schema versions for compatibility.
- Run `pytest -q`, and `ruff check .` if available, before handoff.
