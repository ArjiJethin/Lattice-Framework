"""Optional llama.cpp adapter (``llama-cpp-python``).

The dependency is imported lazily.  When it is absent the adapter reports a
``not_installed`` capability and every other endpoint keeps working.

Limitations (reported through capabilities and runtime metadata):
* generation is synchronous and CPU/GPU native work cannot be preempted
  mid-token; timeouts are enforced between streamed chunks;
* token counts prefer runtime usage, then the exact model tokenizer;
* GGUF is the only supported format.
"""

from __future__ import annotations

import gc
import threading
from typing import Any

from app.core.enums import AvailabilityStatus, ExecutionMode
from app.core.logging import get_logger
from app.core.time import monotonic
from app.runtime.base import (
    BaseRuntimeAdapter,
    GenerationRequest,
    GenerationResult,
    InferenceFailure,
    InferenceTimeout,
    ModelLoadFailure,
    ModelLoadResult,
    OutOfMemoryFailure,
    RuntimeCapabilities,
    RuntimeConfiguration,
    ValidationIssue,
    ValidationResult,
)

logger = get_logger(__name__)

_OOM_MARKERS = ("out of memory", "failed to allocate", "oom", "cuda error", "not enough memory")


def _import_llama_cpp() -> Any | None:
    try:  # pragma: no cover - optional dependency
        import llama_cpp  # type: ignore

        return llama_cpp
    except Exception:  # pragma: no cover - optional dependency
        return None


def _sanitize(message: str, model_path: str) -> str:
    """Strip absolute model paths and newlines from runtime errors."""
    cleaned = message.replace(model_path, "<model>")
    cleaned = " ".join(cleaned.split())
    return cleaned[:400]


class LlamaCppAdapter(BaseRuntimeAdapter):
    adapter_id = "llamacpp"
    is_test_runtime = False

    def __init__(self) -> None:
        self._model: Any | None = None
        self._configuration: RuntimeConfiguration | None = None
        self._lock = threading.Lock()

    # -- capabilities ------------------------------------------------------
    def capabilities(self) -> RuntimeCapabilities:
        module = _import_llama_cpp()
        if module is None:
            return RuntimeCapabilities(
                adapter_id=self.adapter_id,
                available=False,
                status=AvailabilityStatus.NOT_INSTALLED,
                reason=(
                    "llama-cpp-python is not installed; install the optional runtime extra "
                    "to enable real inference"
                ),
                supported_formats=("gguf",),
                limitations=[
                    "llama-cpp-python is an optional dependency and is imported lazily",
                ],
            )
        version = str(getattr(module, "__version__", "unknown"))
        gpu_probe_failed = False
        try:
            supports_gpu = bool(getattr(module, "llama_supports_gpu_offload", lambda: False)())
        except Exception:
            # A probe failure must degrade the capability report, not break the
            # health/capabilities endpoints for every other feature.
            logger.warning("llama.cpp GPU capability probe raised; reporting no GPU offload")
            supports_gpu = False
            gpu_probe_failed = True
        acceleration: list[str] = ["cpu"]
        backend = "cpu"
        try:  # pragma: no cover - depends on build
            info = str(module.llama_print_system_info())
            for marker in ("CUDA", "Metal", "Vulkan", "SYCL", "HIP", "BLAS", "AVX"):
                if marker.lower() in info.lower():
                    acceleration.append(marker)
            if supports_gpu:
                backend = "gpu_capable"
        except Exception:  # pragma: no cover
            pass
        limitations = [
            "timeouts are enforced between streaming chunks; native decode is not preemptible",
            "cancellation is not supported by llama-cpp-python",
            "quantization labels are not enumerated; GGUF metadata is authoritative",
        ]
        if gpu_probe_failed:
            limitations.append(
                "the GPU capability probe raised an error; GPU offload is treated as unavailable"
            )
        elif not supports_gpu:
            limitations.append("this llama.cpp build does not allow GPU offload")
        return RuntimeCapabilities(
            adapter_id=self.adapter_id,
            available=True,
            status=AvailabilityStatus.AVAILABLE,
            version=version,
            backend=backend,
            supports_streaming=True,
            supports_token_counts=True,
            supports_cancellation=False,
            supports_gpu_offload=supports_gpu,
            supported_formats=("gguf",),
            supported_quantizations=None,
            max_context_length=None,
            acceleration=tuple(acceleration),
            is_test_runtime=False,
            limitations=tuple(limitations),
        )

    # -- validation --------------------------------------------------------
    def validate(self, configuration: RuntimeConfiguration) -> ValidationResult:
        issues: list[ValidationIssue] = []
        if configuration.model_path.suffix.lower() != ".gguf":
            issues.append(
                ValidationIssue(
                    field="model_path",
                    code="unsupported_model_format",
                    message="llama.cpp adapter requires a .gguf model file",
                )
            )
        if configuration.context_length < 1:
            issues.append(
                ValidationIssue(
                    field="context_length",
                    code="invalid_context_length",
                    message="context_length must be >= 1",
                )
            )
        if configuration.gpu_layers is not None and configuration.gpu_layers < 0:
            issues.append(
                ValidationIssue(
                    field="gpu_layers",
                    code="invalid_gpu_layers",
                    message="gpu_layers must be >= 0",
                )
            )
        return ValidationResult(valid=not issues, issues=issues)

    # -- lifecycle ---------------------------------------------------------
    def load(self, configuration: RuntimeConfiguration) -> ModelLoadResult:
        module = _import_llama_cpp()
        if module is None:  # pragma: no cover - guarded by service
            raise ModelLoadFailure("llama-cpp-python is not installed", code="runtime_unavailable")
        capabilities = self.capabilities()
        if configuration.gpu_layers and configuration.gpu_layers > 0:
            if not capabilities.supports_gpu_offload:
                logger.warning(
                    "GPU offload requested but this llama.cpp build reports no GPU support"
                )
        kwargs: dict[str, Any] = {
            "model_path": str(configuration.model_path),
            "n_ctx": configuration.context_length,
            "verbose": False,
        }
        if configuration.thread_count:
            kwargs["n_threads"] = configuration.thread_count
        if configuration.batch_size:
            kwargs["n_batch"] = configuration.batch_size
        if configuration.gpu_layers is not None:
            kwargs["n_gpu_layers"] = configuration.gpu_layers
        for key, value in configuration.runtime_parameters.items():
            kwargs.setdefault(key, value)
        start = monotonic()
        try:  # pragma: no cover - requires the optional dependency and a model
            model = module.Llama(**kwargs)
        except Exception as exc:
            message = _sanitize(str(exc), str(configuration.model_path))
            if any(marker in message.lower() for marker in _OOM_MARKERS):
                raise OutOfMemoryFailure(
                    f"model load ran out of memory: {message}", code="out_of_memory"
                ) from exc
            raise ModelLoadFailure(f"model load failed: {message}") from exc
        duration_ms = (monotonic() - start) * 1000.0
        gpu_layers = configuration.gpu_layers or 0
        if gpu_layers > 0 and capabilities.supports_gpu_offload:
            effective = ExecutionMode.HYBRID.value
        else:
            effective = ExecutionMode.CPU.value
        warnings: list[str] = []
        if gpu_layers > 0 and not capabilities.supports_gpu_offload:
            warnings.append(
                "GPU offload was requested but the installed llama.cpp build reports no GPU "
                "support; execution is CPU-only"
            )
        with self._lock:
            self._model = model
            self._configuration = configuration
        return ModelLoadResult(
            load_duration_ms=max(0.001, duration_ms),
            effective_execution_mode=effective,
            runtime_metadata={
                "adapter_id": self.adapter_id,
                "version": capabilities.version,
                "backend": capabilities.backend,
                "acceleration": list(capabilities.acceleration),
                "n_gpu_layers": gpu_layers,
                "n_ctx": configuration.context_length,
                "n_threads": kwargs.get("n_threads"),
                "n_batch": kwargs.get("n_batch"),
                "is_test_runtime": False,
                "effective_execution_mode": effective,
                "requested_gpu_layers": configuration.gpu_layers,
            },
            warnings=warnings,
        )

    def unload(self) -> None:
        model = self._model
        self._model = None
        self._configuration = None
        if model is not None:  # pragma: no cover - requires optional dependency
            close = getattr(model, "close", None)
            if callable(close):
                try:
                    close()
                except Exception:
                    logger.warning("llama.cpp model close raised")
        gc.collect()

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    # -- generation --------------------------------------------------------
    def generate(self, request: GenerationRequest) -> GenerationResult:  # pragma: no cover
        model = self._model
        if model is None:
            raise InferenceFailure("model is not loaded", code="model_not_loaded")
        parameters: dict[str, Any] = {
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "top_k": request.top_k,
            "stop": list(request.stop),
            "stream": True,
            "echo": False,
        }
        if request.seed is not None:
            parameters["seed"] = request.seed
        prompt = request.prompt
        if request.system_prompt:
            prompt = f"{request.system_prompt}\n\n{prompt}"
        started = monotonic()
        deadline = started + max(0.001, request.timeout_seconds)
        first_token_ms: float | None = None
        chunks: list[str] = []
        usage: dict[str, Any] = {}
        finish_reason: str | None = None
        try:
            stream = model(prompt, **parameters)
            for chunk in stream:
                now = monotonic()
                if now > deadline:
                    close = getattr(stream, "close", None)
                    if callable(close):
                        close()
                    raise InferenceTimeout(
                        "generation exceeded the configured timeout between tokens"
                    )
                choices = chunk.get("choices") or []
                if choices:
                    text = choices[0].get("text") or ""
                    if text and first_token_ms is None:
                        first_token_ms = max(0.001, (now - started) * 1000.0)
                    chunks.append(text)
                    finish_reason = choices[0].get("finish_reason") or finish_reason
                if "usage" in chunk and chunk["usage"]:
                    usage = chunk["usage"]
        except (InferenceTimeout, InferenceFailure):
            raise
        except Exception as exc:
            model_path = str(self._configuration.model_path) if self._configuration else ""
            raise InferenceFailure(f"generation failed: {_sanitize(str(exc), model_path)}") from exc
        text = "".join(chunks)
        input_tokens: int | None = None
        output_tokens: int | None = None
        source: str | None = None
        if usage:
            input_tokens = usage.get("prompt_tokens")
            output_tokens = usage.get("completion_tokens")
            source = "runtime:usage"
        else:
            try:
                prompt_tokens = model.tokenize(prompt.encode("utf-8"))
                completion_tokens = model.tokenize(text.encode("utf-8"))
                input_tokens = len(prompt_tokens)
                output_tokens = len(completion_tokens)
                source = "tokenizer:llama_cpp"
            except Exception:
                source = None
        return GenerationResult(
            text=text,
            output_tokens=output_tokens,
            input_tokens=input_tokens,
            token_count_source=source,
            first_token_ms=first_token_ms,
            finish_reason=finish_reason,
            runtime_metadata={
                "adapter_id": self.adapter_id,
                "is_test_runtime": False,
                "effective_execution_mode": (
                    ExecutionMode.HYBRID.value
                    if (self._configuration and (self._configuration.gpu_layers or 0) > 0)
                    else ExecutionMode.CPU.value
                ),
            },
        )


__all__ = ["LlamaCppAdapter"]
