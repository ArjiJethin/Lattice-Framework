# Lattice Framework

Lattice is an optimization and experimentation framework designed for local LLM inference, benchmarking, and runtime configuration profiling.

> **Status: Phase 0 Completed (Project Scaffolding & Environment Setup)**  
> Application business logic, inference orchestration, UI dashboards, and optimization algorithms are scheduled for subsequent implementation phases.

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
│   ├── architecture.md                 # System boundaries and layer descriptions
│   ├── setup-windows.md                # Windows prerequisite setup guide
│   └── development-workflow.md         # Daily development workflows and commands
│
├── frontend/                           # React + Vite + Tauri frontend
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
├── backend/                            # Python FastAPI service
│   ├── pyproject.toml                  # Backend project metadata, Ruff and Pytest configs
│   ├── requirements.txt                # Pinned dependency listing
│   ├── .env.example                    # Backend environment template
│   ├── app/                            # Backend source code
│   │   ├── __init__.py                 # Package declaration
│   │   ├── main.py                     # FastAPI application entry and health check
│   │   ├── api/                        # HTTP routes and routers (reserved)
│   │   ├── core/                       # Core configuration and security (reserved)
│   │   ├── schemas/                    # Pydantic data schemas (reserved)
│   │   ├── services/                   # Business and orchestration logic (reserved)
│   │   ├── repositories/               # Storage and data persistence (reserved)
│   │   └── runtime/                    # Inference runtime bindings (reserved)
│   └── tests/                          # Backend test suite
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
cd frontend
npm install
npm run build
```

### 2. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
```

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

- **Phase**: Phase 0 (Scaffolding and Verification).
- **Frontend**: Contains minimal buildable starter code with complete styling and library prerequisites installed.
- **Backend**: Implements only a minimal server verification endpoint (`/health`).
- **Models & Inference**: No local model weights, llama.cpp bindings, or benchmark suites are packaged yet.