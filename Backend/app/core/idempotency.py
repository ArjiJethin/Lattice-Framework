"""Process-local idempotency keys.

``X-Request-ID`` is treated as a client-supplied idempotency key: replaying the
same key must return the work that was already accepted instead of creating a
second job.  A plain "look for the existing job, then insert" sequence is not
sufficient under concurrency - two requests can both observe "no job yet" before
either commits - so check-and-create runs inside a per-key critical section.

Scope and limits (deliberate, documented):

* The lock is **process-local**, while the database also enforces uniqueness on
  ``(job_type, request_id)`` for non-null keys.  The database constraint is the
  cross-process safety net; callers recover its narrow conflict as a replay.
* Different keys never block each other.
* A ``None`` key is a no-op, so callers without an idempotency key keep their
  previous behaviour.
"""

from __future__ import annotations

import threading
from collections.abc import Iterator
from contextlib import contextmanager

_guard = threading.Lock()
_locks: dict[str, threading.Lock] = {}
_references: dict[str, int] = {}


@contextmanager
def idempotency_lock(scope: str, key: str | None) -> Iterator[None]:
    """Serialise check-and-create for one ``(scope, key)`` pair.

    ``scope`` is the job type, so an inference key can never collide with a
    benchmark or optimization key.
    """
    if not key:
        yield
        return
    composite = f"{scope}:{key}"
    with _guard:
        lock = _locks.get(composite)
        if lock is None:
            lock = threading.Lock()
            _locks[composite] = lock
        # Reference counting happens before the acquire so a lock can never be
        # reaped while another thread is still queued for it.
        _references[composite] = _references.get(composite, 0) + 1
    try:
        lock.acquire()
        try:
            yield
        finally:
            lock.release()
    finally:
        with _guard:
            remaining = _references.get(composite, 1) - 1
            if remaining <= 0:
                _references.pop(composite, None)
                _locks.pop(composite, None)
            else:
                _references[composite] = remaining


def active_lock_count() -> int:
    """Number of live per-key locks (diagnostics/tests only)."""
    with _guard:
        return len(_locks)


def is_job_idempotency_conflict(exc: BaseException) -> bool:
    """Return whether an integrity error is the jobs idempotency uniqueness rule."""
    current: BaseException | None = exc
    while current is not None:
        constraint_name = getattr(getattr(current, "orig", None), "diag", None)
        constraint_name = getattr(constraint_name, "constraint_name", None)
        if constraint_name == "uq_jobs_job_type_request_id":
            return True
        message = str(getattr(current, "orig", current)).lower()
        if (
            "unique constraint failed: jobs.job_type, jobs.request_id" in message
            or "uq_jobs_job_type_request_id" in message
        ):
            return True
        current = getattr(current, "__cause__", None)
    return False


__all__ = ["active_lock_count", "idempotency_lock", "is_job_idempotency_conflict"]
