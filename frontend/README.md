# Lattice Frontend

React 18 + TypeScript + Vite 6 web application and Tauri 2 desktop interface for the **Lattice Framework**.

---

## Quickstart

### 1. Installation

Vite and all necessary UI, 3D, and charting dependencies are defined in `package.json`. You do **not** need to install Vite globally.

```bash
# From the frontend directory:
npm install
```

### 2. Development Server

Start the local Vite dev server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be available at: **`http://localhost:5173`**

### 3. Production Build

To type-check and generate optimized production assets:

```bash
npm run build
```

This outputs static HTML, CSS, and JS chunks to the `dist/` directory.

To preview the built production bundle locally:

```bash
npm run preview
```

---

## Available Workspaces & Routes

| Route | Workspace | Description |
| :--- | :--- | :--- |
| `/overview` | **Overview Dashboard** | Real-time 3D configuration lattice canvas (Three.js), metrics strip, configuration space legend, performance trends charts, and recent experiments table. |
| `/model-lab` | **Model Lab** | 3D procedural archetype viewer (Orbital, Fractal, Lattice, Pedestal), model catalog search, quantization variant strip, and hardware compatibility checks. |
| `/optimization-lab` | **Optimization Lab** | Multi-objective Pareto frontier plotting (ECharts), interactive constraint studio, candidate distribution statistics, and solver decision inspector. |
| `/experiments` | **Experiments Suite** | Real-time iteration progress ring, token decoding telemetry, benchmark test fixtures vs live backend jobs, scatter comparison plots, and CSV/JSON export. |
| `/settings` | **Settings & Preferences** | Runtime adapter configuration (`llama.cpp`), SQLite database storage paths, hardware capabilities detection, theme preferences, and factory reset modal. |

---

## Offline / Demo Mode Resilience

The frontend includes a seamless fallback mechanism:
- When the FastAPI backend (`http://127.0.0.1:8000`) is offline, the frontend automatically runs in **Demo Mode**.
- High-fidelity pre-recorded benchmarks, realistic model catalog entries, and mock telemetry allow full evaluation of every view without running the backend.
- When the backend is started, the app automatically connects and displays live telemetry.

---

## Desktop Shell (Tauri 2)

To run the frontend inside the native Tauri 2 desktop shell (requires Rust toolchain):

```bash
npm run tauri dev
```
