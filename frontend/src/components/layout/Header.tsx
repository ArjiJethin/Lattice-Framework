import React from 'react';
import {
  Search,
  Maximize2,
  ChevronDown,
  Minus,
  Square,
  X,
  ChevronLeft,
  Bell,
  GitFork,
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
    <header className="w-full px-6 pt-3 pb-2 flex flex-col gap-1.5 select-none z-20">
      {/* Top Row: Breadcrumb on Left | Backend Pill, Search, Bell & Window Controls on Right */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb */}
        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#18213B] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
          <span className="text-[#18213B] font-semibold">Overview</span>
        </button>

        {/* Right Status & Window Bar */}
        <div className="flex items-center gap-2.5">
          {/* 2-Line Backend Status Pill */}
          <button
            onClick={onRefreshConnection}
            title={
              backendState.connected
                ? `Connected to ${backendState.service} (${backendState.endpoint})`
                : `Backend unreachable. Click to retry.`
            }
            className={`flex items-center gap-2.5 px-3.5 py-1 rounded-full border transition-all duration-200 text-left ${backendState.connected
                ? 'bg-[#E6F4EA]/90 border-emerald-200/80 hover:bg-[#DCF0E2]'
                : 'bg-amber-50/90 border-amber-200/80 hover:bg-amber-100/80'
              }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${backendState.connected
                  ? 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                  : 'bg-amber-500'
                }`}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold text-[#18213B]">
                {backendState.connected ? 'Backend Connected' : 'Demo Mode'}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {backendState.endpoint}
              </span>
            </div>
          </button>

          {/* Search Icon */}
          <button
            title="Search"
            className="p-2 rounded-full text-slate-600 hover:text-[#18213B] hover:bg-white/70 transition-all"
          >
            <Search className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Bell Notification Icon with Purple Badge Dot */}
          <button
            title="Notifications"
            className="relative p-2 rounded-full text-slate-600 hover:text-[#18213B] hover:bg-white/70 transition-all"
          >
            <Bell className="w-4 h-4 stroke-[2]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8174F5] ring-2 ring-white" />
          </button>

          {/* Window Controls */}
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200/80">
            <button
              title="Minimize"
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#18213B] hover:bg-slate-200/60 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              title="Maximize"
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#18213B] hover:bg-slate-200/60 transition-colors"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              title="Close"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Title & Subtitle on Left | View Mode Selector & Fullscreen on Right */}
      <div className="flex items-end justify-between pt-0.5">
        <div>
          <h2 className="text-[26px] leading-tight font-extrabold text-[#18213B] tracking-tight">
            System Overview
          </h2>
          <p className="text-[13px] text-slate-500 font-normal mt-0.5">
            Live view of your models, resources and optimization experiments.
          </p>
        </div>

        {/* View Selector & Fullscreen Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-white/90 shadow-sm text-xs">
            <span className="text-slate-400 font-medium">View</span>
            <div className="w-[1px] h-3.5 bg-slate-200" />
            <button className="flex items-center gap-1.5 font-semibold text-[#18213B] hover:text-[#8174F5] transition-colors">
              <GitFork className="w-3.5 h-3.5 text-slate-500 rotate-90" />
              <span>Lattice Topology</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>
          </div>

          <button
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen View"
            className="p-2 rounded-xl bg-white/85 backdrop-blur-md border border-white/90 text-slate-600 hover:text-[#18213B] hover:bg-white transition-all shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};