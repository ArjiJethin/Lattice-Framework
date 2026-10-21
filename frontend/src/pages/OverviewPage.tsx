import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LatticeCanvas } from '../components/lattice3d/LatticeCanvas';
import { ConfigurationSpaceLegend } from '../components/overview/ConfigurationSpaceLegend';
import { SelectedConfigurationInspector } from '../components/overview/SelectedConfigurationInspector';
import { CompactMetricsStrip } from '../components/overview/CompactMetricsStrip';
import { RecentExperimentsTable } from '../components/overview/RecentExperimentsTable';
import { PerformanceTrendsChart } from '../components/overview/PerformanceTrendsChart';
import { OverviewDataState } from '../lib/api/client';
import { ConfigurationCandidate } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';
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
  Check,
  Cpu,
  Zap,
} from 'lucide-react';

interface OverviewPageProps {
  data: OverviewDataState;
  onViewCandidateDetails?: (candidate: ConfigurationCandidate) => void;
  onToggleFullscreen?: () => void;
  onNavigate?: (key: NavItemKey) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  data,
  onViewCandidateDetails,
  onToggleFullscreen,
  onNavigate,
}) => {
  const {
    candidates,
    selectedCandidate,
    selectCandidate,
    selectNextCandidate,
    selectPrevCandidate,
    candidateFilter,
    setCandidateFilter,
    stats,
    metrics,
    experiments,
    performanceTrends,
    backendState,
    refreshConnection,
  } = data;

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation across candidates (Arrow Left / Right, Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === 'Escape') {
          setShowSearchModal(false);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectNextCandidate();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectPrevCandidate();
      } else if (e.key === 'Enter') {
        if (selectedCandidate) {
          e.preventDefault();
          onViewCandidateDetails?.(selectedCandidate);
        }
      } else if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowViewDropdown(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNextCandidate, selectPrevCandidate, selectedCandidate, onViewCandidateDetails]);

  // Close view dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) {
        setShowViewDropdown(false);
      }
    };
    if (showViewDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showViewDropdown]);

  // Focus search input on open
  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [showSearchModal]);

  // Filter candidates for quick search modal
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.modelName.toLowerCase().includes(q) ||
        c.quantization.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  // View mode label
  const viewModeLabel = useMemo(() => {
    switch (candidateFilter) {
      case 'feasible':
        return 'Feasible Only';
      case 'pareto':
        return 'Pareto Optimal';
      default:
        return 'Lattice Topology';
    }
  }, [candidateFilter]);

  return (
    <div className="w-full min-h-full flex flex-col select-none pb-14">
      {/* 
        UPPER WORKSPACE:
        Full-bleed 3D architectural landscape background with floating UI overlays.
        Scaled to leave bottom 18% of visible viewport for inference summary & analytical section.
      */}
      <div className="relative w-full h-[82vh] min-h-[480px] shrink-0 overflow-hidden">
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
          <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-400 mb-1 pointer-events-auto">
            <button className="flex items-center gap-1 hover:text-[#18213B] transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full border border-slate-400 inline-block" />
              <span>Overview</span>
            </button>
          </div>

          {/* Heading & Subtitle */}
          <h1 className="text-2xl lg:text-[26px] font-extrabold text-[#18213B] tracking-tight leading-tight">
            System Overview
          </h1>
          <p className="text-[12.5px] text-slate-500 font-normal mt-0.5 max-w-lg">
            Live view of your models, resources and optimization experiments.
          </p>

          {/* Configuration Space Legend floating directly below subtitle */}
          <div className="mt-3 pointer-events-auto">
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
              <div className="flex items-center gap-1.5 text-[11.5px]">
                <span className="font-bold">
                  {backendState.connected ? 'Backend Connected' : 'Demo Mode'}
                </span>
                <span className="font-mono text-[10.5px] opacity-75 font-normal">
                  {backendState.endpoint}
                </span>
              </div>
            </button>

            {/* Quick Candidate Search Button */}
            <button
              onClick={() => setShowSearchModal(true)}
              title="Search Candidates (Ctrl+K)"
              className="p-1.5 rounded-xl glass-panel text-slate-500 hover:text-[#18213B] transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Optimization Recommendation Assistant */}
            <button
              onClick={() => {
                const optimal =
                  candidates.find((c) => c.nodeRole === 'optimizer') ||
                  candidates.find((c) => c.status === 'feasible');
                if (optimal) selectCandidate(optimal.id);
              }}
              title="Focus Recommended Optimal Configuration"
              className="p-1.5 rounded-xl glass-panel text-[#8174F5] hover:text-[#7162F3] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Window Controls */}
            <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-slate-300/60">
              <button
                title="Minimize Window"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#18213B] hover:bg-white/80 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={onToggleFullscreen}
                title="Toggle Window Fullscreen"
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
            <div className="relative" ref={viewDropdownRef}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel text-[12px] font-medium text-slate-700 shadow-sm">
                <span className="text-slate-400 text-[11px]">View</span>
                <button
                  onClick={() => setShowViewDropdown(!showViewDropdown)}
                  className="flex items-center gap-1 font-semibold text-[#18213B] hover:text-[#8174F5] transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#8174F5]" />
                  <span>{viewModeLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {showViewDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white shadow-lg border border-slate-200/90 py-1 z-50 text-[11px]">
                  <button
                    onClick={() => {
                      setCandidateFilter('all');
                      setShowViewDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors ${
                      candidateFilter === 'all'
                        ? 'bg-[#F3F0FF] text-[#7C6AF2] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Lattice Topology (All)</span>
                    {candidateFilter === 'all' && <Check className="w-3 h-3 text-[#7C6AF2]" />}
                  </button>
                  <button
                    onClick={() => {
                      setCandidateFilter('feasible');
                      setShowViewDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors ${
                      candidateFilter === 'feasible'
                        ? 'bg-[#F3F0FF] text-[#7C6AF2] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Feasible Only</span>
                    {candidateFilter === 'feasible' && (
                      <Check className="w-3 h-3 text-[#7C6AF2]" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setCandidateFilter('pareto');
                      setShowViewDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors ${
                      candidateFilter === 'pareto'
                        ? 'bg-[#F3F0FF] text-[#7C6AF2] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Pareto Optimal</span>
                    {candidateFilter === 'pareto' && (
                      <Check className="w-3 h-3 text-[#7C6AF2]" />
                    )}
                  </button>
                </div>
              )}
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
          <div className="pointer-events-auto mt-1 w-[330px] xl:w-[350px]">
            <SelectedConfigurationInspector
              candidate={selectedCandidate}
              onViewDetails={onViewCandidateDetails}
            />
          </div>
        </div>
      </div>

      {/* 
        LOWER ANALYTICAL SECTION:
        Sits directly below the 3D workspace with natural height and vertical flow.
        Left: Metric Strip + Recent Experiments Table
        Right: Performance Trends Graph (aligned directly below Selected Configuration)
      */}
      <div className="px-6 py-3 w-full flex flex-col lg:flex-row gap-4 shrink-0">
        {/* Left: Metrics & Recent Experiments */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <CompactMetricsStrip
            metrics={metrics}
            historicalPoints={performanceTrends.points}
            dataSourceLabel={data.dataSourceLabel}
          />
          <div>
            <RecentExperimentsTable
              experiments={experiments}
              selectedCandidateId={selectedCandidate.id}
              onSelectExperiment={(exp) => {
                if (exp.candidateId) {
                  selectCandidate(exp.candidateId);
                }
              }}
              onViewAll={() => onNavigate?.('experiments')}
            />
          </div>
        </div>

        {/* Right: Performance Trends (aligned underneath Selected Configuration) */}
        <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 flex flex-col">
          <PerformanceTrendsChart
            trendData={performanceTrends}
            currentTimeRange={data.timeRange}
            onRangeChange={data.setTimeRange}
            isLoading={data.isLoading}
          />
        </div>
      </div>

      {/* Quick Candidate Search Modal (Ctrl+K) */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by ID, model, quantization..."
                className="w-full text-xs text-[#18213B] placeholder-slate-400 outline-none bg-transparent"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching candidates found for "{searchQuery}".
                </div>
              ) : (
                searchResults.map((cand) => {
                  const isCurrent = cand.id === selectedCandidate.id;
                  return (
                    <button
                      key={cand.id}
                      onClick={() => {
                        selectCandidate(cand.id);
                        setShowSearchModal(false);
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between rounded-xl transition-colors ${
                        isCurrent ? 'bg-[#F5F3FF]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#18213B]">
                            {cand.modelName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-semibold bg-slate-100 text-slate-700">
                            {cand.quantization}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10.5px] text-slate-500 mt-1 font-mono">
                          <span>{cand.id}</span>
                          {cand.inferenceLatencyMs !== null && (
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <Zap className="w-2.5 h-2.5" />
                              {cand.inferenceLatencyMs} ms
                            </span>
                          )}
                          {cand.memoryUsageGb !== null && (
                            <span className="flex items-center gap-0.5 text-indigo-600">
                              <Cpu className="w-2.5 h-2.5" />
                              {cand.memoryUsageGb.toFixed(1)} GB
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold capitalize ${
                            cand.nodeRole === 'optimizer' || cand.status === 'feasible'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cand.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : cand.status === 'evaluating'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cand.status}
                        </span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#7C6AF2]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[10.5px] text-slate-400 flex justify-between items-center px-4">
              <span>Use arrow keys to cycle · Press Enter to inspect</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9.5px] text-slate-500 font-mono">
                ESC
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
