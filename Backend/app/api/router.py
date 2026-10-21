"""Versioned API router assembly."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    benchmarks,
    configurations,
    health,
    history,
    inference,
    jobs,
    optimization,
    workloads,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(configurations.router)
api_router.include_router(workloads.router)
api_router.include_router(benchmarks.router)
api_router.include_router(optimization.router)
api_router.include_router(inference.router)
api_router.include_router(jobs.router)
api_router.include_router(history.router)
api_router.include_router(history.aliases)

__all__ = ["api_router"]
