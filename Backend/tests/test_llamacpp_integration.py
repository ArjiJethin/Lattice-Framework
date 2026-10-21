"""Optional real-model integration test.

This module is skipped unless BOTH prerequisites are supplied deliberately:

* ``llama-cpp-python`` is importable, and
* ``LATTICE_REAL_MODEL_PATH`` points at an existing local ``.gguf`` file.

Nothing is downloaded and no model is generated.  The test measures a single
short generation and asserts only structural facts (non-empty text, positive
load time, cleanup) so it stays useful without asserting machine-dependent
latency numbers.  Run it explicitly:

    $env:LATTICE_REAL_MODEL_PATH = "C:\\models\\tinyllama.gguf"
    .\\.venv\\Scripts\\python.exe -m pytest tests/test_llamacpp_integration.py -v -s
"""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path

import pytest

from app.runtime.base import GenerationRequest, RuntimeConfiguration
from app.runtime.llamacpp import LlamaCppAdapter

MODEL_ENV = "LATTICE_REAL_MODEL_PATH"


def _model_path() -> Path | None:
    raw = os.environ.get(MODEL_ENV)
    if not raw:
        return None
    path = Path(raw).expanduser()
    return path if path.is_file() else None


pytestmark = pytest.mark.skipif(
    importlib.util.find_spec("llama_cpp") is None,
    reason="llama-cpp-python is not installed (install the optional runtime extra)",
)


def test_real_model_load_generate_unload() -> None:
    model_path = _model_path()
    if model_path is None:
        pytest.skip(f"set {MODEL_ENV} to an existing local .gguf file to run this test")

    adapter = LlamaCppAdapter()
    capabilities = adapter.capabilities()
    assert capabilities.available is True, capabilities.reason

    configuration = RuntimeConfiguration(
        configuration_id="real-model-check",
        model_id=model_path.stem,
        model_path=model_path,
        model_format="gguf",
        quantization=None,
        context_length=512,
        thread_count=2,
        batch_size=64,
        gpu_layers=0,
    )
    validation = adapter.validate(configuration)
    assert validation.valid is True, validation.to_dict()

    try:
        loaded = adapter.load(configuration)
        assert loaded.load_duration_ms > 0
        assert loaded.runtime_metadata["is_test_runtime"] is False
        print(f"\nREAL MODEL: loaded in {loaded.load_duration_ms:.1f} ms")
        print(f"REAL MODEL: effective execution mode {loaded.effective_execution_mode}")

        result = adapter.generate(
            GenerationRequest(
                prompt="Reply with the single word: ready",
                max_tokens=8,
                temperature=0.0,
                timeout_seconds=120.0,
            )
        )
        print(f"REAL MODEL: output {result.text!r}")
        print(
            "REAL MODEL: tokens "
            f"in={result.input_tokens} out={result.output_tokens} "
            f"source={result.token_count_source} ttft_ms={result.first_token_ms}"
        )
        assert result.text is not None
        assert result.text.strip() != ""
        assert result.runtime_metadata["is_test_runtime"] is False
        # Token counts are optional: a runtime/version without usage or a working
        # tokenizer must report null rather than a fabricated number.
        assert result.output_tokens is None or result.output_tokens >= 1
    finally:
        adapter.unload()
        assert adapter.is_loaded is False
