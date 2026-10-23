import React from 'react';
import { ConfigurationCandidate } from '../../types';
import { Button, StatusBadge } from '../ui/primitives';
import { X, Check, AlertTriangle, Box, HardDrive, Clock, Award } from 'lucide-react';

interface CandidateDetailsModalProps {
  candidate: ConfigurationCandidate | null;
  onClose: () => void;
}

export const CandidateDetailsModal: React.FC<CandidateDetailsModalProps> = ({
  candidate,
  onClose,
}) => {
  if (!candidate) return null;

  const statusTone =
    candidate.status === 'selected'
      ? 'accent'
      : candidate.status === 'feasible'
        ? 'success'
        : candidate.status === 'rejected'
          ? 'danger'
          : candidate.status === 'evaluating'
            ? 'warning'
            : 'neutral';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222938]/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl bg-white rounded-lg border border-[#D9DEE7] shadow-glass p-5 relative flex flex-col max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          aria-label="Close Modal"
          onClick={onClose}
          className="absolute top-4 right-4 h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#E6EAF0]">
          <div className="w-10 h-10 rounded-md bg-[#F2F0FD] border border-[#D8D1FA] text-[#7562E8] flex items-center justify-center shrink-0">
            <Box className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-[#222938]">
                {candidate.modelName} — {candidate.name}
              </h2>
              <StatusBadge tone={statusTone} className="uppercase">
                {candidate.status}
              </StatusBadge>
            </div>
            <p className="text-[12px] text-[#647187] font-mono mt-0.5">
              ID: {candidate.id} · Quantization: {candidate.quantization}
            </p>
          </div>
        </div>

        {/* Spec Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
            <div className="flex items-center gap-1.5 text-[#647187] text-[11.5px] mb-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Memory</span>
            </div>
            <div className="text-[15px] font-semibold text-[#222938] font-mono tabular-nums">
              {candidate.memoryUsageGb ? `${candidate.memoryUsageGb.toFixed(1)} GB` : 'Pending'}
            </div>
            <div className="text-[11px] text-[#647187] font-mono tabular-nums mt-0.5">
              Budget: {candidate.memoryBudgetGb} GB
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
            <div className="flex items-center gap-1.5 text-[#647187] text-[11.5px] mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Latency</span>
            </div>
            <div className="text-[15px] font-semibold text-[#222938] font-mono tabular-nums">
              {candidate.inferenceLatencyMs ? `${candidate.inferenceLatencyMs} ms` : 'Evaluating'}
            </div>
            <div className="text-[11px] text-[#647187] font-mono tabular-nums mt-0.5">
              Limit: {candidate.latencyConstraintMs} ms
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
            <div className="flex items-center gap-1.5 text-[#647187] text-[11.5px] mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>Quality Score</span>
            </div>
            <div className="text-[15px] font-semibold text-[#222938] font-mono tabular-nums">
              {candidate.qualityScore ? `${candidate.qualityScore.toFixed(1)} / 100` : 'Unrated'}
            </div>
            <div className="text-[11px] text-[#647187] font-mono tabular-nums mt-0.5">
              Threshold: {candidate.qualityThreshold}
            </div>
          </div>
        </div>

        {/* Constraints Deep Dive */}
        <div className="mb-5">
          <h4 className="text-[11.5px] font-semibold text-[#647187] uppercase tracking-wider mb-2">
            Optimization Constraints Audit
          </h4>
          <div className="space-y-2 p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-[#222938]">
                Memory Budget Allocation (<span className="font-mono">&le; {candidate.memoryBudgetGb} GB</span>)
              </span>
              <span
                className={`font-semibold flex items-center gap-1 ${candidate.constraints.withinMemoryBudget === true
                    ? 'text-[#0D8A58]'
                    : 'text-[#DC2626]'
                  }`}
              >
                {candidate.constraints.withinMemoryBudget === true ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {candidate.constraints.withinMemoryBudget === true ? 'Satisfied' : 'Violated'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#222938]">
                Latency Threshold (<span className="font-mono">&le; {candidate.latencyConstraintMs} ms</span>)
              </span>
              <span
                className={`font-semibold flex items-center gap-1 ${candidate.constraints.meetsLatencyConstraint === true
                    ? 'text-[#0D8A58]'
                    : 'text-[#DC2626]'
                  }`}
              >
                {candidate.constraints.meetsLatencyConstraint === true ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {candidate.constraints.meetsLatencyConstraint === true ? 'Satisfied' : 'Violated'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#222938]">
                Quality Score (<span className="font-mono">&ge; {candidate.qualityThreshold}</span>)
              </span>
              <span
                className={`font-semibold flex items-center gap-1 ${candidate.constraints.qualityThresholdSatisfied === true
                    ? 'text-[#0D8A58]'
                    : 'text-[#DC2626]'
                  }`}
              >
                {candidate.constraints.qualityThresholdSatisfied === true ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {candidate.constraints.qualityThresholdSatisfied === true ? 'Satisfied' : 'Violated'}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Rationale */}
        <div className="p-3 rounded-md bg-white border border-[#D9DEE7] text-[12.5px] text-[#647187] mb-5">
          <div className="font-semibold text-[#222938] mb-1">Configuration Rationale</div>
          <p>{candidate.description}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6EAF0]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};