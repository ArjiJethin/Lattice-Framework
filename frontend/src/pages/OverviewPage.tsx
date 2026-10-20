import React from 'react';
import { LatticeCanvas } from '../components/lattice3d/LatticeCanvas';
import { ConfigurationSpaceLegend } from '../components/overview/ConfigurationSpaceLegend';
import { SelectedConfigurationInspector } from '../components/overview/SelectedConfigurationInspector';
import { CompactMetricsStrip } from '../components/overview/CompactMetricsStrip';
import { RecentExperimentsTable } from '../components/overview/RecentExperimentsTable';
import { PerformanceTrendsChart } from '../components/overview/PerformanceTrendsChart';
import { OverviewDataState } from '../lib/api/client';
import { ConfigurationCandidate } from '../types';
import {
  ChevronLeft,
  Search,
  Sparkles,
  Maximize2,
  ChevronDown,
  Minus,
  Square,
  X,
  Share2,
} from 'lucide-react';

interface OverviewPageProps {
  data: OverviewDataState;
  onViewCandidateDetails?: (candidate: ConfigurationCandidate) => void;
  onToggleFullscreen?: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  data,
  onViewCandidateDetails,
  onToggleFullscreen,
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
    refreshConnection,
  } = data;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto lg:overflow-hidden select-none">
      {/* 
        UPPER WORKSPACE:
        Full-bleed 3D architectural landscape background with floating UI overlays.
        NO rounded corners or border on the 3D scene!
      */}
      <div className="relative w-full h-[530px] lg:h-[550px] xl:h-[570px] shrink-0 overflow-hidden">
        {/* 1. Underlying 3D Lattice Canvas extending across the entire upper section */}
        <div className="absolute inset-0">
          <LatticeCanvas
            candidates={candidates}
            selectedCandidateId={selectedCandidate.id}
            onSelectCandidate={selectCandidate}
          />
        </div>

        {/* 2. Top-Left Floating Header: Breadcrumbs, Title, Subtitle & Configuration Space Legend */}
        <div className="absolute top-4 left-6 z-20 flex flex-col pointer-events-none">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1 pointer-events-auto">
            <button className="flex items-center gap-1 hover:text-[#18213B] transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full border border-slate-400 inline-block" />
              <span>Overview</span>
            </button>
          </div>

          {/* Heading & Subtitle */}
          <h1 className="text-2xl font-extrabold text-[#18213B] tracking-tight">
            System Overview
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5 max-w-md">
            Live view of your models, resources and optimization experiments.
          </p>

          {/* Configuration Space Legend floating directly below subtitle */}
          <div className="mt-3.5 pointer-events-auto">
            <ConfigurationSpaceLegend
              stats={stats}
              isDemoMode={backendState.isDemoMode}
            />
          </div>
        </div>

        {/* 3. Top-Right Floating Controls & Selected Configuration Inspector */}
        <div className="absolute top-4 right-6 z-20 flex flex-col items-end pointer-events-none gap-2">
          {/* Top Bar: Connection Pill, Search, Sparkles, and Window Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Live Backend Connection Pill */}
            <button
              onClick={refreshConnection}
              title={
                backendState.connected
                  ? `Connected to ${backendState.service} (${backendState.endpoint})`
                  : `Backend unreachable (${backendState.error || 'Offline'}). Click to retry.`
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 shadow-sm ${
                backendState.connected
                  ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                  : 'bg-amber-50/90 text-amber-800 border-amber-200/80 hover:bg-amber-100'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendState.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="font-bold">
                  {backendState.connected ? 'Backend Connected' : 'Demo Mode'}
                </span>
                <span className="font-mono text-[10px] opacity-75 font-normal">
                  {backendState.endpoint}
                </span>
              </div>
            </button>

            {/* Search Button */}
            <button
              title="Search"
              className="p-1.5 rounded-xl glass-panel text-slate-500 hover:text-[#18213B] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Sparkles / Notifications Button */}
            <button
              title="Optimization Assistant"
              className="p-1.5 rounded-xl glass-panel text-[#8174F5] hover:text-[#7162F3] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            {/* Window Controls */}
            <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-slate-300/60">
              <button
                title="Minimize"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#18213B] hover:bg-white/80 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                title="Maximize"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#18213B] hover:bg-white/80 transition-colors"
              >
                <Square className="w-3 h-3" />
              </button>
              <button
                title="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* View Mode Dropdown & Fullscreen right above Selected Configuration */}
          <div className="flex items-center gap-2 pointer-events-auto mt-0.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-panel text-xs font-medium text-slate-700 shadow-sm">
              <span className="text-slate-400 text-[11px]">View</span>
              <button className="flex items-center gap-1 font-semibold text-[#18213B] hover:text-[#8174F5] transition-colors">
                <Share2 className="w-3 h-3 text-[#8174F5]" />
                <span>Lattice Topology</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <button
              onClick={onToggleFullscreen}
              title="Expand Fullscreen"
              className="p-1.5 rounded-xl glass-panel text-slate-500 hover:text-[#18213B] transition-colors shadow-sm"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Selected Configuration Inspector: Floating card over 3D scene on the right */}
          <div className="pointer-events-auto mt-1 w-[340px] xl:w-[360px]">
            <SelectedConfigurationInspector
              candidate={selectedCandidate}
              onViewDetails={onViewCandidateDetails}
            />
          </div>
        </div>
      </div>

      {/* 
        LOWER ANALYTICAL SECTION:
        Sits directly below the 3D workspace.
        Left: Metric Strip + Recent Experiments Table
        Right: Performance Trends Graph (aligned directly below Selected Configuration)
      */}
      <div className="px-6 py-3 flex-1 flex flex-col lg:flex-row gap-3.5 min-h-[250px]">
        {/* Left: Metrics & Recent Experiments */}
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

        {/* Right: Performance Trends (aligned underneath Selected Configuration) */}
        <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 flex flex-col">
          <PerformanceTrendsChart trendData={performanceTrends} />
        </div>
      </div>
    </div>
  );
};
