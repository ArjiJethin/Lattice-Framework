import React, { useState } from 'react';
import {
  OptimizationCandidate,
  OptimizationConstraints,
  CandidateStatisticsTab,
} from '../../types/optimizationLab';
import { ParetoPlotView } from './ParetoPlotView';
import { PerformanceTableView } from './PerformanceTableView';
import { MetricsComparisonView } from './MetricsComparisonView';
import { ScatterChart, Table2, BarChart3, ChevronDown } from 'lucide-react';

interface CandidateStatisticsProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
  constraints: OptimizationConstraints;
}

export const CandidateStatistics: React.FC<CandidateStatisticsProps> = ({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  constraints,
}) => {
  const [activeTab, setActiveTab] = useState<CandidateStatisticsTab>('plot');

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Top Header Row with Title and View Controls matching screenshot */}
      <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-[#18213B] tracking-tight">
            2. Candidate Statistics
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Measured profiles for available configurations of the selected model.
          </p>
        </div>

        {/* Top Right: Axis & Color Selection Pills (Matching screenshot) */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 flex-wrap">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400">X:</span>
            <span>Memory Usage</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400">Y:</span>
            <span>Inference Latency</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400">Color:</span>
            <span>Quality Score</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* View Switcher Pill Tabs matching screenshot */}
      <div className="flex items-center gap-1.5 self-start bg-slate-100/80 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('plot')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'plot'
              ? 'bg-[#7C6AF2] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#18213B]'
          }`}
        >
          <ScatterChart className="w-3.5 h-3.5" />
          <span>Pareto Plot</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'table'
              ? 'bg-[#7C6AF2] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#18213B]'
          }`}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span>Performance Table</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'comparison'
              ? 'bg-[#7C6AF2] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#18213B]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Metrics Comparison</span>
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="w-full">
        {activeTab === 'plot' ? (
          <ParetoPlotView
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={onSelectCandidate}
            constraints={constraints}
          />
        ) : activeTab === 'table' ? (
          <PerformanceTableView
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={onSelectCandidate}
          />
        ) : (
          <MetricsComparisonView
            candidates={candidates}
            selectedCandidate={selectedCandidate}
          />
        )}
      </div>
    </div>
  );
};
