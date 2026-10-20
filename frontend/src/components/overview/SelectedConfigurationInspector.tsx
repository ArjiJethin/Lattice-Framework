import React from 'react';
import { ConfigurationCandidate } from '../../types';
import {
  HardDrive,
  Clock,
  Award,
  ArrowRight,
  Maximize2,
  Check,
  X,
  Box,
} from 'lucide-react';

interface SelectedConfigurationInspectorProps {
  candidate: ConfigurationCandidate;
  onViewDetails?: (candidate: ConfigurationCandidate) => void;
}

export const SelectedConfigurationInspector: React.FC<SelectedConfigurationInspectorProps> = ({
  candidate,
  onViewDetails,
}) => {
  const isFeasible = candidate.status === 'feasible' || candidate.status === 'selected';
  const isRejected = candidate.status === 'rejected';
  const isEvaluating = candidate.status === 'evaluating';

  return (
    <div className="h-full p-4 rounded-2xl glass-panel flex flex-col justify-between select-none">
      <div>
        {/* Card Top Title Bar */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/80 mb-3">
          <span className="text-[13px] font-semibold text-[#18213B] tracking-tight">
            Selected Configuration
          </span>
          <button
            title="Expand Inspector Details"
            className="text-slate-400 hover:text-[#18213B] transition-colors p-1 rounded-md hover:bg-white/80"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Model Identification Header */}
        <div className="flex items-start gap-3 mb-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#EEEBFF] text-[#8174F5] flex items-center justify-center shrink-0 border border-[#8174F5]/10 shadow-sm shadow-[#8174F5]/10">
            <Box className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#18213B] truncate tracking-tight">
                {candidate.modelName}
              </h3>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#EEEBFF] text-[#8174F5]">
                {candidate.status === 'selected' ? 'Selected' : candidate.status.toUpperCase()}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              {candidate.quantization}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {candidate.description}
            </div>
          </div>
        </div>

        {/* Key Metrics Rows */}
        <div className="space-y-2 mb-3.5 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/80 shadow-inner">
          {/* Memory Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs">Memory Usage</span>
            </div>
            <span className="text-xs font-bold text-[#18213B] font-mono">
              {candidate.memoryUsageGb !== null
                ? `${candidate.memoryUsageGb.toFixed(1)} GB`
                : 'Profiling...'}
            </span>
          </div>

          {/* Inference Latency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs">Inference Latency</span>
            </div>
            <span className="text-xs font-bold text-[#18213B] font-mono">
              {candidate.inferenceLatencyMs !== null
                ? `${candidate.inferenceLatencyMs} ms`
                : 'Evaluating'}
            </span>
          </div>

          {/* Quality Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs">Quality Score</span>
            </div>
            <span className="text-xs font-bold text-[#18213B] font-mono">
              {candidate.qualityScore !== null
                ? `${candidate.qualityScore.toFixed(1)} / 100`
                : 'Unmeasured'}
            </span>
          </div>
        </div>

        {/* View Full Details Action Button */}
        <button
          onClick={() => onViewDetails?.(candidate)}
          className="w-full py-2 px-3 mb-3.5 rounded-xl bg-[#EEEBFF] hover:bg-[#E3DFFF] text-[#8174F5] text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] shadow-sm shadow-[#8174F5]/10 border border-[#8174F5]/10"
        >
          <span>View Full Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Constraint Evaluation Status */}
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Status
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isFeasible
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
                  : isRejected
                  ? 'bg-rose-500'
                  : isEvaluating
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-xs font-bold text-[#18213B] capitalize">
              {isFeasible ? 'Feasible' : isRejected ? 'Rejected' : isEvaluating ? 'Evaluating' : 'Unprofiled'}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {/* Memory budget check */}
            <div className="flex items-center gap-2 text-slate-600">
              {candidate.constraints.withinMemoryBudget === true ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              ) : candidate.constraints.withinMemoryBudget === false ? (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              ) : (
                <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" />
              )}
              <span className={candidate.constraints.withinMemoryBudget === false ? 'text-rose-600' : ''}>
                Within memory budget
              </span>
            </div>

            {/* Latency constraint check */}
            <div className="flex items-center gap-2 text-slate-600">
              {candidate.constraints.meetsLatencyConstraint === true ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              ) : candidate.constraints.meetsLatencyConstraint === false ? (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              ) : (
                <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" />
              )}
              <span className={candidate.constraints.meetsLatencyConstraint === false ? 'text-rose-600' : ''}>
                Meets latency constraint
              </span>
            </div>

            {/* Quality threshold check */}
            <div className="flex items-center gap-2 text-slate-600">
              {candidate.constraints.qualityThresholdSatisfied === true ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              ) : candidate.constraints.qualityThresholdSatisfied === false ? (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              ) : (
                <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" />
              )}
              <span className={candidate.constraints.qualityThresholdSatisfied === false ? 'text-rose-600' : ''}>
                Quality threshold satisfied
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
