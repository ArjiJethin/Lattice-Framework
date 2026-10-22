import React, { useState } from 'react';
import { Play, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import {
  OptimizationConstraints,
  WorkloadType,
  OptimizationObjectiveType,
} from '../../types/optimizationLab';
import { WORKLOAD_OPTIONS, OBJECTIVE_OPTIONS } from '../../lib/optimization-lab/optimizationLabService';

interface ConstraintStudioProps {
  constraints: OptimizationConstraints;
  onChangeConstraints: (updated: Partial<OptimizationConstraints>) => void;
  onRunOptimization: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const ConstraintStudio: React.FC<ConstraintStudioProps> = ({
  constraints,
  onChangeConstraints,
  onRunOptimization,
  isLoading,
  error,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedWorkload =
    WORKLOAD_OPTIONS.find((w) => w.id === constraints.workloadType) || WORKLOAD_OPTIONS[0];

  const selectedObjective =
    OBJECTIVE_OPTIONS.find((o) => o.id === constraints.objective) || OBJECTIVE_OPTIONS[0];

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-extrabold text-[#18213B] tracking-tight">
            1. Optimization Requirements
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Set your constraints and optimization objective.
          </p>
        </div>

        {/* Advanced Options Toggle */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
            Advanced Options
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={showAdvanced}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
              showAdvanced ? 'bg-[#7C6AF2]' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                showAdvanced ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Form Controls Grid matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
        {/* 1. Workload Type */}
        <div className="lg:col-span-1 flex flex-col justify-between h-[84px]">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Workload Type
            </label>
            <div className="relative">
              <select
                value={constraints.workloadType}
                onChange={(e) =>
                  onChangeConstraints({ workloadType: e.target.value as WorkloadType })
                }
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-xs font-bold text-[#18213B] px-3 py-2 pr-8 rounded-xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-[#7C6AF2]/30 focus:border-[#7C6AF2] transition-colors cursor-pointer"
              >
                {WORKLOAD_OPTIONS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium truncate" title={selectedWorkload.description}>
            {selectedWorkload.description}
          </p>
        </div>

        {/* 2. Optimization Objective */}
        <div className="lg:col-span-1 flex flex-col justify-between h-[84px]">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Optimization Objective
            </label>
            <div className="relative">
              <select
                value={constraints.objective}
                onChange={(e) =>
                  onChangeConstraints({
                    objective: e.target.value as OptimizationObjectiveType,
                  })
                }
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-xs font-bold text-[#18213B] px-3 py-2 pr-8 rounded-xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-[#7C6AF2]/30 focus:border-[#7C6AF2] transition-colors cursor-pointer"
              >
                {OBJECTIVE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium truncate" title={selectedObjective.description}>
            {selectedObjective.description}
          </p>
        </div>

        {/* 3. Max Memory Usage Slider */}
        <div className="lg:col-span-1 flex flex-col justify-between h-[84px]">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Max Memory Usage
            </label>
            <span className="text-[11px] font-extrabold text-[#7C6AF2] bg-[#7C6AF2]/10 px-2 py-0.5 rounded-md border border-[#7C6AF2]/20">
              {constraints.maxMemoryGb.toFixed(1)} GB
            </span>
          </div>
          <div className="py-1">
            <input
              type="range"
              min="0.5"
              max="16.0"
              step="0.1"
              value={constraints.maxMemoryGb}
              onChange={(e) =>
                onChangeConstraints({ maxMemoryGb: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7C6AF2]"
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>0.5</span>
            <span>16</span>
          </div>
        </div>

        {/* 4. Max Inference Latency Slider */}
        <div className="lg:col-span-1 flex flex-col justify-between h-[84px]">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Max Latency
            </label>
            <span className="text-[11px] font-extrabold text-[#7C6AF2] bg-[#7C6AF2]/10 px-2 py-0.5 rounded-md border border-[#7C6AF2]/20">
              {constraints.maxLatencyMs} ms
            </span>
          </div>
          <div className="py-1">
            <input
              type="range"
              min="50"
              max="2000"
              step="10"
              value={constraints.maxLatencyMs}
              onChange={(e) =>
                onChangeConstraints({ maxLatencyMs: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7C6AF2]"
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>50</span>
            <span>2000</span>
          </div>
        </div>

        {/* 5. Minimum Quality Score Slider */}
        <div className="lg:col-span-1 flex flex-col justify-between h-[84px]">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Min Quality Score
            </label>
            <span className="text-[11px] font-extrabold text-[#7C6AF2] bg-[#7C6AF2]/10 px-2 py-0.5 rounded-md border border-[#7C6AF2]/20">
              {constraints.minQualityScore}
            </span>
          </div>
          <div className="py-1">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={constraints.minQualityScore}
              onChange={(e) =>
                onChangeConstraints({ minQualityScore: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7C6AF2]"
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>0</span>
            <span>100</span>
          </div>
        </div>

        {/* 6. Run Optimization Action Button */}
        <div className="lg:col-span-1 flex items-center justify-end h-[84px]">
          <button
            onClick={onRunOptimization}
            disabled={isLoading}
            className="w-full h-[62px] rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C6AF2] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] active:scale-[0.98] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 px-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              </div>
            )}
            <div className="text-left">
              <span className="text-sm font-black leading-tight block">
                {isLoading ? 'Solving...' : 'Run Optimization'}
              </span>
              <span className="text-[10px] font-medium text-white/80 leading-none block mt-0.5">
                Find Best Configuration
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Expandable Advanced Options Panel */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-3.5 rounded-xl animate-fadeIn">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Target Hardware Profile
            </label>
            <input
              type="text"
              value={constraints.targetHardware || ''}
              onChange={(e) => onChangeConstraints({ targetHardware: e.target.value })}
              placeholder="e.g. RTX 3050 (4 GB)"
              className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#7C6AF2]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Switching Overhead Tolerance (ms)
            </label>
            <input
              type="number"
              value={constraints.switchingOverheadMs || 0}
              onChange={(e) =>
                onChangeConstraints({
                  switchingOverheadMs: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#7C6AF2]"
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              id="allowUnprofiled"
              checked={constraints.allowUnprofiled || false}
              onChange={(e) =>
                onChangeConstraints({ allowUnprofiled: e.target.checked })
              }
              className="w-4 h-4 text-[#7C6AF2] rounded border-slate-300 focus:ring-[#7C6AF2]"
            />
            <label
              htmlFor="allowUnprofiled"
              className="text-xs font-medium text-slate-600 cursor-pointer select-none"
            >
              Include unbenchmarked / estimated profiles in search pool
            </label>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
