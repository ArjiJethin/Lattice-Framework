"""Application dependency container.

Everything is constructed once per app instance and injected through FastAPI
dependencies, so tests can substitute the runtime adapter, hardware service,
quality evaluator or database without monkeypatching globals.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.benchmarking.quality import QualityRegistry
from app.core.logging import get_logger
from app.core.settings import Settings
from app.core.time import utcnow
from app.db.session import create_engine_from_settings, create_session_factory, init_database
from app.hardware.service import HardwareService
from app.jobs.manager import JobManager
from app.optimization.baseline import BaselineOptimizer
from app.runtime.locks import RuntimeLockManager
from app.runtime.registry import RuntimeRegistry

logger = get_logger(__name__)


class JobDispatcher:
    """Maps persisted jobs to service entry points (fresh session per job)."""

    def __init__(self, container: Container) -> None:
        self.container = container

    def __call__(self, job_type: str, resource_id: str) -> None:
        # Imported lazily to avoid circular imports at module load time.
        from app.services.benchmarks import BenchmarkService
        from app.services.inference import InferenceService
        from app.services.optimization import OptimizationService

        container = self.container
        # Construct the service with a short-lived session, then close it before
        # the long-running work starts.  Execution methods open their own short
        # sessions for persistence only.
        with container.session_factory() as session:
            if job_type == "benchmark":
                service: Any = BenchmarkService(
                    session,
                    settings=container.settings,
                    runtime_registry=container.runtime_registry,
                    hardware_service=container.hardware_service,
                    quality_registry=container.quality_registry,
                    job_manager=container.job_manager,
                    runtime_locks=container.runtime_locks,
                    session_factory=container.session_factory,
                )
            elif job_type == "inference":
                service = InferenceService(
                    session,
                    settings=container.settings,
                    runtime_registry=container.runtime_registry,
                    hardware_service=container.hardware_service,
                    job_manager=container.job_manager,
                    runtime_locks=container.runtime_locks,
                    session_factory=container.session_factory,
                )
            elif job_type == "optimization":
                service = OptimizationService(
                    session,
                    settings=container.settings,
                    runtime_registry=container.runtime_registry,
                    hardware_service=container.hardware_service,
                    quality_registry=container.quality_registry,
                    job_manager=container.job_manager,
                    runtime_locks=container.runtime_locks,
                    session_factory=container.session_factory,
                    optimizer=container.optimizer,
                )
            else:
                raise ValueError(f"unknown job type '{job_type}'")
        if job_type == "benchmark":
            service.execute(resource_id)
        elif job_type == "inference":
            service.execute(resource_id)
        else:
            service.run_decision_job(resource_id)


class Container:
    def __init__(
        self,
        settings: Settings,
        *,
        runtime_registry: RuntimeRegistry | None = None,
        hardware_service: HardwareService | None = None,
        quality_registry: QualityRegistry | None = None,
        optimizer: BaselineOptimizer | None = None,
    ) -> None:
        self.settings = settings
        self.engine: Engine = create_engine_from_settings(settings)
        self.session_factory: sessionmaker[Session] = create_session_factory(self.engine)
        if settings.auto_create_schema:
            init_database(self.engine)
        self.runtime_registry = runtime_registry or RuntimeRegistry(settings)
        self.hardware_service = hardware_service or HardwareService(settings)
        self.quality_registry = quality_registry or QualityRegistry()
        self.optimizer = optimizer or BaselineOptimizer()
        self.runtime_locks = RuntimeLockManager()
        self.started_at: datetime = utcnow()
        self.dispatcher = JobDispatcher(self)
        self.job_manager = JobManager(
            self.session_factory,
            max_workers=settings.job_max_workers,
            max_pending=settings.job_max_pending,
            dispatcher=self.dispatcher,
            shutdown_grace_seconds=settings.job_shutdown_grace_seconds,
        )

    def close(self) -> None:
        self.job_manager.close()
        self.engine.dispose()


__all__ = ["Container", "JobDispatcher"]
