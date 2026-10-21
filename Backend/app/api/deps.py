"""FastAPI dependency injection."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass

from fastapi import Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.container import Container
from app.schemas.common import Pagination


def get_container(request: Request) -> Container:
    return request.app.state.container


def get_db(container: Container = Depends(get_container)) -> Iterator[Session]:
    session = container.session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@dataclass
class PageParams:
    limit: int
    offset: int


def pagination(
    container: Container = Depends(get_container),
    limit: int | None = Query(default=None, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> PageParams:
    resolved = limit if limit is not None else container.settings.pagination_default_limit
    resolved = min(resolved, container.settings.pagination_max_limit)
    return PageParams(limit=resolved, offset=offset)


def page_meta(params: PageParams, total: int) -> Pagination:
    return Pagination(limit=params.limit, offset=params.offset, total=total)


def get_configuration_service(
    db: Session = Depends(get_db), container: Container = Depends(get_container)
):
    from app.services.configurations import ConfigurationService

    return ConfigurationService(
        db,
        container.settings,
        runtime_registry=container.runtime_registry,
        hardware_service=container.hardware_service,
    )


def get_workload_service(
    db: Session = Depends(get_db), container: Container = Depends(get_container)
):
    from app.services.workloads import WorkloadService

    return WorkloadService(db, container.settings)


def get_benchmark_service(
    db: Session = Depends(get_db), container: Container = Depends(get_container)
):
    from app.services.benchmarks import BenchmarkService

    return BenchmarkService(
        db,
        settings=container.settings,
        runtime_registry=container.runtime_registry,
        hardware_service=container.hardware_service,
        quality_registry=container.quality_registry,
        job_manager=container.job_manager,
        runtime_locks=container.runtime_locks,
        session_factory=container.session_factory,
    )


def get_inference_service(
    db: Session = Depends(get_db), container: Container = Depends(get_container)
):
    from app.services.inference import InferenceService

    return InferenceService(
        db,
        settings=container.settings,
        runtime_registry=container.runtime_registry,
        hardware_service=container.hardware_service,
        job_manager=container.job_manager,
        runtime_locks=container.runtime_locks,
        session_factory=container.session_factory,
    )


def get_optimization_service(
    db: Session = Depends(get_db), container: Container = Depends(get_container)
):
    from app.services.optimization import OptimizationService

    return OptimizationService(
        db,
        settings=container.settings,
        runtime_registry=container.runtime_registry,
        hardware_service=container.hardware_service,
        quality_registry=container.quality_registry,
        job_manager=container.job_manager,
        runtime_locks=container.runtime_locks,
        session_factory=container.session_factory,
        optimizer=container.optimizer,
    )


def get_history_service(
    db: Session = Depends(get_db), container: Container = Depends(get_container)
):
    from app.services.history import HistoryService

    return HistoryService(db, container.settings)


def get_io_service(db: Session = Depends(get_db), container: Container = Depends(get_container)):
    from app.services.io import ImportExportService

    return ImportExportService(db, container.settings)


def get_comparison_service(
    db: Session = Depends(get_db), container: Container = Depends(get_container)
):
    from app.services.comparison import ComparisonService

    return ComparisonService(db)


__all__ = [
    "PageParams",
    "get_benchmark_service",
    "get_comparison_service",
    "get_configuration_service",
    "get_container",
    "get_db",
    "get_history_service",
    "get_inference_service",
    "get_io_service",
    "get_optimization_service",
    "get_workload_service",
    "page_meta",
    "pagination",
]
