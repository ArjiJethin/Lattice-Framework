"""Bounded in-process job manager.

Limitations are explicit: this is a single-process worker pool backed by the
SQLite job table.  There is no distributed queue, no at-least-once delivery and
no cross-process recovery.  Queued/running rows surviving a crash are marked
``interrupted`` at the next startup.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor

from sqlalchemy.orm import Session, sessionmaker

from app.core.enums import JobStatus
from app.core.errors import CapacityError
from app.core.logging import get_logger
from app.db.models import Job
from app.services.jobs import safe_failure, transition

logger = get_logger(__name__)

Dispatcher = Callable[[str, str], None]


class JobManager:
    def __init__(
        self,
        session_factory: sessionmaker[Session],
        *,
        max_workers: int,
        max_pending: int,
        dispatcher: Dispatcher,
        shutdown_grace_seconds: float = 10.0,
    ) -> None:
        if max_workers < 1 or max_pending < 1:
            raise ValueError("max_workers and max_pending must be >= 1")
        self._session_factory = session_factory
        self._max_workers = max_workers
        self._max_pending = max_pending
        self._dispatcher = dispatcher
        self._shutdown_grace_seconds = shutdown_grace_seconds
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers, thread_name_prefix="lattice-job"
        )
        self._lock = threading.Lock()
        self._outstanding = 0
        self._futures: dict[str, Future[None]] = {}
        self._closed = False

    # -- capacity ----------------------------------------------------------
    @property
    def outstanding(self) -> int:
        with self._lock:
            return self._outstanding

    @property
    def max_pending(self) -> int:
        return self._max_pending

    def reserve(self) -> None:
        """Reserve capacity *before* persisting a job row."""
        with self._lock:
            if self._closed:
                raise CapacityError("job manager is shutting down")
            if self._outstanding >= self._max_pending:
                raise CapacityError(
                    "job queue is full; wait for running work to finish",
                    details={
                        "outstanding": self._outstanding,
                        "max_pending": self._max_pending,
                    },
                )
            self._outstanding += 1

    def release(self) -> None:
        with self._lock:
            self._outstanding = max(0, self._outstanding - 1)

    def submit(self, job_id: str, job_type: str, resource_id: str) -> None:
        """Enqueue an already-persisted job.  A reservation must be held."""
        if self._closed:
            self.release()
            raise CapacityError("job manager is shutting down")
        future = self._executor.submit(self._run, job_id, job_type, resource_id)
        with self._lock:
            self._futures[job_id] = future

    # -- worker ------------------------------------------------------------
    def _run(self, job_id: str, job_type: str, resource_id: str) -> None:
        try:
            with self._session_factory() as session:
                job = session.get(Job, job_id)
                if job is None:
                    logger.warning("job %s disappeared before execution", job_id)
                    return
                if job.status != JobStatus.QUEUED.value:
                    # Cancelled (or otherwise terminal) while queued.
                    return
                try:
                    transition(session, job, JobStatus.RUNNING.value)
                    session.commit()
                except Exception:
                    session.rollback()
                    logger.exception("failed to start job %s", job_id)
                    return
            try:
                self._dispatcher(job_type, resource_id)
            except Exception as exc:
                code, message = safe_failure(exc)
                logger.exception("job %s failed (%s)", job_id, code)
                self._mark_failed(job_id, code, message)
            else:
                self._ensure_completed(job_id)
        finally:
            with self._lock:
                self._futures.pop(job_id, None)
            self.release()

    def _mark_failed(self, job_id: str, code: str, message: str) -> None:
        try:
            with self._session_factory() as session:
                job = session.get(Job, job_id)
                if job is None or job.status != JobStatus.RUNNING.value:
                    return
                transition(
                    session,
                    job,
                    JobStatus.FAILED.value,
                    error_code=code,
                    error_message=message,
                )
                session.commit()
        except Exception:
            logger.exception("failed to persist failure state for job %s", job_id)

    def _ensure_completed(self, job_id: str) -> None:
        """Mark completed only if the handler did not set a terminal state."""
        try:
            with self._session_factory() as session:
                job = session.get(Job, job_id)
                if job is None or job.status != JobStatus.RUNNING.value:
                    return
                transition(session, job, JobStatus.COMPLETED.value)
                session.commit()
        except Exception:
            logger.exception("failed to finalize job %s", job_id)

    # -- cancellation ------------------------------------------------------
    def cancel(self, job_id: str) -> bool:
        """Cancel a *queued* job.  Running work is not preemptible."""
        with self._session_factory() as session:
            job = session.get(Job, job_id)
            if job is None:
                return False
            if job.status != JobStatus.QUEUED.value:
                return False
            transition(
                session,
                job,
                JobStatus.CANCELLED.value,
                error_code="cancelled_before_start",
                error_message="Job was cancelled before execution started",
            )
            session.commit()
            return True

    # -- shutdown ----------------------------------------------------------
    def wait_for_idle(self, timeout_seconds: float = 30.0) -> bool:
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            if self.outstanding == 0:
                return True
            time.sleep(0.01)
        return self.outstanding == 0

    def close(self) -> None:
        with self._lock:
            self._closed = True
        self.wait_for_idle(self._shutdown_grace_seconds)
        self._executor.shutdown(wait=False, cancel_futures=False)


__all__ = ["JobManager"]
