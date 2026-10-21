import React, { useState } from 'react';
import { ConfigurationCandidate } from '../../types';
import {
  Cpu,
  Clock,
  Award,
  ArrowRight,
  Maximize2,
  Minimize2,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface SelectedConfigurationInspectorProps {
  candidate: ConfigurationCandidate;
  onViewDetails?: (candidate: ConfigurationCandidate) => void;
  onCycleNext?: () => void;
  onCyclePrev?: () => void;
}

// 3D Isometric Crystalline SVG matching the Selected Configuration icon in the reference
const IsometricCrystalBadge: React.FC<{ size?: 'normal' | 'small' }> = ({ size = 'normal' }) => {
  const isSmall = size === 'small';
  return (
    <div
      className={`${
        isSmall ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'
      } bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] border border-white shadow-sm flex items-center justify-center shrink-0`}
    >
      <svg className={isSmall ? 'w-5 h-5' : 'w-7 h-7'} viewBox="0 0 40 40" fill="none">
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
        <polygon points="20,4 34,12 20,20 6,12" fill="url(#crystalTop)" opacity="0.9" />
        <polygon points="6,12 20,20 20,36 6,28" fill="url(#crystalLeft)" opacity="0.85" />
        <polygon points="20,20 34,12 34,28 20,36" fill="url(#crystalRight)" opacity="0.9" />
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
};

export const SelectedConfigurationInspector: React.FC<SelectedConfigurationInspectorProps> = ({
  candidate,
  onViewDetails,
  onCycleNext,
  onCyclePrev,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isFeasible = candidate.status === 'feasible' || candidate.status === 'selected';
  const isRejected = candidate.status === 'rejected';
  const isEvaluating = candidate.status === 'evaluating';

  // Collapsed Contextual Floating Pill View (for small screens or uncluttered 3D viewing)
  if (isCollapsed) {
    return (
      <div className="p-2.5 px-3.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex items-center justify-between gap-3 select-none transition-all duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <IsometricCrystalBadge size="small" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-[#18213B] truncate">
                {candidate.modelName}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#E5DFFF] text-[#6D5AE6]">
                {candidate.quantization}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isFeasible
                    ? 'bg-[#10B981]'
                    : isRejected
                    ? 'bg-rose-500'
                    : isEvaluating
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span className="capitalize font-medium">
                {candidate.inferenceLatencyMs !== null
                  ? `${candidate.inferenceLatencyMs} ms`
                  : 'Evaluating'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onViewDetails?.(candidate)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#5B46E5] hover:bg-slate-100 transition-colors"
            title="Inspect Details"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#18213B] hover:bg-slate-100 transition-colors"
            title="Expand Inspector Card"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-[20px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between select-none">
      <div>
        {/* Card Header with Collapse and Expand Controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-bold text-[#18213B] tracking-tight">
              Selected Configuration
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(true)}
              title="Collapse into floating pill"
              className="text-slate-400 hover:text-[#18213B] transition-colors p-1 rounded-md hover:bg-slate-100/70"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewDetails?.(candidate)}
              title="Full Constraint Audit Modal"
              className="text-slate-400 hover:text-[#18213B] transition-colors p-1 rounded-md hover:bg-slate-100/70"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Model Info with 3D Crystal Thumbnail */}
        <div className="flex items-start gap-2.5 mb-2.5">
          <IsometricCrystalBadge />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-[15px] font-extrabold text-[#18213B] truncate tracking-tight">
                {candidate.modelName}
              </h3>
              <span
                className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                  candidate.status === 'selected' || candidate.id === 'cand-optimizer'
                    ? 'bg-[#E5DFFF] text-[#6D5AE6]'
                    : isRejected
                    ? 'bg-rose-100 text-rose-700'
                    : isEvaluating
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                }`}
              >
                {candidate.status === 'selected' || candidate.id === 'cand-optimizer'
                  ? 'Active Model'
                  : candidate.status === 'feasible'
                  ? 'Candidate'
                  : candidate.status}
              </span>
            </div>
            <div className="text-[12px] font-medium text-slate-600 mt-0.5 flex items-center gap-2">
              <span>{candidate.quantization}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-[10px] text-slate-400">{candidate.id}</span>
            </div>
            <div className="text-[10.5px] text-slate-400 truncate mt-0.5">
              {candidate.description}
            </div>
          </div>
        </div>

        {/* Clean Divider Metric Rows with Explicit Missing/Unmeasured States */}
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100 mb-2.5">
          {/* Memory Usage */}
          <div className="py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Cpu className="w-3.5 h-3.5 text-slate-500 stroke-[1.8]" />
              <span className="text-[11.5px] font-medium">Memory Usage</span>
            </div>
            <span className="text-[12.5px] font-bold text-[#18213B]">
              {candidate.memoryUsageGb !== null ? (
                `${candidate.memoryUsageGb.toFixed(1)} GB`
              ) : (
                <span className="text-slate-400 font-normal italic text-[11px]">— Pending</span>
              )}
            </span>
          </div>

          {/* Inference Latency */}
          <div className="py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-500 stroke-[1.8]" />
              <span className="text-[11.5px] font-medium">Inference Latency</span>
            </div>
            <span className="text-[12.5px] font-bold text-[#18213B]">
              {candidate.inferenceLatencyMs !== null ? (
                `${candidate.inferenceLatencyMs} ms`
              ) : (
                <span className="text-amber-600 font-medium text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Evaluating
                </span>
              )}
            </span>
          </div>

          {/* Quality Score */}
          <div className="py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Award className="w-3.5 h-3.5 text-slate-500 stroke-[1.8]" />
              <span className="text-[11.5px] font-medium">Quality Score</span>
            </div>
            <span className="text-[12.5px] font-bold text-[#18213B]">
              {candidate.qualityScore !== null ? (
                `${candidate.qualityScore.toFixed(1)} / 100`
              ) : (
                <span className="text-slate-400 font-normal italic text-[11px]">— Unmeasured</span>
              )}
            </span>
          </div>
        </div>

        {/* Lavender Gradient Action Button */}
        <button
          onClick={() => onViewDetails?.(candidate)}
          className="w-full py-2 px-3 mb-2.5 rounded-xl bg-gradient-to-r from-[#DCD5FF] via-[#E2DCFF] to-[#EAE6FF] hover:from-[#D1C8FF] hover:to-[#E0DAFF] text-[#5B46E5] text-[12px] font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm active:scale-[0.99]"
        >
          <span>View Full Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Status & Constraint Verification Section */}
        <div>
          <div className="text-[11px] font-medium text-slate-500 mb-1">
            Status
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isFeasible
                  ? 'bg-[#10B981] ring-2 ring-emerald-500/15'
                  : isRejected
                  ? 'bg-rose-500 ring-2 ring-rose-500/15'
                  : isEvaluating
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-[13px] font-bold text-[#18213B] capitalize">
              {isFeasible
                ? 'Feasible'
                : isRejected
                ? 'Rejected'
                : isEvaluating
                ? 'Evaluating'
                : 'Unprofiled'}
            </span>
          </div>

          {/* Explicit Rejection Rationale when applicable */}
          {isRejected && candidate.rejectionReason && (
            <div className="mb-2.5 p-2 rounded-xl bg-rose-50/90 border border-rose-200/70 text-[11px] text-rose-700 flex items-start gap-1.5 leading-snug">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
              <span>{candidate.rejectionReason}</span>
            </div>
          )}

          {/* Constraint Verification Checklist */}
          <div className="space-y-1 text-[11px]">
            {/* Memory Budget */}
            <div className="flex items-center gap-2 text-slate-600">
              {candidate.constraints.withinMemoryBudget === true ? (
                <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
              ) : candidate.constraints.withinMemoryBudget === false ? (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 font-bold">—</span>
              )}
              <span className={candidate.constraints.withinMemoryBudget === false ? 'text-rose-600 font-medium' : ''}>
                Within memory budget (&le; {candidate.memoryBudgetGb} GB)
              </span>
            </div>

            {/* Latency Limit */}
            <div className="flex items-center gap-2 text-slate-600">
              {candidate.constraints.meetsLatencyConstraint === true ? (
                <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
              ) : candidate.constraints.meetsLatencyConstraint === false ? (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 font-bold">—</span>
              )}
              <span className={candidate.constraints.meetsLatencyConstraint === false ? 'text-rose-600 font-medium' : ''}>
                Meets latency constraint (&le; {candidate.latencyConstraintMs} ms)
              </span>
            </div>

            {/* Quality Score */}
            <div className="flex items-center gap-2 text-slate-600">
              {candidate.constraints.qualityThresholdSatisfied === true ? (
                <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[2.5]" />
              ) : candidate.constraints.qualityThresholdSatisfied === false ? (
                <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 font-bold">—</span>
              )}
              <span className={candidate.constraints.qualityThresholdSatisfied === false ? 'text-rose-600 font-medium' : ''}>
                Quality threshold satisfied (&ge; {candidate.qualityThreshold})
              </span>
            </div>
          </div>
        </div>

        {/* Keyboard-accessible Navigation Hint */}
        <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Navigate:</span>
            <button
              onClick={onCyclePrev}
              title="Previous candidate (Left arrow)"
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[9.5px] transition-colors"
            >
              &larr;
            </button>
            <button
              onClick={onCycleNext}
              title="Next candidate (Right arrow)"
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[9.5px] transition-colors"
            >
              &rarr;
            </button>
          </div>
          <span className="font-mono text-slate-400/80">{candidate.nodeRole}</span>
        </div>
      </div>
    </div>
  );
};