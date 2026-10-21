"""Repetition measurement collection.

The collector owns all measurement arithmetic and provenance.  Warm-up
repetitions are recorded but never enter aggregates.  Failed repetitions keep
their failure information and memory samples, but their duration is **not**
reported as a successful latency sample.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.benchmarking.statistics import summarize_metric
from app.core.enums import MetricStatus, RepetitionStatus
from app.core.time import monotonic, utcnow
from app.hardware.telemetry import ResourceMonitor
from app.runtime.base import (
    BaseRuntimeAdapter,
    GenerationRequest,
    RuntimeFailure,
)

METRIC_UNITS: dict[str, str] = {
    "ttft_ms": "ms",
    "latency_ms": "ms",
    "generation_duration_ms": "ms",
    "input_tokens": "tokens",
    "output_tokens": "tokens",
    "time_per_output_token_ms": "ms/token",
    "output_throughput_tps": "tokens/s",
    "decode_throughput_tps": "tokens/s",
    "peak_process_rss_mb": "MB",
    "peak_system_ram_used_mb": "MB",
    "peak_gpu_device_memory_used_mb": "MB",
    "peak_gpu_utilization_pct": "percent",
}

METRIC_METHODS: dict[str, str] = {
    "ttft_ms": "perf_counter dispatch->first streamed token",
    "latency_ms": "perf_counter dispatch->generation completion",
    "generation_duration_ms": (
        "perf_counter dispatch->generation completion (same window as latency)"
    ),
    "output_tokens": "runtime usage, else exact model tokenizer",
    "input_tokens": "runtime usage, else exact model tokenizer",
    "time_per_output_token_ms": "latency_ms / output_tokens",
    "output_throughput_tps": "output_tokens / end-to-end latency seconds (includes prefill)",
    "decode_throughput_tps": "output_tokens / (latency - ttft) seconds (excludes prefill)",
    "peak_process_rss_mb": "psutil RSS sampling during repetition",
    "peak_system_ram_used_mb": "psutil system used-memory sampling during repetition",
    "peak_gpu_device_memory_used_mb": (
        "NVML/nvidia-smi device-wide VRAM sampling during repetition"
    ),
    "peak_gpu_utilization_pct": (
        "NVML/nvidia-smi device-wide utilization sampling during repetition"
    ),
}


def metric_value(
    name: str,
    value: float | int | None,
    status: MetricStatus,
    *,
    method: str | None = None,
    unit: str | None = None,
    reason: str | None = None,
    sample_count: int | None = 1,
) -> dict[str, Any]:
    """Build one metric envelope.  Non-finite values are never persisted."""
    numeric: float | None
    if value is None:
        numeric = None
    elif isinstance(value, bool):
        numeric = None
        status = MetricStatus.UNAVAILABLE
        reason = reason or "boolean value is not a numeric metric"
    else:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            numeric = None
            status = MetricStatus.FAILED
            reason = reason or "value is not numeric"
        else:
            if not math.isfinite(numeric):
                numeric = None
                status = MetricStatus.FAILED
                reason = reason or "value is not finite"
    if numeric is None and status in (
        MetricStatus.MEASURED,
        MetricStatus.DERIVED,
        MetricStatus.ESTIMATED,
    ):
        status = MetricStatus.UNAVAILABLE
    return {
        "name": name,
        "value": numeric,
        "unit": unit or METRIC_UNITS.get(name),
        "status": status.value,
        "method": method or METRIC_METHODS.get(name, "unknown"),
        "reason": reason,
        "sample_count": sample_count if numeric is not None else 0,
    }


@dataclass
class MeasurementDraft:
    sequence: int
    repetition_index: int | None
    kind: str
    status: str
    started_at: datetime
    finished_at: datetime
    input_tokens: int | None = None
    output_tokens: int | None = None
    token_count_source: str | None = None
    ttft_ms: float | None = None
    latency_ms: float | None = None
    generation_duration_ms: float | None = None
    time_per_output_token_ms: float | None = None
    output_throughput_tps: float | None = None
    peak_process_rss_mb: float | None = None
    system_ram_used_mb: float | None = None
    gpu_device_memory_used_mb: float | None = None
    gpu_utilization_pct: float | None = None
    metrics: dict[str, Any] = field(default_factory=dict)
    error_code: str | None = None
    error_message: str | None = None
    runtime_metadata: dict[str, Any] = field(default_factory=dict)
    output_text: str | None = None

    def metric(self, name: str) -> dict[str, Any] | None:
        return self.metrics.get(name)


def _memory_metrics(
    peaks: dict[str, float | None],
    statuses: dict[str, str],
    reasons: dict[str, str],
    methods: dict[str, str],
    *,
    enabled: bool,
) -> dict[str, Any]:
    mapping = {
        "peak_process_rss_mb": "peak_process_rss_mb",
        "peak_system_ram_used_mb": "peak_system_ram_used_mb",
        "peak_gpu_device_memory_used_mb": "peak_gpu_device_memory_used_mb",
        "peak_gpu_utilization_pct": "peak_gpu_utilization_pct",
    }
    result: dict[str, Any] = {}
    for metric_name, peak_key in mapping.items():
        if not enabled:
            result[metric_name] = metric_value(
                metric_name,
                None,
                MetricStatus.NOT_APPLICABLE,
                reason="memory collection disabled for this benchmark",
            )
            continue
        value = peaks.get(peak_key)
        status_value = statuses.get(peak_key)
        status = MetricStatus.UNAVAILABLE
        if value is not None and status_value == "available":
            status = MetricStatus.MEASURED
        elif status_value == "not_applicable":
            status = MetricStatus.NOT_APPLICABLE
        result[metric_name] = metric_value(
            metric_name,
            value,
            status,
            method=methods.get(peak_key),
            reason=reasons.get(peak_key),
        )
    return result


def measure_repetition(
    adapter: BaseRuntimeAdapter,
    request: GenerationRequest,
    *,
    sequence: int,
    repetition_index: int | None,
    kind: str,
    collect_memory: bool,
    sampling_interval_ms: int,
    gpu_collector: Any | None = None,
) -> MeasurementDraft:
    """Execute exactly one repetition and return a provenance-rich draft."""
    started_at = utcnow()
    monitor = (
        ResourceMonitor(sampling_interval_ms, gpu_collector=gpu_collector)
        if collect_memory
        else None
    )
    if monitor is not None:
        monitor.start()
    start = monotonic()
    result = None
    failure: RuntimeFailure | None = None
    try:
        result = adapter.generate(request)
    except RuntimeFailure as exc:
        failure = exc
    except Exception as exc:  # defensive: adapters should raise RuntimeFailure
        failure = RuntimeFailure(
            f"runtime raised {exc.__class__.__name__}", code="internal_runtime_error"
        )
    end = monotonic()
    finished_at = utcnow()
    sampling = monitor.stop() if monitor is not None else None
    memory_metrics = _memory_metrics(
        sampling.peaks if sampling else {},
        sampling.statuses if sampling else {},
        sampling.reasons if sampling else {},
        sampling.methods if sampling else {},
        enabled=collect_memory,
    )

    if failure is not None or result is None:
        duration_ms = max(0.0, (end - start) * 1000.0)
        metrics = {
            **memory_metrics,
            "failed_duration_ms": metric_value(
                "failed_duration_ms",
                round(duration_ms, 6),
                MetricStatus.MEASURED,
                method="perf_counter dispatch->failure (not a latency sample)",
                unit="ms",
            ),
            "latency_ms": metric_value(
                "latency_ms",
                None,
                MetricStatus.UNAVAILABLE,
                reason="repetition failed; failed duration is reported separately",
            ),
            "ttft_ms": metric_value(
                "ttft_ms", None, MetricStatus.UNAVAILABLE, reason="repetition failed"
            ),
            "output_throughput_tps": metric_value(
                "output_throughput_tps",
                None,
                MetricStatus.UNAVAILABLE,
                reason="repetition failed",
            ),
            "time_per_output_token_ms": metric_value(
                "time_per_output_token_ms",
                None,
                MetricStatus.UNAVAILABLE,
                reason="repetition failed",
            ),
            "output_tokens": metric_value(
                "output_tokens",
                None,
                MetricStatus.UNAVAILABLE,
                reason="repetition failed before token accounting",
            ),
            "input_tokens": metric_value(
                "input_tokens",
                None,
                MetricStatus.UNAVAILABLE,
                reason="repetition failed before token accounting",
            ),
        }
        return MeasurementDraft(
            sequence=sequence,
            repetition_index=repetition_index,
            kind=kind,
            status=RepetitionStatus.FAILED.value,
            started_at=started_at,
            finished_at=finished_at,
            metrics=metrics,
            peak_process_rss_mb=memory_metrics["peak_process_rss_mb"]["value"],
            system_ram_used_mb=memory_metrics["peak_system_ram_used_mb"]["value"],
            gpu_device_memory_used_mb=memory_metrics["peak_gpu_device_memory_used_mb"]["value"],
            gpu_utilization_pct=memory_metrics["peak_gpu_utilization_pct"]["value"],
            error_code=failure.code if failure else "runtime_failure",
            error_message=(failure.message if failure else "runtime returned no result")[:500],
            runtime_metadata={"adapter_id": adapter.adapter_id, "failed": True},
        )

    latency_ms = max(0.0, (end - start) * 1000.0)
    ttft_ms: float | None = None
    ttft_metric: dict[str, Any]
    if result.first_token_ms is not None and 0 <= result.first_token_ms <= latency_ms + 1e-6:
        ttft_ms = round(float(result.first_token_ms), 6)
        ttft_metric = metric_value("ttft_ms", ttft_ms, MetricStatus.MEASURED)
    else:
        ttft_metric = metric_value(
            "ttft_ms",
            None,
            MetricStatus.UNAVAILABLE,
            reason="runtime did not expose a first-token timestamp (streaming required)",
        )
    output_tokens = result.output_tokens
    input_tokens = result.input_tokens
    token_source = result.token_count_source
    token_metric_status = (
        MetricStatus.MEASURED if output_tokens is not None else MetricStatus.UNAVAILABLE
    )
    token_reason = (
        None
        if output_tokens is not None
        else "runtime and tokenizer did not supply an exact token count"
    )

    # Throughput denominators are explicit: end-to-end latency includes prefill.
    throughput: float | None = None
    throughput_metric: dict[str, Any]
    if output_tokens is not None and output_tokens > 0 and latency_ms > 0:
        throughput = round(float(output_tokens) / (latency_ms / 1000.0), 6)
        throughput_metric = metric_value(
            "output_throughput_tps",
            throughput,
            MetricStatus.DERIVED,
            method=METRIC_METHODS["output_throughput_tps"],
        )
    else:
        reason = (
            "zero output tokens; throughput is undefined"
            if output_tokens == 0
            else "output token count unavailable; throughput cannot be derived"
        )
        throughput_metric = metric_value(
            "output_throughput_tps", None, MetricStatus.UNAVAILABLE, reason=reason
        )

    tpot: float | None = None
    tpot_metric: dict[str, Any]
    if output_tokens is not None and output_tokens > 0:
        tpot = round(latency_ms / float(output_tokens), 6)
        tpot_metric = metric_value("time_per_output_token_ms", tpot, MetricStatus.DERIVED)
    else:
        tpot_metric = metric_value(
            "time_per_output_token_ms",
            None,
            MetricStatus.UNAVAILABLE,
            reason=(
                "zero output tokens; per-token time is undefined"
                if output_tokens == 0
                else "output token count unavailable"
            ),
        )

    decode_metric: dict[str, Any]
    if ttft_ms is not None and output_tokens is not None and output_tokens > 0:
        decode_window_ms = latency_ms - ttft_ms
        if decode_window_ms > 0:
            decode_metric = metric_value(
                "decode_throughput_tps",
                round(float(output_tokens) / (decode_window_ms / 1000.0), 6),
                MetricStatus.DERIVED,
            )
        else:
            decode_metric = metric_value(
                "decode_throughput_tps",
                None,
                MetricStatus.UNAVAILABLE,
                reason="non-positive post-TTFT window",
            )
    else:
        decode_metric = metric_value(
            "decode_throughput_tps",
            None,
            MetricStatus.UNAVAILABLE,
            reason="TTFT or output token count unavailable",
        )

    metrics: dict[str, Any] = {
        **memory_metrics,
        "ttft_ms": ttft_metric,
        "latency_ms": metric_value("latency_ms", round(latency_ms, 6), MetricStatus.MEASURED),
        "generation_duration_ms": metric_value(
            "generation_duration_ms",
            round(latency_ms, 6),
            MetricStatus.MEASURED,
            method=METRIC_METHODS["generation_duration_ms"],
        ),
        "input_tokens": metric_value(
            "input_tokens",
            input_tokens,
            MetricStatus.MEASURED if input_tokens is not None else MetricStatus.UNAVAILABLE,
            method=f"token_count_source:{token_source or 'unavailable'}",
            reason=None if input_tokens is not None else token_reason,
        ),
        "output_tokens": metric_value(
            "output_tokens",
            output_tokens,
            token_metric_status,
            method=f"token_count_source:{token_source or 'unavailable'}",
            reason=token_reason,
        ),
        "time_per_output_token_ms": tpot_metric,
        "output_throughput_tps": throughput_metric,
        "decode_throughput_tps": decode_metric,
    }
    return MeasurementDraft(
        sequence=sequence,
        repetition_index=repetition_index,
        kind=kind,
        status=RepetitionStatus.COMPLETED.value,
        started_at=started_at,
        finished_at=finished_at,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        token_count_source=token_source,
        ttft_ms=ttft_ms,
        latency_ms=round(latency_ms, 6),
        generation_duration_ms=round(latency_ms, 6),
        time_per_output_token_ms=tpot,
        output_throughput_tps=throughput,
        peak_process_rss_mb=memory_metrics["peak_process_rss_mb"]["value"],
        system_ram_used_mb=memory_metrics["peak_system_ram_used_mb"]["value"],
        gpu_device_memory_used_mb=memory_metrics["peak_gpu_device_memory_used_mb"]["value"],
        gpu_utilization_pct=memory_metrics["peak_gpu_utilization_pct"]["value"],
        metrics=metrics,
        runtime_metadata=result.runtime_metadata,
        output_text=result.text,
    )


def aggregate_measurements(
    measurements: list[Any],
    *,
    failed_count: int,
) -> list[dict[str, Any]]:
    """Aggregate non-warmup repetitions per metric.

    ``measurements`` may be drafts or persisted ORM rows; both expose
    ``kind``, ``status``, ``metrics``/``metrics_json``.
    """
    measured = [item for item in measurements if item.kind == "measured"]
    successful = [item for item in measured if item.status == RepetitionStatus.COMPLETED.value]
    metric_names: list[str] = [
        "ttft_ms",
        "latency_ms",
        "generation_duration_ms",
        "input_tokens",
        "output_tokens",
        "time_per_output_token_ms",
        "output_throughput_tps",
        "decode_throughput_tps",
        "peak_process_rss_mb",
        "peak_system_ram_used_mb",
        "peak_gpu_device_memory_used_mb",
        "peak_gpu_utilization_pct",
    ]
    summaries: list[dict[str, Any]] = []
    for name in metric_names:
        numeric_values: list[float] = []
        metric_status = MetricStatus.UNAVAILABLE
        method: str | None = None
        reason: str | None = None
        for item in successful:
            payload = getattr(item, "metrics_json", None) or getattr(item, "metrics", {}) or {}
            metric = payload.get(name)
            if not isinstance(metric, dict):
                continue
            status = metric.get("status")
            if status in ("measured", "derived", "estimated") and metric.get("value") is not None:
                numeric_values.append(float(metric["value"]))
                if metric_status == MetricStatus.UNAVAILABLE:
                    metric_status = MetricStatus(status)
                method = method or metric.get("method")
            elif reason is None:
                reason = metric.get("reason")
                if status and method is None:
                    method = metric.get("method")
        if numeric_values and metric_status == MetricStatus.UNAVAILABLE:
            metric_status = MetricStatus.MEASURED
        summaries.append(
            summarize_metric(
                name,
                numeric_values,
                unit=METRIC_UNITS.get(name),
                status=metric_status,
                method=method,
                reason=reason,
                failed_count=failed_count,
            )
        )
    return summaries


def metric_summary_map(summaries: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {summary["metric_name"]: summary for summary in summaries}


__all__ = [
    "METRIC_METHODS",
    "METRIC_UNITS",
    "MeasurementDraft",
    "aggregate_measurements",
    "measure_repetition",
    "metric_summary_map",
    "metric_value",
]
