import React from 'react';
import {
  ChevronLeft,
  Sparkles,
  Search,
  Minus,
  Square,
  X,
  Layers,
  Box,
  BarChart2,
  FlaskConical,
} from 'lucide-react';
import { BackendConnectionState } from '../../types';
import { ModelLibrarySummaryStats } from '../../types/modelLibrary';

interface ModelLibraryHeaderProps {
  stats: ModelLibrarySummaryStats;
  backendState: BackendConnectionState;
  onRefreshConnection: () => void;
  onBackToOverview?: () => void;
}

export const ModelLibraryHeader: React.FC<ModelLibraryHeaderProps> = ({
  stats,
  backendState,
  onRefreshConnection,
  onBackToOverview,
}) => {
  return (
    <header className="w-full px-5 pt-1.5 pb-2 flex flex-col gap-1.5 select-none z-20 shrink-0 border-b border-[#D9DEE7]">
      {/* Top Row: Breadcrumb & Right System Status / Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToOverview}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="font-semibold text-[#222938]">Model Lab</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Backend / Demo Mode Status Pill */}
          <button
            type="button"
            onClick={onRefreshConnection}
            title={
              backendState.connected
                ? `Connected to ${backendState.service} (${backendState.endpoint})`
                : 'Demo fixture data active. Click to retry live backend.'
            }
            className={`flex items-center gap-2 h-7 px-2.5 rounded-md border text-[11.5px] font-medium transition-colors cursor-pointer ${backendState.connected
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0D8A58] hover:bg-[#D1FAE5]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]'
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${backendState.connected ? 'bg-[#0D8A58]' : 'bg-[#D97706]'
                }`}
            />
            <span className="font-semibold">
              {backendState.connected ? 'Backend Connected' : 'Demo Mode'}
            </span>
            <span className="text-[11px] font-mono opacity-85">
              {backendState.endpoint}
            </span>
          </button>

          <button
            type="button"
            aria-label="Search Catalog"
            title="Search"
            className="h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] border border-transparent hover:border-[#D9DEE7] transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            aria-label="Lattice AI Assistant"
            title="Lattice AI Assistant"
            className="h-7 w-7 rounded-md flex items-center justify-center text-[#7562E8] hover:bg-[#F2F0FD] border border-transparent hover:border-[#D8D1FA] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-[#D9DEE7]">
            <button
              type="button"
              aria-label="Minimize"
              title="Minimize"
              className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              aria-label="Maximize"
              title="Maximize"
              className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#DC2626] hover:bg-red-50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Row: Title & Subtitle on Left | 4 Summary Stat Badges on Right */}
      <div className="flex items-end justify-between gap-3 pt-0.5">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold text-[#222938] tracking-tight">
            Model Library
          </h1>
          <p className="text-[12.5px] text-[#647187] font-normal mt-0.5">
            Explore models, inspect configurations and prepare experiments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <div className="w-6 h-6 rounded-sm bg-[#F2F0FD] border border-[#D8D1FA] flex items-center justify-center text-[#7562E8]">
              <Box className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold font-mono text-[#222938] leading-none tabular-nums">
                {stats.installed}
              </span>
              <span className="text-[10px] text-[#647187] font-medium mt-0.5">
                Installed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <div className="w-6 h-6 rounded-sm bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold font-mono text-[#222938] leading-none tabular-nums">
                {stats.totalModels}
              </span>
              <span className="text-[10px] text-[#647187] font-medium mt-0.5">
                Total Models
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <div className="w-6 h-6 rounded-sm bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#0D8A58]">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold font-mono text-[#222938] leading-none tabular-nums">
                {stats.profiled}
              </span>
              <span className="text-[10px] text-[#647187] font-medium mt-0.5">
                Profiled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <div className="w-6 h-6 rounded-sm bg-[#F2F0FD] border border-[#D8D1FA] flex items-center justify-center text-[#7562E8]">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold font-mono text-[#222938] leading-none tabular-nums">
                {stats.readyToTest}
              </span>
              <span className="text-[10px] text-[#647187] font-medium mt-0.5">
                Ready to Test
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};