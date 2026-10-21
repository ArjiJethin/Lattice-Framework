import React, { useState } from 'react';
import { ExperimentItem } from '../../types';
import {
  ArrowRight,
  FlaskConical,
  X,
  XCircle,
} from 'lucide-react';

interface RecentExperimentsTableProps {
  experiments: ExperimentItem[];
  selectedCandidateId?: string;
  onSelectExperiment?: (experiment: ExperimentItem) => void;
  onViewAll?: () => void;
}

export const RecentExperimentsTable: React.FC<RecentExperimentsTableProps> = ({
  experiments,
  selectedCandidateId,
  onSelectExperiment,
  onViewAll,
}) => {
  const [detailModalItem, setDetailModalItem] = useState<ExperimentItem | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F4EA] text-[#137333]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Completed
          </span>
        );
      case 'Running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366F1] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6366F1]" />
            </span>
            Running
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEE2E2] text-[#991B1B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            Failed
          </span>
        );
      case 'Partial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3C7] text-[#B45309]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status}
          </span>
        );
    }
  };

  return (
    <>
      <div className="p-4 rounded-[20px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col select-none">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[13.5px] font-bold text-[#18213B] tracking-tight">
                Recent Experiments
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {experiments.length} runs
              </span>
            </div>

            {onViewAll && (
              <button
                onClick={onViewAll}
                className="text-[11px] font-semibold text-[#7C6AF2] hover:text-[#6854E8] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-[#F5F3FF]"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1 min-h-0">
            {experiments.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <FlaskConical className="w-5 h-5 text-slate-300 stroke-[1.5] mb-1" />
                <span className="text-xs font-semibold text-slate-500">No recent experiments</span>
                <span className="text-[10.5px] text-slate-400">
                  Run an optimization plan or benchmark to populate experiment history.
                </span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="text-slate-500 font-medium text-[10px] bg-slate-100/60 sticky top-0">
                    <th className="py-1 px-2.5 rounded-l-lg font-medium">ID</th>
                    <th className="py-1 px-2 font-medium">Model / Configuration</th>
                    <th className="py-1 px-2 font-medium">Objective</th>
                    <th className="py-1 px-2 font-medium">Result</th>
                    <th className="py-1 px-2 font-medium">Latency</th>
                    <th className="py-1 px-2.5 rounded-r-lg font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {experiments.map((exp) => {
                    const isSelected = exp.candidateId === selectedCandidateId;

                    return (
                      <tr
                        key={exp.id}
                        onClick={() => {
                          onSelectExperiment?.(exp);
                        }}
                        onDoubleClick={() => setDetailModalItem(exp)}
                        title="Click to select candidate on lattice. Double-click for run details."
                        className={`cursor-pointer transition-colors group ${
                          isSelected ? 'bg-[#F5F3FF]/80 font-medium' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-1.5 px-2.5 text-[11px] font-mono text-slate-600">
                          {exp.id}
                        </td>
                        <td className="py-1.5 px-2 text-[11px] font-bold text-[#18213B]">
                          <span className="group-hover:text-[#7C6AF2] transition-colors">
                            {exp.model} · {exp.configuration}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-500 text-[11px]">
                          {exp.objective}
                        </td>
                        <td className="py-1.5 px-2">
                          {getStatusBadge(exp.result)}
                        </td>
                        <td className="py-1.5 px-2 text-slate-700 font-medium text-[11px]">
                          {exp.latencyMs !== null ? `${exp.latencyMs} ms` : '—'}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                          {exp.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Inspect Experiment Details Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#7C6AF2]" />
                <h3 className="text-sm font-bold text-[#18213B]">
                  Experiment Details · {detailModalItem.id}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Configuration</span>
                <span className="font-bold text-[#18213B]">
                  {detailModalItem.model} ({detailModalItem.configuration})
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Objective</span>
                <span className="font-semibold text-slate-700">{detailModalItem.objective}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Execution Result</span>
                {getStatusBadge(detailModalItem.result)}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-[10px] text-slate-400 block">Measured Latency</span>
                  <span className="text-sm font-bold text-[#18213B]">
                    {detailModalItem.latencyMs !== null ? `${detailModalItem.latencyMs} ms` : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-[10px] text-slate-400 block">Throughput</span>
                  <span className="text-sm font-bold text-[#18213B]">
                    {detailModalItem.throughputToks ? `${detailModalItem.throughputToks} tok/s` : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-[10px] text-slate-400 block">Quality Score</span>
                  <span className="text-sm font-bold text-[#18213B]">
                    {detailModalItem.qualityScore ? `${detailModalItem.qualityScore}/100` : '—'}
                  </span>
                </div>
              </div>

              {detailModalItem.errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-800 text-[11px] flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Execution Error</span>
                    <span>{detailModalItem.errorMessage}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Recorded on: {detailModalItem.date}</span>
                {detailModalItem.candidateId && (
                  <span className="font-mono text-[#7C6AF2]">
                    Linked Node: {detailModalItem.candidateId}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              {detailModalItem.candidateId && onSelectExperiment && (
                <button
                  onClick={() => {
                    onSelectExperiment(detailModalItem);
                    setDetailModalItem(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#F5F3FF] text-[#7C6AF2] font-semibold text-xs hover:bg-[#EDE9FE] transition-colors"
                >
                  Focus on Lattice
                </button>
              )}
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-1.5 rounded-lg bg-[#7C6AF2] text-white font-medium text-xs hover:bg-[#6854E8] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};