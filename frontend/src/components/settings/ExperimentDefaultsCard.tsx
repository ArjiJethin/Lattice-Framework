import React from 'react';
import { FlaskConical } from 'lucide-react';
import { ExperimentDefaultSettings } from '../../types/settings';
import { Select, Input, Checkbox } from '../ui/primitives';

interface ExperimentDefaultsCardProps {
  settings: ExperimentDefaultSettings;
  onChangeSettings: (updated: Partial<ExperimentDefaultSettings>) => void;
}

export const ExperimentDefaultsCard: React.FC<ExperimentDefaultsCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  const handleMetricToggle = (
    key: keyof ExperimentDefaultSettings['defaultMetrics']
  ) => {
    onChangeSettings({
      defaultMetrics: {
        ...settings.defaultMetrics,
        [key]: !settings.defaultMetrics[key],
      },
    });
  };

  const handleNumberChange = (
    field: 'defaultNumberOfRuns' | 'maxNewTokens' | 'temperature',
    raw: string
  ) => {
    if (raw === '') return;
    const val = field === 'temperature' ? parseFloat(raw) : parseInt(raw, 10);
    if (!isNaN(val)) {
      onChangeSettings({ [field]: val });
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] shrink-0">
            <FlaskConical className="w-4 h-4 stroke-[1.9]" />
          </div>
          <div>
            <h2 className="text-[14.5px] font-semibold text-[#222938] tracking-tight">
              Experiment Defaults
            </h2>
            <p className="text-[12px] text-[#647187]">
              Baseline workload parameters and telemetry collection flags for new benchmark runs.
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: Workload & Number of Runs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#222938]">
            Default Workload Type
          </label>
          <Select
            value={settings.defaultWorkloadType}
            onChange={(e) =>
              onChangeSettings({ defaultWorkloadType: e.target.value })
            }
          >
            <option value="general">General Purpose</option>
            <option value="code">Code Generation</option>
            <option value="chat">Interactive Chat</option>
            <option value="summarization">Summarization</option>
            <option value="latency_critical">Latency Critical</option>
          </Select>
          <span className="text-[11px] text-[#647187]">
            Initial workload preset selected in Experiments
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Default Number of Runs
            </label>
            <span className="text-[10.5px] font-mono text-[#647187]">1–100</span>
          </div>
          <Input
            type="number"
            mono
            min={1}
            max={100}
            value={settings.defaultNumberOfRuns}
            onChange={(e) =>
              handleNumberChange('defaultNumberOfRuns', e.target.value)
            }
          />
          <span className="text-[11px] text-[#647187]">
            Default repetitions per evaluated configuration
          </span>
        </div>
      </div>

      {/* Row 2: Max New Tokens and Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Max New Tokens
            </label>
            <span className="text-[10.5px] font-mono text-[#647187]">16–4096</span>
          </div>
          <Input
            type="number"
            mono
            min={16}
            max={4096}
            step={32}
            value={settings.maxNewTokens}
            onChange={(e) => handleNumberChange('maxNewTokens', e.target.value)}
          />
          <span className="text-[11px] text-[#647187]">
            Default output token generation budget
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Sampling Temperature
            </label>
            <span className="text-[10.5px] font-mono text-[#647187]">0.0–2.0</span>
          </div>
          <Input
            type="number"
            mono
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(e) => handleNumberChange('temperature', e.target.value)}
          />
          <span className="text-[11px] text-[#647187]">
            Default decoding randomness parameter
          </span>
        </div>
      </div>

      {/* Row 3: Default Metrics checklist */}
      <div className="pt-3 border-t border-[#E6EAF0] flex flex-col gap-2">
        <label className="text-[12px] font-medium text-[#222938]">
          Default Evaluated Metrics
        </label>
        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#E6EAF0] flex items-center gap-5 flex-wrap">
          <Checkbox
            id="def-metric-latency"
            checked={settings.defaultMetrics.latency}
            onCheckedChange={() => handleMetricToggle('latency')}
            label="Latency (TTFT)"
          />
          <Checkbox
            id="def-metric-gentime"
            checked={settings.defaultMetrics.totalGenerationTime}
            onCheckedChange={() => handleMetricToggle('totalGenerationTime')}
            label="Total Generation Time"
          />
          <Checkbox
            id="def-metric-mem"
            checked={settings.defaultMetrics.memoryUsage}
            onCheckedChange={() => handleMetricToggle('memoryUsage')}
            label="Peak Memory Usage"
          />
          <Checkbox
            id="def-metric-tps"
            checked={settings.defaultMetrics.throughput}
            onCheckedChange={() => handleMetricToggle('throughput')}
            label="Throughput (tok/s)"
          />
          <Checkbox
            id="def-metric-quality"
            checked={settings.defaultMetrics.outputQuality}
            onCheckedChange={() => handleMetricToggle('outputQuality')}
            label="Output Quality"
          />
        </div>
      </div>
    </div>
  );
};