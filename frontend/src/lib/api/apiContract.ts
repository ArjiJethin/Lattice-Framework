/**
 * API Contract Specifications for Backend Developer 2
 *
 * Base URL: http://127.0.0.1:8000 (configurable via VITE_BACKEND_URL)
 * Fallback prefix: /api/v1
 */

import {
  ActiveModelInfo,
  ConfigurationCandidate,
  ConfigurationSpaceStats,
  ExperimentItem,
  OverviewMetrics,
  PerformanceTrendData,
} from '../../types';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  version: string;
}

export interface SystemStatusResponse {
  connected: boolean;
  activeModel: ActiveModelInfo;
  hardware: {
    device: string;
    vramTotalGb: number;
    vramUsedGb: number;
    cudaAvailable: boolean;
  };
}

export interface CandidatesResponse {
  stats: ConfigurationSpaceStats;
  selectedCandidateId: string;
  candidates: ConfigurationCandidate[];
}

export interface ExperimentsResponse {
  total: number;
  experiments: ExperimentItem[];
}

export interface PerformanceTrendsResponse {
  data: PerformanceTrendData;
}

export interface OverviewMetricsResponse {
  metrics: OverviewMetrics;
}
