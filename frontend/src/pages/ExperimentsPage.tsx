import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import {
  cancelBenchmark,
  ensureConfiguration,
  ensureWorkload,
  getBenchmarkRun,
  submitBenchmark,
  waitForJob,
} from '../lib/api/runtime';
import { ModelFamily, QuantizationVariant, ModelLibrarySummaryStats } from '../types/modelLibrary';
import { BackendConnectionState } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';
import { AlertCircle, X } from 'lucide-react';

const WORKLOAD_PROMPTS: Record<string, string> = {
  general: 'Explain what a model inference runtime does, in two sentences.',
  code: 'Write a Python function that returns the nth Fibonacci number iteratively.',
  chat: 'In one sentence, introduce yourself as a local language model.',
  summarization: 'Summarize in one sentence: Lattice benchmarks local language models on the machine that runs them.',
  latency_critical: 'Reply with exactly one short sentence about latency.',
};

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
  const activeRunIdRef = useRef<string | null>(null);

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
    const runId = activeRunIdRef.current;
    if (runId) {
      // Best effort: the backend rejects cancelling a run that already finished.
      cancelBenchmark(runId).catch(() => undefined);
    }
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

      const log = (level: 'info' | 'active' | 'success' | 'warn' | 'error', message: string) =>
        setProgress((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleTimeString([], { hour12: false }),
              level,
              message,
            },
          ],
        }));

      // 1. Resolve real backend resources (the model library IDs are fixtures).
      const { configuration, created } = await ensureConfiguration(selectedVariant?.id);
      log(
        'info',
        created
          ? `Created configuration ${configuration.name} (${configuration.id.slice(0, 8)})`
          : `Using configuration ${configuration.name} (${configuration.id.slice(0, 8)})`
      );

      // 2. A workload is required; the backend only accepts generation/completion/exact_match.
      const workloadId = await ensureWorkload({
        name: `${config.workloadType}-${config.dataset}`,
        prompt: WORKLOAD_PROMPTS[config.workloadType] ?? WORKLOAD_PROMPTS.general,
        outputTokens: config.generationParams.maxNewTokens,
        contextRequirement: 2048,
      });
      log('info', `Workload ready (${workloadId.slice(0, 8)})`);

      // 3. Generation parameters must use the backend allowlist keys.
      const generationParameters: Record<string, number> = {
        max_tokens: Math.max(1, Math.min(2048, Math.round(config.generationParams.maxNewTokens))),
        temperature: config.generationParams.temperature,
        top_p: config.generationParams.topP,
        top_k: Math.round(config.generationParams.topK),
      };

      const accepted = await submitBenchmark({
        configuration_id: configuration.id,
        workload_id: workloadId,
        repetitions: Math.max(1, Math.min(20, config.numberOfRuns)),
        warmup_iterations: 1,
        generation_parameters: generationParameters,
        collect_memory: config.metrics.memoryUsagePeak,
      });

      activeRunIdRef.current = accepted.benchmark_run_id;
      setProgress((prev) => ({
        ...prev,
        status: 'running',
        currentRun: 0,
        progressPct: 0,
        statusMessage: `Queued job ${accepted.job_id.slice(0, 8)}`,
        currentLatencyMs: null,
        generatedTokens: null,
        currentMemoryGb: null,
        currentThroughputToks: null,
      }));
      log('active', `Benchmark job queued: ${accepted.message}`);

      // 4. Poll the job, then read the measured run.
      const job = await waitForJob(accepted.job_id, {
        timeoutMs: 900_000,
        onTick: (snapshot) => {
          setProgress((prev) => ({
            ...prev,
            status: 'running',
            progressPct:
              snapshot.progress !== null && snapshot.progress !== undefined
                ? Math.round(snapshot.progress * 100)
                : prev.progressPct,
            statusMessage: snapshot.message || 'Running benchmark repetitions…',
          }));
        },
      });

      if (job.status !== 'completed') {
        throw new Error(job.error_message || `Benchmark job ended with status "${job.status}".`);
      }

      const run = await getBenchmarkRun(accepted.benchmark_run_id);
      const byName = new Map(run.metric_summaries.map((item) => [item.metric_name, item]));
      const latency = byName.get('latency_ms')?.mean ?? null;
      const throughput = byName.get('decode_throughput_tps')?.mean ?? null;
      const rssMb = byName.get('peak_process_rss_mb')?.mean ?? null;
      const tokens = byName.get('output_tokens')?.mean ?? null;

      setProgress((prev) => ({
        ...prev,
        status: 'completed',
        currentRun: config.numberOfRuns,
        totalRuns: config.numberOfRuns,
        progressPct: 100,
        statusMessage: run.test_only
          ? 'Completed on the test-only fake runtime'
          : `${run.completed_repetitions} repetition(s) measured`,
        estimatedTimeRemaining: null,
        currentLatencyMs: latency !== null ? Math.round(latency) : null,
        currentThroughputToks: throughput,
        currentMemoryGb: rssMb !== null ? rssMb / 1024 : null,
        generatedTokens:
          tokens !== null
            ? { current: Math.round(tokens), total: config.generationParams.maxNewTokens }
            : prev.generatedTokens,
      }));
      log(
        'success',
        `Run completed — ${latency !== null ? `${latency.toFixed(0)} ms` : 'no latency'}, ${throughput !== null ? `${throughput.toFixed(1)} tok/s` : 'no throughput'}, ${run.failed_repetitions} failed repetition(s)`
      );
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
      activeRunIdRef.current = null;
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