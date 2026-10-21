import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActiveModelInfo,
  BackendConnectionState,
  ConfigurationCandidate,
  ConfigurationSpaceStats,
  ExperimentItem,
  OptimizationPlanRequest,
  OptimizationPlanResponse,
  OverviewMetrics,
  PerformanceTrendData,
} from '../../types';
import {
  HealthCheckResponse,
  ProfilesResponse,
  ExperimentsResponse,
  OverviewMetricsResponse,
  PerformanceTrendsResponse,
  SystemStatusResponse,
} from './apiContract';
import {
  DEMO_ACTIVE_MODEL,
  DEMO_CANDIDATES,
  DEMO_CONFIG_STATS,
  DEMO_OVERVIEW_METRICS,
  DEMO_PERFORMANCE_TRENDS,
  DEMO_RECENT_EXPERIMENTS,
} from './demoData';

// Priority: VITE_API_BASE_URL -> VITE_BACKEND_URL/api/v1 -> default http://127.0.0.1:8000/api/v1
export const API_BASE_URL = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) {
    const raw = import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
    return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
})();

// Server root for legacy or un-prefixed health check (http://127.0.0.1:8000)
export const SERVER_ROOT_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

/**
 * Low-level API Client for Lattice Backend
 */
export const apiClient = {
  async fetchHealth(signal?: AbortSignal): Promise<HealthCheckResponse> {
    // Attempt /api/v1/health first, then fallback to /health
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal });
      if (res.ok) return await res.json();
    } catch {
      // Fallback to server root /health
    }
    const rootRes = await fetch(`${SERVER_ROOT_URL}/health`, { signal });
    if (!rootRes.ok) throw new Error(`Health check failed with status ${rootRes.status}`);
    return await rootRes.json();
  },

  async fetchSystemStatus(signal?: AbortSignal): Promise<SystemStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/system/status`, { signal });
    if (!res.ok) throw new Error(`System status failed with status ${res.status}`);
    return await res.json();
  },

  async fetchProfiles(signal?: AbortSignal): Promise<ProfilesResponse> {
    const res = await fetch(`${API_BASE_URL}/profiles`, { signal });
    if (!res.ok) throw new Error(`Profiles request failed with status ${res.status}`);
    return await res.json();
  },

  async fetchExperiments(limit = 10, signal?: AbortSignal): Promise<ExperimentsResponse> {
    const res = await fetch(`${API_BASE_URL}/experiments?limit=${limit}`, { signal });
    if (!res.ok) throw new Error(`Experiments request failed with status ${res.status}`);
    return await res.json();
  },

  async fetchOverviewMetrics(signal?: AbortSignal): Promise<OverviewMetricsResponse> {
    const res = await fetch(`${API_BASE_URL}/metrics/overview`, { signal });
    if (!res.ok) throw new Error(`Metrics request failed with status ${res.status}`);
    return await res.json();
  },

  async fetchPerformanceTrends(range = '30', signal?: AbortSignal): Promise<PerformanceTrendsResponse> {
    const res = await fetch(`${API_BASE_URL}/trends?range=${range}`, { signal });
    if (!res.ok) throw new Error(`Trends request failed with status ${res.status}`);
    return await res.json();
  },

  async submitOptimizationPlan(
    req: OptimizationPlanRequest,
    signal?: AbortSignal
  ): Promise<OptimizationPlanResponse> {
    const res = await fetch(`${API_BASE_URL}/optimization/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
    if (!res.ok) throw new Error(`Optimization plan request failed with status ${res.status}`);
    return await res.json();
  },
};

export type CandidateFilterMode = 'all' | 'feasible' | 'pareto';

export interface OverviewDataState {
  backendState: BackendConnectionState;
  activeModel: ActiveModelInfo;
  stats: ConfigurationSpaceStats;
  candidates: ConfigurationCandidate[];
  filteredCandidates: ConfigurationCandidate[];
  selectedCandidate: ConfigurationCandidate;
  selectedCandidateId: string;
  metrics: OverviewMetrics;
  experiments: ExperimentItem[];
  performanceTrends: PerformanceTrendData;
  timeRange: string;
  candidateFilter: CandidateFilterMode;
  isLoading: boolean;
  dataSourceLabel: string;
  selectCandidate: (id: string) => void;
  selectNextCandidate: () => void;
  selectPrevCandidate: () => void;
  setTimeRange: (range: string) => void;
  setCandidateFilter: (filter: CandidateFilterMode) => void;
  toggleDemoMode: () => void;
  refreshConnection: () => Promise<void>;
  submitOptimizationPlan: (req: OptimizationPlanRequest) => Promise<OptimizationPlanResponse>;
}

export function useOverviewData(): OverviewDataState {
  const [backendState, setBackendState] = useState<BackendConnectionState>({
    connected: false,
    isDemoMode: true,
    isConnecting: false,
    endpoint: API_BASE_URL.replace(/^https?:\/\//, ''),
    version: '0.1.0',
    service: 'lattice-backend',
    error: null,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [forceDemoMode, setForceDemoMode] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<ConfigurationCandidate[]>(DEMO_CANDIDATES);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('cand-optimizer');
  const [stats, setStats] = useState<ConfigurationSpaceStats>(DEMO_CONFIG_STATS);
  const [activeModel, setActiveModel] = useState<ActiveModelInfo>(DEMO_ACTIVE_MODEL);
  const [metrics, setMetrics] = useState<OverviewMetrics>(DEMO_OVERVIEW_METRICS);
  const [experiments, setExperiments] = useState<ExperimentItem[]>(DEMO_RECENT_EXPERIMENTS);
  const [allTrends, setAllTrends] = useState<PerformanceTrendData>(DEMO_PERFORMANCE_TRENDS);
  const [timeRange, setTimeRange] = useState<string>('Last 30 runs');
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilterMode>('all');
  const [hadLiveSuccess, setHadLiveSuccess] = useState<boolean>(false);

  // Check Backend Connectivity & Fetch live data if online
  const checkBackendHealth = useCallback(async () => {
    if (forceDemoMode) {
      setBackendState((prev) => ({
        ...prev,
        connected: false,
        isDemoMode: true,
        isConnecting: false,
        error: null,
      }));
      setIsLoading(false);
      return;
    }

    setBackendState((prev) => ({ ...prev, isConnecting: true }));
    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const health = await apiClient.fetchHealth(controller.signal);
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      // Attempt fetching live data endpoints in parallel
      const liveEndpointPromises = await Promise.allSettled([
        apiClient.fetchProfiles(controller.signal),
        apiClient.fetchOverviewMetrics(controller.signal),
        apiClient.fetchExperiments(10, controller.signal),
        apiClient.fetchSystemStatus(controller.signal),
        apiClient.fetchPerformanceTrends('30', controller.signal),
      ]);

      const [profilesRes, metricsRes, experimentsRes, statusRes, trendsRes] = liveEndpointPromises;

      if (profilesRes.status === 'fulfilled' && profilesRes.value?.candidates?.length > 0) {
        setCandidates(profilesRes.value.candidates);
        setStats(profilesRes.value.stats || DEMO_CONFIG_STATS);
        if (profilesRes.value.selectedCandidateId) {
          setSelectedCandidateId(profilesRes.value.selectedCandidateId);
        }
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.metrics) {
        setMetrics({
          ...metricsRes.value.metrics,
          provenance: 'live_backend',
        });
      }

      if (experimentsRes.status === 'fulfilled' && experimentsRes.value?.experiments) {
        setExperiments(experimentsRes.value.experiments);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value?.activeModel) {
        setActiveModel(statusRes.value.activeModel);
      }

      if (trendsRes.status === 'fulfilled' && trendsRes.value?.data) {
        setAllTrends({
          ...trendsRes.value.data,
          provenance: 'live_backend',
        });
      }

      setHadLiveSuccess(true);
      setBackendState({
        connected: true,
        isDemoMode: false,
        isConnecting: false,
        endpoint: API_BASE_URL.replace(/^https?:\/\//, ''),
        version: health.version || '0.1.0',
        service: health.service || 'lattice-backend',
        latencyMs: latency,
        lastChecked: new Date().toLocaleTimeString(),
        error: null,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const errMsg = isAbort ? 'Connection timed out (2.5s)' : (err instanceof Error ? err.message : 'Backend unreachable');

      setBackendState((prev) => ({
        ...prev,
        connected: false,
        isDemoMode: true,
        isConnecting: false,
        lastChecked: new Date().toLocaleTimeString(),
        error: errMsg,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [forceDemoMode]);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 20000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Single source of truth for candidate selection
  const selectCandidate = useCallback((id: string) => {
    setSelectedCandidateId(id);
    setCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        status: c.id === id ? 'selected' : c.status === 'selected' ? 'feasible' : c.status,
      }))
    );
  }, []);

  // Arrow key navigation through candidates
  const selectNextCandidate = useCallback(() => {
    setCandidates((prev) => {
      const idx = prev.findIndex((c) => c.id === selectedCandidateId);
      const nextIdx = (idx + 1) % prev.length;
      const nextCand = prev[nextIdx];
      setSelectedCandidateId(nextCand.id);
      return prev.map((c) => ({
        ...c,
        status: c.id === nextCand.id ? 'selected' : c.status === 'selected' ? 'feasible' : c.status,
      }));
    });
  }, [selectedCandidateId]);

  const selectPrevCandidate = useCallback(() => {
    setCandidates((prev) => {
      const idx = prev.findIndex((c) => c.id === selectedCandidateId);
      const prevIdx = (idx - 1 + prev.length) % prev.length;
      const prevCand = prev[prevIdx];
      setSelectedCandidateId(prevCand.id);
      return prev.map((c) => ({
        ...c,
        status: c.id === prevCand.id ? 'selected' : c.status === 'selected' ? 'feasible' : c.status,
      }));
    });
  }, [selectedCandidateId]);

  const toggleDemoMode = useCallback(() => {
    setForceDemoMode((prev) => !prev);
  }, []);

  const submitOptimizationPlan = useCallback(
    async (req: OptimizationPlanRequest): Promise<OptimizationPlanResponse> => {
      if (backendState.connected) {
        return await apiClient.submitOptimizationPlan(req);
      }
      // Deterministic demo response when backend is offline
      await new Promise((r) => setTimeout(r, 600));
      return {
        decisionId: `plan-sim-${Date.now().toString(36)}`,
        status: 'optimal',
        selectedCandidateId: 'cand-optimizer',
        rationale: `Selected Q4_K_M within ${req.memoryBudgetGb} GB VRAM and ${req.maxLatencyMs} ms latency budget under objective: ${req.objective}.`,
        candidateProfiles: candidates,
        timestamp: new Date().toISOString(),
      };
    },
    [backendState.connected, candidates]
  );

  // Selected candidate derived from candidates array
  const selectedCandidate = useMemo(() => {
    return candidates.find((c) => c.id === selectedCandidateId) || candidates[0];
  }, [candidates, selectedCandidateId]);

  // Topology filter for 3D visualization
  const filteredCandidates = useMemo(() => {
    if (candidateFilter === 'feasible') {
      return candidates.filter((c) => c.status === 'feasible' || c.status === 'selected');
    }
    if (candidateFilter === 'pareto') {
      return candidates.filter(
        (c) => c.status === 'selected' || (c.qualityScore && c.qualityScore >= 85)
      );
    }
    return candidates;
  }, [candidates, candidateFilter]);

  // Performance trends sliced dynamically based on timeRange (Requirement 5)
  const performanceTrends = useMemo<PerformanceTrendData>(() => {
    const points = allTrends.points;
    let sliced = points;
    if (timeRange.includes('10')) {
      sliced = points.slice(-10);
    } else if (timeRange.includes('20')) {
      sliced = points.slice(-20);
    } else if (timeRange.includes('30')) {
      sliced = points.slice(-30);
    }
    return {
      timeRange,
      points: sliced,
      provenance: backendState.connected ? 'live_backend' : 'demo_fixture',
    };
  }, [allTrends, timeRange, backendState.connected]);

  // Data provenance badge
  const dataSourceLabel = useMemo(() => {
    if (backendState.connected) {
      return `Live Backend (${backendState.endpoint})`;
    }
    if (hadLiveSuccess) {
      return 'Stale Live Cache (Backend Disconnected)';
    }
    return 'Deterministic Demo Fixture (Backend Offline)';
  }, [backendState.connected, backendState.endpoint, hadLiveSuccess]);

  return {
    backendState,
    activeModel,
    stats,
    candidates,
    filteredCandidates,
    selectedCandidate,
    selectedCandidateId,
    metrics,
    experiments,
    performanceTrends,
    timeRange,
    candidateFilter,
    isLoading,
    dataSourceLabel,
    selectCandidate,
    selectNextCandidate,
    selectPrevCandidate,
    setTimeRange,
    setCandidateFilter,
    toggleDemoMode,
    refreshConnection: checkBackendHealth,
    submitOptimizationPlan,
  };
}
