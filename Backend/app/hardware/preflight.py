"""Advisory preflight resource checks.

Preflight is never authoritative: only an actual model load can prove that a
configuration fits.  When a defensible estimate is impossible the result is
``unknown`` and the configured policy decides whether a guarded attempt is
allowed (``advisory``, the default) or rejected (``strict``).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.core.settings import Settings
from app.core.time import utc_iso, utcnow


def _reading(snapshot: dict[str, Any], section: str, field: str) -> dict[str, Any] | None:
    value = snapshot.get(section, {}).get(field)
    return value if isinstance(value, dict) else None


def _check(
    name: str,
    status: str,
    detail: str,
    *,
    method: str | None = None,
    value: float | int | str | bool | None = None,
) -> dict[str, Any]:
    return {"name": name, "status": status, "detail": detail, "method": method, "value": value}


def run_preflight(
    *,
    settings: Settings,
    configuration: dict[str, Any],
    model_path: Path,
    runtime_capabilities: dict[str, Any],
    hardware_snapshot: dict[str, Any],
) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    warnings: list[str] = []
    hard_failure = False

    # 1. Model file presence and size (stat only; never loads the model).
    file_size_bytes: int | None = None
    try:
        if model_path.is_file():
            file_size_bytes = model_path.stat().st_size
            checks.append(
                _check(
                    "model_file_exists",
                    "pass",
                    "model file is present",
                    method="pathlib.stat",
                    value=file_size_bytes,
                )
            )
            if file_size_bytes <= 0:
                warnings.append("model file is empty; runtime load will almost certainly fail")
        else:
            hard_failure = True
            checks.append(
                _check(
                    "model_file_exists",
                    "fail",
                    "model file does not exist inside the approved model root",
                    method="pathlib.stat",
                )
            )
    except OSError:
        hard_failure = True
        checks.append(
            _check(
                "model_file_exists",
                "fail",
                "model file could not be inspected",
                method="pathlib.stat",
            )
        )

    # 2. Runtime availability.
    if runtime_capabilities.get("available"):
        checks.append(
            _check(
                "runtime_available",
                "pass",
                f"runtime adapter '{runtime_capabilities.get('adapter_id')}' is available",
                method="runtime_capabilities",
            )
        )
    else:
        hard_failure = True
        checks.append(
            _check(
                "runtime_available",
                "fail",
                "no usable runtime adapter is available for this configuration",
                method="runtime_capabilities",
            )
        )

    # 3. Format / quantization support.
    formats = [str(item).lower() for item in runtime_capabilities.get("supported_formats", [])]
    model_format = str(configuration.get("model_format", "")).lower()
    if formats and model_format and model_format not in formats:
        hard_failure = True
        checks.append(
            _check(
                "model_format_supported",
                "fail",
                f"runtime does not support model format '{model_format}'",
                method="runtime_capabilities",
            )
        )
    else:
        checks.append(
            _check(
                "model_format_supported",
                "pass" if formats else "unknown",
                "runtime accepts the configured model format"
                if formats
                else "runtime did not enumerate supported model formats",
                method="runtime_capabilities",
            )
        )

    quantizations = runtime_capabilities.get("supported_quantizations")
    quantization = configuration.get("quantization")
    if quantizations is not None and quantization:
        if str(quantization).lower() not in [str(item).lower() for item in quantizations]:
            hard_failure = True
            checks.append(
                _check(
                    "quantization_supported",
                    "fail",
                    f"runtime does not support quantization '{quantization}'",
                    method="runtime_capabilities",
                )
            )
        else:
            checks.append(
                _check(
                    "quantization_supported",
                    "pass",
                    "runtime accepts the configured quantization label",
                    method="runtime_capabilities",
                )
            )
    else:
        checks.append(
            _check(
                "quantization_supported",
                "unknown",
                (
                    "runtime does not enumerate quantization labels; "
                    "the file metadata is authoritative"
                ),
                method="runtime_capabilities",
            )
        )

    # 4. Context length vs runtime-reported maximum.
    context_length = int(configuration.get("context_length") or 0)
    runtime_max_context = runtime_capabilities.get("max_context_length")
    if runtime_max_context and context_length > int(runtime_max_context):
        hard_failure = True
        checks.append(
            _check(
                "context_length_supported",
                "fail",
                (
                    f"configured context length {context_length} exceeds runtime "
                    f"maximum {runtime_max_context}"
                ),
                method="runtime_capabilities",
            )
        )
    elif runtime_max_context:
        checks.append(
            _check(
                "context_length_supported",
                "pass",
                f"context length {context_length} is within runtime maximum {runtime_max_context}",
                method="runtime_capabilities",
            )
        )
    else:
        checks.append(
            _check(
                "context_length_supported",
                "unknown",
                "runtime did not report a maximum context length",
                method="runtime_capabilities",
            )
        )

    # 5. Requested acceleration vs detected hardware.  Runtime fallback is
    #    allowed, but requested and effective modes are always reported.
    gpu_layers = configuration.get("gpu_layers")
    gpu_devices = hardware_snapshot.get("gpu", {}).get("devices", [])
    gpu_present = bool(gpu_devices)
    if gpu_layers is not None and gpu_layers > 0:
        if gpu_present and runtime_capabilities.get("supports_gpu_offload"):
            checks.append(
                _check(
                    "requested_gpu_offload_available",
                    "pass",
                    "GPU offload requested and GPU telemetry detected",
                    method="hardware+gpu_capabilities",
                )
            )
        else:
            warnings.append(
                "GPU offload was requested but no usable GPU offload capability was detected; "
                "execution may fall back to CPU or fail"
            )
            checks.append(
                _check(
                    "requested_gpu_offload_available",
                    "warning",
                    "GPU offload requested but not demonstrably available",
                    method="hardware+gpu_capabilities",
                )
            )
    else:
        checks.append(
            _check(
                "requested_gpu_offload_available",
                "pass",
                "CPU-only execution requested",
                method="configuration",
            )
        )

    # 6. Memory estimate - explicitly labelled estimated and advisory.
    estimate: dict[str, Any] = {
        "status": "unavailable",
        "method": "gguf-file-size-heuristic/1",
        "estimated_required_mb": None,
        "available_ram_mb": None,
        "safety_margin_ratio": settings.memory_safety_margin_ratio,
        "uncertainty": "high",
        "assumptions": [
            "weights fit in approximately the model file size",
            "~20% runtime/allocator overhead is assumed",
            "KV-cache memory is NOT modelled (no model metadata is loaded)",
            "memory is compared against currently available RAM only",
        ],
    }
    available_ram = _reading(hardware_snapshot, "memory", "available_mb")
    if available_ram and available_ram.get("value") is not None:
        estimate["available_ram_mb"] = float(available_ram["value"])
    if file_size_bytes and file_size_bytes > 0:
        estimated_mb = (file_size_bytes / (1024.0 * 1024.0)) * 1.2
        estimate["estimated_required_mb"] = round(estimated_mb, 3)
        estimate["status"] = "estimated"
        checks.append(
            _check(
                "estimated_memory",
                "estimated",
                f"coarse estimate: {round(estimated_mb, 3)} MB (high uncertainty)",
                method=estimate["method"],
                value=round(estimated_mb, 3),
            )
        )
        if estimate["available_ram_mb"] is not None:
            budget = float(estimate["available_ram_mb"]) * (
                1.0 - settings.memory_safety_margin_ratio
            )
            if estimated_mb > budget:
                message = (
                    f"estimated requirement {round(estimated_mb, 3)} MB exceeds the "
                    f"available RAM budget {round(budget, 3)} MB"
                )
                warnings.append(message)
                checks.append(
                    _check(
                        "memory_headroom",
                        "fail" if settings.preflight_policy == "strict" else "warning",
                        message,
                        method=estimate["method"],
                    )
                )
                if settings.preflight_policy == "strict":
                    hard_failure = True
            else:
                checks.append(
                    _check(
                        "memory_headroom",
                        "pass",
                        (
                            "coarse estimate fits within available RAM with the "
                            "configured safety margin"
                        ),
                        method=estimate["method"],
                    )
                )
    else:
        checks.append(
            _check(
                "estimated_memory",
                "unknown",
                "no defensible memory estimate is available (model size unknown)",
                method=estimate["method"],
            )
        )

    if hard_failure:
        status = "infeasible"
    elif estimate["status"] != "estimated":
        status = "unknown"
    else:
        status = "feasible"

    return {
        "status": status,
        "policy": settings.preflight_policy,
        "advisory_only": True,
        "evaluated_at": utc_iso(utcnow()),
        "checks": checks,
        "estimate": estimate,
        "warnings": warnings,
        "requested_execution_mode": _requested_mode(gpu_layers),
        "gpu_detected": gpu_present,
        "note": (
            "Preflight is advisory. Only the actual runtime load attempt can determine "
            "whether a configuration fits."
        ),
    }


def _requested_mode(gpu_layers: int | None) -> str:
    if gpu_layers is None:
        return "unknown"
    if gpu_layers > 0:
        return "hybrid_or_gpu_offload"
    return "cpu"


__all__ = ["run_preflight"]
