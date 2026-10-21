"""Reusable input validation used by schemas and services.

These helpers reject parameter injection attempts (arbitrary executable
commands, paths, environment overrides) and non-finite numbers.  They raise
``ValueError`` so Pydantic can turn them into field-level 422 errors.
"""

from __future__ import annotations

import json
import math
from typing import Any

# Generation settings are an explicit allowlist: unknown keys are rejected
# instead of being forwarded to a native runtime.
_GENERATION_SPEC: dict[str, tuple[float, float, bool]] = {
    "temperature": (0.0, 5.0, True),
    "top_p": (0.0, 1.0, True),
    "top_k": (0, 10000, False),
    "min_p": (0.0, 1.0, True),
    "repeat_penalty": (0.0, 4.0, True),
    "presence_penalty": (-2.0, 2.0, True),
    "frequency_penalty": (-2.0, 2.0, True),
    "seed": (0, 2**63 - 1, False),
    "max_tokens": (1, 2**31 - 1, False),
}

_RUNTIME_SPEC: dict[str, tuple[float, float, bool]] = {
    "n_ctx": (1, 2**31 - 1, False),
    "n_threads": (0, 4096, False),
    "n_threads_batch": (0, 4096, False),
    "n_batch": (1, 2**31 - 1, False),
    "n_gpu_layers": (0, 100000, False),
    "n_ubatch": (1, 2**31 - 1, False),
    "main_gpu": (0, 64, False),
    "seed": (0, 2**63 - 1, False),
    "rope_freq_base": (0.0, 1e9, True),
    "rope_freq_scale": (0.0, 1e3, True),
    "offload_kqv": (0, 1, False),
    "flash_attn": (0, 1, False),
    "use_mmap": (0, 1, False),
    "use_mlock": (0, 1, False),
    "vocab_only": (0, 1, False),
    "verbose": (0, 1, False),
}

_DENIED_KEY_TOKENS = (
    "command",
    "cmd",
    "shell",
    "exec",
    "subprocess",
    "argv",
    "env",
    "path",
    "script",
    "url",
    "tokenizer_path",
    "lora_path",
)


def _ensure_finite(value: Any, *, field: str) -> None:
    if isinstance(value, bool):
        return
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError(f"{field} must be a finite number")
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) > 2**63 - 1:
        raise ValueError(f"{field} is outside the supported integer range")


def _is_denied_key(key: str) -> bool:
    lowered = key.lower()
    return any(token in lowered for token in _DENIED_KEY_TOKENS)


def validate_generation_parameters(
    payload: dict[str, Any] | None,
    *,
    max_output_tokens: int,
    field_prefix: str = "generation_parameters",
) -> dict[str, Any]:
    """Validate and normalise generation parameters against an allowlist."""
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ValueError(f"{field_prefix} must be an object")
    cleaned: dict[str, Any] = {}
    for key, value in payload.items():
        if not isinstance(key, str) or not key.isidentifier():
            raise ValueError(f"{field_prefix} contains an invalid parameter name")
        if _is_denied_key(key):
            raise ValueError(f"{field_prefix}.{key} is not a permitted generation parameter")
        if key == "stop":
            if not isinstance(value, list) or len(value) > 8:
                raise ValueError(f"{field_prefix}.stop must be a list of at most 8 strings")
            stops: list[str] = []
            for item in value:
                if not isinstance(item, str) or len(item) > 200 or "\x00" in item:
                    raise ValueError(f"{field_prefix}.stop contains an invalid value")
                stops.append(item)
            cleaned["stop"] = stops
            continue
        if key not in _GENERATION_SPEC:
            raise ValueError(f"{field_prefix}.{key} is not a supported generation parameter")
        low, high, is_float = _GENERATION_SPEC[key]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{field_prefix}.{key} must be numeric")
        _ensure_finite(value, field=f"{field_prefix}.{key}")
        if key == "max_tokens":
            high = min(high, max_output_tokens)
        numeric = float(value) if is_float else int(value)
        if numeric != value and is_float:
            raise ValueError(f"{field_prefix}.{key} must be numeric")
        if not (low <= float(numeric) <= float(high)):
            raise ValueError(f"{field_prefix}.{key} must be between {low} and {high}")
        cleaned[key] = numeric
    return cleaned


def validate_runtime_parameters(payload: dict[str, Any] | None) -> dict[str, Any]:
    """Validate runtime-specific parameters (llama.cpp style allowlist)."""
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ValueError("runtime_parameters must be an object")
    cleaned: dict[str, Any] = {}
    for key, value in payload.items():
        if not isinstance(key, str) or not key.isidentifier():
            raise ValueError("runtime_parameters contains an invalid parameter name")
        if _is_denied_key(key):
            raise ValueError(f"runtime_parameters.{key} is not a permitted runtime parameter")
        if key not in _RUNTIME_SPEC:
            raise ValueError(f"runtime_parameters.{key} is not a supported runtime parameter")
        low, high, is_float = _RUNTIME_SPEC[key]
        if isinstance(value, bool):
            if not is_float:
                cleaned[key] = int(value)
                continue
            raise ValueError(f"runtime_parameters.{key} must be numeric")
        if not isinstance(value, (int, float)):
            raise ValueError(f"runtime_parameters.{key} must be numeric")
        _ensure_finite(value, field=f"runtime_parameters.{key}")
        if not (low <= float(value) <= float(high)):
            raise ValueError(f"runtime_parameters.{key} must be between {low} and {high}")
        cleaned[key] = float(value) if is_float else int(value)
    return cleaned


def validate_metadata(payload: dict[str, Any] | None, *, field: str = "metadata") -> dict[str, Any]:
    """Metadata is an opaque, bounded, JSON-serialisable object."""
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ValueError(f"{field} must be an object")
    try:
        encoded = json.dumps(payload, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be JSON-serialisable with finite numbers") from exc
    if len(encoded.encode("utf-8")) > 16384:
        raise ValueError(f"{field} must not exceed 16384 bytes")
    _reject_non_finite(payload, field=field)
    return payload


def _reject_non_finite(value: Any, *, field: str) -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError(f"{field} contains a non-finite number")
    if isinstance(value, dict):
        for key, item in value.items():
            _reject_non_finite(item, field=f"{field}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _reject_non_finite(item, field=f"{field}[{index}]")


def reject_non_finite(value: Any, *, field: str) -> None:
    """Public alias used by serializers before JSON persistence."""
    _reject_non_finite(value, field=field)
