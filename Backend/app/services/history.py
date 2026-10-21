"""Experiment history and provenance export."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.benchmarking.protocol import EXPORT_SCHEMA_VERSION
from app.core.errors import NotFoundError
from app.core.settings import Settings
from app.core.time import utc_iso, utcnow
from app.db.models import (
    BenchmarkRun,
    Configuration,
    DecisionCandidate,
    InferenceExecution,
    Job,
    OptimizationDecision,
    Workload,
)
from app.repositories import benchmarks as benchmark_repo
from app.repositories import decisions as decision_repo
from app.repositories import inference as inference_repo
from app.schemas.benchmark import BenchmarkRunRead, MeasurementRead
from app.schemas.history import (
    HistoryBenchmarkResponse,
    HistoryConfigurationResponse,
    HistoryCounts,
    HistoryRecordSummary,
    HistorySummary,
    MetricAggregate,
)
from app.services.jobs import job_read


class HistoryService:
    def __init__(self, session: Session, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    # ------------------------------------------------------------------
    def summary(self) -> HistorySummary:
        def count(model: Any) -> int:
            return int(self.session.scalar(select(func.count()).select_from(model)) or 0)

        counts = HistoryCounts(
            configurations=count(Configuration),
            workloads=count(Workload),
            jobs=count(Job),
            benchmark_runs=count(BenchmarkRun),
            optimization_decisions=count(OptimizationDecision),
            inference_executions=count(InferenceExecution),
            failed_jobs=int(
                self.session.scalar(
                    select(func.count()).select_from(Job).where(Job.status == "failed")
                )
                or 0
            ),
        )
        runs = list(
            self.session.scalars(
                select(BenchmarkRun)
                .where(BenchmarkRun.test_only.is_(False))
                .order_by(BenchmarkRun.created_at.desc())
                .limit(5)
            ).all()
        )
        decisions = list(
            self.session.scalars(
                select(OptimizationDecision)
                .order_by(OptimizationDecision.created_at.desc())
                .limit(5)
            ).all()
        )
        executions = list(
            self.session.scalars(
                select(InferenceExecution).order_by(InferenceExecution.created_at.desc()).limit(5)
            ).all()
        )
        latest_runs = [
            HistoryRecordSummary(
                id=run.id,
                kind="benchmark_run",
                status=run.status,
                created_at=run.created_at,
                title=run.id,
                summary={
                    "configuration_id": run.configuration_id,
                    "workload_id": run.workload_id,
                    "test_only": run.test_only,
                    "successful_repetitions": run.completed_repetitions,
                    "failed_repetitions": run.failed_repetitions,
                },
            )
            for run in runs
        ]
        latest_decisions = [
            HistoryRecordSummary(
                id=decision.id,
                kind="optimization_decision",
                status=decision.status,
                created_at=decision.created_at,
                title=decision.algorithm,
                summary={
                    "selected_configuration_id": decision.selected_configuration_id,
                    "candidate_count": len(decision.candidate_configuration_ids or []),
                },
            )
            for decision in decisions
        ]
        latest_inference = [
            HistoryRecordSummary(
                id=execution.id,
                kind="inference_execution",
                status=execution.status,
                created_at=execution.created_at,
                title=execution.configuration_id,
                summary={"test_only": execution.test_only},
            )
            for execution in executions
        ]
        latest_aggregates: list[MetricAggregate] = []
        null_reason: str | None = None
        if runs:
            summaries = benchmark_repo.get_metric_summaries(self.session, runs[0].id)
            for item in summaries:
                latest_aggregates.append(
                    MetricAggregate(
                        metric_name=item.metric_name,
                        unit=item.unit,
                        sample_count=item.sample_count,
                        mean=item.mean,
                        median=item.median,
                        minimum=item.minimum,
                        maximum=item.maximum,
                    )
                )
        else:
            null_reason = "no non-test benchmark runs exist yet"
        return HistorySummary(
            counts=counts,
            latest_runs=latest_runs,
            latest_decisions=latest_decisions,
            latest_inference=latest_inference,
            latest_metric_aggregates=latest_aggregates,
            null_metric_reason=null_reason,
        )

    # ------------------------------------------------------------------
    def benchmark(self, run_id: str) -> HistoryBenchmarkResponse:
        run = benchmark_repo.get_run(self.session, run_id, with_children=True)
        if run is None:
            raise NotFoundError(f"benchmark run '{run_id}' was not found")
        measurements = benchmark_repo.all_measurements(self.session, run_id)
        decision_ids = self._referencing_decision_ids(run_id)
        decisions = (
            list(
                self.session.scalars(
                    select(OptimizationDecision).where(OptimizationDecision.id.in_(decision_ids))
                ).all()
            )
            if decision_ids
            else []
        )
        return HistoryBenchmarkResponse(
            run=BenchmarkRunRead.model_validate(run),
            measurements=[MeasurementRead.model_validate(item) for item in measurements],
            measurement_total=len(measurements),
            decisions_referencing=[decision.id for decision in decisions],
        )

    def configuration(self, configuration_id: str) -> HistoryConfigurationResponse:
        configuration = self.session.get(Configuration, configuration_id)
        if configuration is None:
            raise NotFoundError(f"configuration '{configuration_id}' was not found")
        runs = list(
            self.session.scalars(
                select(BenchmarkRun)
                .where(BenchmarkRun.configuration_id == configuration_id)
                .order_by(BenchmarkRun.created_at.desc())
                .limit(100)
            ).all()
        )
        decisions = decision_repo.for_configuration(self.session, configuration_id, limit=100)
        executions = inference_repo.for_configuration(self.session, configuration_id, limit=100)
        return HistoryConfigurationResponse(
            configuration_id=configuration_id,
            runs=[BenchmarkRunRead.model_validate(item) for item in runs],
            decisions=[
                HistoryRecordSummary(
                    id=decision.id,
                    kind="optimization_decision",
                    status=decision.status,
                    created_at=decision.created_at,
                    title=decision.algorithm,
                    summary={"selected_configuration_id": decision.selected_configuration_id},
                )
                for decision in decisions
            ],
            inference_executions=[
                HistoryRecordSummary(
                    id=execution.id,
                    kind="inference_execution",
                    status=execution.status,
                    created_at=execution.created_at,
                    title=execution.configuration_id,
                    summary={"test_only": execution.test_only},
                )
                for execution in executions
            ],
        )

    # ------------------------------------------------------------------
    def export_jsonl(
        self,
        *,
        configuration_id: str | None = None,
        workload_id: str | None = None,
        run_id: str | None = None,
        created_after: datetime | None = None,
        created_before: datetime | None = None,
        include_test_only: bool = False,
    ) -> list[str]:
        stmt = select(BenchmarkRun)
        if run_id:
            stmt = stmt.where(BenchmarkRun.id == run_id)
        if configuration_id:
            stmt = stmt.where(BenchmarkRun.configuration_id == configuration_id)
        if workload_id:
            stmt = stmt.where(BenchmarkRun.workload_id == workload_id)
        if created_after:
            stmt = stmt.where(BenchmarkRun.created_at >= created_after)
        if created_before:
            stmt = stmt.where(BenchmarkRun.created_at <= created_before)
        if not include_test_only:
            stmt = stmt.where(BenchmarkRun.test_only.is_(False))
        stmt = stmt.order_by(BenchmarkRun.created_at.asc()).limit(
            self.settings.history_export_max_runs
        )
        runs = list(self.session.scalars(stmt).all())
        lines: list[str] = []
        exported_at = utc_iso(utcnow())
        for run in runs:
            measurements = benchmark_repo.all_measurements(self.session, run.id)
            summaries = benchmark_repo.get_metric_summaries(self.session, run.id)
            decision_ids = self._referencing_decision_ids(run.id)
            payload = {
                "schema_version": EXPORT_SCHEMA_VERSION,
                "exported_at": exported_at,
                "record_type": "benchmark_run",
                "run": json.loads(BenchmarkRunRead.model_validate(run).model_dump_json()),
                "measurements": [
                    json.loads(MeasurementRead.model_validate(item).model_dump_json())
                    for item in measurements
                ],
                "metric_summaries": [
                    {
                        "metric_name": item.metric_name,
                        "unit": item.unit,
                        "status": item.status,
                        "method": item.method,
                        "reason": item.reason,
                        "sample_count": item.sample_count,
                        "failed_count": item.failed_count,
                        "mean": item.mean,
                        "median": item.median,
                        "minimum": item.minimum,
                        "maximum": item.maximum,
                        "stddev": item.stddev,
                        "p90": item.p90,
                        "p95": item.p95,
                    }
                    for item in summaries
                ],
                "decision_references": sorted(set(decision_ids)),
                "provenance": {
                    "hardware_snapshot": run.hardware_snapshot,
                    "runtime_metadata": run.runtime_metadata,
                    "software_versions": run.software_versions,
                    "protocol_snapshot": run.protocol_snapshot,
                    "configuration_snapshot": run.configuration_snapshot,
                    "workload_snapshot": run.workload_snapshot,
                    "test_only": run.test_only,
                },
            }
            lines.append(json.dumps(payload, ensure_ascii=False, allow_nan=False))
        return lines

    def _referencing_decision_ids(self, run_id: str) -> list[str]:
        """JSON containment is not portable; filter evidence lists in Python."""
        rows = self.session.scalars(
            select(DecisionCandidate).where(DecisionCandidate.evidence_run_ids.is_not(None))
        ).all()
        return sorted({row.decision_id for row in rows if run_id in (row.evidence_run_ids or [])})

    def job_view(self, job_id: str) -> Any:
        job = self.session.get(Job, job_id)
        if job is None:
            raise NotFoundError(f"job '{job_id}' was not found")
        return job_read(self.session, job)


__all__ = ["HistoryService"]
