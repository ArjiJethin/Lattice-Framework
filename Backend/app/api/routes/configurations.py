"""Configuration profile endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import (
    PageParams,
    get_configuration_service,
    get_io_service,
    pagination,
)
from app.schemas.common import DeleteResponse, Page
from app.schemas.history import ConfigurationExportEnvelope, ImportRequest, ImportResponse
from app.schemas.resources import (
    ConfigurationCreate,
    ConfigurationPage,
    ConfigurationRead,
    ConfigurationUpdate,
    ConfigurationValidationResponse,
)
from app.services.configurations import ConfigurationService
from app.services.io import ImportExportService

router = APIRouter(prefix="/configurations", tags=["Configurations"])


@router.post("", response_model=ConfigurationRead, status_code=status.HTTP_201_CREATED)
def create_configuration(
    payload: ConfigurationCreate,
    service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationRead:
    return service.create(payload)


@router.get("", response_model=ConfigurationPage)
def list_configurations(
    params: PageParams = Depends(pagination),
    enabled: bool | None = Query(default=None),
    model_id: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationPage:
    items, total = service.list(
        limit=params.limit,
        offset=params.offset,
        enabled=enabled,
        model_id=model_id,
        search=search,
    )
    return ConfigurationPage(items=items, limit=params.limit, offset=params.offset, total=total)


@router.post("/import", response_model=ImportResponse)
def import_configurations(
    payload: ImportRequest,
    service: ImportExportService = Depends(get_io_service),
) -> ImportResponse:
    return service.import_configurations(payload)


@router.get("/export", response_model=ConfigurationExportEnvelope)
def export_configurations(
    include_model_paths: bool = Query(
        default=False,
        description="Include absolute model paths (machine-specific; off by default)",
    ),
    service: ImportExportService = Depends(get_io_service),
) -> ConfigurationExportEnvelope:
    return service.export(include_model_paths=include_model_paths)


@router.get("/{configuration_id}", response_model=ConfigurationRead)
def get_configuration(
    configuration_id: str,
    service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationRead:
    return service.to_read(service.get(configuration_id))


@router.patch("/{configuration_id}", response_model=ConfigurationRead)
def update_configuration(
    configuration_id: str,
    payload: ConfigurationUpdate,
    service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationRead:
    return service.update(configuration_id, payload)


@router.delete("/{configuration_id}", response_model=DeleteResponse)
def delete_configuration(
    configuration_id: str,
    service: ConfigurationService = Depends(get_configuration_service),
) -> DeleteResponse:
    return service.delete(configuration_id)


@router.post("/{configuration_id}/validate", response_model=ConfigurationValidationResponse)
def validate_configuration(
    configuration_id: str,
    service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationValidationResponse:
    return service.validate(configuration_id)


@router.get("/{configuration_id}/revisions", response_model=Page[dict])
def configuration_revisions(
    configuration_id: str,
    params: PageParams = Depends(pagination),
    service: ConfigurationService = Depends(get_configuration_service),
) -> Page[dict]:
    configuration = service.get(configuration_id)
    revisions = configuration.revisions
    items = [
        {
            "revision": item.revision,
            "content_hash": item.content_hash,
            "snapshot": item.snapshot,
            "created_at": item.created_at.isoformat(),
        }
        for item in revisions
    ]
    sliced = items[params.offset : params.offset + params.limit]
    return Page(items=sliced, limit=params.limit, offset=params.offset, total=len(items))
