import React, { useState } from 'react';
import { ExperimentItem } from '../../types';
import { Button, StatusBadge } from '../ui/primitives';
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <StatusBadge tone="success">Completed</StatusBadge>;
      case 'Running':
        return (
          <StatusBadge tone="info" pulse>
            Running
          </StatusBadge>
        );
      case 'Failed':
        return <StatusBadge tone="danger">Failed</StatusBadge>;
      case 'Partial':
        return <StatusBadge tone="warning">Partial</StatusBadge>;
      default:
        return <StatusBadge tone="neutral">{status}</StatusBadge>;
    }
  };

  return (
    <>
      <div className="p-4 rounded-lg bg-white border border-[#D9DEE7] shadow-2xs flex flex-col select-none">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E6EAF0]">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[#222938] tracking-tight">
              Recent Experiments
            </h3>
            <span className="text-[11px] text-[#647187] font-mono tabular-nums">
              ({experiments.length})
            </span>
          </div>

          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-[12px] font-semibold text-[#7562E8] hover:text-[#634FDB] flex items-center gap-1 transition-colors px-2 py-0.5 rounded-sm hover:bg-[#F2F0FD] cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {experiments.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-[#647187] bg-[#F8F9FB] rounded-md border border-dashed border-[#D9DEE7]">
              <FlaskConical className="w-5 h-5 text-[#8A94A6] stroke-[1.5] mb-1" />
              <span className="text-[12.5px] font-semibold text-[#222938]">
                No recent experiments
              </span>
              <span className="text-[11.5px] text-[#647187]">
                Run an optimization plan or benchmark to populate experiment history.
              </span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="text-[#647187] font-semibold text-[11px] bg-[#F8F9FB] border-y border-[#E6EAF0]">
                  <th className="py-2 px-2.5 font-semibold">ID</th>
                  <th className="py-2 px-2 font-semibold">Model / Configuration</th>
                  <th className="py-2 px-2 font-semibold">Objective</th>
                  <th className="py-2 px-2 font-semibold">Result</th>
                  <th className="py-2 px-2 font-semibold text-right">Latency</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF0]">
                {experiments.map((exp) => {
                  const isSelected = exp.candidateId === selectedCandidateId;

                  return (
                    <tr
                      key={exp.id}
                      onClick={() => onSelectExperiment?.(exp)}
                      onDoubleClick={() => setDetailModalItem(exp)}
                      title="Click to select candidate on lattice. Double-click for run details."
                      className={`cursor-pointer transition-colors group ${isSelected ? 'bg-[#F2F0FD]' : 'hover:bg-[#F8F9FB]'
                        }`}
                    >
                      <td className="py-2 px-2.5 text-[11.5px] font-mono text-[#647187]">
                        {exp.id}
                      </td>
                      <td className="py-2 px-2 text-[12.5px] font-semibold text-[#222938]">
                        <span className="group-hover:text-[#7562E8] transition-colors">
                          {exp.model}
                        </span>
                        <span className="text-[#647187] font-mono font-normal text-[11.5px] ml-1.5">
                          · {exp.configuration}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[#647187] text-[12px]">
                        {exp.objective}
                      </td>
                      <td className="py-2 px-2">
                        {renderStatusBadge(exp.result)}
                      </td>
                      <td className="py-2 px-2 text-[#222938] font-mono font-semibold text-[12px] text-right tabular-nums">
                        {exp.latencyMs !== null ? `${exp.latencyMs} ms` : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-[#647187] text-[11.5px] text-right whitespace-nowrap tabular-nums">
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

      {/* Inspect Experiment Details Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-[#222938]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-glass border border-[#D9DEE7] p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0]">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#7562E8]" />
                <h3 className="text-[14px] font-semibold text-[#222938]">
                  Experiment Details · <span className="font-mono">{detailModalItem.id}</span>
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close Modal"
                onClick={() => setDetailModalItem(null)}
                className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-[12.5px]">
              <div className="flex justify-between items-center py-1.5 border-b border-[#E6EAF0]">
                <span className="text-[#647187]">Configuration</span>
                <span className="font-semibold text-[#222938]">
                  {detailModalItem.model}{' '}
                  <span className="font-mono text-[11.5px] text-[#647187]">
                    ({detailModalItem.configuration})
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-[#E6EAF0]">
                <span className="text-[#647187]">Objective</span>
                <span className="font-medium text-[#222938]">{detailModalItem.objective}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-[#E6EAF0]">
                <span className="text-[#647187]">Execution Result</span>
                {renderStatusBadge(detailModalItem.result)}
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-center">
                  <span className="text-[11px] text-[#647187] block">Measured Latency</span>
                  <span className="text-[14px] font-mono font-semibold text-[#222938] tabular-nums mt-0.5 block">
                    {detailModalItem.latencyMs !== null ? `${detailModalItem.latencyMs} ms` : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-center">
                  <span className="text-[11px] text-[#647187] block">Throughput</span>
                  <span className="text-[14px] font-mono font-semibold text-[#222938] tabular-nums mt-0.5 block">
                    {detailModalItem.throughputToks ? `${detailModalItem.throughputToks} tok/s` : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-center">
                  <span className="text-[11px] text-[#647187] block">Quality Score</span>
                  <span className="text-[14px] font-mono font-semibold text-[#222938] tabular-nums mt-0.5 block">
                    {detailModalItem.qualityScore ? `${detailModalItem.qualityScore}/100` : '—'}
                  </span>
                </div>
              </div>

              {detailModalItem.errorMessage && (
                <div className="p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[12px] flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Execution Error</span>
                    <span>{detailModalItem.errorMessage}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-[11.5px] text-[#647187] pt-1">
                <span>Recorded: {detailModalItem.date}</span>
                {detailModalItem.candidateId && (
                  <span className="font-mono text-[#222938]">
                    Node: {detailModalItem.candidateId}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6EAF0] flex justify-end gap-2">
              {detailModalItem.candidateId && onSelectExperiment && (
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    onSelectExperiment(detailModalItem);
                    setDetailModalItem(null);
                  }}
                >
                  Focus on Lattice
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailModalItem(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};