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

interface OptimizationLabHeaderProps {
  stats: ModelLibrarySummaryStats;
  backendState: BackendConnectionState;
  onRefreshConnection?: () => void;
  onBackToOverview?: () => void;
  onBackToModelLab?: () => void;
}

export const OptimizationLabHeader: React.FC<OptimizationLabHeaderProps> = ({
  stats,
  backendState,
  onRefreshConnection,
  onBackToOverview,
  onBackToModelLab,
}) => {
  return (
    <header className="flex flex-col gap-2.5 pb-2 border-b border-slate-200/80">
      {/* Top Utility Row */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <button
            onClick={onBackToOverview || onBackToModelLab}
            className="flex items-center gap-1 hover:text-[#7C6AF2] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Optimization Lab</span>
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
                backendState.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{backendState.connected ? 'Live Backend' : 'Demo Mode'}</span>
            <span className="text-[10px] opacity-75 font-mono">{backendState.endpoint}</span>
          </button>

          {/* Quick Action Icons */}
          <button
            title="AI Optimization Insights"
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#7C6AF2] hover:bg-slate-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            title="Settings"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Window Chrome Controls Decoration */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200/80 text-slate-400">
            <button className="p-1 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors">
              <Minus className="w-3 h-3" />
            </button>
            <button className="p-1 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors">
              <Square className="w-2.5 h-2.5" />
            </button>
            <button className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Title & Aggregate Metric Badges Row */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#18213B] tracking-tight leading-none">
            Optimization Lab
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Find the best configuration for your workload using real constraints and measured profiles.
          </p>
        </div>

        {/* 4 Summary Stat Pills matching the reference screenshot */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Installed Models */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-[#8B5CF6] flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-[#18213B] leading-none block">
                {stats.installed}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-none block mt-0.5">
                Installed
              </span>
            </div>
          </div>

          {/* Total Models */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#3B82F6] flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-[#18213B] leading-none block">
                {stats.totalModels}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-none block mt-0.5">
                Total Models
              </span>
            </div>
          </div>

          {/* Profiled */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-[#18213B] leading-none block">
                {stats.profiled}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-none block mt-0.5">
                Profiled
              </span>
            </div>
          </div>

          {/* Ready to Test */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#6366F1] flex items-center justify-center">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-[#18213B] leading-none block">
                {stats.readyToTest}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-none block mt-0.5">
                Ready to Test
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
