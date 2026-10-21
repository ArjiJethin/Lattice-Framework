"""Persistence queries for optimization decisions."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import DecisionCandidate, OptimizationDecision


def create(session: Session, decision: OptimizationDecision) -> OptimizationDecision:
    session.add(decision)
    session.flush()
    return decision


def get(
    session: Session, decision_id: str, *, with_candidates: bool = True
) -> OptimizationDecision | None:
    if with_candidates:
        stmt = (
            select(OptimizationDecision)
            .where(OptimizationDecision.id == decision_id)
            .options(selectinload(OptimizationDecision.candidates))
        )
        return session.scalars(stmt).first()
    return session.get(OptimizationDecision, decision_id)


def add_candidates(session: Session, candidates: list[DecisionCandidate]) -> None:
    for candidate in candidates:
        session.add(candidate)
    session.flush()


def replace_candidates(
    session: Session, decision_id: str, candidates: list[DecisionCandidate]
) -> None:
    for existing in session.scalars(
        select(DecisionCandidate).where(DecisionCandidate.decision_id == decision_id)
    ).all():
        session.delete(existing)
    session.flush()
    add_candidates(session, candidates)


def list_decisions(
    session: Session,
    *,
    limit: int,
    offset: int,
    workload_id: str | None = None,
    status: str | None = None,
) -> tuple[list[OptimizationDecision], int]:
    stmt = select(OptimizationDecision)
    if workload_id:
        stmt = stmt.where(OptimizationDecision.workload_id == workload_id)
    if status:
        stmt = stmt.where(OptimizationDecision.status == status)
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = (
        stmt.options(selectinload(OptimizationDecision.candidates))
        .order_by(OptimizationDecision.created_at.desc(), OptimizationDecision.id.asc())
        .limit(limit)
        .offset(offset)
    )
    return list(session.scalars(stmt).all()), total


def count(session: Session) -> int:
    return int(session.scalar(select(func.count()).select_from(OptimizationDecision)) or 0)


def for_configuration(
    session: Session, configuration_id: str, *, limit: int = 50
) -> list[OptimizationDecision]:
    stmt = (
        select(OptimizationDecision)
        .join(DecisionCandidate, DecisionCandidate.decision_id == OptimizationDecision.id)
        .where(
            (OptimizationDecision.selected_configuration_id == configuration_id)
            | (DecisionCandidate.configuration_id == configuration_id)
        )
        .order_by(OptimizationDecision.created_at.desc())
        .limit(limit)
    )
    return list(session.scalars(stmt).unique().all())
