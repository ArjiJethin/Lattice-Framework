"""Persistence queries for workload profiles."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import (
    BenchmarkRun,
    DecisionCandidate,
    OptimizationDecision,
    Workload,
    WorkloadRevision,
)


def create(session: Session, workload: Workload) -> Workload:
    session.add(workload)
    session.flush()
    return workload


def get(session: Session, workload_id: str, *, include_deleted: bool = False) -> Workload | None:
    workload = session.get(Workload, workload_id)
    if workload is None:
        return None
    if workload.deleted_at is not None and not include_deleted:
        return None
    return workload


def get_by_name(session: Session, name: str) -> Workload | None:
    return session.scalars(select(Workload).where(Workload.name == name)).first()


def list_workloads(
    session: Session,
    *,
    limit: int,
    offset: int,
    workload_type: str | None = None,
    enabled: bool | None = None,
    search: str | None = None,
    include_deleted: bool = False,
) -> tuple[list[Workload], int]:
    stmt = select(Workload)
    if not include_deleted:
        stmt = stmt.where(Workload.deleted_at.is_(None))
    if workload_type:
        stmt = stmt.where(Workload.workload_type == workload_type)
    if enabled is not None:
        stmt = stmt.where(Workload.enabled.is_(enabled))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(or_(Workload.name.ilike(pattern), Workload.description.ilike(pattern)))
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Workload.created_at.desc(), Workload.id.asc())
    items = list(session.scalars(stmt.limit(limit).offset(offset)).all())
    return items, total


def add_revision(session: Session, revision: WorkloadRevision) -> WorkloadRevision:
    session.add(revision)
    session.flush()
    return revision


def count_history_references(session: Session, workload_id: str) -> int:
    runs = (
        session.scalar(
            select(func.count())
            .select_from(BenchmarkRun)
            .where(BenchmarkRun.workload_id == workload_id)
        )
        or 0
    )
    decisions = (
        session.scalar(
            select(func.count())
            .select_from(OptimizationDecision)
            .where(OptimizationDecision.workload_id == workload_id)
        )
        or 0
    )
    return int(runs + decisions)


def count_decisions(session: Session, workload_id: str) -> int:
    return int(
        session.scalar(
            select(func.count())
            .select_from(OptimizationDecision)
            .where(OptimizationDecision.workload_id == workload_id)
        )
        or 0
    )


def delete(session: Session, workload: Workload) -> None:
    session.delete(workload)
    session.flush()


def mark_updated(session: Session, workload: Workload, when: datetime) -> None:
    workload.updated_at = when
    session.flush()


__all__ = [
    "Workload",
    "WorkloadRevision",
    "DecisionCandidate",
    "add_revision",
    "count_decisions",
    "count_history_references",
    "create",
    "delete",
    "get",
    "get_by_name",
    "list_workloads",
    "mark_updated",
]
