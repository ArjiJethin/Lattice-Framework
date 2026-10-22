export type ComparisonStrategy = 'fixed' | 'adaptive';

export type WorkloadType =
  | 'general'
  | 'code'
  | 'chat'
  | 'summarization'
  | 'latency_critical';

export interface DatasetOption {
  id: string;
  label: string;
  description: string;
}

export interface ExperimentGenerationParams {
  maxNewTokens: number;
  temperature: number;
  topP: number;
  topK: number;
}

export interface MetricsSelection {
  latencyTtft: boolean;
  totalGenerationTime: boolean;
  memoryUsagePeak: boolean;
  throughput: boolean;
  outputQuality: boolean;
  compareAdaptive: boolean;
}

export interface ExperimentConfiguration {
  strategy: ComparisonStrategy;
  workloadType: WorkloadType;
  dataset: string;
  numberOfRuns: number;
  generationParams: ExperimentGenerationParams;
  metrics: MetricsSelection;
}

export type ExperimentRunStatus =
  | 'idle'
  | 'queued'
  | 'preparing'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExperimentLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'active' | 'success' | 'warn' | 'error';
  message: string;
}

export interface LiveExperimentProgress {
  status: ExperimentRunStatus;
  currentRun: number;
  totalRuns: number;
  configurationName: string;
  progressPct: number;
  statusMessage: string;
  estimatedTimeRemaining: string | null;
  currentLatencyMs: number | null;
  generatedTokens: { current: number; total: number } | null;
  currentMemoryGb: number | null;
  currentThroughputToks: number | null;
  logs: ExperimentLogEntry[];
}

export interface BenchmarkRunRecord {
  id: string;
  runIndex: number;
  strategy: 'Fixed Configuration' | 'Adaptive (Lattice)';
  modelName: string;
  quantization: string;
  latencyMs: number;
  ttftMs: number;
  totalGenTimeS: number;
  throughputToks: number;
  memoryGb: number;
  qualityScore: number | null;
  status: 'Completed' | 'Partial' | 'Failed';
  tokens: number;
  timestamp: string;
  repetition?: number;
}

export interface AggregatedMetricRow {
  metric: string;
  fixedValue: string;
  adaptiveValue: string;
  deltaPct: number;
  isBetter: boolean;
  unit?: string;
  description?: string;
}

export interface StrategyAggregates {
  sampleCount: number;
  ttftMean: number;
  ttftStd: number;
  totalTimeMean: number;
  totalTimeStd: number;
  throughputMean: number;
  throughputStd: number;
  memoryMean: number;
  memoryStd: number;
  qualityMean: number | null;
  qualityStd: number | null;
}

export interface ExperimentsDataset {
  fixedRuns: BenchmarkRunRecord[];
  adaptiveRuns: BenchmarkRunRecord[];
  allRuns: BenchmarkRunRecord[];
  fixedAggregates: StrategyAggregates;
  adaptiveAggregates: StrategyAggregates;
  aggregatedComparison: AggregatedMetricRow[];
  provenance: string;
  evaluatorInfo?: {
    name: string;
    methodology: string;
    dataset: string;
    limitations: string;
  };
}
