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
import { StatusBadge } from '../components/ui/primitives';
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
    filteredCandidates,
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

  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [showSearchModal]);

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
    <div className="w-full min-h-full flex flex-col select-none pb-12">
      {/* UPPER WORKSPACE: 3D Topology Canvas + Floating Engineering Overlays */}
      <div className="relative w-full h-[80vh] min-h-[480px] shrink-0 overflow-hidden">
        <div className="absolute inset-0">
          <LatticeCanvas
            candidates={filteredCandidates}
            selectedCandidateId={selectedCandidate.id}
            onSelectCandidate={selectCandidate}
          />
        </div>

        {/* Top-Left Floating Header & Configuration Space Legend */}
        <div className="absolute top-4 left-6 z-20 flex flex-col pointer-events-none">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#647187] mb-1 pointer-events-auto">
            <button
              type="button"
              className="flex items-center gap-1 hover:text-[#222938] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          </div>

          <h1 className="text-[26px] font-semibold text-[#222938] tracking-tight leading-tight">
            System Overview
          </h1>
          <p className="text-[13px] text-[#647187] font-normal mt-0.5 max-w-lg">
            Live view of your models, resources and optimization experiments.
          </p>

          <div className="mt-3 pointer-events-auto">
            <ConfigurationSpaceLegend
              stats={stats}
              isDemoMode={backendState.isDemoMode}
            />
          </div>
        </div>

        {/* Top-Right Floating Controls & Selected Configuration Inspector */}
        <div className="absolute top-4 right-6 z-20 flex flex-col items-end pointer-events-none gap-2">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Live Backend Connection Button */}
            <button
              type="button"
              onClick={refreshConnection}
              title={
                backendState.connected
                  ? `Connected to ${backendState.service} (${backendState.endpoint})`
                  : `Backend unreachable (${backendState.error || 'Offline'}). Click to retry.`
              }
              className={`flex items-center gap-2 h-7 px-2.5 rounded-md text-[11.5px] font-medium border transition-colors cursor-pointer ${backendState.connected
                  ? 'bg-[#ECFDF5] text-[#0D8A58] border-[#A7F3D0] hover:bg-[#D1FAE5]'
                  : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] hover:bg-[#FEF3C7]'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${backendState.connected ? 'bg-[#0D8A58]' : 'bg-[#D97706]'
                  }`}
              />
              <span className="font-semibold">
                {backendState.connected ? 'Backend Connected' : 'Demo Mode'}
              </span>
              <span className="font-mono text-[11px] opacity-85">
                {backendState.endpoint}
              </span>
            </button>

            {/* Quick Candidate Search Button */}
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              aria-label="Search Candidates (Ctrl+K)"
              title="Search Candidates (Ctrl+K)"
              className="h-7 w-7 rounded-md bg-white/95 border border-[#D9DEE7] flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-white transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Focus Optimal Configuration Button */}
            <button
              type="button"
              onClick={() => {
                const optimal =
                  candidates.find((c) => c.nodeRole === 'optimizer') ||
                  candidates.find((c) => c.status === 'feasible');
                if (optimal) selectCandidate(optimal.id);
              }}
              aria-label="Focus Recommended Optimal Configuration"
              title="Focus Recommended Optimal Configuration"
              className="h-7 w-7 rounded-md bg-white/95 border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] hover:bg-[#F2F0FD] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            {/* Window Controls */}
            <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-[#D9DEE7]">
              <button
                type="button"
                aria-label="Minimize Window"
                title="Minimize Window"
                className="h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-white/80 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                aria-label="Toggle Window Fullscreen"
                title="Toggle Window Fullscreen"
                className="h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-white/80 transition-colors"
              >
                <Square className="w-3 h-3" />
              </button>
              <button
                type="button"
                aria-label="Close Window"
                title="Close"
                className="h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#DC2626] hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* View Mode Dropdown & Fullscreen */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="relative" ref={viewDropdownRef}>
              <div className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] text-[12px] shadow-2xs">
                <span className="text-[#647187] text-[11.5px]">View</span>
                <div className="w-[1px] h-3.5 bg-[#E6EAF0]" />
                <button
                  type="button"
                  onClick={() => setShowViewDropdown(!showViewDropdown)}
                  className="flex items-center gap-1.5 font-semibold text-[#222938] hover:text-[#7562E8] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#7562E8]" />
                  <span>{viewModeLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#647187]" />
                </button>
              </div>

              {showViewDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-md bg-white shadow-glass border border-[#D9DEE7] py-1 z-50 text-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateFilter('all');
                      setShowViewDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors cursor-pointer ${candidateFilter === 'all'
                        ? 'bg-[#F2F0FD] text-[#634FDB] font-semibold'
                        : 'text-[#222938] hover:bg-[#F8F9FB]'
                      }`}
                  >
                    <span>Lattice Topology (All)</span>
                    {candidateFilter === 'all' && <Check className="w-3.5 h-3.5 text-[#7562E8]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateFilter('feasible');
                      setShowViewDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors cursor-pointer ${candidateFilter === 'feasible'
                        ? 'bg-[#F2F0FD] text-[#634FDB] font-semibold'
                        : 'text-[#222938] hover:bg-[#F8F9FB]'
                      }`}
                  >
                    <span>Feasible Only</span>
                    {candidateFilter === 'feasible' && (
                      <Check className="w-3.5 h-3.5 text-[#7562E8]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateFilter('pareto');
                      setShowViewDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors cursor-pointer ${candidateFilter === 'pareto'
                        ? 'bg-[#F2F0FD] text-[#634FDB] font-semibold'
                        : 'text-[#222938] hover:bg-[#F8F9FB]'
                      }`}
                  >
                    <span>Pareto Optimal</span>
                    {candidateFilter === 'pareto' && (
                      <Check className="w-3.5 h-3.5 text-[#7562E8]" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label="Expand Fullscreen"
              title="Expand Fullscreen"
              className="h-8 w-8 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-white transition-colors shadow-2xs cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Selected Configuration Inspector */}
          <div className="pointer-events-auto mt-0.5 w-[332px] xl:w-[352px]">
            <SelectedConfigurationInspector
              candidate={selectedCandidate}
              onViewDetails={onViewCandidateDetails}
              onCycleNext={selectNextCandidate}
              onCyclePrev={selectPrevCandidate}
            />
          </div>
        </div>
      </div>

      {/* LOWER ANALYTICAL SECTION */}
      <div className="px-6 pt-4 pb-2 w-full flex flex-col lg:flex-row gap-4 shrink-0">
        {/* Left: Metrics Strip & Recent Experiments Table */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <CompactMetricsStrip
            metrics={metrics}
            historicalPoints={performanceTrends.points}
            dataSourceLabel={data.dataSourceLabel}
          />
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

        {/* Right: Performance Trends Chart */}
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
        <div className="fixed inset-0 z-50 bg-[#222938]/40 backdrop-blur-xs flex items-start justify-center pt-24 p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-glass border border-[#D9DEE7] overflow-hidden flex flex-col">
            <div className="p-3 border-b border-[#E6EAF0] flex items-center gap-2.5">
              <Search className="w-4 h-4 text-[#647187] shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by ID, model, quantization..."
                className="w-full text-[13px] text-[#222938] placeholder-[#8A94A6] outline-none bg-transparent"
              />
              <button
                type="button"
                aria-label="Close Search"
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-sm text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#E6EAF0] p-1">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-[12.5px] text-[#647187]">
                  No matching candidates found for "{searchQuery}".
                </div>
              ) : (
                searchResults.map((cand) => {
                  const isCurrent = cand.id === selectedCandidate.id;
                  const tone =
                    cand.nodeRole === 'optimizer' || cand.status === 'selected'
                      ? 'accent'
                      : cand.status === 'feasible'
                        ? 'success'
                        : cand.status === 'rejected'
                          ? 'danger'
                          : cand.status === 'evaluating'
                            ? 'warning'
                            : 'neutral';

                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => {
                        selectCandidate(cand.id);
                        setShowSearchModal(false);
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between rounded-md transition-colors cursor-pointer ${isCurrent ? 'bg-[#F2F0FD]' : 'hover:bg-[#F8F9FB]'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-[#222938]">
                            {cand.modelName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-sm text-[11px] font-mono font-medium bg-[#F8F9FB] text-[#222938] border border-[#D9DEE7]">
                            {cand.quantization}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#647187] mt-1 font-mono tabular-nums">
                          <span>{cand.id}</span>
                          {cand.inferenceLatencyMs !== null && (
                            <span className="flex items-center gap-1 text-[#0D8A58]">
                              <Zap className="w-3 h-3" />
                              {cand.inferenceLatencyMs} ms
                            </span>
                          )}
                          {cand.memoryUsageGb !== null && (
                            <span className="flex items-center gap-1 text-[#2563EB]">
                              <Cpu className="w-3 h-3" />
                              {cand.memoryUsageGb.toFixed(1)} GB
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge tone={tone} className="capitalize">
                          {cand.status}
                        </StatusBadge>
                        {isCurrent && <Check className="w-4 h-4 text-[#7562E8]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-2.5 bg-[#F8F9FB] border-t border-[#E6EAF0] text-[11px] text-[#647187] flex justify-between items-center px-4">
              <span>Use arrow keys to cycle · Press Enter to inspect</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#D9DEE7] rounded-sm text-[10px] text-[#647187] font-mono">
                ESC
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};