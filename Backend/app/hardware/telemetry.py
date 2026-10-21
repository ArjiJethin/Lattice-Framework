"""Per-execution resource sampling.

The sampler runs a lightweight daemon thread for the duration of a single
inference/benchmark repetition and records observed peaks.  It is explicitly
not a peak guarantee: samples happen at a configurable interval and very short
spikes can be missed.  When a collector is unavailable the corresponding value
stays ``None`` with a status/reason - never zero.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Any

from app.core.enums import AvailabilityStatus
from app.core.logging import get_logger

logger = get_logger(__name__)

try:  # pragma: no cover - host dependent
    import psutil
except Exception:  # pragma: no cover
    psutil = None  # type: ignore[assignment]


@dataclass
class SamplingResult:
    peaks: dict[str, float | None] = field(default_factory=dict)
    statuses: dict[str, str] = field(default_factory=dict)
    methods: dict[str, str] = field(default_factory=dict)
    reasons: dict[str, str] = field(default_factory=dict)
    sample_count: int = 0
    interval_ms: int = 50


class ResourceMonitor:
    """Sample process/system/GPU resources while a repetition executes."""

    def __init__(self, interval_ms: int = 50, *, gpu_collector: Any | None = None) -> None:
        self.interval_ms = max(10, int(interval_ms))
        self._gpu_collector = gpu_collector
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._peaks: dict[str, float] = {}
        self._samples = 0
        self._statuses: dict[str, str] = {}
        self._reasons: dict[str, str] = {}
        self._methods: dict[str, str] = {
            "peak_process_rss_mb": (
                f"psutil.Process().memory_info().rss sampled every {self.interval_ms} ms"
            ),
            "peak_system_ram_used_mb": (
                f"psutil.virtual_memory().used sampled every {self.interval_ms} ms"
            ),
            "peak_gpu_device_memory_used_mb": (
                "NVML/NVIDIA-SMI device-wide memory sampled during execution"
            ),
            "peak_gpu_utilization_pct": (
                "NVML/NVIDIA-SMI device utilization sampled during execution"
            ),
        }
        if psutil is None:
            for key in ("peak_process_rss_mb", "peak_system_ram_used_mb"):
                self._statuses[key] = AvailabilityStatus.NOT_INSTALLED.value
                self._reasons[key] = "psutil is not installed"

    # -- lifecycle ---------------------------------------------------------
    def start(self) -> None:
        if psutil is None and self._gpu_collector is None:
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._loop, name="lattice-resource-monitor", daemon=True
        )
        self._thread.start()

    def stop(self) -> SamplingResult:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        result = SamplingResult(
            peaks={
                key: (round(value, 3) if value is not None else None)
                for key, value in self._peaks.items()
            },
            statuses=dict(self._statuses),
            methods=dict(self._methods),
            reasons=dict(self._reasons),
            sample_count=self._samples,
            interval_ms=self.interval_ms,
        )
        # Fill explicit statuses for anything not observed.
        for key in ("peak_process_rss_mb", "peak_system_ram_used_mb"):
            if key not in result.peaks and key not in result.statuses:
                result.statuses[key] = AvailabilityStatus.UNSUPPORTED.value
                result.reasons[key] = "collector did not return a sample"
        for key in ("peak_gpu_device_memory_used_mb", "peak_gpu_utilization_pct"):
            if key not in result.peaks and key not in result.statuses:
                result.statuses[key] = (
                    AvailabilityStatus.NOT_APPLICABLE.value
                    if self._gpu_collector is None
                    or not getattr(self._gpu_collector, "enabled", False)
                    else AvailabilityStatus.NOT_DETECTED.value
                )
                result.reasons[key] = "no GPU telemetry sample was available during execution"
        return result

    # -- sampling ----------------------------------------------------------
    def _loop(self) -> None:
        gpu_counter = 0
        while not self._stop.wait(self.interval_ms / 1000.0):
            self._sample_once(gpu_counter)
            gpu_counter += 1
        # final sample so short executions still record something
        self._sample_once(gpu_counter)

    def _sample_once(self, counter: int) -> None:
        try:
            if psutil is not None:
                process = psutil.Process()
                rss_mb = process.memory_info().rss / (1024.0 * 1024.0)
                system_mb = psutil.virtual_memory().used / (1024.0 * 1024.0)
                with self._lock:
                    self._bump("peak_process_rss_mb", rss_mb)
                    self._bump("peak_system_ram_used_mb", system_mb)
                    self._samples += 1
        except Exception as exc:  # pragma: no cover - defensive
            self._statuses.setdefault(
                "peak_process_rss_mb", AvailabilityStatus.COLLECTION_ERROR.value
            )
            self._reasons.setdefault(
                "peak_process_rss_mb", f"sampling failed ({exc.__class__.__name__})"
            )
        # GPU sampling is more expensive; sample every 5th tick.
        if self._gpu_collector is not None and counter % 5 == 0:
            try:
                devices, count, _limitations = self._gpu_collector.collect()
                if devices:
                    device = devices[0]
                    if device.get("memory_used_mb", {}).get("value") is not None:
                        with self._lock:
                            self._bump(
                                "peak_gpu_device_memory_used_mb",
                                float(device["memory_used_mb"]["value"]),
                            )
                    if device.get("utilization_pct", {}).get("value") is not None:
                        with self._lock:
                            self._bump(
                                "peak_gpu_utilization_pct",
                                float(device["utilization_pct"]["value"]),
                            )
                else:
                    self._statuses.setdefault("peak_gpu_device_memory_used_mb", count.status.value)
                    self._reasons.setdefault(
                        "peak_gpu_device_memory_used_mb", count.reason or "GPU unavailable"
                    )
            except Exception as exc:  # pragma: no cover - defensive
                self._statuses.setdefault(
                    "peak_gpu_device_memory_used_mb", AvailabilityStatus.COLLECTION_ERROR.value
                )
                self._reasons.setdefault(
                    "peak_gpu_device_memory_used_mb",
                    f"GPU sampling failed ({exc.__class__.__name__})",
                )

    def _bump(self, key: str, value: float) -> None:
        current = self._peaks.get(key)
        if current is None or value > current:
            self._peaks[key] = value
        self._statuses[key] = AvailabilityStatus.AVAILABLE.value


__all__ = ["ResourceMonitor", "SamplingResult"]
