"""Persistence queries for configuration profiles.  No business logic here."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.enums import JobType
from app.db.models import (
    BenchmarkRun,
    Configuration,
    ConfigurationRevision,
    DecisionCandidate,
    InferenceExecution,
    Job,
    OptimizationDecision,
)


def create(session: Session, configuration: Configuration) -> Configuration:
    session.add(configuration)
    session.flush()
    return configuration


def get(
    session: Session, configuration_id: str, *, include_deleted: bool = False
) -> Configuration | None:
    configuration = session.get(Configuration, configuration_id)
    if configuration is None:
        return None
    if configuration.deleted_at is not None and not include_deleted:
        return None
    return configuration


def get_by_name(
    session: Session, name: str, *, include_deleted: bool = True
) -> Configuration | None:
    stmt = select(Configuration).where(Configuration.name == name)
    if not include_deleted:
        stmt = stmt.where(Configuration.deleted_at.is_(None))
    return session.scalars(stmt).first()


def list_configurations(
    session: Session,
    *,
    limit: int,
    offset: int,
    enabled: bool | None = None,
    model_id: str | None = None,
    search: str | None = None,
    include_deleted: bool = False,
) -> tuple[list[Configuration], int]:
    stmt = select(Configuration)
    if not include_deleted:
        stmt = stmt.where(Configuration.deleted_at.is_(None))
    if enabled is not None:
        stmt = stmt.where(Configuration.enabled.is_(enabled))
    if model_id:
        stmt = stmt.where(Configuration.model_id == model_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(Configuration.name.ilike(pattern), Configuration.model_id.ilike(pattern))
        )
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Configuration.created_at.desc(), Configuration.id.asc())
    items = list(session.scalars(stmt.limit(limit).offset(offset)).all())
    return items, total


def add_revision(session: Session, revision: ConfigurationRevision) -> ConfigurationRevision:
    session.add(revision)
    session.flush()
    return revision


def count_history_references(session: Session, configuration_id: str) -> int:
    """History links that make hard deletion unsafe."""
    total = 0
    total += (
        session.scalar(
            select(func.count())
            .select_from(BenchmarkRun)
            .where(BenchmarkRun.configuration_id == configuration_id)
        )
        or 0
    )
    total += (
        session.scalar(
            select(func.count())
            .select_from(InferenceExecution)
            .where(InferenceExecution.configuration_id == configuration_id)
        )
        or 0
    )
    total += (
        session.scalar(
            select(func.count())
            .select_from(OptimizationDecision)
            .where(OptimizationDecision.selected_configuration_id == configuration_id)
        )
        or 0
    )
    total += (
        session.scalar(
            select(func.count())
            .select_from(DecisionCandidate)
            .where(DecisionCandidate.configuration_id == configuration_id)
        )
        or 0
    )
    return int(total)


def has_running_jobs(session: Session, configuration_id: str) -> bool:
    stmt = (
        select(func.count())
        .select_from(Job)
        .join(BenchmarkRun, BenchmarkRun.job_id == Job.id)
        .where(
            BenchmarkRun.configuration_id == configuration_id,
            Job.job_type == JobType.BENCHMARK.value,
            Job.status.in_(["queued", "running"]),
        )
    )
    return bool(session.scalar(stmt))


def delete(session: Session, configuration: Configuration) -> None:
    session.delete(configuration)
    session.flush()


def mark_updated(session: Session, configuration: Configuration, when: datetime) -> None:
    configuration.updated_at = when
    session.flush()
