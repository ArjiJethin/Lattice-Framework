import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ExperimentsHeader } from '../components/experiments/ExperimentsHeader';
import { SelectedModelCard } from '../components/experiments/SelectedModelCard';
import { ExperimentConfigurationForm } from '../components/experiments/ExperimentConfigurationForm';
import { LiveProgressSection } from '../components/experiments/LiveProgressSection';
import { ResultsAndComparisonSection } from '../components/experiments/ResultsAndComparisonSection';
import {
  ExperimentConfiguration,
  LiveExperimentProgress,
} from '../types/experiments';
import {
  DEFAULT_EXPERIMENT_CONFIG,
  INITIAL_LIVE_PROGRESS,
  buildExperimentDataset,
} from '../lib/experiments/experimentsService';
import { API_BASE_URL } from '../lib/api/client';
import { ModelFamily, QuantizationVariant, ModelLibrarySummaryStats } from '../types/modelLibrary';
import { BackendConnectionState } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';
import { AlertCircle, X } from 'lucide-react';

interface ExperimentsPageProps {
  selectedModel: ModelFamily;
  selectedVariant?: QuantizationVariant;
  summaryStats: ModelLibrarySummaryStats;
  backendState: BackendConnectionState;
  onRefreshConnection: () => void;
  onNavigate: (key: NavItemKey) => void;
}

export const ExperimentsPage: React.FC<ExperimentsPageProps> = ({
  selectedModel,
  selectedVariant,
  summaryStats,
  backendState,
  onRefreshConnection,
  onNavigate,
}) => {
  const [config, setConfig] = useState<ExperimentConfiguration>(DEFAULT_EXPERIMENT_CONFIG);
  const [progress, setProgress] = useState<LiveExperimentProgress>(INITIAL_LIVE_PROGRESS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionNotice, setExecutionNotice] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const activeQuantization =
    selectedVariant?.name ||
    selectedModel.defaultVariantId.split('-').pop()?.toUpperCase() ||
    'Q4_K_M';

  // Keep progress configuration label and total runs aligned with active selection when not actively executing a live job
  useEffect(() => {
    setProgress((prev) => {
      const targetConfigName =
        config.strategy === 'adaptive'
          ? `${selectedModel.name} · Adaptive (Lattice)`
          : `${selectedModel.name} · ${activeQuantization}`;

      const currentRunBounded = Math.min(prev.currentRun, config.numberOfRuns);
      const pct =
        config.numberOfRuns > 0
          ? Math.round((currentRunBounded / config.numberOfRuns) * 100)
          : 0;

      return {
        ...prev,
        configurationName: targetConfigName,
        totalRuns: config.numberOfRuns,
        currentRun: currentRunBounded,
        progressPct: prev.status === 'completed' ? 100 : pct,
        generatedTokens: prev.generatedTokens
          ? {
            current: Math.min(
              prev.generatedTokens.current,
              config.generationParams.maxNewTokens
            ),
            total: config.generationParams.maxNewTokens,
          }
          : {
            current: config.generationParams.maxNewTokens,
            total: config.generationParams.maxNewTokens,
          },
      };
    });
  }, [
    selectedModel.name,
    activeQuantization,
    config.strategy,
    config.numberOfRuns,
    config.generationParams.maxNewTokens,
  ]);

  const dataset = useMemo(() => {
    return buildExperimentDataset(selectedModel, selectedVariant, config);
  }, [selectedModel, selectedVariant, config]);

  const handleChangeConfig = useCallback((updated: Partial<ExperimentConfiguration>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleResetConfig = useCallback(() => {
    setConfig(DEFAULT_EXPERIMENT_CONFIG);
    setExecutionNotice(null);
  }, []);

  const handleChangeModel = useCallback(() => {
    onNavigate('model-lab');
  }, [onNavigate]);

  const handleClearLogs = useCallback(() => {
    setProgress((prev) => ({ ...prev, logs: [] }));
  }, []);

  const handleCancelExperiment = useCallback(() => {
    setIsRunning(false);
    setProgress((prev) => ({
      ...prev,
      status: 'cancelled',
      statusMessage: 'Evaluation cancelled by user',
      estimatedTimeRemaining: null,
      logs: [
        ...prev.logs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour12: false }),
          level: 'warn',
          message: 'Experiment run cancelled by user.',
        },
      ],
    }));
  }, []);

  const handleRunExperiment = useCallback(async () => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });

    if (!backendState.connected) {
      setExecutionNotice(
        `Live benchmark execution requires a running Lattice backend with an active runtime adapter at ${backendState.endpoint}. In Demo Mode, you can inspect recorded benchmarks, explore configuration settings, and evaluate historical performance trade-offs.`
      );
      setProgress((prev) => ({
        ...prev,
        logs: [
          ...prev.logs,
          {
            id: `log-${Date.now()}`,
            timestamp,
            level: 'warn',
            message: `Demo Mode active (${backendState.endpoint} offline) — displaying recorded benchmark fixture.`,
          },
        ],
      }));
      return;
    }

    try {
      setIsRunning(true);
      setExecutionNotice(null);
      setProgress((prev) => ({
        ...prev,
        status: 'queued',
        statusMessage: 'Submitting benchmark job to runtime queue...',
        logs: [
          ...prev.logs,
          {
            id: `log-queue-${Date.now()}`,
            timestamp,
            level: 'info',
            message: `Submitting ${config.numberOfRuns}x ${config.strategy} run(s) for ${selectedModel.name} (${activeQuantization})...`,
          },
        ],
      }));

      const res = await fetch(`${API_BASE_URL}/benchmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration_id: selectedVariant?.id || selectedModel.defaultVariantId,
          workload_id: config.workloadType,
          repetitions: config.numberOfRuns,
          generation_parameters: config.generationParams,
          collect_memory: config.metrics.memoryUsagePeak,
        }),
      });

      if (!res.ok) {
        if (res.status === 503) {
          throw new Error(
            'Lattice backend reported runtime_unavailable (503): llama-cpp-python adapter is not installed on this host.'
          );
        }
        throw new Error(`Benchmark request failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setProgress((prev) => ({
        ...prev,
        status: 'running',
        statusMessage: `Queued job ${data.job_id || 'active'}`,
        logs: [
          ...prev.logs,
          {
            id: `log-ok-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            level: 'active',
            message: `Benchmark job queued: ${data.message || data.job_id || 'Executing on runtime'}`,
          },
        ],
      }));
    } catch (err: unknown) {
      const errMessage =
        err instanceof Error
          ? err.message
          : 'Benchmark execution failed. Check backend connection.';
      setExecutionNotice(errMessage);
      setProgress((prev) => ({
        ...prev,
        status: 'failed',
        statusMessage: 'Execution failed',
        estimatedTimeRemaining: null,
        logs: [
          ...prev.logs,
          {
            id: `log-err-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            level: 'error',
            message: errMessage,
          },
        ],
      }));
    } finally {
      setIsRunning(false);
    }
  }, [backendState, selectedVariant, selectedModel, config, activeQuantization]);

  return (
    <div className="flex-1 w-full p-4 lg:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto select-none pb-16">
      {/* 1. Header */}
      <ExperimentsHeader
        stats={summaryStats}
        backendState={backendState}
        onRefreshConnection={onRefreshConnection}
        onBackToOverview={() => onNavigate('overview')}
        onBackToOptimizationLab={() => onNavigate('optimization-lab')}
      />

      {/* Execution Notice / Offline Banner */}
      {executionNotice && (
        <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[12px] flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-[#92400E]">
                Runtime Execution Notice:
              </span>{' '}
              {executionNotice}
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss Notice"
            onClick={() => setExecutionNotice(null)}
            className="text-[#B45309] hover:text-[#92400E] p-0.5 rounded-sm cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Selected Model Summary Card */}
      <SelectedModelCard
        model={selectedModel}
        selectedVariant={selectedVariant}
        strategy={config.strategy}
        onChangeModel={handleChangeModel}
      />

      {/* 3. Section 1: Experiment Configuration */}
      <ExperimentConfigurationForm
        config={config}
        onChangeConfig={handleChangeConfig}
        onResetConfig={handleResetConfig}
        onRunExperiment={handleRunExperiment}
        isRunning={isRunning}
        isBackendConnected={backendState.connected}
      />

      {/* 4. Section 2: Live Progress & Logs */}
      <LiveProgressSection
        progress={progress}
        isBackendConnected={backendState.connected}
        onClearLogs={handleClearLogs}
        onCancelExperiment={handleCancelExperiment}
      />

      {/* 5. Section 3: Results & Comparison */}
      <ResultsAndComparisonSection
        dataset={dataset}
        config={config}
        selectedRunId={selectedRunId}
        onSelectRun={(id) => setSelectedRunId(id)}
        selectedQuantizationName={activeQuantization}
      />
    </div>
  );
};