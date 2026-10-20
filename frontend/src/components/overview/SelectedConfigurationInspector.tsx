import React from 'react';
import { ConfigurationCandidate } from '../../types';
import {
  Cpu,
  Clock,
  Award,
  ArrowRight,
  Maximize2,
  Check,
  X,
} from 'lucide-react';

interface SelectedConfigurationInspectorProps {
  candidate: ConfigurationCandidate;
  onViewDetails?: (candidate: ConfigurationCandidate) => void;
}

// 3D Isometric Crystalline SVG matching the Selected Configuration icon in the reference
const IsometricCrystalBadge: React.FC = () => (
  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] border border-white shadow-sm flex items-center justify-center shrink-0">
    <svg className="w-9 h-9" viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="crystalTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="crystalLeft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="crystalRight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      {/* Top Face */}
      <polygon points="20,4 34,12 20,20 6,12" fill="url(#crystalTop)" opacity="0.9" />
      {/* Left Face */}
      <polygon points="6,12 20,20 20,36 6,28" fill="url(#crystalLeft)" opacity="0.85" />
      {/* Right Face */}
      <polygon points="20,20 34,12 34,28 20,36" fill="url(#crystalRight)" opacity="0.9" />
      {/* Internal glowing lattice lines */}
      <path
        d="M20,4 L20,36 M6,12 L34,28 M34,12 L6,28 M20,4 L34,12 L34,28 L20,36 L6,28 L6,12 Z"
        stroke="#FFFFFF"
        strokeWidth="1.1"
        strokeOpacity="0.85"
      />
      <circle cx="20" cy="20" r="2.5" fill="#FFFFFF" />
    </svg>
  </div>
);

export const SelectedConfigurationInspector: React.FC<SelectedConfigurationInspectorProps> = ({
  candidate,
  onViewDetails,
}) => {
  const isFeasible = candidate.status === 'feasible' || candidate.status === 'selected';
  const isRejected = candidate.status === 'rejected';
  const isEvaluating = candidate.status === 'evaluating';

  return (
    <div className="p-5 rounded-[24px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] flex flex-col justify-between select-none">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] font-bold text-[#18213B] tracking-tight">
            Selected Configuration
          </span>
          <button
            title="Expand Inspector Details"
            className="text-slate-400 hover:text-[#18213B] transition-colors p-1 rounded-md hover:bg-slate-100/70"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Model Info with 3D Crystal Thumbnail */}
        <div className="flex items-start gap-3.5 mb-4">
          <IsometricCrystalBadge />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[16px] font-extrabold text-[#18213B] truncate tracking-tight">
                {candidate.modelName}
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E5DFFF] text-[#6D5AE6]">
                {candidate.status === 'selected' ? 'Selected' : candidate.status}
              </span>
            </div>
            <div className="text-[13px] font-medium text-slate-600 mt-0.5">
              {candidate.quantization}
            </div>
            <div className="text-[11.5px] text-slate-400 truncate mt-0.5">
              {candidate.description}
            </div>
          </div>
        </div>

        {/* Clean Divider Metric Rows Matching Reference */}
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100 mb-4">
          {/* Memory Usage */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Cpu className="w-4 h-4 text-slate-500 stroke-[1.8]" />
              <span className="text-[12.5px] font-medium">Memory Usage</span>
            </div>
            <span className="text-[13px] font-bold text-[#18213B]">
              {candidate.memoryUsageGb !== null
                ? `${candidate.memoryUsageGb.toFixed(1)} GB`
                : 'Profiling...'}
            </span>
          </div>

          {/* Inference Latency */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Clock className="w-4 h-4 text-slate-500 stroke-[1.8]" />
              <span className="text-[12.5px] font-medium">Inference Latency</span>
            </div>
            <span className="text-[13px] font-bold text-[#18213B]">
              {candidate.inferenceLatencyMs !== null
                ? `${candidate.inferenceLatencyMs} ms`
                : 'Evaluating'}
            </span>
          </div>

          {/* Quality Score */}
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Award className="w-4 h-4 text-slate-500 stroke-[1.8]" />
              <span className="text-[12.5px] font-medium">Quality Score</span>
            </div>
            <span className="text-[13px] font-bold text-[#18213B]">
              {candidate.qualityScore !== null
                ? `${candidate.qualityScore.toFixed(1)} / 100`
                : 'Unmeasured'}
            </span>
          </div>
        </div>

        {/* Lavender Gradient Action Button */}
        <button
          onClick={() => onViewDetails?.(candidate)}
          className="w-full py-2.5 px-4 mb-4 rounded-xl bg-gradient-to-r from-[#DCD5FF] via-[#E2DCFF] to-[#EAE6FF] hover:from-[#D1C8FF] hover:to-[#E0DAFF] text-[#5B46E5] text-[13px] font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm"
        >
          <span>View Full Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Status Section */}
        <div>
          <div className="text-[12px] font-medium text-slate-500 mb-2">
            Status
          </div>
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className={`w-3 h-3 rounded-full ${isFeasible
                  ? 'bg-[#10B981] ring-4 ring-emerald-500/15'
                  : isRejected
                    ? 'bg-rose-500 ring-4 ring-rose-500/15'
                    : isEvaluating
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-slate-400'
                }`}
            />
            <span className="text-[13.5px] font-bold text-[#18213B]">
              {isFeasible ? 'Feasible' : isRejected ? 'Rejected' : isEvaluating ? 'Evaluating' : 'Unprofiled'}
            </span>
          </div>

          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center gap-2.5 text-slate-600">
              {candidate.constraints.withinMemoryBudget === true ? (
                <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
              ) : (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              )}
              <span>Within memory budget</span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              {candidate.constraints.meetsLatencyConstraint === true ? (
                <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
              ) : (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              )}
              <span>Meets latency constraint</span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              {candidate.constraints.qualityThresholdSatisfied === true ? (
                <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
              ) : (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              )}
              <span>Quality threshold satisfied</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};