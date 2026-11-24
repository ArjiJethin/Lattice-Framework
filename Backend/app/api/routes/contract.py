"""Contract endpoints specifically matching docs/api-contract.md for Frontend integration."""

from __future__ import annotations

import math
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_db
from app.core.container import Container
from app.core.time import utc_iso, utcnow
from app.db.models import BenchmarkRun, Configuration, InferenceExecution
from app.schemas.contract import (
    ActiveModelInfo,
    CandidateConstraints,
    ConfigurationCandidate,
    ConfigurationSpaceStats,
    ExperimentItem,
    ExperimentsResponse,
    HardwareInfo,
    OptimizationPlanRequest,
    OptimizationPlanResponse,
    OverviewMetricsData,
    OverviewMetricsResponse,
    PerformanceTrendData,
    PerformanceTrendPoint,
    PerformanceTrendsResponse,
    ProfilesResponse,
    SystemStatusResponse,
)

router = APIRouter(tags=["Frontend Contract"])


def _mean_metric(run: BenchmarkRun, name: str) -> float | None:
    """Read a metric mean out of a run aggregate summary, if it was measured."""
    metrics = (run.aggregate_summary or {}).get("metrics") or {}
    entry = metrics.get(name) or {}
    value = entry.get("mean")
    if value is None:
        return None
    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def _run_latency_ms(run: BenchmarkRun) -> float | None:
    return _mean_metric(run, "latency_ms") or _mean_metric(run, "ttft_ms")


def _run_throughput_tps(run: BenchmarkRun) -> float | None:
    return _mean_metric(run, "decode_throughput_tps") or _mean_metric(
        run, "output_throughput_tps"
    )


def _run_memory_gb(run: BenchmarkRun) -> float | None:
    rss_mb = _mean_metric(run, "peak_process_rss_mb")
    return round(rss_mb / 1024.0, 2) if rss_mb is not None else None


def _run_quality_score(run: BenchmarkRun) -> float | None:
    quality = run.quality_result or {}
    score = quality.get("score")
    if quality.get("status") != "available" or score is None:
        return None
    try:
        return round(float(score) * 100.0, 1)
    except (TypeError, ValueError):
        return None


def _pct_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return round((current - previous) / previous * 100.0, 1)


QUANTIZATION_LADDER = ("Q2_K", "Q3_K_M", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0")

# Overview foundation platforms, clockwise around the central optimizer node.
# Mirrors NODE_MOUNTS in Frontend/src/components/lattice3d/Foundation.tsx so each
# candidate stands on its own platform instead of floating in orbit.
MOUNT_SLOTS: tuple[tuple[float, float, float], ...] = (
    (-3.4, -1.8, 0.28),
    (-3.8, 1.8, 0.14),
    (1.2, 2.4, 0.14),
    (4.4, 1.4, 0.24),
    (3.8, -2.2, 0.34),
)
CANDIDATE_NODE_SIZE = 0.95


def _mount_position(slot: int) -> list[float]:
    """World position of a candidate standing on one of the foundation platforms."""
    if 0 <= slot < len(MOUNT_SLOTS):
        x, z, mount_height = MOUNT_SLOTS[slot]
        # Platform cap top + pedestal socket clearance + half the crystal height.
        y = 0.185 + mount_height + 0.04 + 0.165 + CANDIDATE_NODE_SIZE / 2.0
        return [x, round(y, 2), z]
    # More configurations than platforms: orbit the extras outside the deck.
    extra = slot - len(MOUNT_SLOTS)
    ring = 4.6 + (extra // 8) * 1.0
    angle = (extra % 8) * (math.pi / 4.0)
    return [round(ring * math.cos(angle), 2), 1.2, round(ring * math.sin(angle), 2)]


def _unprofiled_variant(
    config: Configuration, index: int, quantization: str
) -> ConfigurationCandidate:
    """A candidate quantization of a registered model that is not measured yet."""
    model_name = config.model_id or config.name

    return ConfigurationCandidate(
        id=f"{config.id}:{quantization.lower()}",
        name=f"{model_name}-{quantization}",
        modelName=model_name,
        quantization=quantization,
        description="Candidate quantization profile — not benchmarked yet",
        status="unprofiled",
        nodeRole="candidate",
        memoryUsageGb=None,
        memoryBudgetGb=4.0,
        inferenceLatencyMs=None,
        latencyConstraintMs=250.0,
        qualityScore=None,
        qualityThreshold=80.0,
        generationSpeedToks=None,
        constraints=CandidateConstraints(),
        position3D=_mount_position(index - 1),
        platformIndex=index,
        badgeText="Unprofiled",
        subLabel=None,
        measuredAt=None,
        provenance="live_backend",
    )


def _candidate_from_configuration(
    db: Session,
    config: Configuration,
    index: int,
    *,
    is_selected: bool,
    memory_budget_gb: float = 4.0,
    latency_budget_ms: float | None = None,
    quality_threshold: float | None = None,
) -> ConfigurationCandidate:
    """Map a registered configuration plus its newest measured run into a candidate.

    Every measured value comes from the run aggregate summary; constraints are only
    asserted when a real measurement exists to compare against.
    """
    latest_run = _latest_measured_run(db, config.id)
    memory_gb = _run_memory_gb(latest_run) if latest_run else None
    latency_ms = _run_latency_ms(latest_run) if latest_run else None
    throughput_tps = _run_throughput_tps(latest_run) if latest_run else None
    quality = _run_quality_score(latest_run) if latest_run else None
    measured_at = (
        utc_iso(latest_run.finished_at or latest_run.created_at) if latest_run else None
    )

    return ConfigurationCandidate(
        id=config.id,
        name=config.name,
        modelName=config.model_id or "Qwen2.5-0.5B",
        quantization=config.quantization.upper(),
        description=config.description
        or f"{config.quantization.upper()} candidate configuration",
        status="selected" if is_selected else "feasible",
        nodeRole="optimizer" if is_selected else "candidate",
        memoryUsageGb=memory_gb,
        memoryBudgetGb=memory_budget_gb,
        inferenceLatencyMs=latency_ms,
        latencyConstraintMs=(
            latency_budget_ms if latency_budget_ms is not None else 250.0
        ),
        qualityScore=quality,
        qualityThreshold=(
            quality_threshold if quality_threshold is not None else 80.0
        ),
        generationSpeedToks=throughput_tps,
        constraints=CandidateConstraints(
            withinMemoryBudget=(
                None if memory_gb is None else memory_gb <= memory_budget_gb
            ),
            # Unknown unless the caller supplies an explicit latency budget.
            meetsLatencyConstraint=(
                None
                if latency_ms is None or latency_budget_ms is None
                else latency_ms <= latency_budget_ms
            ),
            qualityThresholdSatisfied=(
                None
                if quality is None or quality_threshold is None
                else quality >= quality_threshold
            ),
        ),
        position3D=[0.0, 2.2, 0.0] if is_selected else _mount_position(index - 1),
        platformIndex=index,
        badgeText="Selected" if is_selected else None,
        subLabel="Active optimal profile" if is_selected else None,
        measuredAt=measured_at,
        provenance="live_backend",
    )


def _latest_measured_run(db: Session, configuration_id: str) -> BenchmarkRun | None:
    """Newest fully completed run, falling back to a partial run with measurements."""
    for statuses in (["completed"], ["partial"]):
        run = db.scalars(
            select(BenchmarkRun)
            .where(BenchmarkRun.configuration_id == configuration_id)
            .where(BenchmarkRun.status.in_(statuses))
            .order_by(desc(BenchmarkRun.created_at))
            .limit(1)
        ).first()
        if run is not None:
            return run
    return None

DEFAULT_CANDIDATES = [
    {
        "id": "cand-optimizer",
        "name": "Qwen2.5-0.5B-Balanced",
        "modelName": "Qwen2.5-0.5B",
        "quantization": "Q4_K_M",
        "description": "General purpose (balanced accuracy & memory)",
        "subLabel": "Selected optimal configuration",
        "status": "selected",
        "nodeRole": "optimizer",
        "memoryUsageGb": 0.5,
        "memoryBudgetGb": 4.0,
        "inferenceLatencyMs": 126.0,
        "latencyConstraintMs": 250.0,
        "qualityScore": 86.2,
        "qualityThreshold": 80.0,
        "generationSpeedToks": 49.7,
        "constraints": {
            "withinMemoryBudget": True,
            "meetsLatencyConstraint": True,
            "qualityThresholdSatisfied": True,
        },
        "position3D": [0.0, 2.2, 0.0],
        "platformIndex": 0,
        "badgeText": "Selected",
    },
    {
        "id": "cand-q2k",
        "name": "Qwen2.5-0.5B-Fast",
        "modelName": "Qwen2.5-0.5B",
        "quantization": "Q2_K",
        "description": "Minimal memory footprint, fastest generation",
        "status": "feasible",
        "nodeRole": "candidate",
        "memoryUsageGb": 0.35,
        "memoryBudgetGb": 4.0,
        "inferenceLatencyMs": 95.0,
        "latencyConstraintMs": 250.0,
        "qualityScore": 81.5,
        "qualityThreshold": 80.0,
        "generationSpeedToks": 58.0,
        "constraints": {
            "withinMemoryBudget": True,
            "meetsLatencyConstraint": True,
            "qualityThresholdSatisfied": True,
        },
        "position3D": [2.5, 1.2, 1.5],
        "platformIndex": 1,
    },
    {
        "id": "cand-q80",
        "name": "Qwen2.5-0.5B-Quality",
        "modelName": "Qwen2.5-0.5B",
        "quantization": "Q8_0",
        "description": "Highest quality 8-bit quantized profile",
        "status": "feasible",
        "nodeRole": "candidate",
        "memoryUsageGb": 0.85,
        "memoryBudgetGb": 4.0,
        "inferenceLatencyMs": 175.0,
        "latencyConstraintMs": 250.0,
        "qualityScore": 92.4,
        "qualityThreshold": 80.0,
        "generationSpeedToks": 38.0,
        "constraints": {
            "withinMemoryBudget": True,
            "meetsLatencyConstraint": True,
            "qualityThresholdSatisfied": True,
        },
        "position3D": [-2.5, 1.2, 1.5],
        "platformIndex": 2,
    },
    {
        "id": "cand-fp16",
        "name": "Qwen2.5-0.5B-FP16",
        "modelName": "Qwen2.5-0.5B",
        "quantization": "FP16",
        "description": "Unquantized 16-bit reference profile",
        "status": "feasible",
        "nodeRole": "candidate",
        "memoryUsageGb": 1.5,
        "memoryBudgetGb": 4.0,
        "inferenceLatencyMs": 240.0,
        "latencyConstraintMs": 250.0,
        "qualityScore": 96.0,
        "qualityThreshold": 80.0,
        "generationSpeedToks": 28.0,
        "constraints": {
            "withinMemoryBudget": True,
            "meetsLatencyConstraint": True,
            "qualityThresholdSatisfied": True,
        },
        "position3D": [0.0, 0.5, -2.5],
        "platformIndex": 3,
    },
    {
        "id": "cand-llama-large",
        "name": "Llama-3.1-8B-Reference",
        "modelName": "Llama-3.1-8B",
        "quantization": "Q8_0",
        "description": "8B parameter model profile",
        "status": "rejected",
        "nodeRole": "candidate",
        "memoryUsageGb": 8.5,
        "memoryBudgetGb": 4.0,
        "inferenceLatencyMs": 520.0,
        "latencyConstraintMs": 250.0,
        "qualityScore": 95.0,
        "qualityThreshold": 80.0,
        "generationSpeedToks": 12.0,
        "rejectionReason": "Exceeds 4.0 GB memory budget constraint",
        "constraints": {
            "withinMemoryBudget": False,
            "meetsLatencyConstraint": False,
            "qualityThresholdSatisfied": True,
        },
        "position3D": [4.0, 0.2, 3.0],
        "platformIndex": 4,
    },
]


@router.get("/system/status", response_model=SystemStatusResponse, summary="Runtime & Hardware status")
def get_system_status(
    container: Container = Depends(get_container),
    db: Session = Depends(get_db),
) -> SystemStatusResponse:
    # 1. Hardware telemetry via NVML/collectors
    hardware_snap = container.hardware_service.snapshot()
    gpu_data = hardware_snap.get("gpu", {})
    devices = gpu_data.get("devices", [])

    device_name = "NVIDIA GeForce RTX 2050"
    vram_total_gb = 4.0
    vram_used_gb = 0.5
    cuda_available = True
    compute_cap = "8.9"

    if devices:
        primary = devices[0]
        model_reading = primary.get("model")
        if isinstance(model_reading, dict) and model_reading.get("value"):
            device_name = str(model_reading["value"])

        tot_reading = primary.get("memory_total_mb")
        if isinstance(tot_reading, dict) and tot_reading.get("value") is not None:
            vram_total_gb = round(float(tot_reading["value"]) / 1024.0, 1)

        used_reading = primary.get("memory_used_mb")
        if isinstance(used_reading, dict) and used_reading.get("value") is not None:
            vram_used_gb = round(float(used_reading["value"]) / 1024.0, 1)

    # 2. Find active or latest configuration
    latest_config = db.scalars(
        select(Configuration).order_by(desc(Configuration.created_at)).limit(1)
    ).first()

    active_name = latest_config.name if latest_config else "Qwen2.5-0.5B"
    quant = latest_config.quantization.upper() if latest_config else "Q4_K_M"
    runtime_name = latest_config.runtime_adapter if latest_config else "llama.cpp"
    ctx = latest_config.context_length if latest_config else 2048

    return SystemStatusResponse(
        connected=True,
        activeModel=ActiveModelInfo(
            name=active_name,
            quantization=quant,
            runtime=runtime_name,
            status="Loaded",
            contextWindow=ctx,
            architecture="qwen2",
        ),
        hardware=HardwareInfo(
            device=device_name,
            vramTotalGb=vram_total_gb,
            vramUsedGb=vram_used_gb,
            cudaAvailable=cuda_available,
            computeCapability=compute_cap,
        ),
    )


@router.get("/profiles", response_model=ProfilesResponse, summary="Configuration space profiles")
def get_profiles(
    db: Session = Depends(get_db),
) -> ProfilesResponse:
    configs = list(db.scalars(select(Configuration).order_by(desc(Configuration.created_at)).limit(20)).all())

    candidates: list[ConfigurationCandidate] = [
        _candidate_from_configuration(db, config, index, is_selected=(index == 0))
        for index, config in enumerate(configs)
    ]

    # The active model's other quantization profiles are candidates of the configuration
    # space; they stay "unprofiled" until a benchmark actually measures them.
    if configs:
        active = configs[0]
        active_model_name = active.model_id or active.name
        profiled_quantizations = {
            candidate.quantization
            for candidate in candidates
            if candidate.modelName == active_model_name
        }
        for quantization in QUANTIZATION_LADDER:
            if quantization in profiled_quantizations:
                continue
            candidates.append(
                _unprofiled_variant(active, len(candidates), quantization)
            )

    # If no registered configs yet, populate from DEFAULT_CANDIDATES
    if not candidates:
        for item in DEFAULT_CANDIDATES:
            candidates.append(ConfigurationCandidate(**item))

    # Calculate stats
    stats = ConfigurationSpaceStats(
        selected=sum(1 for c in candidates if c.status == "selected"),
        feasible=sum(1 for c in candidates if c.status == "feasible"),
        evaluating=sum(1 for c in candidates if c.status == "evaluating"),
        unprofiled=sum(1 for c in candidates if c.status == "unprofiled"),
        rejected=sum(1 for c in candidates if c.status == "rejected"),
        total=len(candidates),
    )

    selected_id = candidates[0].id if candidates else "cand-optimizer"

    return ProfilesResponse(
        stats=stats,
        selectedCandidateId=selected_id,
        candidates=candidates,
    )


@router.get("/metrics/overview", response_model=OverviewMetricsResponse, summary="Overview telemetry metrics")
def get_overview_metrics(
    container: Container = Depends(get_container),
    db: Session = Depends(get_db),
) -> OverviewMetricsResponse:
    # 1. Hardware snapshot
    hardware_snap = container.hardware_service.snapshot()
    gpu_data = hardware_snap.get("gpu", {})
    devices = gpu_data.get("devices", [])

    vram_total_gb = 4.0
    vram_used_gb = 0.5
    if devices:
        tot_reading = devices[0].get("memory_total_mb", {})
        used_reading = devices[0].get("memory_used_mb", {})
        vram_total_gb = round(float(tot_reading.get("value") or 4096.0) / 1024.0, 1)
        vram_used_gb = round(float(used_reading.get("value") or 512.0) / 1024.0, 1)

    usage_pct = round((vram_used_gb / vram_total_gb) * 100) if vram_total_gb else 15

    # 2. Latest measured executions, falling back to measured benchmark runs.
    executions = list(
        db.scalars(
            select(InferenceExecution)
            .where(InferenceExecution.status == "completed")
            .order_by(desc(InferenceExecution.finished_at))
            .limit(2)
        ).all()
    )

    latency: float | None = None
    speed: float | None = None
    latency_change: float | None = None
    speed_change: float | None = None
    timestamp: str | None = None

    if executions:
        latest = executions[0]
        latest_latency = latest.latency_ms or latest.ttft_ms
        latency = round(latest_latency, 1) if latest_latency else None
        speed = (
            round(latest.output_throughput_tps, 1)
            if latest.output_throughput_tps
            else None
        )
        timestamp = utc_iso(latest.finished_at or latest.created_at)
        if len(executions) > 1:
            previous = executions[1]
            latency_change = _pct_change(
                latency, previous.latency_ms or previous.ttft_ms
            )
            speed_change = _pct_change(speed, previous.output_throughput_tps)

    if latency is None or speed is None:
        runs = list(
            db.scalars(
                select(BenchmarkRun)
                .where(BenchmarkRun.status.in_(["completed", "partial"]))
                .order_by(desc(BenchmarkRun.created_at))
                .limit(2)
            ).all()
        )
        if runs:
            latest_run = runs[0]
            if latency is None:
                latency = _run_latency_ms(latest_run)
            if speed is None:
                speed = _run_throughput_tps(latest_run)
            if timestamp is None:
                timestamp = utc_iso(latest_run.finished_at or latest_run.created_at)
            if len(runs) > 1 and (latency_change is None or speed_change is None):
                latency_change = latency_change or _pct_change(
                    _run_latency_ms(latest_run), _run_latency_ms(runs[1])
                )
                speed_change = speed_change or _pct_change(
                    _run_throughput_tps(latest_run), _run_throughput_tps(runs[1])
                )

    return OverviewMetricsResponse(
        metrics=OverviewMetricsData(
            inferenceLatencyMs=latency,
            inferenceLatencyChangePct=latency_change,
            generationSpeedToks=speed,
            generationSpeedChangePct=speed_change,
            gpuMemoryUsedGb=vram_used_gb,
            gpuMemoryTotalGb=vram_total_gb,
            gpuMemoryUsagePct=usage_pct,
            lastMeasuredAt=timestamp or utc_iso(utcnow()),
            provenance="live_backend",
        )
    )


@router.get("/experiments", response_model=ExperimentsResponse, summary="Recent experiments list")
def get_experiments(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ExperimentsResponse:
    runs = list(
        db.scalars(
            select(BenchmarkRun)
            .order_by(desc(BenchmarkRun.created_at))
            .limit(limit)
        ).all()
    )

    result_by_status = {
        "completed": "Completed",
        "partial": "Partial",
        "queued": "Running",
        "running": "Running",
    }

    items: list[ExperimentItem] = []
    for r in runs:
        workload = r.workload_snapshot or {}
        items.append(
            ExperimentItem(
                id=f"EXP-{r.id[:8].upper()}",
                model=r.configuration_snapshot.get("model_id", "Qwen2.5-0.5B"),
                configuration=r.configuration_snapshot.get("quantization", "Q4_K_M").upper(),
                objective=workload.get("name") or "Benchmark run",
                result=result_by_status.get(r.status, "Failed"),
                latencyMs=_run_latency_ms(r),
                date=r.created_at.strftime("%b %d, %Y") if r.created_at else "",
                candidateId=r.configuration_id,
                throughputToks=_run_throughput_tps(r),
                qualityScore=_run_quality_score(r),
                errorMessage=r.error_message,
            )
        )

    return ExperimentsResponse(
        total=len(items),
        experiments=items[:limit],
    )


@router.get("/trends", response_model=PerformanceTrendsResponse, summary="Performance trends scatter/series")
def get_trends(
    range_query: str = Query(default="30", alias="range"),
    container: Container = Depends(get_container),
    db: Session = Depends(get_db),
) -> PerformanceTrendsResponse:
    try:
        limit = max(1, min(int(range_query), 100))
    except ValueError:
        limit = 30

    # Real measured benchmark runs, oldest first, one point per run.
    runs = list(
        db.scalars(
            select(BenchmarkRun)
            .where(BenchmarkRun.status.in_(["completed", "partial"]))
            .order_by(desc(BenchmarkRun.created_at))
            .limit(limit)
        ).all()
    )
    runs.reverse()

    hardware_snap = container.hardware_service.snapshot()
    gpu_memory_gb = 0.0
    devices = (hardware_snap.get("gpu") or {}).get("devices") or []
    if devices:
        used_reading = devices[0].get("memory_used_mb") or {}
        if used_reading.get("value") is not None:
            gpu_memory_gb = round(float(used_reading["value"]) / 1024.0, 1)

    points: list[PerformanceTrendPoint] = []
    for i, run in enumerate(runs):
        latency = _run_latency_ms(run)
        throughput = _run_throughput_tps(run)
        if latency is None or throughput is None:
            continue
        points.append(
            PerformanceTrendPoint(
                run=len(points) + 1,
                latencyMs=latency,
                throughputToks=throughput,
                gpuMemoryGb=gpu_memory_gb,
                timestamp=utc_iso(run.finished_at or run.created_at),
            )
        )

    return PerformanceTrendsResponse(
        data=PerformanceTrendData(
            timeRange=f"Last {range_query} runs",
            points=points,
            provenance="live_backend",
        )
    )


@router.post("/optimization/plan", response_model=OptimizationPlanResponse, summary="Optimization Plan submission")
def submit_optimization_plan(
    payload: OptimizationPlanRequest,
    db: Session = Depends(get_db),
) -> OptimizationPlanResponse:
    configs = list(
        db.scalars(select(Configuration).order_by(desc(Configuration.created_at)).limit(20)).all()
    )

    candidates = [
        _candidate_from_configuration(
            db,
            config,
            index,
            is_selected=False,
            memory_budget_gb=payload.memoryBudgetGb,
            latency_budget_ms=payload.maxLatencyMs,
            quality_threshold=payload.minQualityScore,
        )
        for index, config in enumerate(configs)
    ]

    # Only candidates with real measurements can be ranked by the solver.
    measured = [
        c
        for c in candidates
        if c.inferenceLatencyMs is not None and c.memoryUsageGb is not None
    ]
    feasible = [
        c
        for c in measured
        if c.constraints.withinMemoryBudget is not False
        and c.constraints.meetsLatencyConstraint is not False
        and c.constraints.qualityThresholdSatisfied is not False
    ]

    def rank_key(candidate: ConfigurationCandidate) -> float:
        latency = candidate.inferenceLatencyMs or float("inf")
        memory = candidate.memoryUsageGb or float("inf")
        speed = candidate.generationSpeedToks or 0.0
        quality = candidate.qualityScore or 0.0
        if payload.objective == "latency":
            return latency
        if payload.objective == "memory":
            return memory
        if payload.objective == "throughput":
            return -speed
        # Balanced: normalise latency and memory against the requested budgets.
        return (latency / max(payload.maxLatencyMs, 1.0)) + (
            memory / max(payload.memoryBudgetGb, 0.1)
        ) - (quality / 100.0)

    rationale_parts = [
        f"Evaluated {len(measured)} measured configuration(s)",
        f"against {payload.memoryBudgetGb:g} GB memory and {payload.maxLatencyMs:g} ms latency budgets"
        f" for the {payload.objective} objective.",
    ]

    if feasible:
        winner = min(feasible, key=rank_key)
        status_verdict: Literal["optimal", "feasible", "infeasible"] = "optimal"
        rationale_parts.append(
            f"{winner.name} ({winner.quantization}) is the best fit with "
            f"{winner.inferenceLatencyMs:g} ms measured latency, "
            f"{winner.memoryUsageGb:g} GB peak memory"
            + (
                f", {winner.generationSpeedToks:g} tok/s"
                if winner.generationSpeedToks is not None
                else ""
            )
            + (
                f" and {winner.qualityScore:g}/100 quality."
                if winner.qualityScore is not None
                else "."
            )
        )
    else:
        winner = min(measured, key=rank_key) if measured else None
        status_verdict = "infeasible"
        rationale_parts.append(
            "No measured configuration satisfies all active constraints."
            if measured
            else "No configuration has measured metrics yet; run a benchmark first."
        )

    decision_id = f"dec-{uuid.uuid4().hex[:8]}"
    timestamp = utc_iso(utcnow())

    return OptimizationPlanResponse(
        decisionId=decision_id,
        status=status_verdict,
        selectedCandidateId=winner.id if winner else "",
        rationale=" ".join(rationale_parts),
        candidateProfiles=candidates,
        timestamp=timestamp,
    )
