<#
.SYNOPSIS
    Lattice Framework - Development Launcher Script

.DESCRIPTION
    Provides commands to launch frontend and backend development environments separately or concurrently.

.PARAMETER Target
    The environment to launch: 'frontend', 'backend', 'tauri', or 'all' (default: 'all').

.EXAMPLE
    .\scripts\dev.ps1 -Target frontend
    .\scripts\dev.ps1 -Target backend
    .\scripts\dev.ps1 -Target tauri
    .\scripts\dev.ps1 -Target all
#>

[CmdletBinding()]
param(
    [ValidateSet('frontend', 'backend', 'tauri', 'all')]
    [string]$Target = 'all'
)

$RootDir = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $RootDir "frontend"
$BackendDir = Join-Path $RootDir "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

function Start-Frontend {
    Write-Host "[Lattice] Starting Frontend (Vite dev server on http://localhost:5173)..." -ForegroundColor Cyan
    Set-Location $FrontendDir
    npm run dev
}

function Start-Backend {
    Write-Host "[Lattice] Starting Backend (FastAPI / Uvicorn on http://127.0.0.1:8000)..." -ForegroundColor Green
    Set-Location $BackendDir
    if (Test-Path $VenvPython) {
        & $VenvPython -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    } else {
        python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    }
}

function Start-Tauri {
    Write-Host "[Lattice] Starting Tauri 2 Desktop Shell..." -ForegroundColor Yellow
    Set-Location $FrontendDir
    npm run tauri dev
}

switch ($Target) {
    'frontend' {
        Start-Frontend
    }
    'backend' {
        Start-Backend
    }
    'tauri' {
        Start-Tauri
    }
    'all' {
        Write-Host "[Lattice] Launching Frontend and Backend in separate terminal windows..." -ForegroundColor Magenta
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; if (Test-Path '$VenvPython') { & '$VenvPython' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 } else { python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 }"
    }
}
