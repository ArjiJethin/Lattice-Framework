"""Persistence queries for jobs."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Job


def create(session: Session, job: Job) -> Job:
    session.add(job)
    session.flush()
    return job


def get(session: Session, job_id: str) -> Job | None:
    return session.get(Job, job_id)


def list_jobs(
    session: Session,
    *,
    limit: int,
    offset: int,
    status: str | None = None,
    job_type: str | None = None,
    created_after: datetime | None = None,
    created_before: datetime | None = None,
) -> tuple[list[Job], int]:
    stmt = select(Job)
    if status:
        stmt = stmt.where(Job.status == status)
    if job_type:
        stmt = stmt.where(Job.job_type == job_type)
    if created_after:
        stmt = stmt.where(Job.created_at >= created_after)
    if created_before:
        stmt = stmt.where(Job.created_at <= created_before)
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Job.created_at.desc(), Job.id.asc())
    items = list(session.scalars(stmt.limit(limit).offset(offset)).all())
    return items, total


def find_by_request(session: Session, *, job_type: str, request_id: str) -> Job | None:
    """Return the first job recorded for an idempotency key.

    ``X-Request-ID`` is treated as a client-supplied idempotency key: replaying
    the same request must never create a second job (and therefore never a
    second benchmark/inference row).
    """
    stmt = (
        select(Job)
        .where(Job.job_type == job_type, Job.request_id == request_id)
        .order_by(Job.created_at.asc(), Job.id.asc())
    )
    return session.scalars(stmt).first()


def count_by_status(session: Session, status: str) -> int:
    return int(
        session.scalar(select(func.count()).select_from(Job).where(Job.status == status)) or 0
    )


def count(session: Session) -> int:
    return int(session.scalar(select(func.count()).select_from(Job)) or 0)


def mark_running(session: Session, job: Job, started_at: datetime) -> Job:
    job.status = "running"
    job.started_at = started_at
    job.progress = None
    session.flush()
    return job


def finalize(
    session: Session,
    job: Job,
    status: str,
    finished_at: datetime,
    *,
    result_summary: dict | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> Job:
    job.status = status
    job.finished_at = finished_at
    job.result_summary = result_summary
    job.error_code = error_code
    job.error_message = error_message
    session.flush()
    return job


def set_progress(session: Session, job: Job, completed: int, total: int) -> Job:
    if total <= 0:
        job.progress = None
    else:
        job.progress = max(0.0, min(1.0, completed / total))
    session.flush()
    return job
