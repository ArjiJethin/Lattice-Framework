# Lattice Framework

**Lattice** is an optimization and experimentation framework designed for local Large Language Model (LLM) inference, multi-objective benchmarking, and runtime configuration profiling.

It couples a high-performance **FastAPI + SQLAlchemy** backend engine with a rich, interactive **React 18 + Vite** frontend (deployable as both a web application and a native **Tauri 2** desktop app), featuring interactive 3D topology visualization, live telemetry, and Pareto-optimal solver analytics.

---

## Architecture & Workspaces

Lattice is structured around 5 comprehensive interactive workspaces:

1. **Overview Dashboard (`/overview`)**
   - **Interactive 3D Lattice Canvas**: Real-time configuration topology visualization rendered with Three.js and React Three Fiber, showing candidate nodes, connecting bridges, and foundation planes.
   - **Compact Metrics Strip**: Hardware-aware real-time telemetry (active device, memory ceiling, best throughput, and Pareto candidate count).
   - **Configuration Space Legend & Filter**: Dynamic toggles for candidate categories (Pareto Frontier, Dominated, Infeasible, Evaluated).
   - **Performance Trends Chart**: ECharts scatter and trend regression visualizing latency vs. throughput trade-offs.
   - **Recent Experiments Table & Candidate Inspector**: Drilldown modal for inspection of quantization levels, context lengths, and VRAM footprints.

2. **Model Lab (`/model-lab`)**
   - **Procedural 3D Model Archetypes**: 3D geometric entities representing different model families (`Orbital`, `Fractal`, `Lattice`, `Pedestal`).
   - **Catalog Browser**: Search, filter, and inspect local and catalog model families (Qwen, Llama, DeepSeek, Mistral, Gemma, Phi).
   - **Quantization Variant Strip**: Interactive selection across quantization formats (`Q4_K_M`, `Q5_K_M`, `Q8_0`, `FP16`, `AWQ`, `GGUF`).
   - **Hardware Compatibility Matrix**: Automatic VRAM and system memory sizing checks against detected hardware.
   - **Configuration Comparison Dialog**: Side-by-side comparison of memory footprints, parameter sizes, and expected tokens/sec.

3. **Optimization Lab (`/optimization-lab`)**
   - **Multi-Objective Pareto Plot**: Interactive 2D trade-off scatter plot with interactive frontier curve overlay and candidate inspection.
   - **Constraint Studio**: Live slider-based constraint tuning for Latency (TTFT), Peak Memory (VRAM), Throughput, and Minimum Quality Score.
   - **Statistical Distributions**: Descriptive statistics (Mean, Median, P95, Standard Deviation) across feasible and infeasible configurations.
   - **Optimization Results Inspector**: Solver recommendations, constraint satisfaction breakdown, and direct handoff to live experiment validation.

4. **Experiments Suite (`/experiments`)**
   - **Live Telemetry & Iteration Gauge**: Real-time progress ring, decoding tokens counter, current latency, and memory footprint.
   - **Benchmark Configuration Form**: Workload types (General, Code, Chat, Summarization), prompt datasets, repetition counts, and decoding parameters (temperature, top_p, top_k).
   - **Live Execution Logs**: Timestamped streaming event logs with filtering and export.
   - **Results & Deep-Dive Comparison**: Statistical comparison tables (Mean ± Std Dev) comparing baseline fixed quantization against Lattice's adaptive dynamic selection.
   - **Data Export**: One-click results export in CSV and JSON formats.

5. **Settings & Preferences (`/settings`)**
   - **Inference Runtime Adapter**: Configure runtime providers (`llama.cpp`, vLLM, Fake Test Adapter), context lengths, and CPU thread allocations.
   - **API & Backend Connectivity**: Live endpoint status check, custom base URL configuration, and retry intervals.
   - **Data Storage Paths**: Configurable directories for models (`/models`), experiment artifacts (`/experiments`), and SQLite database files.
   - **Appearance & System Information**: Detected hardware profile (CPU, GPU, RAM, OS platform), theme selection, and factory reset modal.

> **Resilient Demo Mode**: If the backend is not running, the frontend automatically activates **Demo Mode**, supplying high-fidelity benchmark fixtures and mock telemetry so the entire interface can be tested immediately with zero configuration. Once the backend is online, the app seamlessly connects to live endpoints.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Frontend Build Tool** | [Vite 6](https://vitejs.dev/) |
| **3D Graphics & Canvas** | [Three.js](https://threejs.org/) + [@react-three/fiber](https://r3f.docs.pmnd.rs/) + [@react-three/drei](https://github.com/pmndrs/drei) |
| **Data Visualizations** | [Apache ECharts](https://echarts.apache.org/) + `echarts-for-react` |
| **Styling & UI Primitives** | [Tailwind CSS](https://tailwindcss.com/) + Custom Design Tokens + [Lucide React](https://lucide.dev/) |
| **Desktop Shell** | [Tauri 2](https://v2.tauri.app/) (Rust-based lightweight desktop wrapper) |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) (ASGI server) |
| **Persistence & ORM** | [SQLAlchemy 2.x](https://www.sqlalchemy.org/) + [SQLite](https://sqlite.org/) + [Alembic](https://alembic.sqlalchemy.org/) |
| **Data Validation** | [Pydantic v2](https://docs.pydantic.dev/) + `pydantic-settings` |
| **Testing & Quality** | [Pytest](https://docs.pytest.org/), [HTTPX](https://www.python-httpx.org/), [Ruff](https://docs.astral.sh/ruff/) |

---

## System Prerequisites

Before getting started, ensure you have the following installed on your machine:

1. **Node.js**: `v18.0.0` or higher (`v20+ LTS` or `v22` recommended). Includes `npm`.
   - Check with: `node --version` and `npm --version`
2. **Python**: `v3.11` or `v3.12` with `pip`.
   - Check with: `python --version` (or `python3 --version`)
3. **Git**: Required for cloning and submodule management.
4. *(Optional — Only for Tauri Desktop build)*:
   - **Rust Toolchain**: `rustup` with `stable-x86_64-pc-windows-msvc` (or macOS/Linux equivalent).
   - **C++ Build Tools**: Microsoft C++ Build Tools (Windows) or `build-essential` (Linux).
   - **WebView2**: Built into Windows 10/11.

---

## Step-by-Step Installation & Quickstart

### 1. Clone the Repository

```bash
git clone https://github.com/ArjiJethin/Lattice-Framework.git
cd Lattice-Framework
```

---

### 2. Frontend Setup (Installing Vite & Dependencies)

> **Where is Vite installed?**
> Vite is configured locally as a developer dependency inside `frontend/package.json`. **You do NOT need to install Vite globally.** Running `npm install` inside the `frontend` folder automatically downloads and installs Vite and all required UI, 3D, and charting dependencies into `frontend/node_modules/`.

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (installs Vite, React, Three.js, ECharts, Tailwind CSS)
npm install

# 3. Start the Vite development server
npm run dev
```

The frontend will start instantly and output the local development URL:
- **Local Application URL**: **`http://localhost:5173`**
- Press `h` in the terminal for Vite shortcuts, or `q` to quit.

#### Available Frontend Scripts:
- `npm run dev`: Starts the local Vite development server with Hot Module Replacement (HMR).
- `npm run build`: Runs TypeScript compiler (`tsc -b`) and bundles production assets with Vite into `frontend/dist/`.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs ESLint over all TypeScript and React files.

---

### 3. Backend Setup (FastAPI & Python Environment)

The backend service handles hardware profiling, SQLite persistence, and runtime inference benchmarking.

```bash
# 1. Open a new terminal and navigate to the Backend directory
cd Backend

# 2. Create a Python virtual environment
# Windows:
python -m venv .venv
# macOS/Linux:
python3 -m venv .venv

# 3. Activate the virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.\.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

# 4. Upgrade pip and install backend requirements
pip install --upgrade pip
pip install -r requirements.txt

# 5. Create your local environment configuration file
# Windows (PowerShell):
Copy-Item .env.example .env
# macOS/Linux:
cp .env.example .env

# 6. (Optional) Run the automated test suite to verify installation
pytest -q

# 7. Start the FastAPI backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once started, the backend is accessible at:
- **Interactive Swagger Documentation**: **`http://127.0.0.1:8000/docs`**
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`
- **Health / Liveness Probe**: `http://127.0.0.1:8000/health`
- **Readiness Probe**: `http://127.0.0.1:8000/ready`
- **Hardware Capabilities Endpoint**: `http://127.0.0.1:8000/api/v1/capabilities`

---

### 4. Optional: Real GGUF Model Inference (`llama.cpp`)

By default, the backend includes an offline mock/fake runtime allowing tests and development without downloading large weights. To execute real local LLM inference against GGUF models:

1. **Install `llama-cpp-python`**:
   ```bash
   # CPU-only (standard):
   pip install llama-cpp-python

   # Or with NVIDIA CUDA acceleration (requires CUDA Toolkit):
   # $env:CMAKE_ARGS="-DGGML_CUDA=on"
   # pip install llama-cpp-python --force-reinstall --no-cache-dir
   ```

2. **Place GGUF Model Files**:
   Download any compatible `.gguf` file (e.g., `Qwen2.5-0.5B-Instruct-Q4_K_M.gguf` or `Llama-3.2-1B-Instruct-Q4_K_M.gguf`) and place it inside the `models/` directory:
   ```text
   Lattice/
   └── models/
       └── Qwen2.5-0.5B-Instruct-Q4_K_M.gguf
   ```

3. Configure runtime path in `Backend/.env`:
   ```dotenv
   LATTICE_MODEL_ROOTS=["../models"]
   LATTICE_DEFAULT_RUNTIME=llama_cpp
   ```

---

### 5. Running the Complete Stack Concurrently

You can run both the frontend and backend using the provided PowerShell helper script from the repository root:

```powershell
# Run both Frontend (port 5173) and Backend (port 8000) concurrently:
.\scripts\dev.ps1 -Target all

# Or run individual components:
.\scripts\dev.ps1 -Target frontend
.\scripts\dev.ps1 -Target backend

# Or launch the native Tauri 2 desktop shell:
.\scripts\dev.ps1 -Target tauri
```

---

## Repository Directory Layout

```text
Lattice/
├── README.md                           # Main documentation & quickstart guide
├── .gitignore                          # Root Git ignore rules
├── docs/                               # Architectural specifications & documentation
│   ├── architecture.md                 # System layers, persistence, and data flow
│   ├── api.md                          # Endpoint specifications and curl examples
│   ├── benchmarking.md                 # Hardware measurement & statistical protocol
│   ├── hardware-detection.md           # System hardware profiling collectors
│   ├── implementation-decisions.md     # Architecture decisions and boundaries
│   └── setup-windows.md                # Comprehensive Windows setup reference
│
├── frontend/                           # React 18 + Vite 6 + Tailwind + Three.js application
│   ├── package.json                    # Frontend dependencies & npm scripts (Vite, React, 3D)
│   ├── vite.config.ts                  # Vite build configuration & local proxy settings
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── tailwind.config.js              # Custom design system tokens & colors
│   ├── index.html                      # HTML root template
│   ├── src/
│   │   ├── main.tsx                    # Application bootstrap & DOM mount
│   │   ├── App.tsx                     # Main layout shell, routing & state container
│   │   ├── components/
│   │   │   ├── layout/                 # Shared Header, Sidebar, and Navigation
│   │   │   ├── ui/                     # Primitives (Button, Select, Input, Badges, Tabs)
│   │   │   ├── lattice3d/              # Three.js 3D Lattice Canvas & Node Visualization
│   │   │   ├── model-entities/         # 3D Model Archetypes (Orbital, Fractal, Lattice)
│   │   │   ├── overview/               # Overview page cards, charts, and tables
│   │   │   ├── model-library/          # Model catalog, variant strip, compatibility
│   │   │   ├── optimization-lab/       # Pareto chart, constraint studio, solver inspectors
│   │   │   ├── experiments/            # Benchmark form, live progress ring, comparison table
│   │   │   └── settings/               # Preferences cards, system info, reset modal
│   │   ├── pages/                      # Page components (Overview, ModelLab, Optimization, Experiments, Settings)
│   │   ├── lib/                        # API clients, demo datasets, utility helpers
│   │   ├── hooks/                      # Custom React hooks (useModelLibrary)
│   │   └── types/                      # TypeScript definitions across domains
│   └── src-tauri/                      # Tauri 2 native desktop configuration & Rust backend
│
├── Backend/                            # FastAPI + SQLAlchemy Python service
│   ├── pyproject.toml                  # Python package configuration and tool metadata
│   ├── requirements.txt                # Python dependencies (FastAPI, Uvicorn, SQLAlchemy)
│   ├── .env.example                    # Backend environment variable template
│   ├── app/
│   │   ├── main.py                     # FastAPI application factory and lifecycle
│   │   ├── api/                        # Versioned API routes (/api/v1/*)
│   │   ├── core/                       # Configuration settings, dependency container
│   │   ├── db/                         # SQLAlchemy database models & session management
│   │   ├── hardware/                   # System and GPU telemetry collectors
│   │   ├── runtime/                    # Inference runtime adapters (llama.cpp, fake test)
│   │   ├── benchmarking/               # Benchmark job executor and metrics aggregators
│   │   └── optimization/               # Multi-objective Pareto frontier solver
│   └── tests/                          # Backend unit, integration, and API tests
│
├── models/                             # Approved local model directory for GGUF weights
│   ├── .gitkeep
│   ├── frontend_source_code_part1.txt  # Clean frontend export (Part 1 of 2: 56 files)
│   └── frontend_source_code_part2.txt  # Clean frontend export (Part 2 of 2: 33 files)
│
└── scripts/
    └── dev.ps1                         # PowerShell development environment launcher
```

---

## Troubleshooting & FAQ

### 1. PowerShell Script Execution Policy (`Activate.ps1` error)
If running `.\.venv\Scripts\Activate.ps1` produces a script execution error on Windows:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```
Then run the activation command again.

### 2. Port Conflicts
- **Frontend (Port 5173)**: If port 5173 is already in use, Vite will automatically select the next available port (e.g. `5174`), or you can specify a custom port:
  ```bash
  npm run dev -- --port 3000
  ```
- **Backend (Port 8000)**: To run the backend on a different port:
  ```bash
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
  ```
  *(Remember to update the API Base URL in the Settings workspace if changing the backend port)*.

### 3. WebGL / 3D Canvas Performance
The 3D canvases use hardware-accelerated WebGL through Three.js. Ensure hardware acceleration is enabled in your browser settings (Chrome: `Settings -> System -> Use graphics acceleration when available`).

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.