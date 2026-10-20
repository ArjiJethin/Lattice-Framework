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
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {/* Upper Area: 3D Lattice Hero Workspace + Selected Configuration Inspector */}
      <section className="flex flex-col lg:flex-row gap-4 items-stretch min-h-[460px]">
        {/* 3D Scene Container (takes ~65% on desktop) */}
        <div className="relative flex-1 min-h-[460px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-card">
          {/* Floating Configuration Space Legend */}
          <ConfigurationSpaceLegend
            stats={stats}
            isDemoMode={backendState.isDemoMode}
          />

          {/* Genuine 3D Lattice Canvas */}
          <LatticeCanvas
            candidates={candidates}
            selectedCandidateId={selectedCandidate.id}
            onSelectCandidate={selectCandidate}
          />
        </div>

        {/* Selected Configuration Inspector (docked on right) */}
        <SelectedConfigurationInspector
          candidate={selectedCandidate}
          onViewDetails={onViewCandidateDetails}
        />
      </section>

      {/* Lower Area: Analytics, Metrics & Recent Experiments */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Metric Strip + Recent Experiments Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
          <CompactMetricsStrip metrics={metrics} />
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

        {/* Right Column: Performance Trends ECharts (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <PerformanceTrendsChart trendData={performanceTrends} />
        </div>
      </section>
    </div>
  );
};
