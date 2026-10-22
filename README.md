# Lattice Framework

Lattice is an optimization and experimentation framework designed for local LLM inference, benchmarking, and runtime configuration profiling.

> **Status: backend vertical slice implemented (Sections 4–6).**
> SQLite persistence, the versioned FastAPI API, bounded job orchestration, hardware-aware benchmarking, deterministic optimization decisions and test-only end-to-end verification are in place. Real llama.cpp execution is optional and has not been exercised here; UI dashboards remain future work. See [Backend/README.md](Backend/README.md) and [docs/implementation-decisions.md](docs/implementation-decisions.md).

---

## Technology Stack

### Frontend & Desktop Shell
- **Desktop Runtime**: [Tauri 2](https://v2.tauri.app/)
- **UI Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Design Primitives**: shadcn/ui prerequisites (`clsx`, `tailwind-merge`, `class-variance-authority`)
- **Visualizations**: [Apache ECharts](https://echarts.apache.org/) & `echarts-for-react`
- **Animations**: [Motion for React](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend Service
- **Runtime**: Python 3.11+ (Python 3.12 configured)
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & `pydantic-settings`
- **Testing**: [Pytest](https://docs.pytest.org/) & [HTTPX](https://www.python-httpx.org/)
- **Linter & Formatter**: [Ruff](https://docs.astral.sh/ruff/)

### Desktop Build Environment
- **Toolchain**: Rust (stable `x86_64-pc-windows-msvc`) & Cargo
- **System Requirements**: Microsoft Visual Studio C++ Build Tools & Microsoft Edge WebView2

---

## Repository Structure

```text
Lattice/
├── README.md                           # Project overview and quickstart
├── .gitignore                          # Git ignore rules across languages
├── .editorconfig                       # Coding style formatting rules
├── docs/                               # Architecture and developer documentation
│   ├── architecture.md                 # Backend layers, persistence and flows
│   ├── api.md                          # Endpoint reference and curl examples
│   ├── benchmarking.md                 # Protocol, metrics, statistics, provenance
│   ├── hardware-detection.md           # Collectors, availability states, preflight
│   ├── implementation-decisions.md     # Decisions, deviations, known limitations
│   ├── handoff.md                      # Teammate ownership and contracts
│   ├── setup-windows.md                # Windows prerequisite setup guide
│   └── development-workflow.md         # Daily development workflows and commands
│
├── Frontend/                           # React + Vite + Tauri frontend
│   ├── package.json                    # Node dependencies and scripts
│   ├── package-lock.json               # Deterministic lockfile
│   ├── index.html                      # HTML entry point
│   ├── vite.config.ts                  # Vite build and Tauri dev server config
│   ├── tsconfig.json                   # TypeScript compiler options and aliases
│   ├── tailwind.config.js              # Tailwind styling configuration
│   ├── postcss.config.js               # PostCSS plugin pipeline
│   ├── .env.example                    # Frontend environment template
│   ├── public/                         # Static assets
│   ├── src/                            # Application source
│   │   ├── main.tsx                    # React DOM mount point
│   │   ├── App.tsx                     # Root component (starter state)
│   │   ├── components/                 # Reusable UI components (reserved)
│   │   ├── pages/                      # Application route views (reserved)
│   │   ├── hooks/                      # Custom React hooks (reserved)
│   │   ├── lib/                        # Utility functions (includes shadcn cn helper)
│   │   ├── types/                      # TypeScript definitions (reserved)
│   │   └── styles/                     # Global styles and Tailwind layers
│   │
│   └── src-tauri/                      # Tauri 2 desktop shell
│       ├── Cargo.toml                  # Rust dependencies manifest
│       ├── build.rs                    # Tauri build hook
│       ├── tauri.conf.json             # Tauri 2 configuration
│       ├── capabilities/               # Security and window permissions
│       └── src/
│           └── main.rs                 # Native desktop application entry
│
├── Backend/                            # Python FastAPI service
│   ├── pyproject.toml                  # Project metadata, Ruff and Pytest configs
│   ├── requirements.txt                # CPU-only dependency listing
│   ├── .env.example                    # Environment template (all settings)
│   ├── alembic/                        # Optional explicit migrations
│   ├── scripts/smoke_fake_runtime.py   # Test-only end-to-end smoke test
│   ├── app/                            # Backend source code
│   │   ├── main.py                     # App factory, middleware, lifespan
│   │   ├── api/                        # /api/v1 routes, deps, error handlers
│   │   ├── core/                       # Settings, container, errors, validation
│   │   ├── db/                         # SQLAlchemy models and session lifecycle
│   │   ├── repositories/               # Persistence queries
│   │   ├── services/                   # Orchestration and business rules
│   │   ├── jobs/                       # Bounded in-process job manager
│   │   ├── runtime/                    # Runtime contract, llama.cpp, test fake
│   │   ├── hardware/                   # Collectors, telemetry, preflight
│   │   ├── benchmarking/               # Protocol, metrics, statistics, quality
│   │   ├── optimization/               # Pure optimizer contract + baseline
│   │   └── schemas/                    # Pydantic API schemas
│   └── tests/                          # Unit, DB, API and end-to-end tests
│
├── experiments/                        # Experiment artifacts
│   ├── workloads/                      # Benchmark input definitions
│   ├── results/                        # Raw experiment results
│   └── reports/                        # Analysis reports and summaries
│
├── models/                             # Model weights directory (.gitkeep only)
└── scripts/
    └── dev.ps1                         # PowerShell development environment launcher
```

---

## Setup Prerequisites

1. **Node.js**: v18+ (LTS v20+ or v24 recommended) with `npm`
2. **Python**: v3.11 or v3.12 with `pip`
3. **Rust Toolchain**: `rustup` with `stable-x86_64-pc-windows-msvc`
4. **C++ Build Tools**: Visual Studio Build Tools with C++ workload
5. **WebView2**: Windows 10/11 default runtime

For detailed step-by-step installation on Windows, consult [docs/setup-windows.md](docs/setup-windows.md).

---

## Quickstart

### 1. Frontend Setup
```powershell
cd Frontend
npm install
npm run build
```

### 2. Backend Setup
```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
pytest -q
```

Full backend setup, migrations and the test-only smoke test are in
[Backend/README.md](Backend/README.md).

### 3. Running Development Servers
Use the helper script from the repository root:
```powershell
# Run frontend only (http://localhost:5173)
.\scripts\dev.ps1 -Target frontend

# Run backend only (http://127.0.0.1:8000/docs)
.\scripts\dev.ps1 -Target backend

# Run both concurrently
.\scripts\dev.ps1 -Target all

# Run Tauri desktop app
.\scripts\dev.ps1 -Target tauri
```

---

## Current Phase and Limitations

- **Frontend**: Minimal buildable starter; API dashboards are not implemented yet.
- **Backend**: Persistence, configurations/workloads, bounded jobs, benchmarking,
  history/import/export, deterministic optimization and inference orchestration
  are implemented and covered by tests.
- **Models & Inference**: No model weights are packaged or downloaded. The real
  llama.cpp adapter is optional (`llama-cpp-python`) and has been exercised on a
  local CPU-only Qwen2.5-0.5B-Instruct Q4_K_M GGUF through the HTTP API; measured
  results and provenance are in `docs/backend-run.txt` section 11f. Fake-runtime
  runs are test-only and are never real model performance.
- **Not implemented**: distributed queueing, auth/TLS, GPU telemetry beyond
  NVIDIA best-effort, rich quality evaluators, adaptive research optimizers, and
  model quantization/compression. Lattice selects a configuration from measured
  evidence; it never quantizes or compresses a model, and the bundled Qwen GGUF
  is already `Q4_K_M` from upstream.

See [docs/implementation-decisions.md](docs/implementation-decisions.md) for the
full limitations list.