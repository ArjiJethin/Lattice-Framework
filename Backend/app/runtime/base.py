"""Canonical inference-runtime contract.

Concrete adapters implement model lifecycle, generation and metadata only.
They never implement optimization policy and never write to the database.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.core.enums import AvailabilityStatus


class RuntimeFailure(Exception):
    """Structured runtime failure with a stable code and sanitized message."""

    code = "runtime_failure"

    def __init__(self, message: str, *, code: str | None = None) -> None:
        self.message = message
        if code:
            self.code = code
        super().__init__(message)


class RuntimeUnavailable(RuntimeFailure):
    code = "runtime_unavailable"


class ModelLoadFailure(RuntimeFailure):
    code = "model_load_failed"


class OutOfMemoryFailure(ModelLoadFailure):
    code = "out_of_memory"


class InferenceTimeout(RuntimeFailure):
    code = "inference_timeout"


class InferenceFailure(RuntimeFailure):
    code = "inference_failed"


class CancellationUnsupported(RuntimeFailure):
    code = "cancellation_not_supported"


@dataclass(frozen=True)
class RuntimeCapabilities:
    adapter_id: str
    available: bool
    status: AvailabilityStatus
    reason: str | None = None
    version: str | None = None
    backend: str | None = None
    supports_streaming: bool = False
    supports_token_counts: bool = False
    supports_cancellation: bool = False
    supports_gpu_offload: bool = False
    supported_formats: tuple[str, ...] = ()
    supported_quantizations: tuple[str, ...] | None = None
    max_context_length: int | None = None
    acceleration: tuple[str, ...] = ()
    is_test_runtime: bool = False
    limitations: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "adapter_id": self.adapter_id,
            "status": self.status.value,
            "available": self.available,
            "version": self.version,
            "backend": self.backend,
            "reason": self.reason,
            "supports_streaming": self.supports_streaming,
            "supports_token_counts": self.supports_token_counts,
            "supports_cancellation": self.supports_cancellation,
            "supports_gpu_offload": self.supports_gpu_offload,
            "supported_formats": list(self.supported_formats),
            "supported_quantizations": (
                list(self.supported_quantizations)
                if self.supported_quantizations is not None
                else None
            ),
            "max_context_length": self.max_context_length,
            "acceleration": list(self.acceleration),
            "is_test_runtime": self.is_test_runtime,
            "limitations": list(self.limitations),
        }


@dataclass
class RuntimeConfiguration:
    """Adapter-facing view of a configuration profile."""

    configuration_id: str
    model_id: str
    model_path: Path
    model_format: str
    quantization: str | None
    context_length: int
    runtime_parameters: dict[str, Any] = field(default_factory=dict)
    thread_count: int | None = None
    batch_size: int | None = None
    gpu_layers: int | None = None
    generation_defaults: dict[str, Any] = field(default_factory=dict)
    revision: int = 1


@dataclass
class ValidationIssue:
    field: str
    code: str
    message: str
    severity: str = "error"


@dataclass
class ValidationResult:
    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "issues": [
                {
                    "field": issue.field,
                    "code": issue.code,
                    "message": issue.message,
                    "severity": issue.severity,
                }
                for issue in self.issues
            ],
        }


@dataclass
class GenerationRequest:
    prompt: str
    system_prompt: str | None = None
    max_tokens: int = 128
    temperature: float = 0.2
    top_p: float = 0.95
    top_k: int = 40
    stop: tuple[str, ...] = ()
    seed: int | None = None
    timeout_seconds: float = 120.0
    stream: bool = True

    @classmethod
    def from_parameters(
        cls,
        prompt: str,
        parameters: dict[str, Any],
        *,
        system_prompt: str | None = None,
        default_max_tokens: int = 128,
        timeout_seconds: float = 120.0,
        stream: bool = True,
    ) -> GenerationRequest:
        stop = parameters.get("stop") or ()
        return cls(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=int(parameters.get("max_tokens", default_max_tokens)),
            temperature=float(parameters.get("temperature", 0.2)),
            top_p=float(parameters.get("top_p", 0.95)),
            top_k=int(parameters.get("top_k", 40)),
            stop=tuple(stop) if isinstance(stop, (list, tuple)) else (),
            seed=(int(parameters["seed"]) if parameters.get("seed") is not None else None),
            timeout_seconds=timeout_seconds,
            stream=stream,
        )


@dataclass
class GenerationResult:
    text: str | None
    output_tokens: int | None
    input_tokens: int | None
    token_count_source: str | None
    first_token_ms: float | None
    finish_reason: str | None = None
    runtime_metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelLoadResult:
    load_duration_ms: float
    effective_execution_mode: str
    runtime_metadata: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


class BaseRuntimeAdapter(ABC):
    """All adapters implement this interface; nothing else is required."""

    adapter_id: str = "base"
    is_test_runtime: bool = False

    @abstractmethod
    def capabilities(self) -> RuntimeCapabilities:
        """Report availability and feature support without side effects."""

    def validate(self, configuration: RuntimeConfiguration) -> ValidationResult:
        """Non-destructive validation.  Default: accept what the adapter supports."""
        return ValidationResult(valid=True)

    @abstractmethod
    def load(self, configuration: RuntimeConfiguration) -> ModelLoadResult:
        """Load the model.  Raises a RuntimeFailure subclass on failure."""

    @abstractmethod
    def unload(self) -> None:
        """Release resources.  Must be safe to call when nothing is loaded."""

    @abstractmethod
    def generate(self, request: GenerationRequest) -> GenerationResult:
        """Run one generation.  Raises a RuntimeFailure subclass on failure."""

    def cancel(self) -> None:
        raise CancellationUnsupported(
            "this runtime adapter cannot reliably cancel in-flight generation"
        )

    @property
    def is_loaded(self) -> bool:
        return False
