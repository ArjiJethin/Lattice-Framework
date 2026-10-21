"""Benchmark endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import (
    PageParams,
    get_benchmark_service,
    get_comparison_service,
    pagination,
)
from app.schemas.benchmark import (
    BenchmarkAccepted,
    BenchmarkCancelResponse,
    BenchmarkCreate,
    BenchmarkDetail,
    BenchmarkRunPage,
    MeasurementPage,
)
from app.schemas.history import ComparisonResponse
from app.services.benchmarks import BenchmarkService
from app.services.comparison import ComparisonService

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])


@router.post(
    "",
    response_model=BenchmarkAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue a repeatable benchmark run",
)
def submit_benchmark(
    payload: BenchmarkCreate,
    service: BenchmarkService = Depends(get_benchmark_service),
) -> BenchmarkAccepted:
    return service.submit(payload)


@router.get("", response_model=BenchmarkRunPage)
def list_benchmarks(
    params: PageParams = Depends(pagination),
    configuration_id: str | None = Query(default=None),
    workload_id: str | None = Query(default=None),
    run_status: str | None = Query(default=None, alias="status"),
    created_after: datetime | None = Query(default=None),
    created_before: datetime | None = Query(default=None),
    include_test_only: bool = Query(
        default=False,
        description="Fake-runtime runs are excluded from research summaries by default",
    ),
    service: BenchmarkService = Depends(get_benchmark_service),
) -> BenchmarkRunPage:
    items, total = service.list_runs(
        limit=params.limit,
        offset=params.offset,
        configuration_id=configuration_id,
        workload_id=workload_id,
        status=run_status,
        created_after=created_after,
        created_before=created_before,
        include_test_only=include_test_only,
    )
    return BenchmarkRunPage(items=items, limit=params.limit, offset=params.offset, total=total)


@router.get("/compare", response_model=ComparisonResponse)
def compare_benchmarks(
    run_ids: list[str] = Query(..., min_length=2, max_length=10),
    service: ComparisonService = Depends(get_comparison_service),
) -> ComparisonResponse:
    return ComparisonResponse(**service.compare(run_ids))


@router.get("/{run_id}", response_model=BenchmarkDetail)
def get_benchmark(
    run_id: str,
    service: BenchmarkService = Depends(get_benchmark_service),
) -> BenchmarkDetail:
    return service.detail(run_id)


@router.get("/{run_id}/measurements", response_model=MeasurementPage)
def get_measurements(
    run_id: str,
    params: PageParams = Depends(pagination),
    kind: str | None = Query(default=None, pattern="^(warmup|measured)$"),
    service: BenchmarkService = Depends(get_benchmark_service),
) -> MeasurementPage:
    return service.measurements(run_id, limit=params.limit, offset=params.offset, kind=kind)


@router.post("/{run_id}/cancel", response_model=BenchmarkCancelResponse)
def cancel_benchmark(
    run_id: str,
    service: BenchmarkService = Depends(get_benchmark_service),
) -> BenchmarkCancelResponse:
    return service.cancel(run_id)
