"""Structured logging with request correlation IDs.

Log records never include prompts, generated text, secrets or full local
paths.  Only the path *basename* is logged when a model file is referenced.
"""

from __future__ import annotations

import contextvars
import logging
import sys
import uuid

_request_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "lattice_request_id", default=None
)


def new_request_id() -> str:
    return uuid.uuid4().hex


def set_request_id(value: str | None = None) -> str:
    request_id = value or new_request_id()
    _request_id.set(request_id)
    return request_id


def get_request_id() -> str | None:
    return _request_id.get()


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


def configure_logging(level: str = "INFO") -> None:
    """Idempotently configure process-wide logging."""
    root = logging.getLogger()
    root.setLevel(level.upper())
    handler = logging.StreamHandler(stream=sys.stderr)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )
    handler.addFilter(_RequestIdFilter())
    root.handlers = [handler]
    # Uvicorn access logs would duplicate request lines; keep them visible but
    # quiet at warning level to avoid skewing benchmark timing.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
