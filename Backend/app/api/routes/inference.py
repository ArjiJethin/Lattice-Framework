"""Inference execution endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import PageParams, get_inference_service, pagination
from app.schemas.inference import (
    InferenceAccepted,
    InferenceCreate,
    InferencePage,
    InferenceRead,
)
from app.services.inference import InferenceService

router = APIRouter(prefix="/inference", tags=["Inference"])


@router.post(
    "",
    response_model=InferenceAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue an inference execution (prompts are not persisted by default)",
)
def create_inference(
    payload: InferenceCreate,
    service: InferenceService = Depends(get_inference_service),
) -> InferenceAccepted:
    return service.create(payload)


@router.get("", response_model=InferencePage)
def list_inference(
    params: PageParams = Depends(pagination),
    configuration_id: str | None = Query(default=None),
    execution_status: str | None = Query(default=None, alias="status"),
    service: InferenceService = Depends(get_inference_service),
) -> InferencePage:
    items, total = service.list(
        limit=params.limit,
        offset=params.offset,
        configuration_id=configuration_id,
        status=execution_status,
    )
    return InferencePage(items=items, limit=params.limit, offset=params.offset, total=total)


@router.get("/{execution_id}", response_model=InferenceRead)
def get_inference(
    execution_id: str,
    service: InferenceService = Depends(get_inference_service),
) -> InferenceRead:
    return service.get(execution_id)
