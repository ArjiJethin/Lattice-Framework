"""Persistence queries for inference executions."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import InferenceExecution


def create(session: Session, execution: InferenceExecution) -> InferenceExecution:
    session.add(execution)
    session.flush()
    return execution


def get(session: Session, execution_id: str) -> InferenceExecution | None:
    return session.get(InferenceExecution, execution_id)


def list_executions(
    session: Session,
    *,
    limit: int,
    offset: int,
    configuration_id: str | None = None,
    status: str | None = None,
    test_only: bool | None = None,
) -> tuple[list[InferenceExecution], int]:
    stmt = select(InferenceExecution)
    if configuration_id:
        stmt = stmt.where(InferenceExecution.configuration_id == configuration_id)
    if status:
        stmt = stmt.where(InferenceExecution.status == status)
    if test_only is not None:
        stmt = stmt.where(InferenceExecution.test_only.is_(test_only))
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = (
        stmt.order_by(InferenceExecution.created_at.desc(), InferenceExecution.id.asc())
        .limit(limit)
        .offset(offset)
    )
    return list(session.scalars(stmt).all()), total


def count(session: Session) -> int:
    return int(session.scalar(select(func.count()).select_from(InferenceExecution)) or 0)


def for_decision(
    session: Session, decision_id: str, *, limit: int = 20
) -> list[InferenceExecution]:
    """Executions submitted for a decision, newest first.

    A decision may legitimately be executed more than once; the outcome view
    reports the latest attempt and counts the rest.
    """
    stmt = (
        select(InferenceExecution)
        .where(InferenceExecution.decision_id == decision_id)
        .order_by(InferenceExecution.created_at.desc(), InferenceExecution.id.desc())
        .limit(limit)
    )
    return list(session.scalars(stmt).all())


def for_configuration(
    session: Session, configuration_id: str, *, limit: int = 50
) -> list[InferenceExecution]:
    stmt = (
        select(InferenceExecution)
        .where(InferenceExecution.configuration_id == configuration_id)
        .order_by(InferenceExecution.created_at.desc())
        .limit(limit)
    )
    return list(session.scalars(stmt).all())
