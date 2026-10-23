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
    <header className="w-full px-6 pt-3 pb-3 flex flex-col gap-2 border-b border-[#D9DEE7] bg-white select-none z-20">
      {/* Top Row: Breadcrumb on Left | Backend Status, Utilities & Window Controls on Right */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-[#222938] font-semibold">Overview</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Semantic Connection Status Button */}
          <button
            type="button"
            onClick={onRefreshConnection}
            title={
              backendState.connected
                ? `Connected to ${backendState.service} (${backendState.endpoint})`
                : 'Backend unreachable. Click to retry connection.'
            }
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11.5px] transition-colors cursor-pointer ${backendState.connected
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0D8A58] hover:bg-[#D1FAE5]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]'
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${backendState.connected ? 'bg-[#0D8A58]' : 'bg-[#D97706]'
                }`}
            />
            <span className="font-semibold">
              {backendState.connected ? 'Backend Connected' : 'Demo Mode'}
            </span>
            <span className="font-mono text-[11px] opacity-85">
              {backendState.endpoint}
            </span>
          </button>

          {/* Search Button */}
          <button
            type="button"
            aria-label="Search"
            title="Search"
            className="h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] border border-transparent hover:border-[#D9DEE7] transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="relative h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] border border-transparent hover:border-[#D9DEE7] transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#7562E8]" />
          </button>

          {/* Window Controls */}
          <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-[#D9DEE7]">
            <button
              type="button"
              aria-label="Minimize Window"
              title="Minimize"
              className="h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Maximize Window"
              title="Maximize"
              className="h-7 w-7 rounded-md flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors"
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
      </div>

      {/* Bottom Row: Page Title & View Controls */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[26px] leading-tight font-semibold text-[#222938] tracking-tight">
            System Overview
          </h2>
          <p className="text-[13px] text-[#647187] font-normal mt-0.5">
            Live view of your models, resources and optimization experiments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-white border border-[#D9DEE7] text-[12px]">
            <span className="text-[#647187] font-medium">View</span>
            <div className="w-[1px] h-3.5 bg-[#D9DEE7]" />
            <button
              type="button"
              className="flex items-center gap-1.5 font-semibold text-[#222938] hover:text-[#7562E8] transition-colors cursor-pointer"
            >
              <GitFork className="w-3.5 h-3.5 text-[#647187] rotate-90" />
              <span>Lattice Topology</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#647187]" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label="Toggle Fullscreen View"
            title="Toggle Fullscreen View"
            className="h-8 w-8 rounded-md bg-white border border-[#D9DEE7] flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};