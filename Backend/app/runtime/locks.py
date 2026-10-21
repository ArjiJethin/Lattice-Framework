"""Runtime mutual exclusion.

The in-process worker pool may run several jobs, but a runtime that cannot be
concurrently loaded must be serialized.  Locks are keyed by adapter id; a
timeout produces a bounded-capacity error instead of unbounded waiting.
"""

from __future__ import annotations

import threading
from collections.abc import Iterator
from contextlib import contextmanager

from app.core.errors import CapacityError


class RuntimeLockManager:
    def __init__(self) -> None:
        self._locks: dict[str, threading.Lock] = {}
        self._guard = threading.Lock()

    def _lock_for(self, key: str) -> threading.Lock:
        with self._guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = threading.Lock()
                self._locks[key] = lock
            return lock

    @contextmanager
    def acquire(self, key: str, *, timeout_seconds: float = 30.0) -> Iterator[None]:
        lock = self._lock_for(key)
        acquired = lock.acquire(timeout=max(0.001, timeout_seconds))
        if not acquired:
            raise CapacityError(
                "runtime is busy; another job holds the model/runtime lock",
                details={"lock_key": key, "timeout_seconds": timeout_seconds},
            )
        try:
            yield
        finally:
            lock.release()


__all__ = ["RuntimeLockManager"]
