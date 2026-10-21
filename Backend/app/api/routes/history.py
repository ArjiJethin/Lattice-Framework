"""History, provenance export and compatibility aliases."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import (
    get_comparison_service,
    get_history_service,
    get_inference_service,
    get_io_service,
    get_optimization_service,
)
from app.core.errors import ValidationFailure
from app.schemas.history import (
    ComparisonResponse,
    ConfigurationExportEnvelope,
    HistoryBenchmarkResponse,
    HistoryConfigurationResponse,
    HistorySummary,
    ImportRequest,
    ImportResponse,
)
from app.schemas.inference import InferenceRead
from app.schemas.optimization import DecisionRead
from app.services.comparison import ComparisonService
from app.services.history import HistoryService
from app.services.inference import InferenceService
from app.services.io import ImportExportService
from app.services.optimization import OptimizationService

router = APIRouter(prefix="/history", tags=["History"])
aliases = APIRouter(tags=["History"])


@router.get("", response_model=HistorySummary)
def history_summary(service: HistoryService = Depends(get_history_service)) -> HistorySummary:
    return service.summary()


@router.get("/summary", response_model=HistorySummary)
def history_summary_alias(
    service: HistoryService = Depends(get_history_service),
) -> HistorySummary:
    return service.summary()


@router.get("/compare", response_model=ComparisonResponse)
def compare_runs(
    run_ids: list[str] = Query(..., min_length=2, max_length=10),
    service: ComparisonService = Depends(get_comparison_service),
) -> ComparisonResponse:
    return ComparisonResponse(**service.compare(run_ids))


@router.get("/benchmarks/{run_id}", response_model=HistoryBenchmarkResponse)
def history_benchmark(
    run_id: str,
    service: HistoryService = Depends(get_history_service),
) -> HistoryBenchmarkResponse:
    return service.benchmark(run_id)


@router.get("/decisions/{decision_id}", response_model=DecisionRead)
def history_decision(
    decision_id: str,
    service: OptimizationService = Depends(get_optimization_service),
) -> DecisionRead:
    return service.get_decision(decision_id)


@router.get("/inference/{execution_id}", response_model=InferenceRead)
def history_inference(
    execution_id: str,
    service: InferenceService = Depends(get_inference_service),
) -> InferenceRead:
    return service.get(execution_id)


@router.get("/configurations/{configuration_id}", response_model=HistoryConfigurationResponse)
def history_configuration(
    configuration_id: str,
    service: HistoryService = Depends(get_history_service),
) -> HistoryConfigurationResponse:
    return service.configuration(configuration_id)


@router.get(
    "/export",
    response_class=StreamingResponse,
    summary="Export experiment history as JSONL (one independently parseable object per line)",
)
def export_history(
    format: str = Query(default="jsonl", pattern="^(jsonl)$"),
    configuration_id: str | None = Query(default=None),
    workload_id: str | None = Query(default=None),
    run_id: str | None = Query(default=None),
    created_after: datetime | None = Query(default=None),
    created_before: datetime | None = Query(default=None),
    include_test_only: bool = Query(default=False),
    service: HistoryService = Depends(get_history_service),
) -> StreamingResponse:
    if format != "jsonl":
        raise ValidationFailure("only format=jsonl is supported")
    lines = service.export_jsonl(
        configuration_id=configuration_id,
        workload_id=workload_id,
        run_id=run_id,
        created_after=created_after,
        created_before=created_before,
        include_test_only=include_test_only,
    )

    def generate():
        for line in lines:
            yield line + "\n"

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={
            "Content-Disposition": 'attachment; filename="lattice-experiments.jsonl"',
            "X-Record-Count": str(len(lines)),
        },
    )


@aliases.post("/import/configurations", response_model=ImportResponse)
def import_configurations_alias(
    payload: ImportRequest,
    service: ImportExportService = Depends(get_io_service),
) -> ImportResponse:
    return service.import_configurations(payload)


@aliases.get("/export/configurations", response_model=ConfigurationExportEnvelope)
def export_configurations_alias(
    include_model_paths: bool = Query(default=False),
    service: ImportExportService = Depends(get_io_service),
) -> ConfigurationExportEnvelope:
    return service.export(include_model_paths=include_model_paths)
