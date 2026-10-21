"""Best-effort hardware collectors.

Rules:
* imports of optional dependencies are guarded; absence is a *status*, not an
  exception;
* every collector is independently testable and never raises to the caller;
* GPU telemetry is optional (NVML first, ``nvidia-smi`` fallback).  No GPU
  vendor is required for startup, inference on CPU, or the test suite.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from dataclasses import dataclass
from typing import Any

from app.core.enums import AvailabilityStatus
from app.core.logging import get_logger
from app.hardware.types import (
    HardwareReading,
    available,
    not_detected,
    not_installed,
    unavailable,
)

logger = get_logger(__name__)

try:  # pragma: no cover - import depends on host
    import psutil

    _PSUTIL_VERSION = psutil.__version__
except Exception:  # pragma: no cover
    psutil = None  # type: ignore[assignment]
    _PSUTIL_VERSION = None


def _mb(value_bytes: float) -> float:
    return round(float(value_bytes) / (1024.0 * 1024.0), 3)


@dataclass
class SystemCollector:
    name: str = "system"
    version: str = "1.0.0"

    def collect(self) -> dict[str, HardwareReading]:
        method = "python:platform"
        uname = platform.uname()
        return {
            "os": available(uname.system or sys.platform, method=method),
            "os_release": available(uname.release, method=method),
            "os_version": available(uname.version, method=method),
            "architecture": available(uname.machine, method=method),
            "python_version": available(platform.python_version(), method="python:sys"),
            "python_implementation": available(
                platform.python_implementation(), method="python:sys"
            ),
            "hostname_kind": available("redacted", method="privacy:hostname-not-collected"),
        }


@dataclass
class CPUCollector:
    name: str = "cpu"
    version: str = "1.0.0"

    def collect(self) -> dict[str, HardwareReading]:
        method = "psutil" if psutil is not None else "python:platform"
        result: dict[str, HardwareReading] = {}
        model = platform.processor() or platform.uname().processor or ""
        if model:
            result["model"] = available(model, method="python:platform")
        else:
            result["model"] = unavailable(
                AvailabilityStatus.UNSUPPORTED,
                "platform does not expose a CPU model string",
                method="python:platform",
            )
        if psutil is not None:
            logical = psutil.cpu_count(logical=True)
            physical = psutil.cpu_count(logical=False)
            result["logical_cores"] = (
                available(logical, method="psutil.cpu_count(logical=True)")
                if logical
                else unavailable(
                    AvailabilityStatus.UNSUPPORTED, "logical core count unavailable", method=method
                )
            )
            result["physical_cores"] = (
                available(physical, method="psutil.cpu_count(logical=False)")
                if physical
                else unavailable(
                    AvailabilityStatus.UNSUPPORTED,
                    "physical core count unavailable on this platform",
                    method=method,
                )
            )
        else:
            result["logical_cores"] = (
                available(os.cpu_count(), method="os.cpu_count")
                if os.cpu_count()
                else not_installed("psutil is not installed", method=method)
            )
            result["physical_cores"] = not_installed(
                "psutil is required for physical core detection", method=method
            )
        return result


@dataclass
class MemoryCollector:
    name: str = "memory"
    version: str = "1.0.0"

    def collect(self) -> dict[str, HardwareReading]:
        result: dict[str, HardwareReading] = {}
        if psutil is None:
            result["total_mb"] = not_installed("psutil is not installed", method="psutil")
            result["available_mb"] = not_installed("psutil is not installed", method="psutil")
            result["process_rss_mb"] = not_installed("psutil is not installed", method="psutil")
            return result
        try:
            virtual = psutil.virtual_memory()
            result["total_mb"] = available(
                _mb(virtual.total), unit="MB", method="psutil.virtual_memory().total"
            )
            result["available_mb"] = available(
                _mb(virtual.available),
                unit="MB",
                method="psutil.virtual_memory().available",
            )
            result["used_mb"] = available(
                _mb(virtual.used), unit="MB", method="psutil.virtual_memory().used"
            )
        except Exception as exc:
            for key in ("total_mb", "available_mb", "used_mb"):
                result[key] = unavailable(
                    AvailabilityStatus.COLLECTION_ERROR,
                    f"system memory collection failed ({exc.__class__.__name__})",
                    method="psutil",
                )
        try:
            process = psutil.Process()
            info = process.memory_info()
            result["process_rss_mb"] = available(
                _mb(info.rss), unit="MB", method="psutil.Process().memory_info().rss.point_sample"
            )
            peak = getattr(info, "peak_wset", None)
            if peak is not None:
                result["process_peak_rss_mb"] = available(
                    _mb(peak),
                    unit="MB",
                    method="psutil.Process().memory_info().peak_wset",
                )
            else:
                result["process_peak_rss_mb"] = unavailable(
                    AvailabilityStatus.NOT_APPLICABLE,
                    "platform does not report a peak working set; use the run sampler",
                    method="psutil",
                )
        except Exception as exc:
            result["process_rss_mb"] = unavailable(
                AvailabilityStatus.COLLECTION_ERROR,
                f"process memory collection failed ({exc.__class__.__name__})",
                method="psutil",
            )
        result["psutil_version"] = available(_PSUTIL_VERSION or "unknown", method="importlib")
        return result


def _gpu_readings_from_nvml() -> tuple[list[dict[str, Any]], HardwareReading]:
    """Return per-device readings plus a device-count reading."""
    try:  # pragma: no cover - depends on host
        import pynvml
    except Exception:
        return [], not_installed(
            "nvidia-ml-py (pynvml) is not installed; install the optional 'gpu' extra",
            method="import:pynvml",
        )

    method = "pynvml"
    try:
        version_text: str | None = str(pynvml.nvmlSystemGetDriverVersion())
    except Exception:
        version_text = None
    try:
        pynvml.nvmlInit()
    except Exception as exc:  # pragma: no cover
        name = exc.__class__.__name__
        if "NoPermission" in name or "Permission" in name:
            return [], unavailable(
                AvailabilityStatus.PERMISSION_DENIED,
                "NVML permission denied",
                method=method,
            )
        if "DriverNotLoaded" in name or "LibraryNotFound" in name:
            return [], not_detected("NVML driver/library not available", method=method)
        return [], unavailable(
            AvailabilityStatus.TEMPORARILY_UNAVAILABLE,
            f"NVML initialisation failed ({name})",
            method=method,
        )
    devices: list[dict[str, Any]] = []
    try:
        count = pynvml.nvmlDeviceGetCount()
        for index in range(count):
            handle = pynvml.nvmlDeviceGetHandleByIndex(index)
            entry: dict[str, Any] = {"index": index}
            try:
                name = pynvml.nvmlDeviceGetName(handle)
                entry["model"] = available(
                    name.decode() if isinstance(name, bytes) else str(name),
                    method="pynvml.nvmlDeviceGetName",
                    source_version=version_text,
                )
            except Exception:
                entry["model"] = unavailable(
                    AvailabilityStatus.COLLECTION_ERROR,
                    "device name unavailable",
                    method=method,
                )
            try:
                memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                entry["memory_total_mb"] = available(
                    _mb(memory.total), unit="MB", method="pynvml.nvmlDeviceGetMemoryInfo"
                )
                entry["memory_free_mb"] = available(
                    _mb(memory.free), unit="MB", method="pynvml.nvmlDeviceGetMemoryInfo"
                )
                entry["memory_used_mb"] = available(
                    _mb(memory.used), unit="MB", method="pynvml.nvmlDeviceGetMemoryInfo"
                )
            except Exception as exc:
                for key in ("memory_total_mb", "memory_free_mb", "memory_used_mb"):
                    entry[key] = unavailable(
                        AvailabilityStatus.COLLECTION_ERROR,
                        f"VRAM query failed ({exc.__class__.__name__})",
                        method=method,
                    )
            try:
                utilisation = pynvml.nvmlDeviceGetUtilizationRates(handle)
                entry["utilization_pct"] = available(
                    float(utilisation.gpu),
                    unit="percent",
                    method="pynvml.nvmlDeviceGetUtilizationRates",
                )
            except Exception:
                entry["utilization_pct"] = unavailable(
                    AvailabilityStatus.COLLECTION_ERROR,
                    "GPU utilisation unavailable",
                    method=method,
                )
            entry["process_memory_mb"] = _process_gpu_memory(pynvml, handle, method)
            devices.append(entry)
        return devices, available(
            count, method="pynvml.nvmlDeviceGetCount", source_version=version_text
        )
    except Exception as exc:  # pragma: no cover
        return devices, unavailable(
            AvailabilityStatus.TEMPORARILY_UNAVAILABLE,
            f"NVML device enumeration failed ({exc.__class__.__name__})",
            method=method,
        )
    finally:
        try:
            pynvml.nvmlShutdown()
        except Exception:
            pass


def _process_gpu_memory(pynvml: Any, handle: Any, method: str) -> HardwareReading:
    """Process-attributed VRAM is often unavailable; never substitute device totals."""
    try:
        import os as _os

        pid = _os.getpid()
        processes = pynvml.nvmlDeviceGetComputeRunningProcesses(handle)
        total = 0
        found = False
        for process in processes:
            if getattr(process, "pid", None) == pid:
                used = getattr(process, "usedGpuMemory", None)
                if used is None or int(used) < 0:
                    return unavailable(
                        AvailabilityStatus.PERMISSION_DENIED,
                        "process VRAM usage is not permitted on this platform",
                        method=f"{method}.nvmlDeviceGetComputeRunningProcesses",
                    )
                total += int(used)
                found = True
        if not found:
            return available(
                0.0, unit="MB", method=f"{method}.nvmlDeviceGetComputeRunningProcesses"
            )
        return available(
            _mb(total), unit="MB", method=f"{method}.nvmlDeviceGetComputeRunningProcesses"
        )
    except Exception as exc:
        return unavailable(
            AvailabilityStatus.PERMISSION_DENIED,
            f"process VRAM usage unavailable ({exc.__class__.__name__})",
            method=f"{method}.nvmlDeviceGetComputeRunningProcesses",
        )


def _gpu_readings_from_smi(timeout_seconds: float) -> tuple[list[dict[str, Any]], HardwareReading]:
    executable = shutil.which("nvidia-smi")
    if not executable:
        return [], not_detected("nvidia-smi is not on PATH", method="shutil.which")
    query = "name,memory.total,memory.used,memory.free,utilization.gpu"
    command = [executable, "--query-gpu=" + query, "--format=csv,noheader,nounits"]
    try:
        completed = subprocess.run(  # noqa: S603 - explicit argv, no shell
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
            shell=False,
        )
    except subprocess.TimeoutExpired:
        return [], unavailable(
            AvailabilityStatus.TEMPORARILY_UNAVAILABLE,
            "nvidia-smi timed out",
            method="nvidia-smi",
        )
    except Exception as exc:  # pragma: no cover
        return [], unavailable(
            AvailabilityStatus.COLLECTION_ERROR,
            f"nvidia-smi invocation failed ({exc.__class__.__name__})",
            method="nvidia-smi",
        )
    if completed.returncode != 0:
        stderr = (completed.stderr or "").lower()
        if "permission" in stderr:
            return [], unavailable(
                AvailabilityStatus.PERMISSION_DENIED,
                "nvidia-smi permission denied",
                method="nvidia-smi",
            )
        return [], unavailable(
            AvailabilityStatus.TEMPORARILY_UNAVAILABLE,
            f"nvidia-smi exited with code {completed.returncode}",
            method="nvidia-smi",
        )
    devices: list[dict[str, Any]] = []
    for index, line in enumerate((completed.stdout or "").strip().splitlines()):
        parts = [part.strip() for part in line.split(",")]
        if len(parts) < 5:
            continue
        try:
            devices.append(
                {
                    "index": index,
                    "model": available(parts[0], method="nvidia-smi"),
                    "memory_total_mb": available(float(parts[1]), unit="MB", method="nvidia-smi"),
                    "memory_used_mb": available(float(parts[2]), unit="MB", method="nvidia-smi"),
                    "memory_free_mb": available(float(parts[3]), unit="MB", method="nvidia-smi"),
                    "utilization_pct": available(
                        float(parts[4]), unit="percent", method="nvidia-smi"
                    ),
                    "process_memory_mb": unavailable(
                        AvailabilityStatus.NOT_APPLICABLE,
                        "nvidia-smi device-wide query cannot attribute VRAM to a process",
                        method="nvidia-smi",
                    ),
                }
            )
        except ValueError:
            continue
    if not devices:
        return [], unavailable(
            AvailabilityStatus.COLLECTION_ERROR,
            "nvidia-smi returned no parsable devices",
            method="nvidia-smi",
        )
    return devices, available(len(devices), method="nvidia-smi")


@dataclass
class GPUCollector:
    name: str = "gpu"
    version: str = "1.0.0"
    enabled: bool = True
    timeout_seconds: float = 2.0

    def collect(self) -> tuple[list[dict[str, Any]], HardwareReading, list[str]]:
        if not self.enabled:
            return (
                [],
                unavailable(
                    AvailabilityStatus.NOT_APPLICABLE,
                    "GPU telemetry disabled by configuration",
                    method="settings",
                ),
                ["gpu_telemetry_disabled"],
            )
        devices, count = _gpu_readings_from_nvml()
        limitations: list[str] = []
        if devices:
            return devices, count, limitations
        fallback_devices, fallback_count = _gpu_readings_from_smi(self.timeout_seconds)
        if fallback_devices:
            limitations.append(
                "GPU metrics collected with nvidia-smi device-wide queries; per-process VRAM "
                "is not available"
            )
            return fallback_devices, fallback_count, limitations
        # Preserve NVML's more specific status when it explained the absence.
        status = count
        if status.status == AvailabilityStatus.AVAILABLE:
            status = unavailable(
                AvailabilityStatus.NOT_DETECTED,
                "no supported GPU telemetry collector detected",
                method="gpu",
            )
        return [], status, limitations


def gpu_presence(devices: list[dict[str, Any]], count: HardwareReading) -> bool:
    return bool(devices) and count.status == AvailabilityStatus.AVAILABLE
