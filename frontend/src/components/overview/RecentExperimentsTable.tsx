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
    <div className="h-full p-3.5 rounded-2xl glass-panel flex flex-col justify-between select-none">
      <div>
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100/80">
          <h3 className="text-[13px] font-semibold text-[#18213B] tracking-tight">
            Recent Experiments
          </h3>
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-[#8174F5] hover:text-[#7162F3] flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100/80">
                <th className="pb-1.5 font-medium">ID</th>
                <th className="pb-1.5 font-medium">Model / Configuration</th>
                <th className="pb-1.5 font-medium">Objective</th>
                <th className="pb-1.5 font-medium">Result</th>
                <th className="pb-1.5 font-medium">Latency</th>
                <th className="pb-1.5 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {experiments.map((exp) => {
                const isSelected = exp.candidateId === selectedCandidateId;
                const isCompleted = exp.result === 'Completed';

                return (
                  <tr
                    key={exp.id}
                    onClick={() => onSelectExperiment?.(exp)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#EEEBFF]/70 hover:bg-[#EEEBFF]/90'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    <td className="py-2 font-mono text-[11px] font-semibold text-slate-700">
                      {exp.id}
                    </td>
                    <td className="py-2 text-[#18213B] font-medium">
                      {exp.model}{' '}
                      <span className="text-slate-400 font-normal">· {exp.configuration}</span>
                    </td>
                    <td className="py-2 text-slate-500 text-[11px]">{exp.objective}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isCompleted
                            ? 'bg-emerald-50/90 text-emerald-600 border-emerald-100/80'
                            : 'bg-amber-50/90 text-amber-600 border-amber-100/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500'
                          }`}
                        />
                        {exp.result}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-slate-700 font-medium text-[11px]">
                      {exp.latencyMs} ms
                    </td>
                    <td className="py-2 text-slate-400 text-right text-[11px]">
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
