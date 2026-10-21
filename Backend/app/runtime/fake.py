"""Test-only deterministic runtime adapter.

This adapter must only be registered when ``LATTICE_RUNTIME_ALLOW_FAKE=true``
(tests or an explicit development opt-in).  Every result is tagged
``is_test_runtime`` and every run using it is persisted with ``test_only=true``
so it can never be mistaken for real model performance.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field

from app.core.enums import AvailabilityStatus, ExecutionMode
from app.core.time import monotonic
from app.runtime.base import (
    BaseRuntimeAdapter,
    GenerationRequest,
    GenerationResult,
    InferenceFailure,
    InferenceTimeout,
    ModelLoadFailure,
    ModelLoadResult,
    RuntimeCapabilities,
    RuntimeConfiguration,
    ValidationIssue,
    ValidationResult,
)

FAKE_TEST_MARKER = "FAKE RUNTIME - NOT A REAL MODEL BENCHMARK"


@dataclass
class FakeRuntimeProfile:
    """Knobs used by tests to simulate runtime behaviour deterministically."""

    version: str = "fake-runtime/1.0.0"
    backend: str = "fake"
    load_delay_ms: float = 0.0
    ttft_delay_ms: float = 1.0
    generation_delay_ms: float = 1.0
    output_tokens: int | None = None
    input_tokens: int | None = None
    emit_token_counts: bool = True
    supports_streaming: bool = True
    supports_token_counts: bool = True
    max_context_length: int | None = 32768
    load_error: bool = False
    load_error_code: str = "simulated_model_load_failure"
    fail_on_calls: set[int] = field(default_factory=set)
    timeout_on_calls: set[int] = field(default_factory=set)
    fail_message: str = "Simulated inference failure (test fake)"
    timeout_message: str = "Simulated inference timeout (test fake)"
    execution_mode: str = ExecutionMode.CPU.value
    fixed_text: str | None = None


class FakeRuntimeAdapter(BaseRuntimeAdapter):
    adapter_id = "fake"
    is_test_runtime = True

    def __init__(self, profile: FakeRuntimeProfile | None = None) -> None:
        self.profile = profile or FakeRuntimeProfile()
        self._loaded = False
        self._configuration: RuntimeConfiguration | None = None
        self._calls = 0
        self._lock = threading.Lock()

    def capabilities(self) -> RuntimeCapabilities:
        return RuntimeCapabilities(
            adapter_id=self.adapter_id,
            available=True,
            status=AvailabilityStatus.AVAILABLE,
            reason="test-only adapter; results are not real model measurements",
            version=self.profile.version,
            backend=self.profile.backend,
            supports_streaming=self.profile.supports_streaming,
            supports_token_counts=self.profile.supports_token_counts,
            supports_cancellation=False,
            supports_gpu_offload=False,
            supported_formats=("gguf", "ggml", "safetensors", "onnx", "unknown"),
            supported_quantizations=None,
            max_context_length=self.profile.max_context_length,
            acceleration=("cpu",),
            is_test_runtime=True,
            limitations=[FAKE_TEST_MARKER],
        )

    def validate(self, configuration: RuntimeConfiguration) -> ValidationResult:
        issues: list[ValidationIssue] = []
        if (
            self.profile.max_context_length
            and configuration.context_length > self.profile.max_context_length
        ):
            issues.append(
                ValidationIssue(
                    field="context_length",
                    code="context_too_large",
                    message=f"fake runtime supports at most {self.profile.max_context_length}",
                )
            )
        return ValidationResult(valid=not issues, issues=issues)

    def load(self, configuration: RuntimeConfiguration) -> ModelLoadResult:
        start = monotonic()
        if self.profile.load_delay_ms > 0:
            time.sleep(self.profile.load_delay_ms / 1000.0)
        if self.profile.load_error:
            raise ModelLoadFailure(self.profile.load_error_code, code="model_load_failed")
        self._loaded = True
        self._configuration = configuration
        return ModelLoadResult(
            load_duration_ms=max(0.001, (monotonic() - start) * 1000.0),
            effective_execution_mode=self.profile.execution_mode,
            runtime_metadata={
                "adapter_id": self.adapter_id,
                "version": self.profile.version,
                "backend": self.profile.backend,
                "is_test_runtime": True,
                "fake_marker": FAKE_TEST_MARKER,
                "effective_execution_mode": self.profile.execution_mode,
            },
        )

    def unload(self) -> None:
        self._loaded = False
        self._configuration = None

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def generate(self, request: GenerationRequest) -> GenerationResult:
        if not self._loaded:
            raise InferenceFailure("model is not loaded", code="model_not_loaded")
        with self._lock:
            self._calls += 1
            call = self._calls
        if call in self.profile.timeout_on_calls:
            time.sleep(min(0.02, request.timeout_seconds))
            raise InferenceTimeout(self.profile.timeout_message)
        if call in self.profile.fail_on_calls:
            raise InferenceFailure(self.profile.fail_message)

        started = monotonic()
        first_token_ms: float | None = None
        if self.profile.ttft_delay_ms > 0:
            time.sleep(self.profile.ttft_delay_ms / 1000.0)
        if self.profile.supports_streaming:
            first_token_ms = max(0.001, (monotonic() - started) * 1000.0)
        if self.profile.generation_delay_ms > 0:
            time.sleep(self.profile.generation_delay_ms / 1000.0)

        if self.profile.output_tokens is not None:
            output_tokens: int | None = min(self.profile.output_tokens, request.max_tokens)
        else:
            output_tokens = min(request.max_tokens, 8)
        input_tokens = self.profile.input_tokens
        if input_tokens is None:
            input_tokens = max(1, len(request.prompt.split()))
        if not self.profile.emit_token_counts:
            output_tokens = None
            input_tokens = None
        configuration_id = (
            self._configuration.configuration_id if self._configuration else "unknown"
        )
        text = (
            self.profile.fixed_text
            if self.profile.fixed_text is not None
            else (
                f"[fake-runtime output for {configuration_id}] tokens={output_tokens}"
                if output_tokens is not None
                else None
            )
        )
        return GenerationResult(
            text=text,
            output_tokens=output_tokens,
            input_tokens=input_tokens if self.profile.emit_token_counts else None,
            token_count_source="runtime" if self.profile.emit_token_counts else None,
            first_token_ms=first_token_ms if self.profile.supports_streaming else None,
            finish_reason="stop",
            runtime_metadata={
                "adapter_id": self.adapter_id,
                "is_test_runtime": True,
                "fake_marker": FAKE_TEST_MARKER,
                "call_index": call,
                "effective_execution_mode": self.profile.execution_mode,
            },
        )


__all__ = ["FAKE_TEST_MARKER", "FakeRuntimeAdapter", "FakeRuntimeProfile"]
