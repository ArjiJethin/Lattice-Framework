import React from 'react';
import {
  Play,
  RotateCcw,
  ChevronDown,
  Info,
  Loader2,
} from 'lucide-react';
import {
  ExperimentConfiguration,
  WorkloadType,
  ComparisonStrategy,
} from '../../types/experiments';
import {
  DATASET_OPTIONS,
  WORKLOAD_OPTIONS,
} from '../../lib/experiments/experimentsService';

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
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 100) {
      onChangeConfig({ numberOfRuns: val });
    }
  };

  const handleGenParamChange = (
    field: keyof ExperimentConfiguration['generationParams'],
    val: number
  ) => {
    onChangeConfig({
      generationParams: {
        ...config.generationParams,
        [field]: val,
      },
    });
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
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-5">
      {/* 1. Header with section number */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-extrabold text-[#18213B] tracking-tight">
            1. Experiment Configuration
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Define the experiment settings and select what to compare.
          </span>
        </div>

        {!isBackendConnected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-500" />
            <span>Demo Mode — Reviewing Recorded Benchmarks</span>
          </div>
        )}
      </div>

      {/* 2. Top Controls Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Comparison Mode (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Comparison Mode</label>
          <div className="grid grid-cols-2 gap-2 h-full">
            {/* Fixed Configuration Button */}
            <button
              type="button"
              onClick={() => handleStrategyChange('fixed')}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                config.strategy === 'fixed'
                  ? 'border-[#7C6AF2] bg-purple-50/50 shadow-2xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    config.strategy === 'fixed'
                      ? 'border-[#7C6AF2]'
                      : 'border-slate-300'
                  }`}
                >
                  {config.strategy === 'fixed' && (
                    <div className="w-2 h-2 rounded-full bg-[#7C6AF2]" />
                  )}
                </div>
                <span className="text-xs font-bold text-[#18213B]">
                  Fixed Configuration
                </span>
              </div>
              <span className="text-[10.5px] text-slate-500 font-medium ml-6 mt-1">
                Use a specific model configuration
              </span>
            </button>

            {/* Adaptive Lattice Button */}
            <button
              type="button"
              onClick={() => handleStrategyChange('adaptive')}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                config.strategy === 'adaptive'
                  ? 'border-[#7C6AF2] bg-purple-50/50 shadow-2xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    config.strategy === 'adaptive'
                      ? 'border-[#7C6AF2]'
                      : 'border-slate-300'
                  }`}
                >
                  {config.strategy === 'adaptive' && (
                    <div className="w-2 h-2 rounded-full bg-[#7C6AF2]" />
                  )}
                </div>
                <span className="text-xs font-bold text-[#18213B]">
                  Adaptive (Lattice)
                </span>
              </div>
              <span className="text-[10.5px] text-slate-500 font-medium ml-6 mt-1">
                Let Lattice select configuration
              </span>
            </button>
          </div>
        </div>

        {/* Workload Type (Col 3) */}
        <div className="lg:col-span-3 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Workload Type</label>
          <div className="relative">
            <select
              value={config.workloadType}
              onChange={handleWorkloadChange}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              {WORKLOAD_OPTIONS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {activeWorkload.description}
          </span>
        </div>

        {/* Dataset / Prompt Set (Col 3) */}
        <div className="lg:col-span-3 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Dataset / Prompt Set</label>
          <div className="relative">
            <select
              value={config.dataset}
              onChange={handleDatasetChange}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              {DATASET_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {activeDataset.description}
          </span>
        </div>

        {/* Number of Runs (Col 2) */}
        <div className="lg:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Number of Runs</label>
          <input
            type="number"
            min={1}
            max={100}
            value={config.numberOfRuns}
            onChange={handleRunsChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
          />
          <span className="text-[11px] text-slate-500 font-medium">
            Runs per configuration
          </span>
        </div>
      </div>

      {/* 3. Bottom Row: Generation Parameters, Metrics to Evaluate, and Run Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-1">
        {/* Generation Parameters (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <label className="text-xs font-bold text-[#18213B]">
            Generation Parameters
          </label>
          <div className="grid grid-cols-4 gap-2">
            {/* Max New Tokens */}
            <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                Max New Tokens
              </span>
              <input
                type="number"
                min={16}
                max={4096}
                step={32}
                value={config.generationParams.maxNewTokens}
                onChange={(e) =>
                  handleGenParamChange('maxNewTokens', parseInt(e.target.value, 10) || 512)
                }
                className="text-xs font-extrabold text-[#18213B] w-full bg-transparent mt-1 border-b border-transparent focus:border-[#7C6AF2] focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 mt-1 block truncate">
                Length of generated output
              </span>
            </div>

            {/* Temperature */}
            <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                Temperature
              </span>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={config.generationParams.temperature}
                onChange={(e) =>
                  handleGenParamChange('temperature', parseFloat(e.target.value) || 0.7)
                }
                className="text-xs font-extrabold text-[#18213B] w-full bg-transparent mt-1 border-b border-transparent focus:border-[#7C6AF2] focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 mt-1 block truncate">
                Controls randomness
              </span>
            </div>

            {/* Top P */}
            <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                Top P
              </span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={config.generationParams.topP}
                onChange={(e) =>
                  handleGenParamChange('topP', parseFloat(e.target.value) || 0.9)
                }
                className="text-xs font-extrabold text-[#18213B] w-full bg-transparent mt-1 border-b border-transparent focus:border-[#7C6AF2] focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 mt-1 block truncate">
                Nucleus sampling
              </span>
            </div>

            {/* Top K */}
            <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                Top K
              </span>
              <input
                type="number"
                min={1}
                max={100}
                step={5}
                value={config.generationParams.topK}
                onChange={(e) =>
                  handleGenParamChange('topK', parseInt(e.target.value, 10) || 50)
                }
                className="text-xs font-extrabold text-[#18213B] w-full bg-transparent mt-1 border-b border-transparent focus:border-[#7C6AF2] focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 mt-1 block truncate">
                Token selection limit
              </span>
            </div>
          </div>
        </div>

        {/* Metrics to Evaluate (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <label className="text-xs font-bold text-[#18213B]">
            Metrics to Evaluate
          </label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-medium text-slate-600">
            {/* Col 1 */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.metrics.latencyTtft}
                  onChange={() => handleMetricToggle('latencyTtft')}
                  className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
                />
                <span className="truncate">Latency (time to first token)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.metrics.totalGenerationTime}
                  onChange={() => handleMetricToggle('totalGenerationTime')}
                  className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
                />
                <span className="truncate">Total generation time</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.metrics.memoryUsagePeak}
                  onChange={() => handleMetricToggle('memoryUsagePeak')}
                  className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
                />
                <span className="truncate">Memory usage (peak)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.metrics.throughput}
                  onChange={() => handleMetricToggle('throughput')}
                  className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
                />
                <span className="truncate">Throughput (tokens/s)</span>
              </label>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.metrics.outputQuality}
                  onChange={() => handleMetricToggle('outputQuality')}
                  className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
                />
                <span className="truncate">Output quality (if available)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.metrics.compareAdaptive}
                  onChange={() => handleMetricToggle('compareAdaptive')}
                  className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
                />
                <span className="truncate">Compare with adaptive selection</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons (Col 3) */}
        <div className="lg:col-span-3 flex flex-col justify-end gap-2">
          {/* Run Experiment Button matching screenshot */}
          <button
            type="button"
            onClick={onRunExperiment}
            disabled={isRunning}
            className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer ${
              isRunning
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#7C6AF2] via-[#6B57EC] to-[#5F46E8] hover:from-[#6B57EC] hover:to-[#5037DE] text-white shadow-[#7C6AF2]/25 hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            {isRunning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
            <div className="text-left leading-tight">
              <div className="text-sm font-black">
                {isRunning ? 'Running Experiment...' : 'Run Experiment'}
              </div>
              <div className="text-[10.5px] opacity-90 font-medium">
                {isRunning ? 'Measuring iterations' : 'Start Evaluation'}
              </div>
            </div>
          </button>

          {/* Reset Settings Button */}
          <button
            type="button"
            onClick={onResetConfig}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-200 text-slate-500 hover:text-[#18213B] hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
