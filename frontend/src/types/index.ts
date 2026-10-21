/**
 * Domain types for Lattice Framework - Optimization & Configuration Space
 */

export type CandidateStatus = 'selected' | 'feasible' | 'evaluating' | 'unprofiled' | 'rejected';

export type NodeRole = 'optimizer' | 'candidate' | 'engine' | 'runtime' | 'structural';

export interface CandidateConstraints {
  withinMemoryBudget: boolean | null;
  meetsLatencyConstraint: boolean | null;
  qualityThresholdSatisfied: boolean | null;
}

export type DataProvenance = 'live_backend' | 'demo_fixture' | 'stale_cache';

export interface ConfigurationCandidate {
  id: string;
  name: string;
  modelName: string;
  quantization: string;
  description: string;
  status: CandidateStatus;
  nodeRole: NodeRole;
  memoryUsageGb: number | null;
  memoryBudgetGb: number;
  inferenceLatencyMs: number | null;
  latencyConstraintMs: number;
  qualityScore: number | null;
  qualityThreshold: number;
  generationSpeedToks: number | null;
  constraints: CandidateConstraints;
  position3D: [number, number, number];
  platformIndex?: number;
  badgeText?: string;
  subLabel?: string;
  rejectionReason?: string | null;
  measuredAt?: string | null;
  provenance?: DataProvenance;
}

export interface ConfigurationSpaceStats {
  selected: number;
  feasible: number;
  evaluating: number;
  unprofiled: number;
  rejected: number;
  total: number;
}

export interface OverviewMetrics {
  inferenceLatencyMs: number | null;
  inferenceLatencyChangePct: number | null;
  generationSpeedToks: number | null;
  generationSpeedChangePct: number | null;
  gpuMemoryUsedGb: number | null;
  gpuMemoryTotalGb: number;
  gpuMemoryUsagePct: number | null;
  provenance?: DataProvenance;
  lastMeasuredAt?: string;
}

export type ExperimentStatus = 'Completed' | 'Partial' | 'Failed' | 'Running';

export interface ExperimentItem {
  id: string;
  model: string;
  configuration: string;
  objective: string;
  result: ExperimentStatus;
  latencyMs: number | null;
  date: string;
  candidateId?: string;
  throughputToks?: number | null;
  qualityScore?: number | null;
  errorMessage?: string;
}

export interface PerformanceTrendPoint {
  run: number;
  latencyMs: number;
  throughputToks: number;
  gpuMemoryGb: number;
  timestamp?: string;
}

export interface PerformanceTrendData {
  timeRange: string;
  points: PerformanceTrendPoint[];
  provenance?: DataProvenance;
}

export interface ActiveModelInfo {
  name: string;
  quantization: string;
  runtime: string;
  status: string;
  contextWindow?: number;
  architecture?: string;
}

export interface HardwareInfo {
  device: string;
  vramTotalGb: number;
  vramUsedGb: number;
  cudaAvailable: boolean;
  computeCapability?: string;
}

export interface BackendConnectionState {
  connected: boolean;
  isDemoMode: boolean;
  endpoint: string;
  version: string;
  service: string;
  latencyMs?: number;
  lastChecked?: string;
  error?: string | null;
  isConnecting?: boolean;
}

export type OptimizationObjective = 'balanced' | 'latency' | 'throughput' | 'memory';

export interface OptimizationPlanRequest {
  modelName: string;
  targetHardware?: string;
  memoryBudgetGb: number;
  maxLatencyMs: number;
  minQualityScore?: number;
  objective: OptimizationObjective;
}

export interface OptimizationPlanResponse {
  decisionId: string;
  status: 'optimal' | 'feasible' | 'infeasible';
  selectedCandidateId: string;
  rationale: string;
  candidateProfiles: ConfigurationCandidate[];
  timestamp: string;
}

export interface SystemStatusResponse {
  connected: boolean;
  activeModel: ActiveModelInfo;
  hardware: HardwareInfo;
}
