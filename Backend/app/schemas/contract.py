"""API Contract schemas matching docs/api-contract.md for Frontend integration."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class ActiveModelInfo(BaseModel):
    name: str = "Qwen2.5-0.5B"
    quantization: str = "Q4_K_M"
    runtime: str = "llama.cpp"
    status: str = "Loaded"
    contextWindow: int | None = 2048
    architecture: str | None = "qwen2"


class HardwareInfo(BaseModel):
    device: str
    vramTotalGb: float
    vramUsedGb: float
    cudaAvailable: bool
    computeCapability: str | None = None


class SystemStatusResponse(BaseModel):
    connected: bool = True
    activeModel: ActiveModelInfo
    hardware: HardwareInfo


class CandidateConstraints(BaseModel):
    withinMemoryBudget: bool | None = None
    meetsLatencyConstraint: bool | None = None
    qualityThresholdSatisfied: bool | None = None


class ConfigurationCandidate(BaseModel):
    id: str
    name: str
    modelName: str
    quantization: str
    description: str = ""
    status: Literal["selected", "feasible", "evaluating", "unprofiled", "rejected"] = "feasible"
    nodeRole: Literal["optimizer", "candidate", "engine", "runtime", "structural"] = "candidate"
    memoryUsageGb: float | None = None
    memoryBudgetGb: float = 4.0
    inferenceLatencyMs: float | None = None
    latencyConstraintMs: float = 250.0
    qualityScore: float | None = None
    qualityThreshold: float = 80.0
    generationSpeedToks: float | None = None
    constraints: CandidateConstraints
    position3D: list[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    platformIndex: int | None = 0
    badgeText: str | None = None
    subLabel: str | None = None
    rejectionReason: str | None = None
    measuredAt: str | None = None
    provenance: str | None = "live_backend"


class ConfigurationSpaceStats(BaseModel):
    selected: int = 1
    feasible: int = 0
    evaluating: int = 0
    unprofiled: int = 0
    rejected: int = 0
    total: int = 0


class ProfilesResponse(BaseModel):
    stats: ConfigurationSpaceStats
    selectedCandidateId: str
    candidates: list[ConfigurationCandidate]


class OverviewMetricsData(BaseModel):
    inferenceLatencyMs: float | None = None
    inferenceLatencyChangePct: float | None = None
    generationSpeedToks: float | None = None
    generationSpeedChangePct: float | None = None
    gpuMemoryUsedGb: float | None = None
    gpuMemoryTotalGb: float = 4.0
    gpuMemoryUsagePct: float | None = None
    lastMeasuredAt: str | None = None
    provenance: str | None = "live_backend"


class OverviewMetricsResponse(BaseModel):
    metrics: OverviewMetricsData


class ExperimentItem(BaseModel):
    id: str
    model: str
    configuration: str
    objective: str
    result: Literal["Completed", "Partial", "Failed", "Running"]
    latencyMs: float | None = None
    date: str
    candidateId: str | None = None
    throughputToks: float | None = None
    qualityScore: float | None = None
    errorMessage: str | None = None


class ExperimentsResponse(BaseModel):
    total: int
    experiments: list[ExperimentItem]


class PerformanceTrendPoint(BaseModel):
    run: int
    latencyMs: float
    throughputToks: float
    gpuMemoryGb: float
    timestamp: str | None = None


class PerformanceTrendData(BaseModel):
    timeRange: str
    points: list[PerformanceTrendPoint]
    provenance: str | None = "live_backend"


class PerformanceTrendsResponse(BaseModel):
    data: PerformanceTrendData


class OptimizationPlanRequest(BaseModel):
    modelName: str
    targetHardware: str | None = None
    memoryBudgetGb: float
    maxLatencyMs: float
    minQualityScore: float | None = 80.0
    objective: Literal["balanced", "latency", "throughput", "memory"] = "balanced"


class OptimizationPlanResponse(BaseModel):
    decisionId: str
    status: Literal["optimal", "feasible", "infeasible"]
    selectedCandidateId: str
    rationale: str
    candidateProfiles: list[ConfigurationCandidate] = Field(default_factory=list)
    timestamp: str
