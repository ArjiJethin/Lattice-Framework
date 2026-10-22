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
    <header className="w-full px-5 pt-2 pb-1.5 flex flex-col gap-1.5 select-none z-20 shrink-0">
      {/* Top Row: Breadcrumb & Right System Status / Controls */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb */}
        <button
          onClick={onBackToOverview}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#18213B] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-[#18213B]">Model Lab</span>
        </button>

        {/* Right Status & Window Controls */}
        <div className="flex items-center gap-2">
          {/* Backend / Demo Mode Status Pill */}
          <button
            onClick={onRefreshConnection}
            title={
              backendState.connected
                ? `Connected to ${backendState.service} (${backendState.endpoint})`
                : 'Demo fixture data active. Click to retry live backend.'
            }
            className={`flex items-center gap-2 px-3 py-0.5 rounded-full border transition-all duration-200 text-left ${backendState.connected
                ? 'bg-[#E6F4EA]/90 border-emerald-200/80 hover:bg-[#DCF0E2]'
                : 'bg-amber-50/90 border-amber-200/80 hover:bg-amber-100/80'
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${backendState.connected
                  ? 'bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                  : 'bg-amber-500'
                }`}
            />
            <span className="text-[11px] font-bold text-[#18213B]">
              {backendState.connected ? 'Backend Connected' : 'Demo Mode'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {backendState.endpoint}
            </span>
          </button>

          {/* Search Icon */}
          <button
            title="Search"
            className="p-1 rounded-full text-slate-600 hover:text-[#18213B] hover:bg-white/70 transition-all"
          >
            <Search className="w-3.5 h-3.5 stroke-[2]" />
          </button>

          {/* Assistant Sparkles */}
          <button
            title="Lattice AI Assistant"
            className="p-1 rounded-full text-slate-600 hover:text-[#8174F5] hover:bg-white/70 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8174F5]" />
          </button>

          {/* Window Controls */}
          <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-slate-200/80">
            <button
              title="Minimize"
              className="p-1 rounded-md text-slate-500 hover:text-[#18213B] hover:bg-slate-200/60 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              title="Maximize"
              className="p-1 rounded-md text-slate-500 hover:text-[#18213B] hover:bg-slate-200/60 transition-colors"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              title="Close"
              className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Row: Title & Subtitle on Left | 4 Summary Stat Pills on Right */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold text-[#18213B] tracking-tight">
            Model Library
          </h1>
          <p className="text-[11.5px] text-slate-500 font-normal mt-0.5">
            Explore models, inspect configurations and prepare experiments.
          </p>
        </div>

        {/* 4 Summary Stat Badges */}
        <div className="flex items-center gap-2">
          {/* Installed */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-white/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-[#8174F5]">
              <Box className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-extrabold text-[#18213B] leading-none">
                {stats.installed}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                Installed
              </span>
            </div>
          </div>

          {/* Total Models */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-white/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-[#3B82F6]">
              <Layers className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-extrabold text-[#18213B] leading-none">
                {stats.totalModels}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                Total Models
              </span>
            </div>
          </div>

          {/* Profiled */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-white/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-[#14B8A6]">
              <BarChart2 className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-extrabold text-[#18213B] leading-none">
                {stats.profiled}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                Profiled
              </span>
            </div>
          </div>

          {/* Ready to Test */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-white/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-[#6366F1]">
              <FlaskConical className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-extrabold text-[#18213B] leading-none">
                {stats.readyToTest}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                Ready to Test
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
