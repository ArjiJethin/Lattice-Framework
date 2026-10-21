"""Lattice backend application factory and ASGI entry point.

Run locally with::

    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

The service starts on a CPU-only machine without llama.cpp, a GPU, model files
or network access.  Runtime-dependent endpoints report a controlled 503 until
an adapter is installed.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.router import api_router
from app.api.routes import health as health_routes
from app.benchmarking.quality import QualityRegistry
from app.core.container import Container
from app.core.logging import configure_logging, new_request_id, set_request_id
from app.core.settings import Settings, get_settings
from app.hardware.service import HardwareService
from app.optimization.baseline import BaselineOptimizer
from app.runtime.registry import RuntimeRegistry
from app.services.jobs import recover_interrupted_work

DESCRIPTION = """\
Lattice is a resource- and quality-aware local LLM inference experimentation API.

The backend persists configuration/workload profiles, queues benchmark and inference jobs
through a bounded in-process worker, records raw per-repetition measurements with hardware
provenance, computes descriptive statistics, evaluates hard constraints and persists
deterministic optimization decisions.

Runtime inference is optional and lazy-loaded. Without `llama-cpp-python` the API remains
fully usable for configuration, workload, history and decision management; benchmark and
inference execution return a controlled `runtime_unavailable` error. The fake runtime is
test-only and every run using it is tagged `test_only`.
"""


def create_app(
    settings: Settings | None = None,
    *,
    runtime_registry: RuntimeRegistry | None = None,
    hardware_service: HardwareService | None = None,
    quality_registry: QualityRegistry | None = None,
    optimizer: BaselineOptimizer | None = None,
    container: Container | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    configure_logging(resolved_settings.log_level)
    resolved_container = container or Container(
        resolved_settings,
        runtime_registry=runtime_registry,
        hardware_service=hardware_service,
        quality_registry=quality_registry,
        optimizer=optimizer,
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):  # noqa: ARG001
        if resolved_settings.job_recover_interrupted_on_startup:
            recover_interrupted_work(resolved_container.session_factory)
        yield
        resolved_container.close()

    app = FastAPI(
        title="Lattice Backend",
        version=resolved_settings.version,
        description=DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        contact={"name": "Lattice Framework"},
        license_info={"name": "See repository LICENSE"},
    )
    app.state.container = resolved_container

    @app.middleware("http")
    async def request_context(request: Request, call_next: Any):  # type: ignore[no-untyped-def]
        request_id = request.headers.get("X-Request-ID") or new_request_id()
        set_request_id(request_id)
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    if resolved_settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=resolved_settings.cors_origins,
            allow_credentials=resolved_settings.cors_allow_credentials,
            allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
            expose_headers=["X-Request-ID", "X-Record-Count"],
        )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=resolved_settings.api_prefix)

    # Root aliases preserve the original scaffold contract and make liveness
    # probes work without knowing the version prefix.
    @app.get("/health", tags=["Health"], summary="Liveness alias of /api/v1/health")
    def root_health() -> dict[str, Any]:
        return health_routes.health(resolved_container)

    @app.get("/ready", tags=["Health"], summary="Readiness alias of /api/v1/ready")
    def root_ready():  # type: ignore[no-untyped-def]
        return health_routes.ready(resolved_container)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, Any]:
        return {
            "service": "lattice-backend",
            "version": resolved_settings.version,
            "api": resolved_settings.api_prefix,
            "docs": "/docs",
        }

    return app


app = create_app()
