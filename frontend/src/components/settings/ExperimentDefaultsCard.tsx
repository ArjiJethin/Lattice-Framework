import React from 'react';
import { FlaskConical, ChevronDown } from 'lucide-react';
import { ExperimentDefaultSettings } from '../../types/settings';

interface ExperimentDefaultsCardProps {
  settings: ExperimentDefaultSettings;
  onChangeSettings: (updated: Partial<ExperimentDefaultSettings>) => void;
}

export const ExperimentDefaultsCard: React.FC<ExperimentDefaultsCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  const handleMetricToggle = (key: keyof ExperimentDefaultSettings['defaultMetrics']) => {
    onChangeSettings({
      defaultMetrics: {
        ...settings.defaultMetrics,
        [key]: !settings.defaultMetrics[key],
      },
    });
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
          <FlaskConical className="w-5 h-5 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-[#18213B] tracking-tight">
            Experiment Settings
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Configure default experiment parameters.
          </p>
        </div>
      </div>

      {/* Row 1: Workload & Number of Runs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Default Workload Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">
            Default Workload Type
          </label>
          <div className="relative">
            <select
              value={settings.defaultWorkloadType}
              onChange={(e) => onChangeSettings({ defaultWorkloadType: e.target.value })}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              <option value="general">General Purpose</option>
              <option value="code">Code Generation</option>
              <option value="chat">Interactive Chat</option>
              <option value="summarization">Summarization</option>
              <option value="latency_critical">Latency Critical</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Default workload for new experiments
          </span>
        </div>

        {/* Default Number of Runs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">
            Default Number of Runs
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={settings.defaultNumberOfRuns}
            onChange={(e) =>
              onChangeSettings({
                defaultNumberOfRuns: parseInt(e.target.value, 10) || 10,
              })
            }
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
          />
          <span className="text-[11px] text-slate-500 font-medium">
            Default runs per experiment
          </span>
        </div>
      </div>

      {/* Row 2: Max New Tokens and Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Max New Tokens */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Max New Tokens</label>
          <input
            type="number"
            min={16}
            max={4096}
            step={32}
            value={settings.maxNewTokens}
            onChange={(e) =>
              onChangeSettings({
                maxNewTokens: parseInt(e.target.value, 10) || 512,
              })
            }
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
          />
          <span className="text-[11px] text-slate-500 font-medium">
            Default generation length
          </span>
        </div>

        {/* Temperature */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Temperature</label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(e) =>
              onChangeSettings({
                temperature: parseFloat(e.target.value) || 0.7,
              })
            }
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
          />
          <span className="text-[11px] text-slate-500 font-medium">
            Default sampling temperature
          </span>
        </div>
      </div>

      {/* Row 3: Default Metrics checklist */}
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
        <label className="text-xs font-bold text-[#18213B]">Default Metrics</label>
        <div className="flex items-center gap-4 flex-wrap text-xs font-medium text-slate-600">
          {/* Latency */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.defaultMetrics.latency}
              onChange={() => handleMetricToggle('latency')}
              className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
            />
            <span>Latency</span>
          </label>

          {/* Total Generation Time */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.defaultMetrics.totalGenerationTime}
              onChange={() => handleMetricToggle('totalGenerationTime')}
              className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
            />
            <span>Total Generation Time</span>
          </label>

          {/* Memory Usage */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.defaultMetrics.memoryUsage}
              onChange={() => handleMetricToggle('memoryUsage')}
              className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
            />
            <span>Memory Usage</span>
          </label>

          {/* Throughput */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.defaultMetrics.throughput}
              onChange={() => handleMetricToggle('throughput')}
              className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
            />
            <span>Throughput</span>
          </label>

          {/* Output Quality */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.defaultMetrics.outputQuality}
              onChange={() => handleMetricToggle('outputQuality')}
              className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-3.5 h-3.5"
            />
            <span>Output Quality</span>
          </label>
        </div>
      </div>
    </div>
  );
};
