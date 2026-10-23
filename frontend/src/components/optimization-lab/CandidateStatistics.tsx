import React, { useState, useMemo } from 'react';
import {
  OptimizationCandidate,
  OptimizationConstraints,
  CandidateStatisticsTab,
} from '../../types/optimizationLab';
import { ParetoPlotView } from './ParetoPlotView';
import { PerformanceTableView } from './PerformanceTableView';
import { MetricsComparisonView } from './MetricsComparisonView';
import { SegmentedTabs, StatusBadge } from '../ui/primitives';
import { ScatterChart, Table2, BarChart3 } from 'lucide-react';

interface CandidateStatisticsProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
  recommendedCandidateId: string | null;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
  constraints: OptimizationConstraints;
}

export const CandidateStatistics: React.FC<CandidateStatisticsProps> = ({
  candidates,
  selectedCandidate,
  recommendedCandidateId,
  onSelectCandidate,
  constraints,
}) => {
  const [activeTab, setActiveTab] = useState<CandidateStatisticsTab>('plot');

  const counts = useMemo(() => {
    const activeModelCands = candidates.filter((c) => c.isCurrentModelVariant);
    return {
      total: activeModelCands.length,
      feasible: activeModelCands.filter((c) => c.status === 'feasible').length,
      nearFeasible: activeModelCands.filter((c) => c.status === 'near_feasible').length,
      rejected: activeModelCands.filter((c) => c.status === 'rejected').length,
      unprofiled: activeModelCands.filter((c) => c.status === 'unprofiled').length,
    };
  }, [candidates]);

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-3">
      {/* Header & Feasibility Summary Pills */}
      <div className="flex items-start justify-between pb-2.5 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#222938] tracking-tight">
            2. Candidate Analysis &amp; Trade-Offs
          </h2>
          <p className="text-[12px] text-[#647187] mt-0.5">
            Inspect memory, latency, throughput, and quality trade-offs across configurations.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge tone="success">
            <span className="font-mono tabular-nums">{counts.feasible}</span> Feasible
          </StatusBadge>
          {counts.nearFeasible > 0 && (
            <StatusBadge tone="warning">
              <span className="font-mono tabular-nums">{counts.nearFeasible}</span> Near
            </StatusBadge>
          )}
          <StatusBadge tone="danger">
            <span className="font-mono tabular-nums">{counts.rejected}</span> Rejected
          </StatusBadge>
          <StatusBadge tone="neutral">
            <span className="font-mono tabular-nums">{counts.unprofiled}</span> Unprofiled
          </StatusBadge>
        </div>
      </div>

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SegmentedTabs
          value={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          options={[
            {
              id: 'plot',
              label: 'Pareto Plot',
              icon: <ScatterChart className="w-3.5 h-3.5" />,
            },
            {
              id: 'table',
              label: 'Performance Table',
              icon: <Table2 className="w-3.5 h-3.5" />,
              count: counts.total,
            },
            {
              id: 'comparison',
              label: 'Metrics Comparison',
              icon: <BarChart3 className="w-3.5 h-3.5" />,
            },
          ]}
        />

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#647187]">
          <span className="px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] tabular-nums">
            Budget ≤ {constraints.maxMemoryGb.toFixed(1)} GB
          </span>
          <span className="px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] tabular-nums">
            Limit ≤ {constraints.maxLatencyMs} ms
          </span>
          <span className="px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] tabular-nums">
            Quality ≥ {constraints.minQualityScore}
          </span>
        </div>
      </div>

      {/* Active View Body */}
      <div className="w-full">
        {activeTab === 'plot' ? (
          <ParetoPlotView
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            recommendedCandidateId={recommendedCandidateId}
            onSelectCandidate={onSelectCandidate}
            constraints={constraints}
          />
        ) : activeTab === 'table' ? (
          <PerformanceTableView
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            recommendedCandidateId={recommendedCandidateId}
            onSelectCandidate={onSelectCandidate}
            constraints={constraints}
          />
        ) : (
          <MetricsComparisonView
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            recommendedCandidateId={recommendedCandidateId}
            constraints={constraints}
            onSelectCandidate={onSelectCandidate}
          />
        )}
      </div>
    </div>
  );
};