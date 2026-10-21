"""Time, ID and canonical-hash helpers.

All persisted timestamps are UTC.  All measured durations use a monotonic
high-resolution clock; wall-clock timestamps are only used for provenance.
"""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from datetime import UTC, datetime
from typing import Any


def utcnow() -> datetime:
    """Timezone-aware current UTC time."""
    return datetime.now(tz=UTC)


def ensure_utc(value: datetime | None) -> datetime | None:
    """SQLite drops tzinfo; re-attach UTC on the way out."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def utc_iso(value: datetime | None) -> str | None:
    value = ensure_utc(value)
    return value.isoformat() if value is not None else None


def new_id() -> str:
    """Stable, opaque UUIDv4 string identifier."""
    return str(uuid.uuid4())


def monotonic() -> float:
    """High-resolution monotonic clock used for all duration measurements."""
    return time.perf_counter()


def elapsed_ms(start: float, end: float | None = None) -> float:
    stop = monotonic() if end is None else end
    return max(0.0, (stop - start) * 1000.0)


def canonical_json(payload: Any) -> str:
    """Deterministic JSON encoding used for content hashes."""
    return json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str
    )


def content_hash(payload: Any) -> str:
    """SHA-256 of the canonical JSON encoding of ``payload``."""
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()


def is_finite_number(value: Any) -> bool:
    """True when ``value`` is a finite int/float (bools are rejected)."""
    import math

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return math.isfinite(float(value))
