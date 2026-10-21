from __future__ import annotations

import math

import pytest

from app.benchmarking.statistics import percentile, sanitize_values, summarize_metric
from app.core.enums import MetricStatus


def test_empty_dataset_reports_null_not_zero():
    summary = summarize_metric("latency_ms", [], unit="ms", status=MetricStatus.MEASURED)
    assert summary["status"] == "unavailable"
    assert summary["sample_count"] == 0
    assert summary["mean"] is None
    assert summary["median"] is None
    assert summary["minimum"] is None
    assert summary["maximum"] is None
    assert summary["stddev"] is None
    assert summary["reason"]


def test_single_sample_has_null_stddev_and_percentiles():
    summary = summarize_metric("latency_ms", [12.5], unit="ms", status=MetricStatus.MEASURED)
    assert summary["sample_count"] == 1
    assert summary["mean"] == 12.5
    assert summary["median"] == 12.5
    assert summary["minimum"] == 12.5
    assert summary["maximum"] == 12.5
    assert summary["stddev"] is None
    assert summary["p90"] is None
    assert summary["p95"] is None


def test_mean_median_stddev_for_known_values():
    values = [1.0, 2.0, 3.0, 4.0]
    summary = summarize_metric("latency_ms", values, unit="ms", status=MetricStatus.MEASURED)
    assert summary["mean"] == pytest.approx(2.5)
    assert summary["median"] == pytest.approx(2.5)
    assert summary["minimum"] == 1.0
    assert summary["maximum"] == 4.0
    # sample standard deviation (n-1)
    assert summary["stddev"] == pytest.approx(1.2909944487358056, rel=1e-9)


def test_percentiles_require_five_samples_and_interpolate():
    four = [1.0, 2.0, 3.0, 4.0]
    assert summarize_metric("x", four, unit=None, status=MetricStatus.MEASURED)["p90"] is None
    five = [1.0, 2.0, 3.0, 4.0, 5.0]
    summary = summarize_metric("x", five, unit=None, status=MetricStatus.MEASURED)
    assert summary["p90"] == pytest.approx(4.6)
    assert summary["p95"] == pytest.approx(4.8)
    assert percentile([1.0, 2.0], 0.5) == pytest.approx(1.5)


def test_nan_inf_and_none_are_rejected_and_counted():
    clean, invalid = sanitize_values([1.0, float("nan"), float("inf"), None, True, "x"])
    assert clean == [1.0]
    assert invalid == 5
    summary = summarize_metric(
        "latency_ms",
        [float("nan"), float("-inf"), None],
        unit="ms",
        status=MetricStatus.MEASURED,
    )
    assert summary["status"] == "unavailable"
    assert summary["invalid_count"] >= 3
    assert summary["mean"] is None


def test_unavailable_status_discards_values():
    summary = summarize_metric(
        "ttft_ms", [1.0], unit="ms", status=MetricStatus.UNAVAILABLE, reason="no stream"
    )
    assert summary["status"] == "unavailable"
    assert summary["mean"] is None
    assert summary["sample_count"] == 0


def test_no_non_finite_values_in_output():
    summary = summarize_metric(
        "latency_ms", [1e300, 1e300], unit="ms", status=MetricStatus.MEASURED
    )
    for key in ("mean", "median", "minimum", "maximum", "stddev"):
        value = summary[key]
        assert value is None or math.isfinite(value)
