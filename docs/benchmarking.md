# Benchmarking Protocol and Measurement Semantics

Implementation: `app/benchmarking/` (protocol, executors, metrics, statistics,
quality), orchestration in `app/services/benchmarks.py`, persistence models in
`app/db/models.py`.

Protocol version: `1.0` (`app/benchmarking/protocol.py`).

---

## 1. Request validation

| Field | Default | Bound |
| --- | --- | --- |
| `warmup_iterations` | 1 | 0..`LATTICE_BENCHMARK_MAX_WARMUPS` (5) |
| `repetitions` | 3 | 1..`LATTICE_BENCHMARK_MAX_REPETITIONS` (20) |
| `timeout_seconds` | 120 | >0 and <= `LATTICE_BENCHMARK_MAX_TIMEOUT_SECONDS` (900) |
| `generation_parameters` | config defaults | allowlisted keys, bounded |
| `quality_evaluator` | none | one of the registered evaluators |
| `evaluation_samples` | workload samples | bounded by the request schema |
| `protocol_version` | `1.0` | must match a supported version |

Validation happens before a job is created. Invalid values return `422` with
field-level details; they are never clamped. Runs are serial per runtime adapter
and per model path (`app/runtime/locks.py`).

## 2. Lifecycle

1. Validate the request, configuration and workload (enabled, path, format,
   runtime adapter availability).
2. Persist `BenchmarkRun` + `Job` (queued) with immutable configuration,
   workload and protocol snapshots **before** any work starts.
3. Worker acquires the runtime + model lock.
4. Capture the pre-run hardware/process baseline.
5. Load the model (or reuse a cached handle keyed by runtime config hash); record
   `load_time_ms` separately. Cold load is never included in request latency.
6. Run warm-ups; persist them with `kind="warmup"` and exclude them from
   aggregates.
7. Run measured repetitions; each gets its own `BenchmarkMeasurement` row with
   monotonic timings, token counts + provenance, memory samples and status.
8. Optionally run the declared quality evaluator over the workload samples using
   the *same loaded handle*, recording evaluator metadata.
9. Capture post-run memory/RSS, release the runtime, release the lock in
   `finally`.
10. Aggregate successful measured repetitions, persist `metric_summaries`,
    `quality`, execution metadata, status and finish time.

A crash or timeout cannot leave the job `running`: the worker boundary records a
terminal `failed` state; restart recovery marks abandoned `running` jobs
`interrupted` (see `app/jobs/manager.py`).

## 3. Metric definitions

Canonical names are defined in `METRIC_CATALOGUE`
(`app/benchmarking/protocol.py`) and `METRIC_UNITS`/`METRIC_METHODS`
(`app/benchmarking/metrics.py`).

| Metric | Unit | Status | Definition | Source |
| --- | --- | --- | --- | --- |
| `model_load_ms` | ms | measured | run-level model load duration, excluded from request latency | monotonic clock around `load()` |
| `ttft_ms` | ms | measured / unavailable | dispatch to first streamed token | runtime first-token timestamp; **never** total latency |
| `latency_ms` | ms | measured | dispatch to completion (excludes load) | monotonic `perf_counter` |
| `generation_duration_ms` | ms | measured | currently the same window as `latency_ms` (no prefill split available) | monotonic clock |
| `output_tokens` | tokens | measured / unavailable | runtime usage count, else the exact model tokenizer; otherwise unavailable | llama.cpp usage / `tokenize()` (`token_count_source`) |
| `input_tokens` | tokens | measured / unavailable | same precedence | same |
| `time_per_output_token_ms` | ms/token | derived | `latency_ms / output_tokens` for successful reps with tokens > 0 (includes prefill) | arithmetic |
| `output_throughput_tps` | tokens/s | derived | `output_tokens / (latency_ms / 1000)` — **includes prefill** | arithmetic |
| `decode_throughput_tps` | tokens/s | derived / unavailable | `output_tokens / ((latency_ms - ttft_ms)/1000)` — only when TTFT exists | arithmetic |
| `peak_process_rss_mb` | MB | measured / unavailable | observed peak RSS of this process during the repetition | psutil sampler, 50 ms default |
| `peak_system_ram_used_mb` | MB | measured / unavailable | observed peak device-wide used RAM | psutil sampler |
| `peak_gpu_device_memory_used_mb` | MB | measured / unavailable | device-wide VRAM peak, **not** process-attributed | NVML/nvidia-smi sampling |
| `peak_gpu_utilization_pct` | percent | measured / unavailable | device-wide utilization peak | NVML/nvidia-smi sampling |
| `quality_score`/`exact_match_accuracy` | ratio 0..1 | measured / unavailable | evaluator-defined score | quality evaluator |

Any value that cannot be measured is `null` with a status (`unavailable`,
`failed`, `not_applicable`) and a `reason`; zero is never used for missing data.
Summary objects keep `count`, `status`, `sample_count`, `numerator`,
`denominator` and `reason` along with their typed columns.

Streaming: the native llama.cpp adapter uses `stream=True` and timestamps the
first non-empty chunk, so TTFT is measured there. Non-streaming runtimes report
TTFT as unavailable instead of substituting latency; `decode_throughput_tps` is
then unavailable as well. No character/word heuristic is used for token counts:
anything not returned by the runtime or the exact tokenizer stays unavailable.

## 4. Warm-ups and repetitions

- Warm-ups are executed through the identical code path, persisted with
  `kind="warmup"`, and never enter aggregates.
- Measured failures are persisted individually with `status="failed"` and a
  reason. They are counted in `failed_repetitions`.
- Aggregates include successful measured repetitions only, and always carry the
  counts so the denominator is visible.
- Partial policy: if **at least one** measured repetition succeeds, the run is
  `partial` when failures exist and `completed` otherwise. If all measured
  repetitions fail (or model load fails), the run is `failed` and no numeric
  aggregates are emitted. A partial run is never labelled successful.

## 5. Statistics

For each metric over successful measured repetitions:

- `count`, `mean`, `median`, `min`, `max`
- sample standard deviation (`n-1`) for `n >= 2`, `null` for `n == 1`
- `p90`/`p95` for `n >= 5` using linear interpolation (R-7) of sorted values
- unit, sample count, status, numerator/denominator

`n = 0` produces no summary at all. Non-finite inputs are rejected before
persistence and serialization.

## 6. Quality evaluation

Interface: `QualityEvaluator` in `app/benchmarking/quality.py` with
`name`, `version`, `metric_name`, `scale`, `evaluate(samples, ...)`.

Built-in: `exact_match` — normalised case/whitespace match, score 0..1.
Workloads using it must declare `references`/`samples` with `reference`.
Unregistered evaluators and missing references are rejected at request time.
Evaluator exceptions are caught and recorded as `quality.status="failed"` with a
reason; they never crash the run and never produce a score.

If no evaluator is declared, `quality.status="unavailable"` and no score
exists. Such a run cannot satisfy a quality constraint. No universal LLM judge or
external API is used.

## 7. Provenance

Each run stores:

- `configuration_snapshot` / `workload_snapshot` / `protocol_snapshot` (versioned
  JSON + hash), generated once and never mutated;
- runtime adapter/service identity + version, effective backend, requested vs
  effective execution mode (cpu/gpu/hybrid/unknown), offload information;
- model identity (configured model id/version, format, quantization, file name,
  size, mtime, configuration revision and content hash — file contents are not
  hashed);
- hardware snapshot (`HardwareSnapshot` with per-field status/reason/method and
  collector provenance);
- process RSS baseline/peak, system RAM, GPU samples with methods;
- protocol version, warmups/repetitions requested and completed, token-count
  method, metric collection method, quality evaluator metadata;
- software versions (Python, platform, runtime packages) and UTC timestamps;
- `test_only` for fake-runtime runs.

## 8. Comparison compatibility

`compatibility_issues(run_a, run_b)` (`app/benchmarking/comparison.py` /
`app/services/comparison.py`) returns:

- **Blocking issues** (=> `comparable: false`): different workload snapshot,
  different protocol snapshot/version, different model identity, different
  runtime adapter, different token-count method, mixing test-only with real runs.
- **Warnings**: hardware fingerprint differences (CPU model, RAM class,
  GPU/VRAM, OS), runtime version differences, execution-mode differences,
  missing/partial metrics, small sample counts.

Blocking means metrics are never pooled. Warnings are surfaced to the caller.
Tests/unit comparison helpers live in `tests/test_comparison.py`.

## 9. Sources of noise and limitations

- Desktop OS scheduling, background processes, thermal throttling, shared GPU.
- psutil sampling (~50 ms) can miss very short memory peaks; values are process
  RSS not VRAM.
- GPU telemetry is device-wide and best-effort; per-process VRAM is usually
  unavailable on Windows without extra tooling.
- llama.cpp load time includes file I/O and cannot be separated from
  mmap/initialisation.
- Token counts from `/tokenize` exclude special tokens unless the runtime reports
  them; this is recorded as `token_count_source`.
- No lab-grade isolation is claimed.

## 10. Fake runtime policy

`app/runtime/fake.py` is deterministic and only selected by explicit
`LATTICE_RUNTIME_ADAPTER=fake` **and** `LATTICE_RUNTIME_ALLOW_FAKE=true`, or by
test injection. Fake runs are flagged
`test_only=true`, are excluded from history summaries/exports/comparisons and are
rejected as optimization evidence unless explicitly opted in and enabled. Fake
measurements are never real model performance.
