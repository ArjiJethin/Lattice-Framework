# Windows Environment Setup Guide

This guide details the setup prerequisites and environment configuration required to build and run the Lattice Framework on Windows.

---

## 1. Prerequisites Checklist

| Component | Minimum Version | Recommended | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | v18.0.0 | v20.x or v24.x | `node -v` |
| **npm** | 9.0.0 | 10.x or 11.x | `npm -v` |
| **Python** | 3.11 | 3.12.x | `python --version` |
| **Rust Toolchain** | stable | stable 1.84+ | `rustc --version` |
| **Cargo** | stable | stable 1.84+ | `cargo --version` |
| **Visual Studio C++ Build Tools** | 2019 / 2022 | 2022 Community / Build Tools | `cl.exe` (in developer prompt) |
| **Microsoft Edge WebView2** | Evergreen | Installed by default on Win 10/11 | Registry / Edge settings |

---

## 2. Installation Instructions via Windows Package Manager (`winget`)

### Python 3.12
```powershell
winget install -e --id Python.Python.3.12 --scope user
```
Ensure `Add Python to PATH` is enabled. You can verify by running:
```powershell
python --version
```

### Rust & Cargo
Install Rustup:
```powershell
winget install -e --id Rustlang.Rustup
```
Ensure default toolchain is installed:
```powershell
rustup default stable
rustc --version
cargo --version
```

### Visual Studio C++ Build Tools
Tauri requires the MSVC toolchain to build native Windows binaries:
```powershell
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools;includeRecommended"
```
During installation, ensure the **Desktop development with C++** workload is selected, specifically:
- MSVC v143 - VS 2022 C++ x64/x86 build tools
- Windows 10/11 SDK

### Node.js (if not installed)
```powershell
winget install -e --id OpenJS.NodeJS.LTS
```

---

## 3. Environment Verification Commands

Run this sequence in PowerShell to verify all required binaries are in your path:

```powershell
Write-Host "Node:   " (node -v)
Write-Host "NPM:    " (npm -v)
Write-Host "Python: " (python --version)
Write-Host "Rustc:  " (rustc --version)
Write-Host "Cargo:  " (cargo --version)
```

---

## 4. Common Setup Issues and Troubleshooting

### 1. PowerShell Script Execution Policy
**Symptom**: `File ... Activate.ps1 cannot be loaded because running scripts is disabled on this system.`  
**Resolution**: Run in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Path Environment Refresh
**Symptom**: `rustc` or `python` is not recognized immediately after running winget or installers.  
**Resolution**: Restart your terminal or reload environment variables in PowerShell:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 3. Missing MSVC Linker (`link.exe not found`)
**Symptom**: Cargo fails with `error: linker link.exe not found`.  
**Resolution**: Ensure Visual Studio Build Tools has the C++ workload installed. If already installed, launch your terminal from **x64 Native Tools Command Prompt for VS 2022** or ensure MSVC bin directories are present in `PATH`.

### 4. WebView2 Runtime Missing
**Symptom**: Tauri application compiles but fails to open a window.  
**Resolution**: Download and install the evergreen bootstrapper from [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
