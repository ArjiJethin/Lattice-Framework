"""Hardware reading primitives.

Every optional value carries an explicit availability status and collection
method.  Missing values are ``None`` - never a fabricated zero.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.core.enums import AvailabilityStatus
from app.core.time import utc_iso, utcnow

HARDWARE_SCHEMA_VERSION = "lattice.hardware/1.0.0"


@dataclass(frozen=True)
class HardwareReading:
    value: float | int | str | bool | None
    status: AvailabilityStatus
    unit: str | None = None
    method: str = "unknown"
    reason: str | None = None
    source_version: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "value": self.value,
            "unit": self.unit,
            "status": self.status.value,
            "method": self.method,
            "reason": self.reason,
            "source_version": self.source_version,
        }


def available(
    value: float | int | str | bool,
    *,
    unit: str | None = None,
    method: str,
    source_version: str | None = None,
) -> HardwareReading:
    return HardwareReading(
        value=value,
        status=AvailabilityStatus.AVAILABLE,
        unit=unit,
        method=method,
        source_version=source_version,
    )


def unavailable(
    status: AvailabilityStatus,
    reason: str,
    *,
    method: str = "unknown",
    source_version: str | None = None,
) -> HardwareReading:
    if status == AvailabilityStatus.AVAILABLE:  # defensive programming
        raise ValueError("unavailable() cannot produce an available reading")
    return HardwareReading(
        value=None,
        status=status,
        unit=None,
        method=method,
        reason=reason,
        source_version=source_version,
    )


def not_installed(reason: str, *, method: str = "unknown") -> HardwareReading:
    return unavailable(AvailabilityStatus.NOT_INSTALLED, reason, method=method)


def unsupported(reason: str, *, method: str = "unknown") -> HardwareReading:
    return unavailable(AvailabilityStatus.UNSUPPORTED, reason, method=method)


def not_detected(reason: str, *, method: str = "unknown") -> HardwareReading:
    return unavailable(AvailabilityStatus.NOT_DETECTED, reason, method=method)


@dataclass
class CollectorReport:
    name: str
    version: str
    status: AvailabilityStatus
    duration_ms: float
    reason: str | None = None
    fields: dict[str, HardwareReading] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "status": self.status.value,
            "duration_ms": round(self.duration_ms, 3),
            "reason": self.reason,
            "fields": {key: reading.to_dict() for key, reading in self.fields.items()},
        }


@dataclass
class HardwareSnapshot:
    collected_at: datetime
    collectors: list[CollectorReport]
    system: dict[str, HardwareReading]
    cpu: dict[str, HardwareReading]
    memory: dict[str, HardwareReading]
    gpu: dict[str, Any]
    runtime: dict[str, Any]
    sampling: dict[str, Any]
    schema_version: str = HARDWARE_SCHEMA_VERSION

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "collected_at": utc_iso(self.collected_at),
            "collectors": [report.to_dict() for report in self.collectors],
            "system": {key: reading.to_dict() for key, reading in self.system.items()},
            "cpu": {key: reading.to_dict() for key, reading in self.cpu.items()},
            "memory": {key: reading.to_dict() for key, reading in self.memory.items()},
            "gpu": self.gpu,
            "runtime": self.runtime,
            "sampling": self.sampling,
        }


def snapshot_timestamp() -> datetime:
    return utcnow()
