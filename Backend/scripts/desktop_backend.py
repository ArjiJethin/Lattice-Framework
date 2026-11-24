"""Frozen entry point for the desktop backend sidecar.

The Tauri shell starts this executable next to itself and talks to it on
loopback.  It is the same FastAPI application used in development; only the
transport is started programmatically so a packaged build needs no Python.
"""

from __future__ import annotations

import multiprocessing
import os

import uvicorn

from app.main import app


def main() -> None:
    multiprocessing.freeze_support()
    host = os.environ.get("LATTICE_HOST", "127.0.0.1")
    port = int(os.environ.get("LATTICE_PORT", "8000"))
    log_level = os.environ.get("LATTICE_LOG_LEVEL", "info").lower()
    uvicorn.run(app, host=host, port=port, log_level=log_level)


if __name__ == "__main__":
    main()
