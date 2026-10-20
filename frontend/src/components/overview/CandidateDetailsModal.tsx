import React from 'react';
import { ConfigurationCandidate } from '../../types';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white/95 rounded-3xl border border-slate-200/90 shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-[#18213B] hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EEEBFF] text-[#8174F5] flex items-center justify-center shrink-0">
            <Box className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#18213B]">
                {candidate.modelName} — {candidate.name}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEEBFF] text-[#8174F5]">
                {candidate.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Candidate ID: {candidate.id} · Quant: {candidate.quantization}
            </p>
          </div>
        </div>

        {/* Configuration Profile Spec Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Memory</span>
            </div>
            <div className="text-sm font-bold text-[#18213B] font-mono">
              {candidate.memoryUsageGb ? `${candidate.memoryUsageGb.toFixed(1)} GB` : 'Pending'}
            </div>
            <div className="text-[10px] text-slate-400">Budget: {candidate.memoryBudgetGb} GB</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Latency</span>
            </div>
            <div className="text-sm font-bold text-[#18213B] font-mono">
              {candidate.inferenceLatencyMs ? `${candidate.inferenceLatencyMs} ms` : 'Evaluating'}
            </div>
            <div className="text-[10px] text-slate-400">Limit: {candidate.latencyConstraintMs} ms</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>Quality Score</span>
            </div>
            <div className="text-sm font-bold text-[#18213B] font-mono">
              {candidate.qualityScore ? `${candidate.qualityScore.toFixed(1)} / 100` : 'Unrated'}
            </div>
            <div className="text-[10px] text-slate-400">Threshold: {candidate.qualityThreshold}</div>
          </div>
        </div>

        {/* Constraints Deep Dive */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-[#18213B] uppercase tracking-wider mb-2.5">
            Optimization Constraints Audit
          </h4>
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Memory Budget Allocation (&le; {candidate.memoryBudgetGb} GB)</span>
              <span className={`font-semibold flex items-center gap-1 ${
                candidate.constraints.withinMemoryBudget === true ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {candidate.constraints.withinMemoryBudget === true ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {candidate.constraints.withinMemoryBudget === true ? 'Satisfied' : 'Violated'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Latency Threshold (&le; {candidate.latencyConstraintMs} ms)</span>
              <span className={`font-semibold flex items-center gap-1 ${
                candidate.constraints.meetsLatencyConstraint === true ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {candidate.constraints.meetsLatencyConstraint === true ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {candidate.constraints.meetsLatencyConstraint === true ? 'Satisfied' : 'Violated'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Perplexity / Quality Score (&ge; {candidate.qualityThreshold})</span>
              <span className={`font-semibold flex items-center gap-1 ${
                candidate.constraints.qualityThresholdSatisfied === true ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {candidate.constraints.qualityThresholdSatisfied === true ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {candidate.constraints.qualityThresholdSatisfied === true ? 'Satisfied' : 'Violated'}
              </span>
            </div>
          </div>
        </div>

        {/* Runtime Notes & Description */}
        <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-100 text-xs text-slate-600 mb-6">
          <div className="font-semibold text-slate-800 mb-1">Configuration Rationale</div>
          <p>{candidate.description}</p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#18213B] text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
