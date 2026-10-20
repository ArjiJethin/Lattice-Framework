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
    <div className="w-full lg:w-[320px] xl:w-[350px] shrink-0 p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-card flex flex-col justify-between select-none">
      <div>
        {/* Card Top Title Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
          <span className="text-[13px] font-semibold text-[#18213B] tracking-tight">
            Selected Configuration
          </span>
          <button
            title="Expand Inspector Details"
            className="text-slate-400 hover:text-[#18213B] transition-colors p-1 rounded-md hover:bg-slate-100"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Model Identification Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#EEEBFF] text-[#8174F5] flex items-center justify-center shrink-0 border border-[#8174F5]/10 shadow-sm">
            <Box className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#18213B] truncate tracking-tight">
                {candidate.modelName}
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEEBFF] text-[#8174F5]">
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
        <div className="space-y-3 mb-6 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
          {/* Memory Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <HardDrive className="w-4 h-4 text-slate-400" />
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
              <Clock className="w-4 h-4 text-slate-400" />
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
              <Award className="w-4 h-4 text-slate-400" />
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
          className="w-full py-2.5 px-4 mb-6 rounded-xl bg-[#EEEBFF] hover:bg-[#E3DFFF] text-[#8174F5] text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99]"
        >
          <span>View Full Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Constraint Evaluation Status */}
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Status
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isFeasible
                  ? 'bg-emerald-500'
                  : isRejected
                  ? 'bg-rose-500'
                  : isEvaluating
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-sm font-bold text-[#18213B] capitalize">
              {isFeasible ? 'Feasible' : isRejected ? 'Rejected' : isEvaluating ? 'Evaluating' : 'Unprofiled'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Memory budget check */}
            <div className="flex items-center gap-2 text-slate-600">
              {candidate.constraints.withinMemoryBudget === true ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              ) : candidate.constraints.withinMemoryBudget === false ? (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />
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
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />
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
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />
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
