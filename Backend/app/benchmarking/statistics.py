"""Descriptive statistics for benchmark metrics.

Conventions:
* sample standard deviation (``n - 1`` denominator) for ``n >= 2``, else null;
* p90/p95 use linear interpolation (R-7) and are only reported for ``n >= 5``;
* non-finite values are rejected before persistence or JSON serialization;
* no numeric aggregate is produced from zero valid samples.
"""

from __future__ import annotations

import math
import statistics
from collections.abc import Iterable, Sequence
from typing import Any

from app.core.enums import MetricStatus

MIN_PERCENTILE_SAMPLES = 5


def sanitize_values(values: Iterable[float | int | None]) -> tuple[list[float], int]:
    """Return finite floats plus the count of rejected/invalid entries."""
    cleaned: list[float] = []
    invalid = 0
    for value in values:
        if value is None or isinstance(value, bool):
            invalid += 1
            continue
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            invalid += 1
            continue
        if not math.isfinite(numeric):
            invalid += 1
            continue
        cleaned.append(numeric)
    return cleaned, invalid


def percentile(values: Sequence[float], fraction: float) -> float | None:
    """Linear-interpolation percentile (R-7).  Caller enforces sample minimum."""
    if not values:
        return None
    if not 0 <= fraction <= 1:
        raise ValueError("fraction must be within [0, 1]")
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[int(position)]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def summarize_metric(
    metric_name: str,
    values: Iterable[float | int | None],
    *,
    unit: str | None,
    status: MetricStatus,
    method: str | None = None,
    reason: str | None = None,
    failed_count: int = 0,
    invalid_count: int = 0,
) -> dict[str, Any]:
    """Build a persistence-ready summary row for one metric."""
    cleaned, rejected = sanitize_values(values)
    invalid_count += rejected
    if status not in (
        MetricStatus.MEASURED,
        MetricStatus.DERIVED,
        MetricStatus.ESTIMATED,
    ):
        cleaned = []
    if not cleaned:
        return {
            "metric_name": metric_name,
            "unit": unit,
            "status": status.value
            if status not in (MetricStatus.MEASURED, MetricStatus.DERIVED, MetricStatus.ESTIMATED)
            else MetricStatus.UNAVAILABLE.value,
            "method": method,
            "reason": reason or "no valid samples were collected",
            "sample_count": 0,
            "failed_count": failed_count,
            "invalid_count": invalid_count,
            "mean": None,
            "median": None,
            "minimum": None,
            "maximum": None,
            "stddev": None,
            "p90": None,
            "p95": None,
        }
    count = len(cleaned)
    stddev = statistics.stdev(cleaned) if count >= 2 else None
    return {
        "metric_name": metric_name,
        "unit": unit,
        "status": status.value,
        "method": method,
        "reason": reason,
        "sample_count": count,
        "failed_count": failed_count,
        "invalid_count": invalid_count,
        "mean": statistics.fmean(cleaned),
        "median": statistics.median(cleaned),
        "minimum": min(cleaned),
        "maximum": max(cleaned),
        "stddev": stddev,
        "p90": percentile(cleaned, 0.90) if count >= MIN_PERCENTILE_SAMPLES else None,
        "p95": percentile(cleaned, 0.95) if count >= MIN_PERCENTILE_SAMPLES else None,
    }


def summarise_many(
    samples: dict[str, list[float | None]],
    *,
    units: dict[str, str | None],
    statuses: dict[str, MetricStatus],
    methods: dict[str, str | None],
    reasons: dict[str, str | None] | None = None,
    failed_count: int = 0,
) -> list[dict[str, Any]]:
    """Summarise every metric present in ``samples`` (including empty ones)."""
    reasons = reasons or {}
    return [
        summarize_metric(
            name,
            values,
            unit=units.get(name),
            status=statuses.get(name, MetricStatus.UNAVAILABLE),
            method=methods.get(name),
            reason=reasons.get(name),
            failed_count=failed_count,
        )
        for name, values in samples.items()
    ]


__all__ = [
    "MIN_PERCENTILE_SAMPLES",
    "percentile",
    "sanitize_values",
    "summarise_many",
    "summarize_metric",
]
