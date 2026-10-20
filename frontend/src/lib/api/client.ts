import { useState, useEffect, useCallback } from 'react';
import {
  ActiveModelInfo,
  BackendConnectionState,
  ConfigurationCandidate,
  ConfigurationSpaceStats,
  ExperimentItem,
  OverviewMetrics,
  PerformanceTrendData,
} from '../../types';
import {
  DEMO_ACTIVE_MODEL,
  DEMO_CANDIDATES,
  DEMO_CONFIG_STATS,
  DEMO_OVERVIEW_METRICS,
  DEMO_PERFORMANCE_TRENDS,
  DEMO_RECENT_EXPERIMENTS,
} from './demoData';

const BACKEND_BASE_URL =
  // @ts-expect-error import.meta.env is provided by Vite
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  'http://127.0.0.1:8000';

export interface OverviewDataState {
  backendState: BackendConnectionState;
  activeModel: ActiveModelInfo;
  stats: ConfigurationSpaceStats;
  candidates: ConfigurationCandidate[];
  selectedCandidate: ConfigurationCandidate;
  metrics: OverviewMetrics;
  experiments: ExperimentItem[];
  performanceTrends: PerformanceTrendData;
  isLoading: boolean;
  dataSourceLabel: string;
  selectCandidate: (id: string) => void;
  refreshConnection: () => Promise<void>;
}

export function useOverviewData(): OverviewDataState {
  const [backendState, setBackendState] = useState<BackendConnectionState>({
    connected: false,
    isDemoMode: true,
    endpoint: `${BACKEND_BASE_URL}`,
    version: '0.1.0',
    service: 'lattice-backend',
    error: null,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [candidates, setCandidates] = useState<ConfigurationCandidate[]>(DEMO_CANDIDATES);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('cand-optimizer');
  const [stats] = useState<ConfigurationSpaceStats>(DEMO_CONFIG_STATS);
  const [activeModel] = useState<ActiveModelInfo>(DEMO_ACTIVE_MODEL);
  const [metrics] = useState<OverviewMetrics>(DEMO_OVERVIEW_METRICS);
  const [experiments] = useState<ExperimentItem[]>(DEMO_RECENT_EXPERIMENTS);
  const [performanceTrends] = useState<PerformanceTrendData>(DEMO_PERFORMANCE_TRENDS);

  const checkBackendHealth = useCallback(async () => {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${BACKEND_BASE_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const duration = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        setBackendState({
          connected: true,
          isDemoMode: false,
          endpoint: BACKEND_BASE_URL.replace('http://', ''),
          version: data.version || '0.1.0',
          service: data.service || 'lattice-backend',
          latencyMs: duration,
          lastChecked: new Date().toLocaleTimeString(),
          error: null,
        });
      } else {
        throw new Error(`HTTP status ${response.status}`);
      }
    } catch (err) {
      setBackendState((prev) => ({
        ...prev,
        connected: false,
        isDemoMode: true,
        endpoint: BACKEND_BASE_URL.replace('http://', ''),
        lastChecked: new Date().toLocaleTimeString(),
        error: err instanceof Error ? err.message : 'Backend unreachable',
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  const selectCandidate = useCallback((id: string) => {
    setSelectedCandidateId(id);
    setCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        status: c.id === id ? 'selected' : c.status === 'selected' ? 'feasible' : c.status,
      }))
    );
  }, []);

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  const dataSourceLabel = backendState.connected
    ? 'Live Backend Feed'
    : 'Deterministic Demo Fixture (Backend Offline)';

  return {
    backendState,
    activeModel,
    stats,
    candidates,
    selectedCandidate,
    metrics,
    experiments,
    performanceTrends,
    isLoading,
    dataSourceLabel,
    selectCandidate,
    refreshConnection: checkBackendHealth,
  };
}
