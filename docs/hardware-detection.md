# Hardware Discovery, Telemetry and Resource Preflight

Implementation: `app/hardware/` (`detector.py`, `collectors.py`, `telemetry.py`,
`preflight.py`, `estimates.py`).

Every collector is optional. Missing tools, drivers, permissions or platforms can
never prevent startup, CPU-only inference, database use or the test suite.

---

## 1. Availability model

Every optional field is a `HardwareReading` (`app/hardware/types.py`):

```json
{"value": 15.6, "unit": "GB", "status": "available", "reason": null,
 "method": "psutil.virtual_memory().total", "source_version": "5.9.8"}
```

Statuses: `available`, `unsupported`, `not_installed`, `not_detected`,
`permission_denied`, `temporarily_unavailable`, `not_applicable`, plus
`collection_error` for a collector that raised. Non-available values have
`value: null` — never `0`.

## 2. Collector matrix

| Field | Primary collector | Optional dependency | Windows | Linux | macOS |
| --- | --- | --- | --- | --- | --- |
| OS / arch / Python | `platform`, `sys` | none | yes | yes | yes |
| CPU model / logical cores | `platform.processor`, `os.cpu_count` | none | yes | yes | yes |
| Physical cores | psutil | `psutil` | yes | yes | yes |
| Total RAM | psutil | `psutil` | yes | yes | yes |
| Available RAM | psutil | `psutil` | yes | yes | yes |
| Process RSS / peak RSS | psutil `Process` | `psutil` | yes | yes | yes |
| GPU vendor/model, VRAM | `nvidia-smi --query-gpu` | NVIDIA driver (no Python pkg) | if present | if present | if present |
| GPU util / device memory | `nvidia-smi` | NVIDIA driver | yes | yes | yes |
| Per-process VRAM | `nvidia-smi --query-compute-apps` | NVIDIA driver + permissions | often unavailable | often unavailable | n/a |
| Runtime backend / versions | runtime adapter | llama-cpp-python | yes | yes | yes |
| CUDA available | runtime-reported | llama.cpp build | yes | yes | yes |

AMD/Intel GPUs, Apple Metal and ROCm are **not** implemented: those fields are
`unsupported` with a reason. Windows GPU memory via WMI (`Win32_VideoController`)
is not used because it reports adapter RAM unreliably; it is documented as a
future collector.

Collectors never shell out to arbitrary user input; only fixed `nvidia-smi`
queries are executed with `shell=False`, short timeouts and parsed output. A
non-zero exit, timeout or unparseable output becomes `temporarily_unavailable`
with a reason.

## 3. Hardware snapshot

Attached to every benchmark run and inference execution (`hardware_snapshot`
JSON plus a compact `hardware_fingerprint`). Fields: OS, kernel/release,
architecture, Python version, CPU vendor/model/physical/logical cores, RAM total
and available, process RSS/peak RSS, GPU list (vendor, model, count, VRAM total
and free, driver, util, device memory used), runtime backend/version, CUDA
availability, requested vs effective execution mode, collector provenance
(names/versions/durations), and per-field availability/reason.

This makes comparisons hardware-aware. Compatibility checks treat hardware
differences as warnings (not silent), while model/runtime/protocol differences
block comparison.

## 4. CPU-only behaviour

Without `psutil`, CPU/RAM values are `not_installed`; the API still starts. With
no NVIDIA GPU, GPU fields are `not_applicable`/`not_installed`; CPU inference and
all tests continue to work. `llama-cpp-python` is not in the default dependency
set; the llama.cpp adapter reports `not_installed` and runtime-dependent
endpoints return `409`/`503` with a controlled error instead of crashing.

## 5. Resource preflight

`resource_preflight(configuration, hardware, policy)` is advisory, non-fatal and
returns `status: pass|warn|fail|unknown` with per-check details:

1. Runtime-supported options: context length, threads, batch size, GPU layers
   validated against adapter capabilities and settings bounds.
2. Model file existence/size/extension (no full model load; header read only).
3. Memory estimate: only when the model file size is known. `run_preflight`
   (`app/hardware/preflight.py`) uses a coarse `file_size × 1.2` heuristic
   (`gguf-file-size-heuristic/1`) and explicitly labels it `estimated` with high
   uncertainty and its assumptions (weights ≈ file size, ~20% runtime overhead,
   KV cache **not** modelled). No file size => `unknown`.
4. Comparison against currently available RAM with the configurable safety
   margin `LATTICE_MEMORY_SAFETY_MARGIN_RATIO` (default 0.15). Thresholds are
   policy, never hardcoded hardware limits.
5. `LATTICE_PREFLIGHT_POLICY=advisory` (default) records the warning and permits
   a guarded attempt; `strict` turns an over-budget estimate or unknown runtime
   capability into `infeasible`. The policy, per-check results and reasons are
   returned to the caller.

Passing preflight is not a guarantee: actual load/inference decides, and OOM,
fallback to CPU, reduced offload and load failures are recorded on the run.

## 6. Execution mode truthfulness

Requested mode comes from the configuration (`gpu_layers` etc.). Effective mode
comes from runtime-reported information (offloaded layer count, backend device
at load/inference):

- all layers offloaded and CUDA/Metal backend -> `gpu`
- some layers offloaded -> `hybrid`
- zero layers -> `cpu`
- unavailable -> `unknown`

A GPU merely being present never implies GPU execution. Both requested and
effective modes are persisted, together with fallback/failure reasons.

## 7. Telemetry in benchmarks

`ProcessSampler` (`app/hardware/telemetry.py`) polls RSS every
`LATTICE_MEMORY_SAMPLING_INTERVAL_MS` (default 50 ms) while a request runs to
produce `peak_process_rss_mb`; `baseline_process_rss_mb` and post-run system
RAM/GPU samples are recorded separately. GPU values are device-wide point samples from
`nvidia-smi`, labelled with method and sampling time. A single post-run sample is
never called a peak.

Known limitations: sampling gaps, device-wide vs process-attributed GPU memory,
no VRAM attribution on Windows, no thermal or power telemetry, no NUMA awareness.
