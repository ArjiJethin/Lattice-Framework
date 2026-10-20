# Lattice Framework Architecture

This document outlines the high-level system boundaries and directory architecture planned for the Lattice Framework.

---

## 1. System Separation & Boundaries

The Lattice Framework separates concerns across three primary components:

```text
┌────────────────────────────────────────────────────────┐
│               Frontend Desktop Application             │
│            (React + TypeScript + Vite + Tauri 2)       │
│                                                        │
│  - User Interface & Visualization Dashboards           │
│  - ECharts Metrics Visualizations                      │
│  - Native Windows Window Management (Tauri Shell)      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / WebSocket Communication
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend API Service                  │
│                (FastAPI + Python 3.12)                 │
│                                                        │
│  - Experiment Scheduling & Workload Dispatch           │
│  - Metric Aggregation & Optimization Engines           │
│  - Persistence & Report Generation                     │
└───────────────────────────┬────────────────────────────┘
                            │ Process / C-FFI Bindings
                            ▼
┌────────────────────────────────────────────────────────┐
│               Local Inference Runtime                  │
│         (llama.cpp / Native LLM Execution Engine)      │
│                     (Planned)                          │
│                                                        │
│  - GGUF Quantized Model Execution                      │
│  - Memory, Compute, & Context Window Profiling         │
└────────────────────────────────────────────────────────┘
```

### Desktop Shell & Frontend (`frontend/`)
- Encapsulates the UI presentation layer using React 18, Vite, and Tailwind CSS.
- Integrates Apache ECharts via `echarts-for-react` for rendering metrics and execution profiles.
- Wrapped by Tauri 2 (`frontend/src-tauri`), which provides a native lightweight desktop window container on Windows without the overhead of Chromium.

### Backend Application Service (`backend/`)
- Implemented as a high-performance Python asynchronous service using FastAPI and Uvicorn.
- Coordinates experiments, manages configuration schemas via Pydantic, and handles data validation.
- Decoupled from the desktop frontend via a standardized REST API interface, enabling both embedded execution and headless/remote deployment modes.

### Local Inference Engine (`models/` & `backend/app/runtime/`)
- Dedicated layer for interfacing with local LLMs (e.g., llama.cpp / GGUF model formats).
- Models reside outside Git version control in `models/`.
- During Phase 0, this runtime layer remains empty and uninstantiated.

---

## 2. Directory Responsibilities

| Directory | Purpose |
| :--- | :--- |
| `frontend/` | Web frontend and Tauri 2 native desktop shell codebases. |
| `frontend/src/components/` | Reusable UI design system and atomic components. |
| `frontend/src/pages/` | Main application view pages (experiments, metrics, settings). |
| `frontend/src/hooks/` | Custom stateful React hooks for API queries and state. |
| `frontend/src/lib/` | Shared utilities, formatting helpers, and class mergers. |
| `frontend/src/types/` | TypeScript interfaces and type definitions matching backend schemas. |
| `frontend/src/styles/` | Global CSS styling, Tailwind configuration, and CSS variables. |
| `frontend/src-tauri/` | Rust source, configuration, and capabilities for the Tauri desktop shell. |
| `backend/` | Python FastAPI backend application, dependencies, and tests. |
| `backend/app/api/` | HTTP routers and endpoint handlers. |
| `backend/app/core/` | Application configuration, environment settings, and logging. |
| `backend/app/schemas/` | Pydantic validation models for input/output payloads. |
| `backend/app/services/` | Business logic, optimization algorithms, and benchmark orchestrators. |
| `backend/app/repositories/`| Database access and persistence layers. |
| `backend/app/runtime/` | Inference engine adapters and execution bindings. |
| `backend/tests/` | Unit and integration tests for API endpoints and algorithms. |
| `experiments/` | Storage for experiment workloads, raw benchmark results, and output reports. |
| `models/` | Local directory reserved for model weights and GGUF checkpoints (Git-ignored). |
| `scripts/` | Automation and development convenience scripts. |
| `docs/` | System architecture, setup instructions, and developer documentation. |
