# Backend Completion Audit

Audit date: 2026-10-21
Scope: `Backend/` only. The `Frontend/` scaffold was not modified.
Method: inspect the repository, run the actual commands, then fix verified gaps.
The prior completion report was treated as a map, not as proof.

## 1. Environment used for verification

| Item | Value |
| --- | --- |
| OS | Windows (build 26100), Git Bash + Windows PowerShell 5.1 |
| Interpreter | CPython 3.13.5 (project requires >= 3.11) |
| Server | uvicorn 0.54.0, `app.main:app` |
| Migrations | alembic 1.20.0, single revision `cab7b3235e59` |
| `llama-cpp-python` | **not installed** |
| `nvidia-ml-py` / `pynvml` | **not installed** |
| GPU | none reported by the collectors used in this environment |
| Real GGUF model | **none available**, so no real-model benchmark was run |

No hardware detail in this document is inferred. Where a value was not collected,
it is reported as unavailable rather than guessed.

## 2. Baseline (before this session's changes)

| Check | Command (from `Backend/`) | Result |
| --- | --- | --- |
| Test suite | `.\.venv\Scripts\python.exe -m pytest -q` | **100 passed**, 1 warning |
| Lint | `.\.venv\Scripts\python.exe -m ruff check .` | All checks passed |
| Format | `.\.venv\Scripts\python.exe -m ruff format --check .` | 95 files already formatted |
| Type checking | — | Not configured in `pyproject.toml`; nothing to run |
| Adapter contract tests | — | **None existed**; `generate()` was entirely uncovered |
| Real-model integration test | — | **Did not exist** |
| `docs/backend-run.txt` | — | **Did not exist** |

The claimed "100 passing tests" figure was accurate. The claimed coverage of the
real adapter was not: no test exercised `LlamaCppAdapter.generate()` or its error
translation.

## 3. Audit matrix

Status values: **verified** (code + executed evidence), **hardened** (a real defect
was found and fixed this session), **partial** (works, but with a documented
scope limit), **missing** (not implemented; stated as a limitation).

| # | Requirement | Code location | Status | Evidence | Gap / action |
| --- | --- | --- | --- | --- | --- |
| 1 | Optional runtime must not be required for startup | `app/runtime/llamacpp.py`, `app/api/routes/health.py` | verified | `test_benchmark_requires_runtime_when_runtime_is_absent`, live server with no `llama_cpp` | `/health`, `/ready`, `/capabilities` return 200; benchmarks return controlled 503 |
| 2 | Runtime capability reporting | `LlamaCppAdapter.capabilities` | hardened | `tests/test_llamacpp_adapter.py` (3 tests) | `llama_supports_gpu_offload()` could raise and break `/capabilities`; probe is now guarded and degrades to "no GPU offload" with a stated limitation |
| 3 | Adapter argument mapping | `LlamaCppAdapter.load` | verified | `test_load_maps_configuration_to_llama_arguments`, `test_runtime_parameters_cannot_override_core_arguments` | Core kwargs (`n_ctx`, `n_threads`, `n_batch`, `n_gpu_layers`) cannot be overridden by free-form runtime parameters |
| 4 | Load failure / OOM distinction, sanitized messages | `LlamaCppAdapter.load`, `_sanitize` | verified | `test_load_failure_is_translated_and_sanitized`, `test_load_out_of_memory_is_classified_separately` | Absolute model paths replaced with `<model>`; OOM has its own code |
| 5 | Failed load must not corrupt lifecycle state | `LlamaCppAdapter.load` | verified | `test_failed_load_keeps_the_previously_loaded_model` | Previously loaded model stays usable and is not silently closed |
| 6 | Unload is safe and idempotent | `LlamaCppAdapter.unload` | verified | `test_unload_closes_the_model_and_is_idempotent`, `test_unload_tolerates_a_failing_close` | A raising native `close()` is logged, not propagated |
| 7 | Generation streaming, TTFT, token provenance | `LlamaCppAdapter.generate` | verified | `test_generate_streams_text_and_reports_runtime_usage`, `test_generate_falls_back_to_the_model_tokenizer`, `test_generate_keeps_token_counts_null_when_no_source_exists` | Counts come from runtime usage, else the model tokenizer, else `null` + reason |
| 8 | Timeout / failed-stream handling | `LlamaCppAdapter.generate` | partial | `test_generate_times_out_between_chunks_and_closes_the_stream`, `test_generate_translates_stream_failures_without_path_leaks` | Timeouts are enforced **between streamed chunks**; a native call that never yields cannot be preempted (documented, and cancellation is reported unsupported) |
| 9 | Real end-to-end inference | `LlamaCppAdapter`, `tests/test_llamacpp_integration.py` | missing (environment) | `pytest tests/test_llamacpp_integration.py -v` -> **1 skipped** | No local model and no `llama-cpp-python`; native inference remains unverified |
| 10 | Model path privacy | `app/schemas/resources.py`, `services/configurations.py` | verified | live `POST /api/v1/configurations` response contains `model_path_configured`/`model_file_name`, never the absolute path; `test_create_and_read_hides_absolute_model_path` | Path policy rejects files outside configured roots |
| 11 | Hardware collectors fail independently | `app/hardware/collectors.py`, `service.py` | verified | `test_gpu_collector_missing_dependency`, `test_gpu_collector_reports_permission_denied`, `test_failing_collector_does_not_break_snapshot`, `test_partial_collector_data_leaves_missing_values_null` | Missing values stay `null` with a status, never `0` |
| 12 | Preflight is advisory, not proof | `app/hardware/preflight.py` | partial | `test_preflight_marks_estimate_as_estimated_and_advisory`; live validate output shows `method: gguf-file-size-heuristic/1`, `uncertainty: high`, `memory is compared against currently available RAM only` | File-size heuristic; KV-cache/context/batch memory not modelled. Only an actual load is authoritative |
| 13 | Execution mode: requested vs effective | `runtime/llamacpp.py`, snapshots | partial | `test_load_marks_hybrid_only_when_build_supports_gpu`, `test_load_warns_when_gpu_requested_without_gpu_build` | Effective mode is derived from the build's offload support, not from per-layer runtime proof |
| 14 | Immutable run snapshots and provenance | `services/snapshots.py`, `db/models.py` | verified | `test_benchmark_snapshot_is_not_affected_by_later_edits`, `test_jsonl_export_is_parseable_and_provenance_complete` | configuration/workload/protocol snapshots + hashes + hardware/software versions |
| 15 | Warmups excluded, failures preserved | `benchmarking/metrics.py`, `services/benchmarks.py` | verified | `test_warmups_are_excluded_from_aggregates_but_raw_rows_preserved`, `test_partial_run_preserves_failures`, `test_all_failed_run_is_failed_not_success` | Raw rows retained; all-failed run is `failed`, not `completed` |
| 16 | No fabricated metrics | `benchmarking/metrics.py`, `statistics.py` | verified | `test_missing_token_counts_prevent_throughput`, `test_zero_output_tokens_never_divides_by_zero`, `test_ttft_unavailable_without_stream_timestamps`, `test_memory_collection_disabled_is_not_applicable_not_zero`, `test_nan_inf_and_none_are_rejected_and_counted` | Unavailable stays null with method/reason |
| 17 | Quality evaluation constraints | `benchmarking/quality.py` | verified | `test_exact_match_quality_is_measured_with_evaluator_metadata`, `test_missing_quality_evaluator_stays_unavailable` | Exact-match only; no evaluator means unavailable, never `0.0` |
| 18 | Hard constraints gate selection | `optimization/baseline.py`, `services/optimization.py` | verified | `test_hard_constraint_failure_excludes_fastest_candidate`, `test_quality_constraint_excludes_best_latency_regardless_of_score`, `test_unit_mismatch_is_unknown_evidence`, `test_no_evidence_reports_insufficient_evidence` | Missing/estimated/test-only evidence is not a pass |
| 19 | No-selection and explainability | `optimization/baseline.py` | verified | `test_all_candidates_infeasible_reports_no_feasible_candidate`, `test_unknown_required_metric_is_insufficient_evidence`, live decision response includes per-candidate `constraint_results` | Decision persists reasons and evidence run ids |
| 20 | Execution gating + post-validation | `services/optimization.py`, `services/inference.py` | verified | `test_execute_refuses_infeasible_decision`, `test_execute_selected_decision_creates_inference`; live run -> `validation_status: passed` (latency constraint re-checked) | Missing actual metric yields `not_evaluated` |
| 21 | Bounded job queue, state machine, restart recovery | `jobs/manager.py`, `services/jobs.py` | verified | `test_queue_capacity_is_bounded`, `test_job_state_machine_rejects_illegal_and_terminal_transitions`, `test_restart_recovery_marks_interrupted_work`, `test_cancel_only_queued_jobs` | In-process and non-durable by design; queued-only cancellation |
| 22 | Persistence, FK enforcement, migrations | `db/session.py`, `alembic/` | partial | `test_sqlite_foreign_keys_enabled_on_every_connection`, `test_data_persists_across_engine_restart`; `alembic upgrade head` on a fresh temp DB -> 11 app tables + `alembic_version`, `alembic current` -> `cab7b3235e59 (head)` | Only one revision exists, so upgrading a *prior* schema is not testable yet. `LATTICE_AUTO_CREATE_SCHEMA=true` can create tables without recording a version; documented |
| 23 | API error envelope, pagination, privacy | `app/api/errors.py`, `schemas/common.py` | verified | live 404 `{"error": {"code": "not_found", ...}, "request_id": ...}`; live 422 `validation_error` with field details; `test_list_pagination_and_filters`; inference response `prompt_retained: false`, `retained_output: null` | No authentication; local research API only |
| 24 | Runbook deliverable | `docs/backend-run.txt` | missing -> created | This session | Commands verified where executable; unverified ones labelled |
| 25 | Frontend | `Frontend/` | untouched | `git status` shows no frontend changes | Out of scope |

## 4. Defects found and fixed (P0/P1)

### P0 — capabilities endpoint could fail on a partial runtime build

`LlamaCppAdapter.capabilities()` called `module.llama_supports_gpu_offload()`
outside any guard. A `llama-cpp-python` build where that probe raises would make
`/api/v1/capabilities`, `/api/v1/ready` (runtime check) and adapter resolution
raise instead of reporting a reduced capability. Fixed by guarding the probe,
logging a warning, reporting `supports_gpu_offload=false`, and adding an explicit
limitation string. Regression test: `test_capabilities_survive_a_failing_gpu_probe`.

### P1 — the real adapter's generation path had no contract coverage

`LlamaCppAdapter.generate()` was annotated `pragma: no cover` and untested, so
nothing verified argument mapping, TTFT boundaries, usage-vs-tokenizer provenance,
empty output, timeout behaviour, stream failure translation, or path sanitation.
Added 22 mocked-runtime tests in `tests/test_llamacpp_adapter.py`. These are
contract tests: they prove adapter logic, not model performance.

### P1 — no optional real-model test and no way to prove a skip is intentional

Added `tests/test_llamacpp_integration.py`. It is skipped unless
`llama-cpp-python` is importable **and** `LATTICE_REAL_MODEL_PATH` names an
existing local `.gguf`. It never downloads anything and asserts only structural
facts so it does not encode machine-specific timings. In this environment it
reports `1 skipped` with the reason.

### P2 — missing runbook

`docs/backend-run.txt` did not exist. Created with verified Windows commands for
setup, migration, startup, the fake-runtime smoke flow, tests/lint, optional
real-model verification, troubleshooting and a results checklist.

## 5. Remaining limitations (explicit)

1. **No real model has ever been executed here.** `llama-cpp-python` is not
   installed and no GGUF file is present. All measurements in this environment
   come from the test-only fake runtime and are tagged `test_only`.
2. **Timeout semantics.** Native decode cannot be interrupted; a timeout is only
   observed when the stream yields another chunk. A hung native call blocks the
   worker thread. Cancellation is reported unsupported (`409`, `cancellation_not_supported`).
3. **Preflight memory model is coarse.** `model_file_size * 1.2` with high
   uncertainty; KV cache, context length and batch effects are not modelled and
   VRAM is not predicted from model metadata. It is advisory, not a safety proof.
4. **Effective execution mode is inferred** from build capability plus requested
   offload, not verified per layer at runtime.
5. **Single migration revision.** There is no prior schema to upgrade from, so
   only "fresh database -> head" is tested.
6. **In-process job queue.** Not durable; interrupted work is marked on restart
   and not retried. Pending inference prompts are memory-only and cannot survive
   a restart.
7. **Quality evaluation** is exact-match only when the workload declares it and
   an evaluator is configured; otherwise quality is unavailable.
8. **No authentication / rate limiting / TLS.** Local research API only.
9. **No type checker** is configured in `pyproject.toml`, so no type-check gate
   exists to run.

## 6. Verification performed after the changes

| Check | Command (from `Backend/`) | Result |
| --- | --- | --- |
| Full suite | `.\.venv\Scripts\python.exe -m pytest -q` | **122 passed, 1 skipped**, 1 warning (24 s) |
| Adapter contract | `.\.venv\Scripts\python.exe -m pytest tests/test_llamacpp_adapter.py -q` | 22 passed |
| Optional real model | `.\.venv\Scripts\python.exe -m pytest tests/test_llamacpp_integration.py -v` | 1 skipped (dependency absent) |
| Lint | `.\.venv\Scripts\python.exe -m ruff check .` | All checks passed |
| Format | `.\.venv\Scripts\python.exe -m ruff format --check .` | 97 files already formatted |
| Fresh migration | `alembic upgrade head` + `alembic current` on a temp SQLite file | revision `cab7b3235e59 (head)`; 11 app tables created |
| Live API, no runtime | uvicorn on 127.0.0.1:8123 | `/health` 200, `/docs` 200, `/openapi.json` 200, `/api/v1/capabilities` 200 with `llamacpp: not_installed` and 14 metrics |
| Live API, fake runtime | uvicorn on 127.0.0.1:8124/8125 | config 201, validate 200, workload 201, benchmark 202 -> job `completed`, run `completed` (3 reps, 1 warmup), measurements 4 rows, decision 201 `selected`, execute 202 -> inference `completed` / `passed`, export 200 (`application/x-ndjson`, 2 records) |
| Smoke script | `.\.venv\Scripts\python.exe scripts/smoke_fake_runtime.py` | exit 0, "smoke test finished successfully" |

Servers started for verification were stopped afterwards; ports 8123-8125 are closed.

## 7. Files changed in this audit

| File | Change |
| --- | --- |
| `Backend/app/runtime/llamacpp.py` | Guarded GPU capability probe; added degradation limitation |
| `Backend/tests/test_llamacpp_adapter.py` | New: 22 mocked-runtime contract tests |
| `Backend/tests/test_llamacpp_integration.py` | New: opt-in real-model test that skips cleanly |
| `Backend/README.md` | Pointer to the runbook + optional real-model test instructions |
| `docs/backend-completion-audit.md` | New: this audit |
| `docs/backend-run.txt` | New: verified run-and-verify runbook |
| `docs/product-built.txt` | Updated with post-build functionality, test counts and new limitations |

## 8. API compatibility

No request/response schema, route, status code or persisted column changed. The
only behaviour change is that a failing GPU probe now returns a capability report
instead of an error, which is strictly more permissive. The frontend owner needs
no changes.
