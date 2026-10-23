import React from 'react';
import { Play, RotateCcw } from 'lucide-react';
import {
  ExperimentConfiguration,
  WorkloadType,
  ComparisonStrategy,
} from '../../types/experiments';
import {
  DATASET_OPTIONS,
  WORKLOAD_OPTIONS,
} from '../../lib/experiments/experimentsService';
import {
  Button,
  Select,
  Input,
  Checkbox,
  StatusBadge,
} from '../ui/primitives';

interface ExperimentConfigurationFormProps {
  config: ExperimentConfiguration;
  onChangeConfig: (updated: Partial<ExperimentConfiguration>) => void;
  onResetConfig: () => void;
  onRunExperiment: () => void;
  isRunning: boolean;
  isBackendConnected: boolean;
}

export const ExperimentConfigurationForm: React.FC<ExperimentConfigurationFormProps> = ({
  config,
  onChangeConfig,
  onResetConfig,
  onRunExperiment,
  isRunning,
  isBackendConnected,
}) => {
  const handleStrategyChange = (strategy: ComparisonStrategy) => {
    onChangeConfig({ strategy });
  };

  const handleWorkloadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({ workloadType: e.target.value as WorkloadType });
  };

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({ dataset: e.target.value });
  };

  const handleRunsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') return;
    const val = parseInt(raw, 10);
    if (!isNaN(val)) {
      onChangeConfig({ numberOfRuns: Math.max(1, Math.min(100, val)) });
    }
  };

  const handleGenParamChange = (
    field: keyof ExperimentConfiguration['generationParams'],
    rawValue: string
  ) => {
    if (rawValue === '') return;
    const parsed =
      field === 'temperature' || field === 'topP'
        ? parseFloat(rawValue)
        : parseInt(rawValue, 10);

    if (!isNaN(parsed)) {
      onChangeConfig({
        generationParams: {
          ...config.generationParams,
          [field]: parsed,
        },
      });
    }
  };

  const handleMetricToggle = (field: keyof ExperimentConfiguration['metrics']) => {
    onChangeConfig({
      metrics: {
        ...config.metrics,
        [field]: !config.metrics[field],
      },
    });
  };

  const activeWorkload =
    WORKLOAD_OPTIONS.find((w) => w.id === config.workloadType) || WORKLOAD_OPTIONS[0];
  const activeDataset =
    DATASET_OPTIONS.find((d) => d.id === config.dataset) || DATASET_OPTIONS[0];

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#222938] tracking-tight">
            1. Experiment Configuration
          </h2>
          <p className="text-[12px] text-[#647187] mt-0.5">
            Define workload parameters, prompt datasets, and metrics to evaluate.
          </p>
        </div>

        {isBackendConnected ? (
          <StatusBadge tone="success">Live Runtime Ready</StatusBadge>
        ) : (
          <StatusBadge tone="warning">
            Demo Mode — Reviewing Recorded Benchmarks
          </StatusBadge>
        )}
      </div>

      {/* 2. Top Controls Row (12-Col Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Comparison Mode (Col 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Comparison Strategy
            </label>
            <span className="text-[10.5px] font-mono text-[#647187] uppercase">
              {config.strategy}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleStrategyChange('fixed')}
              className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${config.strategy === 'fixed'
                  ? 'border-[#7562E8] bg-[#F2F0FD]'
                  : 'border-[#D9DEE7] bg-white hover:bg-[#F8F9FB]'
                }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${config.strategy === 'fixed'
                      ? 'border-[#7562E8] bg-white'
                      : 'border-[#8A94A6]'
                    }`}
                >
                  {config.strategy === 'fixed' && (
                    <span className="w-2 h-2 rounded-full bg-[#7562E8]" />
                  )}
                </span>
                <span className="text-[12.5px] font-semibold text-[#222938] truncate">
                  Fixed Configuration
                </span>
              </div>
              <span className="text-[11px] text-[#647187] block pl-5.5 mt-0.5 truncate">
                Single static quantization
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStrategyChange('adaptive')}
              className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${config.strategy === 'adaptive'
                  ? 'border-[#7562E8] bg-[#F2F0FD]'
                  : 'border-[#D9DEE7] bg-white hover:bg-[#F8F9FB]'
                }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${config.strategy === 'adaptive'
                      ? 'border-[#7562E8] bg-white'
                      : 'border-[#8A94A6]'
                    }`}
                >
                  {config.strategy === 'adaptive' && (
                    <span className="w-2 h-2 rounded-full bg-[#7562E8]" />
                  )}
                </span>
                <span className="text-[12.5px] font-semibold text-[#222938] truncate">
                  Adaptive (Lattice)
                </span>
              </div>
              <span className="text-[11px] text-[#647187] block pl-5.5 mt-0.5 truncate">
                Dynamic Pareto selection
              </span>
            </button>
          </div>
        </div>

        {/* Workload Type (Col 3) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Workload Type
            </label>
            <span className="text-[10.5px] font-mono text-[#647187]">Profile</span>
          </div>
          <Select value={config.workloadType} onChange={handleWorkloadChange}>
            {WORKLOAD_OPTIONS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </Select>
          <span
            className="text-[11px] text-[#647187] truncate"
            title={activeWorkload.description}
          >
            {activeWorkload.description}
          </span>
        </div>

        {/* Dataset / Prompt Set (Col 2) */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Dataset / Prompts
            </label>
          </div>
          <Select value={config.dataset} onChange={handleDatasetChange}>
            {DATASET_OPTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </Select>
          <span
            className="text-[11px] text-[#647187] truncate"
            title={activeDataset.description}
          >
            {activeDataset.description}
          </span>
        </div>

        {/* Number of Runs (Col 2) */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Number of Runs
            </label>
            <span className="text-[10.5px] font-mono text-[#647187]">5–30</span>
          </div>
          <Input
            type="number"
            mono
            min={1}
            max={100}
            value={config.numberOfRuns}
            onChange={handleRunsChange}
          />
          <span className="text-[11px] text-[#647187] truncate">
            Repetitions per strategy
          </span>
        </div>
      </div>

      {/* 3. Bottom Row: Generation Parameters, Metrics to Evaluate, and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch pt-3 border-t border-[#E6EAF0]">
        {/* Generation Parameters (Col 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Generation Parameters
            </label>
            <span className="text-[10.5px] font-mono text-[#647187]">
              Decode sampling controls
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between gap-1">
              <span className="text-[10.5px] font-medium text-[#647187] truncate">
                Max Tokens
              </span>
              <Input
                type="number"
                mono
                min={16}
                max={4096}
                step={32}
                value={config.generationParams.maxNewTokens}
                onChange={(e) => handleGenParamChange('maxNewTokens', e.target.value)}
                className="h-7 px-2 text-[12px]"
              />
              <span className="text-[10px] text-[#8A94A6] truncate">Output budget</span>
            </div>

            <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between gap-1">
              <span className="text-[10.5px] font-medium text-[#647187] truncate">
                Temperature
              </span>
              <Input
                type="number"
                mono
                min={0}
                max={2}
                step={0.1}
                value={config.generationParams.temperature}
                onChange={(e) => handleGenParamChange('temperature', e.target.value)}
                className="h-7 px-2 text-[12px]"
              />
              <span className="text-[10px] text-[#8A94A6] truncate">Randomness</span>
            </div>

            <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between gap-1">
              <span className="text-[10.5px] font-medium text-[#647187] truncate">
                Top P
              </span>
              <Input
                type="number"
                mono
                min={0.05}
                max={1}
                step={0.05}
                value={config.generationParams.topP}
                onChange={(e) => handleGenParamChange('topP', e.target.value)}
                className="h-7 px-2 text-[12px]"
              />
              <span className="text-[10px] text-[#8A94A6] truncate">Nucleus</span>
            </div>

            <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between gap-1">
              <span className="text-[10.5px] font-medium text-[#647187] truncate">
                Top K
              </span>
              <Input
                type="number"
                mono
                min={1}
                max={200}
                step={5}
                value={config.generationParams.topK}
                onChange={(e) => handleGenParamChange('topK', e.target.value)}
                className="h-7 px-2 text-[12px]"
              />
              <span className="text-[10px] text-[#8A94A6] truncate"> Candidates</span>
            </div>
          </div>
        </div>

        {/* Metrics to Evaluate (Col 4) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2">
          <label className="text-[12px] font-medium text-[#222938]">
            Metrics to Evaluate
          </label>
          <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
            <Checkbox
              id="metric-ttft"
              checked={config.metrics.latencyTtft}
              onCheckedChange={() => handleMetricToggle('latencyTtft')}
              label="Latency (TTFT)"
            />
            <Checkbox
              id="metric-gen-time"
              checked={config.metrics.totalGenerationTime}
              onCheckedChange={() => handleMetricToggle('totalGenerationTime')}
              label="Total generation time"
            />
            <Checkbox
              id="metric-memory"
              checked={config.metrics.memoryUsagePeak}
              onCheckedChange={() => handleMetricToggle('memoryUsagePeak')}
              label="Peak memory usage"
            />
            <Checkbox
              id="metric-throughput"
              checked={config.metrics.throughput}
              onCheckedChange={() => handleMetricToggle('throughput')}
              label="Throughput (tok/s)"
            />
            <Checkbox
              id="metric-quality"
              checked={config.metrics.outputQuality}
              onCheckedChange={() => handleMetricToggle('outputQuality')}
              label="Output quality score"
            />
            <Checkbox
              id="metric-adaptive"
              checked={config.metrics.compareAdaptive}
              onCheckedChange={() => handleMetricToggle('compareAdaptive')}
              label="Compare adaptive"
            />
          </div>
        </div>

        {/* Action Buttons Hierarchy (Col 3): Primary Run Experiment + Secondary Reset */}
        <div className="lg:col-span-3 flex flex-col justify-end gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onRunExperiment}
            isLoading={isRunning}
            leftIcon={<Play className="w-4 h-4 fill-current" />}
            className="w-full"
          >
            {isRunning ? 'Running Experiment...' : 'Run Experiment'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onResetConfig}
            disabled={isRunning}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-[#647187]" />}
            className="w-full"
          >
            Reset Settings
          </Button>
        </div>
      </div>
    </div>
  );
};