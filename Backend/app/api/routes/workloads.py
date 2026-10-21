"""Workload profile endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import PageParams, get_workload_service, pagination
from app.schemas.common import DeleteResponse
from app.schemas.resources import WorkloadCreate, WorkloadPage, WorkloadRead, WorkloadUpdate
from app.services.workloads import WorkloadService

router = APIRouter(prefix="/workloads", tags=["Workloads"])


@router.post("", response_model=WorkloadRead, status_code=status.HTTP_201_CREATED)
def create_workload(
    payload: WorkloadCreate,
    service: WorkloadService = Depends(get_workload_service),
) -> WorkloadRead:
    return service.create(payload)


@router.get("", response_model=WorkloadPage)
def list_workloads(
    params: PageParams = Depends(pagination),
    workload_type: str | None = Query(default=None),
    enabled: bool | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    service: WorkloadService = Depends(get_workload_service),
) -> WorkloadPage:
    items, total = service.list(
        limit=params.limit,
        offset=params.offset,
        workload_type=workload_type,
        enabled=enabled,
        search=search,
    )
    return WorkloadPage(items=items, limit=params.limit, offset=params.offset, total=total)


@router.get("/{workload_id}", response_model=WorkloadRead)
def get_workload(
    workload_id: str,
    service: WorkloadService = Depends(get_workload_service),
) -> WorkloadRead:
    return service.to_read(service.get(workload_id))


@router.patch("/{workload_id}", response_model=WorkloadRead)
def update_workload(
    workload_id: str,
    payload: WorkloadUpdate,
    service: WorkloadService = Depends(get_workload_service),
) -> WorkloadRead:
    return service.update(workload_id, payload)


@router.delete("/{workload_id}", response_model=DeleteResponse)
def delete_workload(
    workload_id: str,
    service: WorkloadService = Depends(get_workload_service),
) -> DeleteResponse:
    return service.delete(workload_id)
