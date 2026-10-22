"""Optimization decision endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status
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
    DecisionExecutionOutcome,
    DecisionPage,
    DecisionRead,
    OptimizationCreate,
)
from app.services.optimization import OptimizationService

router = APIRouter(tags=["Optimization"])


@router.post(
    "/optimization/decisions",
    response_model=DecisionCreationResponse,
    responses={200: {}, 201: {}, 202: {}},
    summary="Create a deterministic optimization decision (201) or queue fresh evidence (202)",
)
def create_decision(
    payload: OptimizationCreate,
    request: Request,
    service: OptimizationService = Depends(get_optimization_service),
):
    creation = service.create(payload, request_id=request.state.request_id)
    body = DecisionCreationResponse(
        decision=creation.decision,
        job_id=creation.job_id,
        duplicate=creation.duplicate,
        message=(
            "Duplicate submission replayed: the decision persisted for this X-Request-ID "
            "was returned without re-evaluating evidence"
            if creation.duplicate
            else (
                "Decision persisted from existing compatible evidence"
                if creation.job_id is None
                else "Fresh benchmarking queued; the decision is pending evidence"
            )
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


@router.get(
    "/optimization/decisions/{decision_id}/execution",
    response_model=DecisionExecutionOutcome,
    summary=(
        "Post-execution outcome of a decision: job status, actual metrics vs baseline evidence "
        "and whether the declared constraints still hold"
    ),
)
def decision_execution_outcome(
    decision_id: str,
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionExecutionOutcome:
    return service.execution_outcome(decision_id)


@router.post(
    "/optimization/decisions/{decision_id}/execute",
    response_model=DecisionExecuteResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def execute_decision(
    decision_id: str,
    payload: DecisionExecuteRequest,
    request: Request,
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionExecuteResponse:
    return service.execute(decision_id, payload, request_id=request.state.request_id)


# ---------------------------------------------------------------------------
# Compatibility aliases (documented as aliases of the /decisions routes)
# ---------------------------------------------------------------------------
@router.post(
    "/optimization",
    response_model=DecisionCreationResponse,
    responses={200: {}, 201: {}, 202: {}},
    include_in_schema=True,
    summary="Alias of POST /optimization/decisions",
)
def create_decision_alias(
    payload: OptimizationCreate,
    request: Request,
    service: OptimizationService = Depends(get_optimization_service),
):
    creation = service.create(payload, request_id=request.state.request_id)
    body = DecisionCreationResponse(
        decision=creation.decision,
        job_id=creation.job_id,
        duplicate=creation.duplicate,
        message=(
            "Duplicate submission replayed: the decision persisted for this X-Request-ID "
            "was returned without re-evaluating evidence"
            if creation.duplicate
            else (
                "Decision persisted from existing compatible evidence"
                if creation.job_id is None
                else "Fresh benchmarking queued; the decision is pending evidence"
            )
        ),
    )
    return JSONResponse(status_code=creation.http_status, content=body.model_dump(mode="json"))


@router.get("/optimization/{decision_id}", response_model=DecisionRead)
def get_decision_alias(
    decision_id: str,
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionRead:
    return service.get_decision(decision_id)
