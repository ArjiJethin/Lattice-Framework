import React from 'react';
import { LatticeCanvas } from '../components/lattice3d/LatticeCanvas';
import { ConfigurationSpaceLegend } from '../components/overview/ConfigurationSpaceLegend';
import { SelectedConfigurationInspector } from '../components/overview/SelectedConfigurationInspector';
import { CompactMetricsStrip } from '../components/overview/CompactMetricsStrip';
import { RecentExperimentsTable } from '../components/overview/RecentExperimentsTable';
import { PerformanceTrendsChart } from '../components/overview/PerformanceTrendsChart';
import { OverviewDataState } from '../lib/api/client';
import { ConfigurationCandidate } from '../types';

interface OverviewPageProps {
  data: OverviewDataState;
  onViewCandidateDetails?: (candidate: ConfigurationCandidate) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  data,
  onViewCandidateDetails,
}) => {
  const {
    candidates,
    selectedCandidate,
    selectCandidate,
    stats,
    metrics,
    experiments,
    performanceTrends,
    backendState,
  } = data;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 px-5 py-3.5 gap-3.5 overflow-y-auto lg:overflow-hidden select-none">
      {/* Top Row: 3D Lattice Canvas (Left) + Selected Configuration (Right) */}
      <div className="flex-1 min-h-[380px] lg:min-h-[400px] flex flex-col lg:flex-row gap-3.5">
        {/* 3D Scene Hero Workspace */}
        <div className="flex-1 min-w-0 relative rounded-2xl overflow-hidden glass-panel">
          {/* Floating Configuration Space Legend */}
          <ConfigurationSpaceLegend
            stats={stats}
            isDemoMode={backendState.isDemoMode}
          />

          {/* 3D Three.js Scene */}
          <LatticeCanvas
            candidates={candidates}
            selectedCandidateId={selectedCandidate.id}
            onSelectCandidate={selectCandidate}
          />
        </div>

        {/* Selected Configuration Inspector (Right Top) */}
        <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 flex flex-col">
          <SelectedConfigurationInspector
            candidate={selectedCandidate}
            onViewDetails={onViewCandidateDetails}
          />
        </div>
      </div>

      {/* Bottom Row: Metrics Strip + Recent Experiments (Left) + Performance Trends (Right) */}
      <div className="h-[280px] shrink-0 flex flex-col lg:flex-row gap-3.5">
        {/* Bottom Left: Metrics + Recent Experiments */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <CompactMetricsStrip metrics={metrics} />
          <div className="flex-1 min-h-0">
            <RecentExperimentsTable
              experiments={experiments}
              selectedCandidateId={selectedCandidate.id}
              onSelectExperiment={(exp) => {
                if (exp.candidateId) {
                  selectCandidate(exp.candidateId);
                }
              }}
            />
          </div>
        </div>

        {/* Bottom Right: Performance Trends Chart */}
        <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 flex flex-col">
          <PerformanceTrendsChart trendData={performanceTrends} />
        </div>
      </div>
    </div>
  );
};
