"""Contract tests for the optional llama.cpp adapter.

These tests replace ``llama_cpp`` with a small in-memory double.  They prove the
adapter's own logic (argument mapping, error translation, sanitization, timing,
cleanup) and **not** real model behaviour.  The default suite never imports
``llama-cpp-python`` and never needs a model file.
"""

from __future__ import annotations

import types
from pathlib import Path

import pytest

import app.runtime.llamacpp as llamacpp_module
from app.core.enums import AvailabilityStatus, ExecutionMode
from app.runtime.base import (
    GenerationRequest,
    InferenceFailure,
    InferenceTimeout,
    ModelLoadFailure,
    OutOfMemoryFailure,
    RuntimeConfiguration,
)
from app.runtime.llamacpp import LlamaCppAdapter

# ---------------------------------------------------------------------------
# doubles
# ---------------------------------------------------------------------------


class FakeStream:
    """Iterator with an observable ``close()`` and optional mid-iteration error."""

    def __init__(self, chunks, *, error: Exception | None = None) -> None:
        self._chunks = list(chunks)
        self._error = error
        self.closed = False

    def __iter__(self):
        yield from self._chunks
        if self._error is not None:
            raise self._error

    def close(self) -> None:
        self.closed = True


class FakeModel:
    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs
        self.closed = False
        self.calls: list[tuple[str, dict]] = []
        self.stream = FakeStream(
            [
                {"choices": [{"text": "Hello", "finish_reason": None}]},
                {"choices": [{"text": " world", "finish_reason": "stop"}]},
                {
                    "choices": [],
                    "usage": {"prompt_tokens": 7, "completion_tokens": 2},
                },
            ]
        )

    def __call__(self, prompt: str, **parameters):
        self.calls.append((prompt, parameters))
        return self.stream

    def tokenize(self, data: bytes) -> list[int]:
        return list(range(len(data.split())))

    def close(self) -> None:
        self.closed = True


def fake_module(
    *,
    gpu_support: bool = False,
    system_info: str = "AVX = 1 | AVX2 = 1 | BLAS = 1",
    module_version: str = "0.3.1",
    llama_factory=FakeModel,
    gpu_probe_error: Exception | None = None,
) -> types.SimpleNamespace:
    def llama_supports_gpu_offload() -> bool:
        if gpu_probe_error is not None:
            raise gpu_probe_error
        return gpu_support

    return types.SimpleNamespace(
        __version__=module_version,
        Llama=llama_factory,
        llama_supports_gpu_offload=llama_supports_gpu_offload,
        llama_print_system_info=lambda: system_info,
    )


@pytest.fixture
def installed(monkeypatch):
    """Install a fake ``llama_cpp`` module and restore the real probe afterwards."""

    def _install(module: types.SimpleNamespace) -> types.SimpleNamespace:
        monkeypatch.setattr(llamacpp_module, "_import_llama_cpp", lambda: module)
        return module

    return _install


@pytest.fixture
def configuration(tmp_path: Path) -> RuntimeConfiguration:
    model = tmp_path / "tiny.gguf"
    model.write_bytes(b"gguf" * 32)
    return RuntimeConfiguration(
        configuration_id="cfg-1",
        model_id="tiny",
        model_path=model,
        model_format="gguf",
        quantization="q4_k_m",
        context_length=2048,
        thread_count=4,
        batch_size=64,
        gpu_layers=0,
        runtime_parameters={"use_mmap": False},
    )


@pytest.fixture
def adapter() -> LlamaCppAdapter:
    return LlamaCppAdapter()


# ---------------------------------------------------------------------------
# capabilities
# ---------------------------------------------------------------------------


def test_capabilities_without_package_reports_not_installed(monkeypatch, adapter):
    monkeypatch.setattr(llamacpp_module, "_import_llama_cpp", lambda: None)
    capabilities = adapter.capabilities()
    assert capabilities.available is False
    assert capabilities.status is AvailabilityStatus.NOT_INSTALLED
    assert capabilities.is_test_runtime is False
    assert "llama-cpp-python" in (capabilities.reason or "")
    assert capabilities.supported_formats == ("gguf",)


def test_capabilities_with_package_reports_version_and_acceleration(installed, adapter):
    installed(fake_module(gpu_support=True, system_info="CUDA = 1 | AVX = 1"))
    capabilities = adapter.capabilities()
    assert capabilities.available is True
    assert capabilities.status is AvailabilityStatus.AVAILABLE
    assert capabilities.version == "0.3.1"
    assert capabilities.backend == "gpu_capable"
    assert "CUDA" in capabilities.acceleration
    assert capabilities.supports_gpu_offload is True
    assert capabilities.supports_cancellation is False
    assert capabilities.is_test_runtime is False
    assert any("preemptible" in limitation for limitation in capabilities.limitations)


def test_capabilities_survive_a_failing_gpu_probe(installed, adapter):
    installed(fake_module(gpu_probe_error=RuntimeError("no cuda backend")))
    capabilities = adapter.capabilities()
    assert capabilities.available is True
    assert capabilities.supports_gpu_offload is False
    assert any("probe" in limitation.lower() for limitation in capabilities.limitations)


# ---------------------------------------------------------------------------
# validation
# ---------------------------------------------------------------------------


def test_validate_rejects_non_gguf_and_bad_numeric_ranges(installed, adapter, tmp_path):
    installed(fake_module())
    configuration = RuntimeConfiguration(
        configuration_id="cfg-1",
        model_id="bad",
        model_path=tmp_path / "model.bin",
        model_format="bin",
        quantization=None,
        context_length=0,
        gpu_layers=-1,
    )
    result = adapter.validate(configuration)
    assert result.valid is False
    codes = {issue.code for issue in result.issues}
    assert codes == {"unsupported_model_format", "invalid_context_length", "invalid_gpu_layers"}


def test_validate_accepts_a_valid_configuration(installed, adapter, configuration):
    installed(fake_module())
    assert adapter.validate(configuration).valid is True


# ---------------------------------------------------------------------------
# load / unload
# ---------------------------------------------------------------------------


def test_load_maps_configuration_to_llama_arguments(installed, adapter, configuration):
    captured: dict[str, object] = {}

    def capture(**kwargs):
        captured.update(kwargs)
        return FakeModel()

    installed(fake_module(llama_factory=capture))
    result = adapter.load(configuration)
    assert captured["model_path"] == str(configuration.model_path)
    assert captured["n_ctx"] == 2048
    assert captured["n_threads"] == 4
    assert captured["n_batch"] == 64
    assert captured["n_gpu_layers"] == 0
    assert captured["use_mmap"] is False
    assert captured["verbose"] is False
    assert adapter.is_loaded is True
    assert result.effective_execution_mode == ExecutionMode.CPU.value
    assert result.load_duration_ms > 0
    assert result.runtime_metadata["n_ctx"] == 2048
    assert result.runtime_metadata["n_threads"] == 4
    assert result.runtime_metadata["n_batch"] == 64
    assert result.runtime_metadata["is_test_runtime"] is False


def test_load_marks_hybrid_only_when_build_supports_gpu(installed, adapter, configuration):
    installed(fake_module(gpu_support=True))
    configuration.gpu_layers = 10
    result = adapter.load(configuration)
    assert result.effective_execution_mode == ExecutionMode.HYBRID.value
    assert result.runtime_metadata["requested_gpu_layers"] == 10
    assert result.warnings == []


def test_load_warns_when_gpu_requested_without_gpu_build(installed, adapter, configuration):
    installed(fake_module(gpu_support=False))
    configuration.gpu_layers = 10
    result = adapter.load(configuration)
    assert result.effective_execution_mode == ExecutionMode.CPU.value
    assert result.warnings and "CPU-only" in result.warnings[0]


def test_load_failure_is_translated_and_sanitized(installed, adapter, configuration):
    def exploding(**kwargs):
        raise RuntimeError(f"failed to open {configuration.model_path}")

    installed(fake_module(llama_factory=exploding))
    with pytest.raises(ModelLoadFailure) as caught:
        adapter.load(configuration)
    assert caught.value.code == "model_load_failed"
    assert str(configuration.model_path) not in str(caught.value)
    assert "<model>" in str(caught.value)
    assert adapter.is_loaded is False


def test_load_out_of_memory_is_classified_separately(installed, adapter, configuration):
    def exploding(**kwargs):
        raise RuntimeError("CUDA error: out of memory while allocating KV cache")

    installed(fake_module(llama_factory=exploding))
    with pytest.raises(OutOfMemoryFailure) as caught:
        adapter.load(configuration)
    assert caught.value.code == "out_of_memory"


def test_failed_load_keeps_the_previously_loaded_model(installed, adapter, configuration):
    installed(fake_module())
    adapter.load(configuration)
    first = adapter._model

    def exploding(**kwargs):
        raise RuntimeError("disk read error")

    installed(fake_module(llama_factory=exploding))
    with pytest.raises(ModelLoadFailure):
        adapter.load(configuration)
    assert adapter.is_loaded is True
    assert adapter._model is first


def test_runtime_parameters_cannot_override_core_arguments(installed, adapter, configuration):
    captured: dict[str, object] = {}

    def capture(**kwargs):
        captured.update(kwargs)
        return FakeModel()

    installed(fake_module(llama_factory=capture))
    configuration.runtime_parameters = {"use_mmap": False, "n_ctx": 999, "n_ubatch": 32}
    adapter.load(configuration)
    assert captured["n_ctx"] == 2048
    assert captured["use_mmap"] is False
    assert captured["n_ubatch"] == 32


def test_unload_closes_the_model_and_is_idempotent(installed, adapter, configuration):
    module = installed(fake_module())
    adapter.load(configuration)
    model = adapter._model
    assert isinstance(model, module.Llama)
    adapter.unload()
    assert model.closed is True
    assert adapter.is_loaded is False
    adapter.unload()  # safe when nothing is loaded


def test_unload_tolerates_a_failing_close(installed, adapter, configuration):
    class BadClose(FakeModel):
        def close(self) -> None:
            raise RuntimeError("native close failed")

    installed(fake_module(llama_factory=BadClose))
    adapter.load(configuration)
    adapter.unload()
    assert adapter.is_loaded is False


# ---------------------------------------------------------------------------
# generation
# ---------------------------------------------------------------------------


def _loaded(installed, adapter, configuration, **module_kwargs):
    module = installed(fake_module(**module_kwargs))
    adapter.load(configuration)
    return module, adapter._model


def test_generate_streams_text_and_reports_runtime_usage(installed, adapter, configuration):
    _, model = _loaded(installed, adapter, configuration)
    result = adapter.generate(GenerationRequest(prompt="hi", max_tokens=8, temperature=0.1))
    assert result.text == "Hello world"
    assert result.output_tokens == 2
    assert result.input_tokens == 7
    assert result.token_count_source == "runtime:usage"
    assert result.first_token_ms is not None and result.first_token_ms > 0
    assert result.finish_reason == "stop"
    assert result.runtime_metadata["is_test_runtime"] is False
    prompt, parameters = model.calls[0]
    assert prompt == "hi"
    assert parameters["max_tokens"] == 8
    assert parameters["temperature"] == 0.1
    assert parameters["stream"] is True


def test_generate_prefixes_system_prompt_and_passes_seed(installed, adapter, configuration):
    _, model = _loaded(installed, adapter, configuration)
    adapter.generate(
        GenerationRequest(prompt="question", system_prompt="be terse", seed=42, stop=("</s>",))
    )
    prompt, parameters = model.calls[0]
    assert prompt == "be terse\n\nquestion"
    assert parameters["seed"] == 42
    assert parameters["stop"] == ["</s>"]


def test_generate_falls_back_to_the_model_tokenizer(installed, adapter, configuration):
    _, model = _loaded(installed, adapter, configuration)
    model.stream = FakeStream([{"choices": [{"text": "one two three"}]}])
    result = adapter.generate(GenerationRequest(prompt="a b"))
    assert result.token_count_source == "tokenizer:llama_cpp"
    assert result.input_tokens == 2
    assert result.output_tokens == 3


def test_generate_keeps_token_counts_null_when_no_source_exists(installed, adapter, configuration):
    _, model = _loaded(installed, adapter, configuration)
    model.stream = FakeStream([{"choices": [{"text": "text"}]}])

    def broken_tokenize(data: bytes):
        raise RuntimeError("tokenizer unavailable")

    model.tokenize = broken_tokenize
    result = adapter.generate(GenerationRequest(prompt="a b"))
    assert result.input_tokens is None
    assert result.output_tokens is None
    assert result.token_count_source is None


def test_generate_rejects_an_unloaded_model(adapter):
    with pytest.raises(InferenceFailure) as caught:
        adapter.generate(GenerationRequest(prompt="hi"))
    assert caught.value.code == "model_not_loaded"


def test_generate_translates_stream_failures_without_path_leaks(installed, adapter, configuration):
    _, model = _loaded(installed, adapter, configuration)
    model.stream = FakeStream(
        [{"choices": [{"text": "partial"}]}],
        error=RuntimeError(f"decode failed for {configuration.model_path}"),
    )
    with pytest.raises(InferenceFailure) as caught:
        adapter.generate(GenerationRequest(prompt="hi"))
    assert caught.value.code == "inference_failed"
    assert str(configuration.model_path) not in str(caught.value)
    assert "<model>" in str(caught.value)


def test_generate_times_out_between_chunks_and_closes_the_stream(
    installed, adapter, configuration, monkeypatch
):
    _, model = _loaded(installed, adapter, configuration)
    stream = FakeStream(
        [
            {"choices": [{"text": "first"}]},
            {"choices": [{"text": "second"}]},
        ]
    )
    model.stream = stream

    ticks = iter([0.0, 0.2, 1.0])
    monkeypatch.setattr(llamacpp_module, "monotonic", lambda: next(ticks))
    with pytest.raises(InferenceTimeout) as caught:
        adapter.generate(GenerationRequest(prompt="hi", timeout_seconds=0.5))
    assert caught.value.code == "inference_timeout"
    assert stream.closed is True


def test_generate_returns_empty_text_without_fake_first_token(installed, adapter, configuration):
    _, model = _loaded(installed, adapter, configuration)
    model.stream = FakeStream(
        [{"choices": [{"text": "", "finish_reason": "length"}]}],
    )
    result = adapter.generate(GenerationRequest(prompt="hi"))
    assert result.text == ""
    assert result.first_token_ms is None
    assert result.finish_reason == "length"
