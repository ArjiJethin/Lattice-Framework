"""Canonical benchmark protocol and metric catalogue."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

PROTOCOL_ID = "lattice.benchmark"
PROTOCOL_VERSION = "lattice.benchmark/1.0.0"
SNAPSHOT_SCHEMA_VERSION = "lattice.benchmark-snapshot/1"
DECISION_SNAPSHOT_SCHEMA_VERSION = "lattice.decision/1"
EXPORT_SCHEMA_VERSION = "lattice.experiment-export/1"
CONFIGURATION_EXPORT_SCHEMA_VERSION = "lattice.configurations/1"

#: Every metric the engine can emit, with canonical unit and collection note.
METRIC_CATALOGUE: tuple[dict[str, Any], ...] = (
    {
        "name": "ttft_ms",
        "unit": "ms",
        "kind": "measured",
        "description": (
            "dispatch to first streamed token; unavailable without first-token timestamps"
        ),
    },
    {
        "name": "latency_ms",
        "unit": "ms",
        "kind": "measured",
        "description": "dispatch to generation completion for successful repetitions",
    },
    {
        "name": "generation_duration_ms",
        "unit": "ms",
        "kind": "measured",
        "description": "same window as latency_ms in this protocol (no prefill split available)",
    },
    {
        "name": "output_tokens",
        "unit": "tokens",
        "kind": "measured",
        "description": "runtime-reported count, else exact model tokenizer, else unavailable",
    },
    {
        "name": "input_tokens",
        "unit": "tokens",
        "kind": "measured",
        "description": "same provenance rules as output tokens",
    },
    {
        "name": "time_per_output_token_ms",
        "unit": "ms/token",
        "kind": "derived",
        "description": (
            "latency_ms / output_tokens for successful repetitions with output_tokens > 0"
        ),
    },
    {
        "name": "output_throughput_tps",
        "unit": "tokens/s",
        "kind": "derived",
        "description": "output_tokens / end-to-end latency seconds (includes prefill)",
    },
    {
        "name": "decode_throughput_tps",
        "unit": "tokens/s",
        "kind": "derived",
        "description": "output_tokens / (latency - ttft) when TTFT is measured",
    },
    {
        "name": "peak_process_rss_mb",
        "unit": "MB",
        "kind": "measured",
        "description": "observed peak of process RSS via psutil sampling",
    },
    {
        "name": "peak_system_ram_used_mb",
        "unit": "MB",
        "kind": "measured",
        "description": "observed peak of device-wide used system RAM via psutil sampling",
    },
    {
        "name": "peak_gpu_device_memory_used_mb",
        "unit": "MB",
        "kind": "measured",
        "description": "device-wide VRAM peak from NVML/nvidia-smi; not process-attributed",
    },
    {
        "name": "peak_gpu_utilization_pct",
        "unit": "percent",
        "kind": "measured",
        "description": "device-wide GPU utilization peak when a supported collector exists",
    },
    {
        "name": "model_load_ms",
        "unit": "ms",
        "kind": "measured",
        "description": "run-level cold model load duration (excluded from latency)",
    },
    {
        "name": "quality_score",
        "unit": "evaluator-defined",
        "kind": "measured",
        "description": (
            "score from a declared evaluator; unavailable when no evaluator is configured"
        ),
    },
)

NUMERIC_SUMMARY_METRICS: tuple[str, ...] = tuple(
    metric["name"] for metric in METRIC_CATALOGUE if metric["name"] != "quality_score"
)


@dataclass
class BenchmarkProtocol:
    repetitions: int
    warmups: int
    timeout_seconds: float
    generation_parameters: dict[str, Any] = field(default_factory=dict)
    collect_memory: bool = True
    memory_sampling_interval_ms: int = 50
    quality_evaluator: str | None = None
    stream: bool = True
    protocol_id: str = PROTOCOL_ID
    protocol_version: str = PROTOCOL_VERSION

    def to_dict(self) -> dict[str, Any]:
        return {
            "protocol_id": self.protocol_id,
            "protocol_version": self.protocol_version,
            "warmups": self.warmups,
            "repetitions": self.repetitions,
            "timeout_seconds": self.timeout_seconds,
            "generation_parameters": self.generation_parameters,
            "collect_memory": self.collect_memory,
            "memory_sampling_interval_ms": self.memory_sampling_interval_ms,
            "quality_evaluator": self.quality_evaluator,
            "stream": self.stream,
            "warmups_excluded_from_aggregates": True,
            "percentile_method": "linear interpolation (R-7), requires n >= 5",
            "stddev_method": "sample standard deviation, requires n >= 2",
            "latency_unit": "milliseconds",
            "throughput_unit": "tokens/second",
            "token_count_policy": "runtime usage > exact model tokenizer > unavailable",
            "failure_policy": "failed repetitions are recorded; run status becomes partial",
        }


__all__ = [
    "CONFIGURATION_EXPORT_SCHEMA_VERSION",
    "DECISION_SNAPSHOT_SCHEMA_VERSION",
    "EXPORT_SCHEMA_VERSION",
    "METRIC_CATALOGUE",
    "NUMERIC_SUMMARY_METRICS",
    "PROTOCOL_ID",
    "PROTOCOL_VERSION",
    "SNAPSHOT_SCHEMA_VERSION",
    "BenchmarkProtocol",
]
