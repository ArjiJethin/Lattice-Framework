import React, { useState, useMemo, useCallback } from 'react';
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
  // 1. Experiment Configuration State (Preserved across navigation)
  const [config, setConfig] = useState<ExperimentConfiguration>(DEFAULT_EXPERIMENT_CONFIG);

  // 2. Live Progress State
  const [progress, setProgress] = useState<LiveExperimentProgress>(INITIAL_LIVE_PROGRESS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionNotice, setExecutionNotice] = useState<string | null>(null);

  // 3. Selected Run Drilldown
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // 4. Benchmark Dataset computed from current model and profile metrics
  const dataset = useMemo(() => {
    return buildExperimentDataset(selectedModel, selectedVariant, config);
  }, [selectedModel, selectedVariant, config]);

  const activeQuantization =
    selectedVariant?.name ||
    selectedModel.defaultVariantId.split('-').pop()?.toUpperCase() ||
    'Q4_K_M';

  // Handle updates to configuration
  const handleChangeConfig = useCallback((updated: Partial<ExperimentConfiguration>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  }, []);

  // Reset to defaults
  const handleResetConfig = useCallback(() => {
    setConfig(DEFAULT_EXPERIMENT_CONFIG);
  }, []);

  // Change Model navigation to Model Lab
  const handleChangeModel = useCallback(() => {
    onNavigate('model-lab');
  }, [onNavigate]);

  // Clear live logs
  const handleClearLogs = useCallback(() => {
    setProgress((prev) => ({ ...prev, logs: [] }));
  }, []);

  // Run Experiment Handler
  const handleRunExperiment = useCallback(async () => {
    if (!backendState.connected) {
      setExecutionNotice(
        `Live benchmark execution requires a running Lattice backend with an active runtime adapter at ${backendState.endpoint}. In Demo Mode, you can inspect recorded benchmarks, explore configuration settings, and evaluate historical performance trade-offs.`
      );
      return;
    }

    try {
      setIsRunning(true);
      setExecutionNotice(null);
      // Attempt backend submission to POST /api/v1/benchmarks if live
      const res = await fetch(`${backendState.endpoint}/benchmarks`, {
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
        throw new Error(`Benchmark queue failed with status ${res.status}`);
      }

      const data = await res.json();
      setProgress((prev) => ({
        ...prev,
        status: 'running',
        configurationName: activeQuantization,
        statusMessage: `Queued job ${data.job_id || 'active'}`,
        logs: [
          ...prev.logs,
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: `Benchmark queued: ${data.message || 'Processing on runtime'}`,
          },
        ],
      }));
    } catch (err: any) {
      setExecutionNotice(
        err.message || 'Benchmark execution failed. Check backend connection.'
      );
    } finally {
      setIsRunning(false);
    }
  }, [backendState, selectedVariant, selectedModel, config, activeQuantization]);

  return (
    <div className="min-h-full flex flex-col p-4 md:p-6 gap-5 max-w-[1720px] mx-auto w-full select-none">
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
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-950">Runtime Execution Notice:</span>{' '}
              {executionNotice}
            </div>
          </div>
          <button
            onClick={() => setExecutionNotice(null)}
            className="text-amber-600 hover:text-amber-800 p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Selected Model Summary Card */}
      <SelectedModelCard
        model={selectedModel}
        selectedVariant={selectedVariant}
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

      {/* 4. Section 2: Live Progress */}
      <LiveProgressSection
        progress={progress}
        onClearLogs={handleClearLogs}
      />

      {/* 5. Section 3: Results & Comparison */}
      <ResultsAndComparisonSection
        dataset={dataset}
        selectedRunId={selectedRunId}
        onSelectRun={(id) => setSelectedRunId(id)}
        selectedQuantizationName={activeQuantization}
      />
    </div>
  );
};
