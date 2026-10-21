/**
 * API Contract Specifications for Lattice Framework
 *
 * Base URL: http://127.0.0.1:8000 (configurable via VITE_API_BASE_URL or VITE_BACKEND_URL)
 * Route prefix: /api/v1
 *
 * Backend Developer 2 can reference this contract to implement compatible FastAPI endpoints.
 */

import {
  ActiveModelInfo,
  ConfigurationCandidate,
  ConfigurationSpaceStats,
  ExperimentItem,
  HardwareInfo,
  OptimizationPlanRequest,
  OptimizationPlanResponse,
  OverviewMetrics,
  PerformanceTrendData,
  SystemStatusResponse,
} from '../../types';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  version: string;
  uptimeSeconds?: number;
}

export interface ProfilesResponse {
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

export {
  type SystemStatusResponse,
  type HardwareInfo,
  type ActiveModelInfo,
  type OptimizationPlanRequest,
  type OptimizationPlanResponse,
};
