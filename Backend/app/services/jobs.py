"""Job state machine.

Transitions are explicit and terminal states never transition back.  Retrying
creates a new attempt; a failed attempt is never rewritten.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import (
    TERMINAL_JOB_STATUSES,
    DecisionStatus,
    JobStatus,
    JobType,
    RunStatus,
)
from app.core.errors import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.time import utc_iso, utcnow
from app.db.models import (
    BenchmarkRun,
    InferenceExecution,
    Job,
    OptimizationDecision,
)
from app.repositories import jobs as job_repo
from app.schemas.jobs import JobRead

logger = get_logger(__name__)

ALLOWED_TRANSITIONS: dict[JobStatus, frozenset[JobStatus]] = {
    JobStatus.QUEUED: frozenset({JobStatus.RUNNING, JobStatus.FAILED, JobStatus.CANCELLED}),
    JobStatus.RUNNING: frozenset(
        {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.INTERRUPTED, JobStatus.CANCELLED}
    ),
    JobStatus.COMPLETED: frozenset(),
    JobStatus.FAILED: frozenset(),
    JobStatus.CANCELLED: frozenset(),
    JobStatus.INTERRUPTED: frozenset(),
}


def assert_transition(current: str, target: str) -> None:
    try:
        current_status = JobStatus(current)
        target_status = JobStatus(target)
    except ValueError as exc:
        raise ConflictError(f"unknown job status transition '{current}' -> '{target}'") from exc
    if target_status not in ALLOWED_TRANSITIONS[current_status]:
        raise ConflictError(
            f"illegal job state transition '{current}' -> '{target}'",
            details={"from": current, "to": target},
        )


def create_job(
    session: Session,
    *,
    job_type: str,
    resource_type: str,
    resource_id: str,
    request_id: str | None = None,
) -> Job:
    job = Job(
        id=__import__("uuid").uuid4().hex,
        job_type=job_type,
        status=JobStatus.QUEUED.value,
        resource_type=resource_type,
        resource_id=resource_id,
        request_id=request_id,
        attempt=1,
    )
    session.add(job)
    session.flush()
    return job


def transition(
    session: Session,
    job: Job,
    target: str,
    *,
    result_summary: dict[str, Any] | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> Job:
    assert_transition(job.status, target)
    now = utcnow()
    job.status = target
    if target == JobStatus.RUNNING.value:
        job.started_at = now
        job.progress = None
    elif target in {status.value for status in TERMINAL_JOB_STATUSES}:
        job.finished_at = now
    if result_summary is not None:
        job.result_summary = result_summary
    if error_code is not None:
        job.error_code = error_code
    if error_message is not None:
        job.error_message = error_message
    session.flush()
    return job


def get_job(session: Session, job_id: str) -> Job:
    job = job_repo.get(session, job_id)
    if job is None:
        raise NotFoundError(f"job '{job_id}' was not found")
    return job


def job_read(session: Session, job: Job) -> JobRead:
    duration_ms: float | None = None
    if job.started_at and job.finished_at:
        duration_ms = max(0.0, (job.finished_at - job.started_at).total_seconds() * 1000.0)
    benchmark_run_id = None
    inference_execution_id = None
    if job.job_type == JobType.BENCHMARK.value and job.resource_id:
        benchmark_run_id = job.resource_id
    elif job.job_type == JobType.INFERENCE.value and job.resource_id:
        inference_execution_id = job.resource_id
    return JobRead(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        progress=job.progress,
        resource_type=job.resource_type,
        resource_id=job.resource_id,
        result_summary=job.result_summary,
        error_code=job.error_code,
        error_message=job.error_message,
        attempt=job.attempt,
        request_id=job.request_id,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        duration_ms=duration_ms,
        benchmark_run_id=benchmark_run_id,
        inference_execution_id=inference_execution_id,
    )


def safe_failure(exc: BaseException) -> tuple[str, str]:
    """Map arbitrary exceptions to a stable code and safe message."""
    from app.core.errors import AppError
    from app.runtime.base import RuntimeFailure

    if isinstance(exc, RuntimeFailure):
        return exc.code, exc.message[:500]
    if isinstance(exc, AppError):
        return exc.code, exc.message[:500]
    return "internal_error", f"Unexpected failure ({exc.__class__.__name__}); see server logs"


def recover_interrupted_work(session_factory: Any) -> dict[str, int]:
    """Mark queued/running work interrupted after an unclean shutdown.

    A restart cannot resume in-process work, so jobs are never silently
    duplicated.  Queued jobs are marked interrupted too (documented policy).
    """
    counts = {"jobs": 0, "benchmark_runs": 0, "inference_executions": 0, "decisions": 0}
    with session_factory() as session:
        now = utcnow()
        jobs = list(
            session.scalars(
                select(Job).where(Job.status.in_([JobStatus.QUEUED.value, JobStatus.RUNNING.value]))
            ).all()
        )
        for job in jobs:
            job.status = JobStatus.INTERRUPTED.value
            job.finished_at = now
            job.error_code = "interrupted_by_restart"
            job.error_message = (
                "Job was interrupted by a backend restart; requeue by submitting a new request"
            )
            counts["jobs"] += 1
        runs = list(
            session.scalars(
                select(BenchmarkRun).where(
                    BenchmarkRun.status.in_([RunStatus.QUEUED.value, RunStatus.RUNNING.value])
                )
            ).all()
        )
        for run in runs:
            run.status = RunStatus.INTERRUPTED.value
            run.finished_at = now
            run.error_code = "interrupted_by_restart"
            run.error_message = "Benchmark run was interrupted by a backend restart"
            counts["benchmark_runs"] += 1
        executions = list(
            session.scalars(
                select(InferenceExecution).where(
                    InferenceExecution.status.in_([RunStatus.QUEUED.value, RunStatus.RUNNING.value])
                )
            ).all()
        )
        for execution in executions:
            execution.status = RunStatus.INTERRUPTED.value
            execution.finished_at = now
            execution.error_code = "interrupted_by_restart"
            execution.error_message = "Inference execution was interrupted by a backend restart"
            counts["inference_executions"] += 1
        decisions = list(
            session.scalars(
                select(OptimizationDecision).where(
                    OptimizationDecision.status == DecisionStatus.PENDING_EVIDENCE.value
                )
            ).all()
        )
        for decision in decisions:
            decision.status = DecisionStatus.FAILED.value
            decision.no_selection_reason = (
                "optimization was interrupted by a backend restart before evidence was complete"
            )
            counts["decisions"] += 1
        session.commit()
    if any(counts.values()):
        logger.warning(
            "recovered interrupted work: %s", {key: value for key, value in counts.items() if value}
        )
    return counts


def job_timestamp(value: datetime | None) -> str | None:
    return utc_iso(value)


__all__ = [
    "ALLOWED_TRANSITIONS",
    "assert_transition",
    "create_job",
    "get_job",
    "job_read",
    "recover_interrupted_work",
    "safe_failure",
    "transition",
]
