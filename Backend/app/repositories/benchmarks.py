"""Persistence queries for benchmark runs and raw measurements."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import BenchmarkMeasurement, BenchmarkMetricSummary, BenchmarkRun


def create_run(session: Session, run: BenchmarkRun) -> BenchmarkRun:
    session.add(run)
    session.flush()
    return run


def get_run(session: Session, run_id: str, *, with_children: bool = False) -> BenchmarkRun | None:
    if with_children:
        stmt = (
            select(BenchmarkRun)
            .where(BenchmarkRun.id == run_id)
            .options(
                selectinload(BenchmarkRun.metric_summaries),
                selectinload(BenchmarkRun.measurements),
            )
        )
        return session.scalars(stmt).first()
    return session.get(BenchmarkRun, run_id)


def list_runs(
    session: Session,
    *,
    limit: int,
    offset: int,
    configuration_id: str | None = None,
    workload_id: str | None = None,
    status: str | None = None,
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    test_only: bool | None = None,
) -> tuple[list[BenchmarkRun], int]:
    stmt = select(BenchmarkRun)
    if configuration_id:
        stmt = stmt.where(BenchmarkRun.configuration_id == configuration_id)
    if workload_id:
        stmt = stmt.where(BenchmarkRun.workload_id == workload_id)
    if status:
        stmt = stmt.where(BenchmarkRun.status == status)
    if created_after:
        stmt = stmt.where(BenchmarkRun.created_at >= created_after)
    if created_before:
        stmt = stmt.where(BenchmarkRun.created_at <= created_before)
    # Fake-runtime runs must never pollute production/research summaries.
    if test_only is None:
        stmt = stmt.where(BenchmarkRun.test_only.is_(False))
    else:
        stmt = stmt.where(BenchmarkRun.test_only.is_(test_only))
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(BenchmarkRun.created_at.desc(), BenchmarkRun.id.asc())
    items = list(
        session.scalars(
            stmt.options(selectinload(BenchmarkRun.metric_summaries)).limit(limit).offset(offset)
        ).all()
    )
    return items, total


def finished_runs_for_configuration(
    session: Session,
    configuration_id: str,
    *,
    workload_id: str | None = None,
    statuses: list[str],
    limit: int = 50,
) -> list[BenchmarkRun]:
    stmt = select(BenchmarkRun).where(
        BenchmarkRun.configuration_id == configuration_id,
        BenchmarkRun.status.in_(statuses),
    )
    if workload_id:
        stmt = stmt.where(BenchmarkRun.workload_id == workload_id)
    stmt = stmt.order_by(BenchmarkRun.finished_at.desc(), BenchmarkRun.created_at.desc()).limit(
        limit
    )
    return list(session.scalars(stmt).all())


def add_measurement(session: Session, measurement: BenchmarkMeasurement) -> BenchmarkMeasurement:
    session.add(measurement)
    session.flush()
    return measurement


def list_measurements(
    session: Session,
    run_id: str,
    *,
    limit: int,
    offset: int,
    kind: str | None = None,
) -> tuple[list[BenchmarkMeasurement], int]:
    stmt = select(BenchmarkMeasurement).where(BenchmarkMeasurement.run_id == run_id)
    if kind:
        stmt = stmt.where(BenchmarkMeasurement.kind == kind)
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(BenchmarkMeasurement.sequence.asc())
    return list(session.scalars(stmt.limit(limit).offset(offset)).all()), total


def all_measurements(session: Session, run_id: str) -> list[BenchmarkMeasurement]:
    stmt = (
        select(BenchmarkMeasurement)
        .where(BenchmarkMeasurement.run_id == run_id)
        .order_by(BenchmarkMeasurement.sequence.asc())
    )
    return list(session.scalars(stmt).all())


def get_metric_summaries(session: Session, run_id: str) -> list[BenchmarkMetricSummary]:
    stmt = (
        select(BenchmarkMetricSummary)
        .where(BenchmarkMetricSummary.run_id == run_id)
        .order_by(BenchmarkMetricSummary.metric_name.asc())
    )
    return list(session.scalars(stmt).all())


def replace_metric_summaries(
    session: Session, run_id: str, summaries: list[BenchmarkMetricSummary]
) -> None:
    for existing in get_metric_summaries(session, run_id):
        session.delete(existing)
    session.flush()
    for summary in summaries:
        summary.run_id = run_id
        session.add(summary)
    session.flush()


def latest_metric_summaries(session: Session, *, limit: int = 20) -> list[BenchmarkMetricSummary]:
    stmt = (
        select(BenchmarkMetricSummary)
        .join(BenchmarkRun, BenchmarkRun.id == BenchmarkMetricSummary.run_id)
        .where(BenchmarkRun.test_only.is_(False))
        .order_by(BenchmarkRun.finished_at.desc().nullslast())
        .limit(limit)
    )
    return list(session.scalars(stmt).all())


def count_runs(session: Session) -> int:
    return int(session.scalar(select(func.count()).select_from(BenchmarkRun)) or 0)
