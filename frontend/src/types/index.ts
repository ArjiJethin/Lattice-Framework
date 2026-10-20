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
  inferenceLatencyMs: number;
  inferenceLatencyChangePct: number;
  generationSpeedToks: number;
  generationSpeedChangePct: number;
  gpuMemoryUsedGb: number;
  gpuMemoryTotalGb: number;
  gpuMemoryUsagePct: number;
}

export type ExperimentStatus = 'Completed' | 'Partial' | 'Failed' | 'Running';

export interface ExperimentItem {
  id: string;
  model: string;
  configuration: string;
  objective: string;
  result: ExperimentStatus;
  latencyMs: number;
  date: string;
  candidateId?: string;
}

export interface PerformanceTrendPoint {
  run: number;
  latencyMs: number;
  throughputToks: number;
  gpuMemoryGb: number;
}

export interface PerformanceTrendData {
  timeRange: string;
  points: PerformanceTrendPoint[];
}

export interface ActiveModelInfo {
  name: string;
  quantization: string;
  runtime: string;
  status: string;
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
}
