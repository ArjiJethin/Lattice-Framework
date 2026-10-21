# Lattice Backend

FastAPI + SQLAlchemy 2.x backend for resource- and quality-aware local LLM
experimentation. It persists configuration and workload profiles, executes
repeatable benchmarks through a runtime adapter, stores raw per-repetition
measurements with hardware/software provenance, aggregates descriptive
statistics, evaluates hard constraints, persists deterministic optimization
decisions and executes the selected configuration.

> **Honest status:** the persistence/API/benchmark/decision path is implemented
> and tested. Real llama.cpp execution is an optional adapter that is **not
> installed by default and has not been exercised in this environment**. The
> default test suite uses a clearly marked test-only fake runtime; its numbers
> are never real model performance.

---

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Python 3.11+ | Tested with CPython 3.13 on Windows |
| pip | Installs CPU-only dependencies; no GPU tooling required |
| SQLite | Bundled with Python (standard `sqlite3`) |
| Optional: `llama-cpp-python` | Real GGUF inference adapter |
| Optional: `nvidia-ml-py` | NVML GPU telemetry |
| Optional: local GGUF weights | Place under an approved model root |

The API starts, the database initializes, and the whole test suite runs on a
CPU-only machine with no model files, no GPU, and no network access.

## 2. Install (CPU-only)

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Optional extras:

```powershell
# Real GGUF inference adapter
pip install llama-cpp-python

# Optional NVML GPU telemetry
pip install nvidia-ml-py
```

No model is downloaded automatically. Put a GGUF file under `../models/` (the
default approved root) or set `LATTICE_MODEL_ROOTS` in `.env`.

## 3. Database initialization and migrations

Two equivalent paths exist:

1. **Automatic schema creation (default).** `LATTICE_AUTO_CREATE_SCHEMA=true`
   runs `Base.metadata.create_all()` at startup. It only creates missing tables
   and never drops or resets data.
2. **Explicit Alembic migrations.** Set `LATTICE_AUTO_CREATE_SCHEMA=false`, then:

```powershell
$env:LATTICE_DATABASE_URL = "sqlite:///C:/absolute/path/lattice.db"
alembic upgrade head
alembic current
```

`alembic downgrade base` exists but is destructive; never run it against a
database you want to keep. The initial migration creates all 11 tables and the
runtime enables SQLite foreign keys on every connection.

Database files live under `Backend/data/` by default and are git-ignored.

## 4. Start the API

```powershell
cd Backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI: <http://127.0.0.1:8000/openapi.json>
- Liveness: <http://127.0.0.1:8000/health> (also `/api/v1/health`)
- Readiness: <http://127.0.0.1:8000/ready> (also `/api/v1/ready`)
- Capabilities: <http://127.0.0.1:8000/api/v1/capabilities>

`/health` is liveness only. `/ready` reports database readiness separately from
optional runtime readiness; a missing runtime yields `status: ready` with
`checks.runtime.status: unavailable`, not a 503.

## 5. Test and lint

```powershell
cd Backend
.\.venv\Scripts\Activate.ps1
ruff check app tests
ruff format --check app tests
pytest -q
```

The default suite is deterministic, offline, CPU-only and does not require a
model file, GPU driver, internet, specific filesystem path or RAM size. It uses
temporary SQLite databases and the injected fake runtime.

## 6. End-to-end smoke test (test-only fake runtime)

```powershell
cd Backend
.\.venv\Scripts\Activate.ps1
python scripts/smoke_fake_runtime.py
```

This creates a temporary database and model placeholder, then exercises:
configuration -> workload -> benchmark job -> raw measurements -> optimization
decision -> decision execution -> inference -> JSONL export. It prints a
`TEST-ONLY` warning and does not touch your configured database.

To exercise the *real* adapter, install `llama-cpp-python`, set
`LATTICE_RUNTIME_ADAPTER=llamacpp`, register a GGUF configuration, and submit a
benchmark. Until that is done, `POST /api/v1/benchmarks` returns a controlled
`503 runtime_unavailable`.

An opt-in integration test runs only when both the package and a local model are
present; otherwise it skips with a reason:

```powershell
$env:LATTICE_REAL_MODEL_PATH = "C:\models\your-model.gguf"
.\.venv\Scripts\python.exe -m pytest tests/test_llamacpp_integration.py -v -s
```

It never downloads a model. The full step-by-step procedure, including the
manual API checklist and troubleshooting, is in the repository runbook at
[`../docs/backend-run.txt`](../docs/backend-run.txt).

## 7. Environment configuration

Every setting is documented with safe defaults in [`.env.example`](.env.example).
Variables use the `LATTICE_` prefix; the legacy `HOST`, `PORT`, `DEBUG`,
`ENVIRONMENT` and `CORS_ORIGINS` names are still accepted.

Defaults worth knowing:

| Setting | Default | Meaning |
| --- | --- | --- |
| `LATTICE_RUNTIME_ADAPTER` | `auto` | first installed non-test adapter |
| `LATTICE_RUNTIME_ALLOW_FAKE` | `false` | test-only adapter gate |
| `LATTICE_JOB_MAX_WORKERS` / `_MAX_PENDING` | `1` / `16` | bounded in-process queue |
| `LATTICE_BENCHMARK_DEFAULT_REPETITIONS` | `3` | research reporting recommends >= 5 |
| `LATTICE_BENCHMARK_MAX_REPETITIONS` | `20` | hard request bound |
| `LATTICE_ALLOW_OUTPUT_RETENTION` | `false` | prompts never persisted; outputs only with opt-in |
| `LATTICE_ALLOW_TEST_ONLY_OPTIMIZATION_EVIDENCE` | `false` | fake evidence cannot influence decisions by default |

## 8. Operational notes and limitations

- **Single-process job worker.** No Redis/Celery/distributed delivery. Queued
  and running rows surviving a crash are marked `interrupted` on next startup;
  queued work is not retried automatically.
- **Cancellation.** Only queued jobs can be cancelled reliably. Native inference
  cannot be preempted, so running cancellation is refused (`409`) rather than
  falsely reported as successful.
- **Sessions.** Long inference/benchmark work never holds a database session;
  each persistence step uses a short transaction.
- **Prompts.** Inference prompts are kept in process memory only. Pending
  inference jobs cannot survive a restart because their prompts are not stored.
  Generated outputs are not stored unless the server enables retention *and* the
  request asks for it.
- **Preflight.** Memory estimates are coarse and explicitly `estimated`
  (weights + ~20% overhead; KV cache not modelled). Only the actual model load
  is authoritative.
- **Fake runtime.** Test/development only. Runs are tagged `test_only`, excluded
  from research summaries/exports/comparisons by default, and rejected as
  optimization evidence unless explicitly allowed.
- **Public exposure.** This is a local research API. Do not expose it to the
  internet without authentication, TLS and rate limiting (not implemented).

Adapter contract tests use a mocked `llama_cpp` module: they prove the adapter's
logic (argument mapping, error translation, sanitisation, timeouts, cleanup), not
real model performance.

See `docs/` at the repository root for the runbook (`backend-run.txt`), the audit
(`backend-completion-audit.md`), architecture, API, benchmarking, hardware
detection, implementation decisions and teammate handoff contracts.
