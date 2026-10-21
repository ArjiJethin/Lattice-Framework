"""Hardware snapshot aggregation."""

from __future__ import annotations

from typing import Any

from app.core.enums import AvailabilityStatus, ExecutionMode
from app.core.logging import get_logger
from app.core.settings import Settings
from app.core.time import monotonic, utc_iso, utcnow
from app.hardware.collectors import CPUCollector, GPUCollector, MemoryCollector, SystemCollector
from app.hardware.types import (
    HARDWARE_SCHEMA_VERSION,
    CollectorReport,
    HardwareReading,
    HardwareSnapshot,
    available,
    unavailable,
)

logger = get_logger(__name__)

TELEMETRY_FIELDS = (
    "process_rss_mb",
    "process_peak_rss_mb",
    "system_ram_used_mb",
    "system_ram_available_mb",
    "gpu_device_memory_used_mb",
    "gpu_device_memory_total_mb",
    "gpu_utilization_pct",
    "gpu_process_memory_mb",
)


class HardwareService:
    """Collect a best-effort snapshot; never raise because a collector failed."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._system = SystemCollector()
        self._cpu = CPUCollector()
        self._memory = MemoryCollector()
        self._gpu = GPUCollector(
            enabled=settings.gpu_telemetry_enabled,
            timeout_seconds=settings.gpu_collector_timeout_seconds,
        )

    def snapshot(
        self,
        *,
        runtime_metadata: dict[str, Any] | None = None,
        include_gpu: bool = True,
    ) -> dict[str, Any]:
        collectors: list[CollectorReport] = []
        system: dict[str, HardwareReading] = {}
        cpu: dict[str, HardwareReading] = {}
        memory: dict[str, HardwareReading] = {}
        gpu_devices: list[dict[str, Any]] = []
        gpu_count: HardwareReading = unavailable(
            AvailabilityStatus.NOT_APPLICABLE,
            "GPU collection skipped for this snapshot",
            method="gpu",
        )
        limitations: list[str] = []

        start = monotonic()
        try:
            fields = self._system.collect()
            system.update(fields)
            collectors.append(
                CollectorReport(
                    name=self._system.name,
                    version=self._system.version,
                    status=AvailabilityStatus.AVAILABLE,
                    duration_ms=(monotonic() - start) * 1000.0,
                    fields=fields,
                )
            )
        except Exception as exc:
            logger.warning("system collector failed: %s", exc.__class__.__name__)
            collectors.append(
                CollectorReport(
                    name="system",
                    version="1.0.0",
                    status=AvailabilityStatus.COLLECTION_ERROR,
                    duration_ms=(monotonic() - start) * 1000.0,
                    reason=f"collector raised {exc.__class__.__name__}",
                )
            )

        start = monotonic()
        try:
            fields = self._cpu.collect()
            cpu.update(fields)
            status = (
                AvailabilityStatus.AVAILABLE
                if any(item.status == AvailabilityStatus.AVAILABLE for item in fields.values())
                else AvailabilityStatus.UNSUPPORTED
            )
            collectors.append(
                CollectorReport(
                    name=self._cpu.name,
                    version=self._cpu.version,
                    status=status,
                    duration_ms=(monotonic() - start) * 1000.0,
                    fields=fields,
                )
            )
        except Exception as exc:
            logger.warning("cpu collector failed: %s", exc.__class__.__name__)
            collectors.append(
                CollectorReport(
                    name="cpu",
                    version="1.0.0",
                    status=AvailabilityStatus.COLLECTION_ERROR,
                    duration_ms=(monotonic() - start) * 1000.0,
                    reason=f"collector raised {exc.__class__.__name__}",
                )
            )

        start = monotonic()
        try:
            fields = self._memory.collect()
            memory.update(fields)
            status = (
                AvailabilityStatus.AVAILABLE
                if any(item.status == AvailabilityStatus.AVAILABLE for item in fields.values())
                else AvailabilityStatus.UNSUPPORTED
            )
            collectors.append(
                CollectorReport(
                    name=self._memory.name,
                    version=self._memory.version,
                    status=status,
                    duration_ms=(monotonic() - start) * 1000.0,
                    fields=fields,
                )
            )
        except Exception as exc:
            logger.warning("memory collector failed: %s", exc.__class__.__name__)
            collectors.append(
                CollectorReport(
                    name="memory",
                    version="1.0.0",
                    status=AvailabilityStatus.COLLECTION_ERROR,
                    duration_ms=(monotonic() - start) * 1000.0,
                    reason=f"collector raised {exc.__class__.__name__}",
                )
            )

        if include_gpu:
            start = monotonic()
            try:
                gpu_devices, gpu_count, gpu_limitations = self._gpu.collect()
                limitations.extend(gpu_limitations)
                status = gpu_count.status
                collectors.append(
                    CollectorReport(
                        name="gpu",
                        version=self._gpu.version,
                        status=status,
                        duration_ms=(monotonic() - start) * 1000.0,
                        reason=gpu_count.reason,
                    )
                )
            except Exception as exc:
                logger.warning("gpu collector failed: %s", exc.__class__.__name__)
                collectors.append(
                    CollectorReport(
                        name="gpu",
                        version="1.0.0",
                        status=AvailabilityStatus.COLLECTION_ERROR,
                        duration_ms=(monotonic() - start) * 1000.0,
                        reason=f"collector raised {exc.__class__.__name__}",
                    )
                )
        else:
            limitations.append("GPU collection disabled for this snapshot")

        runtime = self._runtime_section(runtime_metadata or {}, bool(gpu_devices))
        snapshot = HardwareSnapshot(
            collected_at=utcnow(),
            collectors=collectors,
            system=system,
            cpu=cpu,
            memory=memory,
            gpu={
                "device_count": gpu_count.to_dict(),
                "devices": gpu_devices,
                "limitations": limitations,
            },
            runtime=runtime,
            sampling={
                "memory_interval_ms": self.settings.memory_sampling_interval_ms,
                "gpu_telemetry_enabled": self.settings.gpu_telemetry_enabled,
                "gpu_device_memory_scope": "device_wide",
                "gpu_process_memory_scope": "process_attributed_when_available",
                "snapshot_kind": "point_in_time",
                "schema_version": HARDWARE_SCHEMA_VERSION,
            },
        )
        return snapshot.to_dict()

    @staticmethod
    def _runtime_section(metadata: dict[str, Any], gpu_present: bool) -> dict[str, Any]:
        def field(key: str) -> dict[str, Any]:
            if key in metadata and metadata[key] not in (None, "", []):
                return available(metadata[key], method="runtime_adapter").to_dict()
            return unavailable(
                AvailabilityStatus.NOT_APPLICABLE,
                "runtime did not report this field",
                method="runtime_adapter",
            ).to_dict()

        execution_mode = metadata.get("execution_mode") or ExecutionMode.UNKNOWN.value
        return {
            "adapter_id": metadata.get("adapter_id"),
            "version": field("version"),
            "backend": field("backend"),
            "acceleration": metadata.get("acceleration", []),
            "execution_mode": execution_mode,
            "requested_execution_mode": metadata.get("requested_execution_mode"),
            "gpu_present": gpu_present,
            "supports_streaming": bool(metadata.get("supports_streaming", False)),
            "supports_token_counts": bool(metadata.get("supports_token_counts", False)),
        }

    @staticmethod
    def telemetry_support(snapshot: dict[str, Any]) -> dict[str, Any]:
        """Describe which telemetry fields a snapshot actually carries."""
        memory = snapshot.get("memory", {})
        gpu = snapshot.get("gpu", {})
        devices = gpu.get("devices", [])
        device = devices[0] if devices else {}

        def describe(value: dict[str, Any] | None) -> str:
            if not value:
                return AvailabilityStatus.NOT_APPLICABLE.value
            return str(value.get("status"))

        return {
            "process_memory": describe(memory.get("process_rss_mb")),
            "process_peak_memory": describe(memory.get("process_peak_rss_mb")),
            "system_memory": describe(memory.get("available_mb")),
            "gpu_device_memory": describe(device.get("memory_used_mb")),
            "gpu_utilization": describe(device.get("utilization_pct")),
            "gpu_process_memory": describe(device.get("process_memory_mb")),
            "sampling": snapshot.get("sampling", {}),
        }


def classify_execution_mode(
    *,
    requested_gpu_layers: int | None,
    gpu_present: bool,
    runtime_reports_gpu: bool,
    all_layers_offloaded: bool | None = None,
) -> str:
    """Infer requested/effective execution mode from evidence, never from GPU presence alone."""
    if requested_gpu_layers is None:
        requested = ExecutionMode.UNKNOWN.value
    elif requested_gpu_layers > 0:
        requested = ExecutionMode.HYBRID.value
    else:
        requested = ExecutionMode.CPU.value
    if not runtime_reports_gpu or not gpu_present:
        return requested
    if all_layers_offloaded is True:
        return ExecutionMode.GPU.value
    return ExecutionMode.HYBRID.value


__all__ = ["HardwareService", "TELEMETRY_FIELDS", "classify_execution_mode", "utc_iso"]
