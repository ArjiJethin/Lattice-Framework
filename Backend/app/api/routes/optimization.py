"""Optimization decision endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.api.deps import (
    PageParams,
    get_optimization_service,
    pagination,
)
from app.schemas.optimization import (
    DecisionCreationResponse,
    DecisionExecuteRequest,
    DecisionExecuteResponse,
    DecisionPage,
    DecisionRead,
    OptimizationCreate,
)
from app.services.optimization import OptimizationService

router = APIRouter(tags=["Optimization"])


@router.post(
    "/optimization/decisions",
    response_model=DecisionCreationResponse,
    responses={201: {}, 202: {}},
    summary="Create a deterministic optimization decision (201) or queue fresh evidence (202)",
)
def create_decision(
    payload: OptimizationCreate,
    service: OptimizationService = Depends(get_optimization_service),
):
    creation = service.create(payload)
    body = DecisionCreationResponse(
        decision=creation.decision,
        job_id=creation.job_id,
        message=(
            "Decision persisted from existing compatible evidence"
            if creation.job_id is None
            else "Fresh benchmarking queued; the decision is pending evidence"
        ),
    )
    return JSONResponse(status_code=creation.http_status, content=body.model_dump(mode="json"))


@router.get("/optimization/decisions", response_model=DecisionPage)
def list_decisions(
    params: PageParams = Depends(pagination),
    workload_id: str | None = Query(default=None),
    decision_status: str | None = Query(default=None, alias="status"),
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionPage:
    items, total = service.list(
        limit=params.limit,
        offset=params.offset,
        workload_id=workload_id,
        status=decision_status,
    )
    return DecisionPage(items=items, limit=params.limit, offset=params.offset, total=total)


@router.get("/optimization/decisions/{decision_id}", response_model=DecisionRead)
def get_decision(
    decision_id: str,
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionRead:
    return service.get_decision(decision_id)


@router.post(
    "/optimization/decisions/{decision_id}/execute",
    response_model=DecisionExecuteResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def execute_decision(
    decision_id: str,
    payload: DecisionExecuteRequest,
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionExecuteResponse:
    return service.execute(decision_id, payload)


# ---------------------------------------------------------------------------
# Compatibility aliases (documented as aliases of the /decisions routes)
# ---------------------------------------------------------------------------
@router.post(
    "/optimization",
    response_model=DecisionCreationResponse,
    responses={201: {}, 202: {}},
    include_in_schema=True,
    summary="Alias of POST /optimization/decisions",
)
def create_decision_alias(
    payload: OptimizationCreate,
    service: OptimizationService = Depends(get_optimization_service),
):
    creation = service.create(payload)
    body = DecisionCreationResponse(
        decision=creation.decision,
        job_id=creation.job_id,
        message=(
            "Decision persisted from existing compatible evidence"
            if creation.job_id is None
            else "Fresh benchmarking queued; the decision is pending evidence"
        ),
    )
    return JSONResponse(status_code=creation.http_status, content=body.model_dump(mode="json"))


@router.get("/optimization/{decision_id}", response_model=DecisionRead)
def get_decision_alias(
    decision_id: str,
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionRead:
    return service.get_decision(decision_id)
