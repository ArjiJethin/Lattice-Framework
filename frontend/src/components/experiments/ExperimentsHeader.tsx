import React from 'react';
import {
  Download,
  Database,
  BarChart2,
  FlaskConical,
  Sparkles,
  Settings,
  Minus,
  Square,
  X,
  ChevronLeft,
} from 'lucide-react';
import { BackendConnectionState } from '../../types';
import { ModelLibrarySummaryStats } from '../../types/modelLibrary';

interface ExperimentsHeaderProps {
  stats: ModelLibrarySummaryStats;
  backendState: BackendConnectionState;
  onRefreshConnection?: () => void;
  onBackToOverview?: () => void;
  onBackToOptimizationLab?: () => void;
}

export const ExperimentsHeader: React.FC<ExperimentsHeaderProps> = ({
  stats,
  backendState,
  onRefreshConnection,
  onBackToOverview,
  onBackToOptimizationLab,
}) => {
  return (
    <header className="flex flex-col gap-2 pb-2 border-b border-slate-200/80">
      {/* Top Utility Row */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <button
            onClick={onBackToOptimizationLab || onBackToOverview}
            className="flex items-center gap-1 hover:text-[#7C6AF2] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Experiments</span>
          </button>
        </div>

        {/* Right Status Badges & Window Controls */}
        <div className="flex items-center gap-2">
          {/* Connection Mode Pill */}
          <button
            onClick={onRefreshConnection}
            title={
              backendState.connected
                ? `Connected to ${backendState.endpoint}`
                : `Demo Mode: Backend offline at ${backendState.endpoint} (Click to re-check)`
            }
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md transition-all ${
              backendState.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 shadow-2xs'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80 shadow-2xs'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendState.connected
                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span>
              {backendState.connected ? 'Live Backend' : 'Demo Mode'}{' '}
              <span className="font-mono text-[10px] opacity-80">{backendState.endpoint}</span>
            </span>
          </button>

          {/* Sparkles / Quick Action */}
          <button
            title="Lattice AI Assistant"
            className="w-7 h-7 rounded-lg bg-white/80 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-[#7C6AF2] hover:bg-white transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7C6AF2]" />
          </button>

          {/* Settings */}
          <button
            title="Preferences"
            className="w-7 h-7 rounded-lg bg-white/80 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-[#7C6AF2] hover:bg-white transition-all shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Window Minimise / Maximise / Close Simulated Buttons */}
          <div className="flex items-center ml-1 pl-1 border-l border-slate-200/80 gap-1 text-slate-400">
            <button className="w-6 h-6 flex items-center justify-center hover:text-slate-600 rounded">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 flex items-center justify-center hover:text-slate-600 rounded">
              <Square className="w-3 h-3" />
            </button>
            <button className="w-6 h-6 flex items-center justify-center hover:text-rose-500 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Title & Global Stats Counter Strip */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        {/* Page Title & Subtitle */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#18213B]">
            Experiments
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Run and compare inference experiments to evaluate Lattice's optimization strategy.
          </p>
        </div>

        {/* 4 Metrics Count Pills matching Reference Image */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Installed */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-[#7C6AF2] flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black text-[#18213B]">{stats.installed}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Installed</div>
            </div>
          </div>

          {/* Total Models */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black text-[#18213B]">{stats.totalModels}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Total Models</div>
            </div>
          </div>

          {/* Profiled */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black text-[#18213B]">{stats.profiled}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Profiled</div>
            </div>
          </div>

          {/* Ready to Test */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#6366F1] flex items-center justify-center shrink-0">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black text-[#18213B]">{stats.readyToTest}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Ready to Test</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
