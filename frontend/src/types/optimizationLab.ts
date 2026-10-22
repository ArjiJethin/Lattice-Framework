import { DataProvenance } from './index';

export type WorkloadType =
  | 'general'
  | 'code'
  | 'chat'
  | 'summarization'
  | 'latency_critical';

export interface WorkloadOption {
  id: WorkloadType;
  label: string;
  description: string;
  recommendedContext: string;
}

export type OptimizationObjectiveType =
  | 'latency'
  | 'memory'
  | 'throughput'
  | 'balanced';

export interface ObjectiveOption {
  id: OptimizationObjectiveType;
  label: string;
  description: string;
  helperText: string;
}

export interface OptimizationConstraints {
  workloadType: WorkloadType;
  objective: OptimizationObjectiveType;
  maxMemoryGb: number;
  maxLatencyMs: number;
  minQualityScore: number;
  // Advanced options
  targetHardware?: string;
  switchingOverheadMs?: number;
  minRepetitions?: number;
  allowUnprofiled?: boolean;
}

export type CandidateFeasibility =
  | 'selected'
  | 'feasible'
  | 'near_feasible'
  | 'rejected'
  | 'unprofiled';

export interface CandidateConstraintAudit {
  withinMemoryBudget: boolean | null;
  memoryDeltaGb: number | null;
  meetsLatencyConstraint: boolean | null;
  latencyDeltaMs: number | null;
  qualityThresholdSatisfied: boolean | null;
  qualityDeltaScore: number | null;
}

export interface OptimizationCandidate {
  id: string;
  name: string;
  modelName: string;
  quantization: string;
  description: string;
  format: string;
  memoryUsageGb: number | null;
  inferenceLatencyMs: number | null;
  generationSpeedToks: number | null;
  qualityScore: number | null;
  ttftMs?: number | null;
  status: CandidateFeasibility;
  feasibilityScore?: number;
  isParetoOptimal?: boolean;
  rejectionReasons: string[];
  audit: CandidateConstraintAudit;
  provenance: DataProvenance;
  isCurrentModelVariant: boolean;
}

export interface OptimizationAlternative {
  candidateId: string;
  configurationName: string;
  quantization: string;
  reasonNotPreferred: string;
  memoryUsageGb: number | null;
  inferenceLatencyMs: number | null;
  qualityScore: number | null;
  status: CandidateFeasibility;
}

export interface OptimizationDecisionResult {
  decisionId: string;
  status: 'optimal' | 'feasible' | 'infeasible';
  recommendedCandidate: OptimizationCandidate | null;
  whyThisConfiguration: string[];
  alternatives: OptimizationAlternative[];
  rationale: string;
  timestamp: string;
  isLiveResponse: boolean;
  algorithm: string;
}

export type CandidateStatisticsTab = 'plot' | 'table' | 'comparison';
