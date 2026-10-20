import React from 'react';
import { ExperimentItem } from '../../types';
import { ArrowRight } from 'lucide-react';

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
  return (
    <div className="h-full p-3.5 rounded-[18px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between select-none">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13.5px] font-bold text-[#18213B] tracking-tight">
            Recent Experiments
          </h3>
          <button
            onClick={onViewAll}
            className="text-[11px] font-semibold text-[#7C6AF2] hover:text-[#6854E8] flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="text-slate-500 font-medium text-[10px] bg-slate-100/60">
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
                const isCompleted = exp.result === 'Completed';

                return (
                  <tr
                    key={exp.id}
                    onClick={() => onSelectExperiment?.(exp)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#F5F3FF]/70' : 'hover:bg-slate-50/70'
                      }`}
                  >
                    <td className="py-1.5 px-2.5 text-[11px] font-medium text-slate-600">
                      {exp.id}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] font-bold text-[#18213B]">
                      {exp.model} · {exp.configuration}
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 text-[11px]">
                      {exp.objective}
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isCompleted
                            ? 'bg-[#E6F4EA] text-[#137333]'
                            : 'bg-[#FEF3C7] text-[#B45309]'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                            }`}
                        />
                        {exp.result}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-700 font-medium text-[11px]">
                      {exp.latencyMs} ms
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-500 text-[11px]">
                      {exp.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};