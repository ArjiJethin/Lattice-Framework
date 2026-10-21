from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from app.benchmarking.metrics import aggregate_measurements, measure_repetition
from app.runtime.base import GenerationRequest, RuntimeConfiguration
from app.runtime.fake import FakeRuntimeAdapter, FakeRuntimeProfile


def make_adapter(profile: FakeRuntimeProfile | None = None) -> FakeRuntimeAdapter:
    adapter = FakeRuntimeAdapter(
        profile or FakeRuntimeProfile(generation_delay_ms=1, ttft_delay_ms=1, output_tokens=10)
    )
    adapter.load(
        RuntimeConfiguration(
            configuration_id="cfg",
            model_id="tiny",
            model_path=Path("tiny.gguf"),
            model_format="gguf",
            quantization="q4_k_m",
            context_length=1024,
        )
    )
    return adapter


def run_once(adapter: FakeRuntimeAdapter, **kwargs):
    request = GenerationRequest(
        prompt="hello",
        max_tokens=kwargs.pop("max_tokens", 10),
        timeout_seconds=kwargs.pop("timeout_seconds", 5.0),
        stream=True,
    )
    values = {
        "sequence": 1,
        "repetition_index": 1,
        "kind": "measured",
        "collect_memory": False,
        "sampling_interval_ms": 50,
    }
    values.update(kwargs)
    return measure_repetition(adapter, request, **values)


def test_successful_repetition_provenance_and_derived_metrics():
    draft = run_once(make_adapter())
    assert draft.status == "completed"
    assert draft.output_tokens == 10
    assert draft.token_count_source == "runtime"
    assert draft.ttft_ms is not None and draft.ttft_ms >= 0
    assert draft.latency_ms is not None and draft.latency_ms > 0
    assert draft.metrics["ttft_ms"]["status"] == "measured"
    assert draft.metrics["output_tokens"]["status"] == "measured"
    assert draft.metrics["time_per_output_token_ms"]["status"] == "derived"
    assert draft.metrics["output_throughput_tps"]["status"] == "derived"
    assert draft.output_throughput_tps == pytest.approx(10 / (draft.latency_ms / 1000.0), rel=1e-6)
    assert draft.time_per_output_token_ms == pytest.approx(draft.latency_ms / 10, rel=1e-6)
    assert draft.metrics["output_throughput_tps"]["method"].startswith("output_tokens /")


def test_ttft_unavailable_without_stream_timestamps():
    draft = run_once(
        make_adapter(FakeRuntimeProfile(ttft_delay_ms=0, supports_streaming=False, output_tokens=4))
    )
    assert draft.ttft_ms is None
    assert draft.metrics["ttft_ms"]["status"] == "unavailable"
    assert draft.metrics["ttft_ms"]["value"] is None
    assert "first-token" in draft.metrics["ttft_ms"]["reason"]
    # End-to-end metrics remain valid.
    assert draft.metrics["latency_ms"]["status"] == "measured"
    assert draft.metrics["decode_throughput_tps"]["status"] == "unavailable"


def test_zero_output_tokens_never_divides_by_zero():
    draft = run_once(make_adapter(FakeRuntimeProfile(output_tokens=0, generation_delay_ms=0)))
    assert draft.output_tokens == 0
    assert draft.output_throughput_tps is None
    assert draft.time_per_output_token_ms is None
    assert draft.metrics["output_throughput_tps"]["status"] == "unavailable"
    assert "zero output tokens" in draft.metrics["output_throughput_tps"]["reason"]
    assert draft.metrics["latency_ms"]["value"] is not None


def test_missing_token_counts_prevent_throughput():
    profile = FakeRuntimeProfile(emit_token_counts=False, supports_token_counts=False)
    draft = run_once(make_adapter(profile))
    assert draft.output_tokens is None
    assert draft.token_count_source is None
    assert draft.metrics["output_throughput_tps"]["status"] == "unavailable"
    assert draft.metrics["output_tokens"]["status"] == "unavailable"


def test_failed_repetition_keeps_failure_and_no_latency_sample():
    profile = FakeRuntimeProfile(fail_on_calls={1})
    draft = run_once(make_adapter(profile))
    assert draft.status == "failed"
    assert draft.error_code == "inference_failed"
    assert draft.latency_ms is None
    assert draft.metrics["latency_ms"]["status"] == "unavailable"
    assert draft.metrics["failed_duration_ms"]["status"] == "measured"
    assert draft.metrics["failed_duration_ms"]["value"] is not None


def test_timeout_is_recorded_as_failure():
    profile = FakeRuntimeProfile(timeout_on_calls={1})
    draft = run_once(make_adapter(profile))
    assert draft.status == "failed"
    assert draft.error_code == "inference_timeout"
    assert draft.latency_ms is None


def test_memory_collection_disabled_is_not_applicable_not_zero():
    draft = run_once(make_adapter(), collect_memory=False)
    for metric in (
        "peak_process_rss_mb",
        "peak_system_ram_used_mb",
        "peak_gpu_device_memory_used_mb",
        "peak_gpu_utilization_pct",
    ):
        assert draft.metrics[metric]["status"] == "not_applicable"
        assert draft.metrics[metric]["value"] is None


def test_gpu_memory_is_missing_without_collector():
    draft = run_once(make_adapter(), collect_memory=True)
    assert draft.metrics["peak_gpu_device_memory_used_mb"]["value"] is None
    assert draft.metrics["peak_gpu_device_memory_used_mb"]["status"] in {
        "unavailable",
        "not_applicable",
        "not_detected",
    }


def _draft(kind: str, status: str, latency: float | None) -> SimpleNamespace:
    metrics = {
        "latency_ms": {
            "value": latency,
            "status": "measured" if latency is not None else "unavailable",
            "method": "perf_counter",
            "reason": None,
        }
    }
    return SimpleNamespace(kind=kind, status=status, metrics_json=metrics)


def test_warmups_are_excluded_from_aggregates_but_raw_rows_preserved():
    measurements = [
        _draft("warmup", "completed", 999.0),
        _draft("measured", "completed", 10.0),
        _draft("measured", "completed", 20.0),
    ]
    summaries = aggregate_measurements(measurements, failed_count=0)
    latency = next(item for item in summaries if item["metric_name"] == "latency_ms")
    assert latency["sample_count"] == 2
    assert latency["mean"] == pytest.approx(15.0)
    assert latency["maximum"] == pytest.approx(20.0)


def test_failed_repetitions_excluded_from_numeric_aggregates_and_reported():
    measurements = [
        _draft("measured", "completed", 10.0),
        SimpleNamespace(
            kind="measured",
            status="failed",
            metrics_json={"latency_ms": {"value": None, "status": "unavailable"}},
        ),
    ]
    summaries = aggregate_measurements(measurements, failed_count=1)
    latency = next(item for item in summaries if item["metric_name"] == "latency_ms")
    assert latency["sample_count"] == 1
    assert latency["mean"] == pytest.approx(10.0)
    assert latency["failed_count"] == 1


def test_all_failed_aggregate_has_no_numeric_values():
    measurements = [
        SimpleNamespace(kind="measured", status="failed", metrics_json={}),
        SimpleNamespace(kind="measured", status="failed", metrics_json={}),
    ]
    summaries = aggregate_measurements(measurements, failed_count=2)
    for summary in summaries:
        assert summary["status"] == "unavailable"
        assert summary["mean"] is None
