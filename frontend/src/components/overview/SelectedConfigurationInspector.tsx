import React, { useState } from 'react';
import { ConfigurationCandidate } from '../../types';
import { Button, StatusBadge } from '../ui/primitives';
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

const IsometricCrystalBadge: React.FC<{ size?: 'normal' | 'small' }> = ({ size = 'normal' }) => {
  const isSmall = size === 'small';
  return (
    <div
      className={`${isSmall ? 'w-8 h-8 rounded-md' : 'w-10 h-10 rounded-md'
        } bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center shrink-0`}
    >
      <svg className={isSmall ? 'w-5 h-5' : 'w-6 h-6'} viewBox="0 0 40 40" fill="none">
        <polygon points="20,4 34,12 20,20 6,12" fill="#DDD6FE" opacity="0.9" />
        <polygon points="6,12 20,20 20,36 6,28" fill="#8B5CF6" opacity="0.85" />
        <polygon points="20,20 34,12 34,28 20,36" fill="#7562E8" opacity="0.9" />
        <path
          d="M20,4 L20,36 M6,12 L34,28 M34,12 L6,28 M20,4 L34,12 L34,28 L20,36 L6,28 L6,12 Z"
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />
        <circle cx="20" cy="20" r="2.4" fill="#FFFFFF" />
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

  const statusTone =
    candidate.status === 'selected' || candidate.id === 'cand-optimizer'
      ? 'accent'
      : isFeasible
        ? 'success'
        : isRejected
          ? 'danger'
          : isEvaluating
            ? 'warning'
            : 'neutral';

  if (isCollapsed) {
    return (
      <div className="p-2.5 px-3 rounded-lg glass-floating flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <IsometricCrystalBadge size="small" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-[#222938] truncate">
                {candidate.modelName}
              </span>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] text-[#222938] border border-[#D9DEE7]">
                {candidate.quantization}
              </span>
            </div>
            <div className="text-[11px] text-[#647187] flex items-center gap-1.5 mt-0.5 font-mono tabular-nums">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isFeasible
                    ? 'bg-[#0D8A58]'
                    : isRejected
                      ? 'bg-[#DC2626]'
                      : isEvaluating
                        ? 'bg-[#D97706]'
                        : 'bg-[#8A94A6]'
                  }`}
              />
              <span>
                {candidate.inferenceLatencyMs !== null
                  ? `${candidate.inferenceLatencyMs} ms`
                  : 'Evaluating'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onViewDetails?.(candidate)}
            aria-label="Inspect Details"
            title="Inspect Details"
            className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand Inspector Card"
            title="Expand Inspector Card"
            className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg glass-floating flex flex-col justify-between select-none">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E6EAF0]">
          <span className="text-[14px] font-semibold text-[#222938] tracking-tight">
            Selected Configuration
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse Inspector"
              title="Collapse Inspector"
              className="h-6 w-6 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewDetails?.(candidate)}
              aria-label="Full Constraint Audit Modal"
              title="Full Constraint Audit Modal"
              className="h-6 w-6 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Model Info Header */}
        <div className="flex items-start gap-3 mb-3">
          <IsometricCrystalBadge />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-[15px] font-semibold text-[#222938] truncate tracking-tight">
                {candidate.modelName}
              </h3>
              <StatusBadge tone={statusTone}>
                {candidate.status === 'selected' || candidate.id === 'cand-optimizer'
                  ? 'Selected'
                  : candidate.status}
              </StatusBadge>
            </div>
            <div className="text-[12px] font-mono font-medium text-[#222938] mt-0.5 flex items-center gap-1.5">
              <span>{candidate.quantization}</span>
              <span className="text-[#D9DEE7]">·</span>
              <span className="text-[11px] text-[#647187]">{candidate.id}</span>
            </div>
            <div className="text-[12px] text-[#647187] truncate mt-0.5">
              {candidate.description}
            </div>
          </div>
        </div>

        {/* Aligned Tabular Metric Rows */}
        <div className="divide-y divide-[#E6EAF0] border-t border-b border-[#E6EAF0] mb-3">
          <div className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#647187]">
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[12.5px]">Memory Usage</span>
            </div>
            <span className="text-[12.5px] font-mono font-semibold text-[#222938] tabular-nums">
              {candidate.memoryUsageGb !== null ? (
                `${candidate.memoryUsageGb.toFixed(1)} GB`
              ) : (
                <span className="text-[#8A94A6] font-sans font-normal">Pending</span>
              )}
            </span>
          </div>

          <div className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#647187]">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[12.5px]">Inference Latency</span>
            </div>
            <span className="text-[12.5px] font-mono font-semibold text-[#222938] tabular-nums">
              {candidate.inferenceLatencyMs !== null ? (
                `${candidate.inferenceLatencyMs} ms`
              ) : (
                <span className="text-[#B45309] font-sans font-medium text-[11.5px]">
                  Evaluating
                </span>
              )}
            </span>
          </div>

          <div className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#647187]">
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[12.5px]">Quality Score</span>
            </div>
            <span className="text-[12.5px] font-mono font-semibold text-[#222938] tabular-nums">
              {candidate.qualityScore !== null ? (
                `${candidate.qualityScore.toFixed(1)} / 100`
              ) : (
                <span className="text-[#8A94A6] font-sans font-normal">Unmeasured</span>
              )}
            </span>
          </div>
        </div>

        {/* Standardized Action Button */}
        <Button
          variant="subtle"
          size="sm"
          onClick={() => onViewDetails?.(candidate)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="w-full mb-3"
        >
          View Full Details
        </Button>

        {/* Status & Constraint Audit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647187]">
              Constraint Audit
            </span>
            <span className="text-[12px] font-semibold text-[#222938] capitalize flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${isFeasible
                    ? 'bg-[#0D8A58]'
                    : isRejected
                      ? 'bg-[#DC2626]'
                      : isEvaluating
                        ? 'bg-[#D97706]'
                        : 'bg-[#8A94A6]'
                  }`}
              />
              {isFeasible
                ? 'Feasible'
                : isRejected
                  ? 'Rejected'
                  : isEvaluating
                    ? 'Evaluating'
                    : 'Unprofiled'}
            </span>
          </div>

          {isRejected && candidate.rejectionReason && (
            <div className="mb-2.5 p-2 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[11.5px] text-[#DC2626] flex items-start gap-2 leading-snug">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{candidate.rejectionReason}</span>
            </div>
          )}

          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between text-[#647187]">
              <div className="flex items-center gap-2">
                {candidate.constraints.withinMemoryBudget === true ? (
                  <Check className="w-3.5 h-3.5 text-[#0D8A58] stroke-[2.5]" />
                ) : candidate.constraints.withinMemoryBudget === false ? (
                  <X className="w-3.5 h-3.5 text-[#DC2626] stroke-[2.5]" />
                ) : (
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-[#8A94A6]">—</span>
                )}
                <span className={candidate.constraints.withinMemoryBudget === false ? 'text-[#DC2626] font-medium' : 'text-[#222938]'}>
                  Within memory budget
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#647187] tabular-nums">
                &le; {candidate.memoryBudgetGb} GB
              </span>
            </div>

            <div className="flex items-center justify-between text-[#647187]">
              <div className="flex items-center gap-2">
                {candidate.constraints.meetsLatencyConstraint === true ? (
                  <Check className="w-3.5 h-3.5 text-[#0D8A58] stroke-[2.5]" />
                ) : candidate.constraints.meetsLatencyConstraint === false ? (
                  <X className="w-3.5 h-3.5 text-[#DC2626] stroke-[2.5]" />
                ) : (
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-[#8A94A6]">—</span>
                )}
                <span className={candidate.constraints.meetsLatencyConstraint === false ? 'text-[#DC2626] font-medium' : 'text-[#222938]'}>
                  Meets latency constraint
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#647187] tabular-nums">
                &le; {candidate.latencyConstraintMs} ms
              </span>
            </div>

            <div className="flex items-center justify-between text-[#647187]">
              <div className="flex items-center gap-2">
                {candidate.constraints.qualityThresholdSatisfied === true ? (
                  <Check className="w-3.5 h-3.5 text-[#0D8A58] stroke-[2.5]" />
                ) : candidate.constraints.qualityThresholdSatisfied === false ? (
                  <X className="w-3.5 h-3.5 text-[#DC2626] stroke-[2.5]" />
                ) : (
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-[#8A94A6]">—</span>
                )}
                <span className={candidate.constraints.qualityThresholdSatisfied === false ? 'text-[#DC2626] font-medium' : 'text-[#222938]'}>
                  Quality threshold satisfied
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#647187] tabular-nums">
                &ge; {candidate.qualityThreshold}
              </span>
            </div>
          </div>
        </div>

        {/* Cycle Navigation Footer */}
        <div className="mt-3 pt-2 border-t border-[#E6EAF0] flex items-center justify-between text-[11px] text-[#647187]">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#8A94A6]" />
            <span>Cycle Node:</span>
            <button
              type="button"
              onClick={onCyclePrev}
              aria-label="Previous candidate"
              title="Previous candidate (Left arrow)"
              className="px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] hover:bg-[#EDEFF3] border border-[#D9DEE7] text-[#222938] font-mono text-[10px] transition-colors cursor-pointer"
            >
              &larr;
            </button>
            <button
              type="button"
              onClick={onCycleNext}
              aria-label="Next candidate"
              title="Next candidate (Right arrow)"
              className="px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] hover:bg-[#EDEFF3] border border-[#D9DEE7] text-[#222938] font-mono text-[10px] transition-colors cursor-pointer"
            >
              &rarr;
            </button>
          </div>
          <span className="font-mono text-[10.5px] uppercase text-[#8A94A6]">
            {candidate.nodeRole}
          </span>
        </div>
      </div>
    </div>
  );
};