"""Benchmark run comparison with explicit compatibility rules.

Two runs are directly comparable only when workload snapshot, protocol version,
model identity, generation settings and runtime measurement definitions agree.
Hardware differences and partial runs are exposed as warnings, never silently
normalised away.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import ValidationFailure
from app.db.models import BenchmarkRun
from app.repositories import benchmarks as repo


class ComparisonService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def compare(self, run_ids: list[str]) -> dict[str, Any]:
        if len(run_ids) < 2:
            raise ValidationFailure("compare requires at least two run_ids")
        runs: list[BenchmarkRun] = []
        for run_id in run_ids:
            run = repo.get_run(self.session, run_id, with_children=True)
            if run is None:
                raise ValidationFailure(
                    f"benchmark run '{run_id}' was not found",
                    details={"field": "run_ids"},
                )
            runs.append(run)
        warnings: list[dict[str, Any]] = []
        blockers: list[str] = []
        checked: dict[str, Any] = {}

        def block(code: str, message: str) -> None:
            blockers.append(code)
            warnings.append(
                {
                    "code": code,
                    "severity": "blocker",
                    "message": message,
                    "run_ids": [run.id for run in runs],
                }
            )

        def warn(code: str, message: str, run_pair: list[str] | None = None) -> None:
            warnings.append(
                {
                    "code": code,
                    "severity": "warning",
                    "message": message,
                    "run_ids": run_pair or [run.id for run in runs],
                }
            )

        workload_hashes = {(run.workload_snapshot or {}).get("content_hash") for run in runs}
        checked["workload_snapshot_hashes"] = sorted(value for value in workload_hashes if value)
        if len(workload_hashes) > 1:
            block("different_workloads", "runs used different workload snapshots")

        protocol_versions = {run.protocol_version for run in runs}
        checked["protocol_versions"] = sorted(protocol_versions)
        if len(protocol_versions) > 1:
            block("different_protocol_versions", "runs used different benchmark protocol versions")

        protocol_snapshots = {
            __import__("json").dumps(run.protocol_snapshot, sort_keys=True) for run in runs
        }
        if len(protocol_snapshots) > 1:
            block(
                "different_protocol_snapshots",
                "protocol snapshots differ (repetitions, warmups, generation parameters or metric "
                "collection options), so measured values are not directly comparable",
            )

        model_keys = {
            (
                (run.model_identity or {}).get("model_id"),
                (run.model_identity or {}).get("quantization"),
                (run.model_identity or {}).get("model_format"),
            )
            for run in runs
        }
        checked["model_identities"] = sorted(str(item) for item in model_keys)
        if len(model_keys) > 1:
            block("different_models", "runs measured different models or quantizations")

        runtime_adapters = {(run.runtime_metadata or {}).get("adapter_id") for run in runs}
        checked["runtime_adapters"] = sorted(str(item) for item in runtime_adapters)
        if len(runtime_adapters) > 1:
            block("different_runtime_adapters", "runs used different runtime adapters")

        runtime_versions = {(run.runtime_metadata or {}).get("version") for run in runs}
        checked["runtime_versions"] = sorted(str(item) for item in runtime_versions if item)
        if len(runtime_versions) > 1:
            warn(
                "different_runtime_versions",
                "runtime versions differ; measurement methods may have changed",
            )

        execution_modes = {
            (run.runtime_metadata or {}).get("effective_execution_mode") for run in runs
        }
        checked["execution_modes"] = sorted(str(item) for item in execution_modes if item)
        if len(execution_modes) > 1:
            warn(
                "different_execution_modes",
                "effective execution modes differ (CPU/GPU/hybrid); performance is not "
                "portable across modes",
            )

        if any(run.test_only for run in runs):
            block(
                "test_only_evidence",
                "at least one run used the test-only fake runtime; those numbers are not model "
                "performance",
            )

        hardware_classes = {self._hardware_class(run.hardware_snapshot or {}) for run in runs}
        checked["hardware_classes"] = sorted(hardware_classes)
        if len(hardware_classes) > 1:
            warn(
                "different_hardware",
                "runs were collected on different hardware classes; absolute values are not "
                "portable",
            )

        if any(run.status == "partial" for run in runs):
            warn(
                "partial_runs",
                "at least one run is partial; failed repetitions are excluded from numeric "
                "aggregates and are reported separately",
            )

        metric_names: set[str] = set()
        for run in runs:
            metric_names.update(summary.metric_name for summary in run.metric_summaries)
        metrics: dict[str, Any] = {}
        for name in sorted(metric_names):
            entries: dict[str, Any] = {}
            methods: set[str] = set()
            units: set[str | None] = set()
            for run in runs:
                summary = next(
                    (item for item in run.metric_summaries if item.metric_name == name), None
                )
                if summary is None:
                    entries[run.id] = None
                    continue
                methods.add(summary.method or "unknown")
                units.add(summary.unit)
                entries[run.id] = {
                    "metric_name": summary.metric_name,
                    "unit": summary.unit,
                    "status": summary.status,
                    "sample_count": summary.sample_count,
                    "mean": summary.mean,
                    "median": summary.median,
                    "minimum": summary.minimum,
                    "maximum": summary.maximum,
                    "stddev": summary.stddev,
                    "method": summary.method,
                }
            if len(methods) > 1:
                block(
                    f"metric_method_mismatch:{name}",
                    f"metric '{name}' was collected with different methods across runs; values "
                    "must not be pooled",
                )
            if len(units) > 1:
                block(
                    f"metric_unit_mismatch:{name}",
                    f"metric '{name}' uses different units across runs",
                )
            metrics[name] = {
                "unit": next((unit for unit in units if unit is not None), None),
                "method": next(iter(methods)) if len(methods) == 1 else None,
                "values": entries,
            }

        return {
            "comparable": not blockers,
            "warnings": warnings,
            "run_ids": [run.id for run in runs],
            "metrics": metrics,
            "checked_fields": checked,
        }

    @staticmethod
    def _hardware_class(snapshot: dict[str, Any]) -> str:
        cpu = (snapshot.get("cpu") or {}).get("model") or {}
        devices = (snapshot.get("gpu") or {}).get("devices") or []
        gpu = devices[0].get("model", {}).get("value") if devices else None
        os_name = (snapshot.get("system") or {}).get("os", {}).get("value")
        return f"{os_name}|{cpu.get('value')}|{gpu}".lower()


__all__ = ["ComparisonService"]
