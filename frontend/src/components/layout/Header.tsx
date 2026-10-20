import React from 'react';
import {
  Search,
  Maximize2,
  ChevronDown,
  Minus,
  Square,
  X,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { BackendConnectionState } from '../../types';

interface HeaderProps {
  backendState: BackendConnectionState;
  onRefreshConnection: () => void;
  onToggleFullscreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendState,
  onRefreshConnection,
  onToggleFullscreen,
}) => {
  return (
    <header className="w-full px-6 pt-3 pb-2 flex items-center justify-between border-b border-slate-200/60 bg-white/40 backdrop-blur-md select-none">
      {/* Left: Breadcrumbs & Heading */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mb-0.5">
          <button className="flex items-center gap-0.5 hover:text-[#18213B] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
        </div>
        <h2 className="text-xl font-extrabold text-[#18213B] tracking-tight">
          System Overview
        </h2>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          Live view of your models, resources and optimization experiments.
        </p>
      </div>

      {/* Right: Actions, View Modes & Window Controls */}
      <div className="flex items-center gap-3">
        {/* Backend Status Pill */}
        <button
          onClick={onRefreshConnection}
          title={
            backendState.connected
              ? `Connected to ${backendState.service} (${backendState.endpoint})`
              : `Backend unreachable (${backendState.error || 'Offline'}). Click to retry.`
          }
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
            backendState.connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100/70 shadow-sm'
              : 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100 shadow-sm'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendState.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-bold">
              {backendState.connected ? 'Backend Connected' : 'Demo Mode (Offline)'}
            </span>
            <span className="font-mono text-[10px] opacity-75 font-normal">
              {backendState.endpoint}
            </span>
          </div>
        </button>

        {/* Search button */}
        <button
          title="Search"
          className="p-2 rounded-xl text-slate-500 hover:text-[#18213B] hover:bg-white/80 border border-transparent hover:border-slate-200 transition-all shadow-sm"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications / AI Assistant button */}
        <button
          title="System Notifications"
          className="p-2 rounded-xl text-slate-500 hover:text-[#18213B] hover:bg-white/80 border border-transparent hover:border-slate-200 transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-[#8174F5]" />
        </button>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm">
          <span className="text-slate-400 text-[11px]">View</span>
          <button className="flex items-center gap-1 font-semibold text-[#18213B] hover:text-[#8174F5] transition-colors">
            <span>Lattice Topology</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Fullscreen Expand */}
        <button
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen View"
          className="p-2 rounded-xl text-slate-500 hover:text-[#18213B] hover:bg-white/80 border border-slate-200/60 transition-all shadow-sm"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Window controls (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-slate-200">
          <button
            title="Minimize"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#18213B] hover:bg-slate-200/70 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            title="Maximize"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#18213B] hover:bg-slate-200/70 transition-colors"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            title="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
