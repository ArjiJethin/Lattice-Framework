# Development Workflow

This document details common development workflows, commands, and conventions for the Lattice Framework.

---

## 1. Running Development Servers

### Running Concurrently
To launch both the frontend and backend in dedicated terminal windows:
```powershell
.\scripts\dev.ps1 -Target all
```

### Running Frontend Independently
In `frontend/`:
```powershell
cd frontend
npm run dev
```
The Vite development server runs at `http://localhost:5173` with Hot Module Replacement (HMR).

To test the frontend build:
```powershell
npm run build
npm run preview
```

### Running Tauri Desktop App
In `frontend/`:
```powershell
cd frontend
npm run tauri dev
```
This runs Vite in the background and opens the Tauri native desktop window.

### Running Backend Independently
In `backend/`:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
The FastAPI interactive documentation is available at `http://127.0.0.1:8000/docs`.

---

## 2. Dependency Management

### Frontend (Node.js)
- **Adding runtime dependencies**:
  ```powershell
  cd frontend
  npm install <package-name>
  ```
- **Adding development tools**:
  ```powershell
  cd frontend
  npm install -D <package-name>
  ```
- Always commit both `frontend/package.json` and `frontend/package-lock.json`.

### Backend (Python)
- Always work inside the virtual environment (`backend/.venv`).
- **Adding new dependencies**:
  1. Add the package specification to `backend/pyproject.toml` (and `backend/requirements.txt` if pinning for non-editable installations).
  2. Install via pip:
     ```powershell
     cd backend
     .\.venv\Scripts\Activate.ps1
     pip install <package-name>
     pip freeze > requirements.txt
     ```

### Desktop Shell (Rust)
- Add dependencies to `frontend/src-tauri/Cargo.toml`.
- Update Cargo locks:
  ```powershell
  cd frontend/src-tauri
  cargo check
  ```

---

## 3. Code Quality, Linting, & Testing

### Python Linting & Formatting
We use [Ruff](https://docs.astral.sh/ruff/) for Python linting and code formatting:
```powershell
cd backend
ruff check .
ruff format .
```

### Python Automated Testing
```powershell
cd backend
pytest
```

### Frontend Typechecking
```powershell
cd frontend
npm run build
```

---

## 4. Git Conventions & Workflow

- **Branching**: Use feature branches off `main` (e.g., `feat/runtime-profiler`, `fix/fastapi-cors`).
- **Commit Messages**: Follow standard conventional commits format:
  - `feat: ...` for new capabilities.
  - `fix: ...` for bug fixes.
  - `chore: ...` for dependency bumps and environment configuration.
  - `docs: ...` for documentation updates.
  - `test: ...` for test suite additions.
- **Never commit**: Large binaries, `.env` secrets, model weights (`.gguf`, `.bin`), or virtual environment directories.
