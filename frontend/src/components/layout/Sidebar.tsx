import React from 'react';
import {
  Home,
  Layers,
  FlaskConical,
  Settings,
  Box,
} from 'lucide-react';
import { ActiveModelInfo, BackendConnectionState } from '../../types';

export type NavItemKey =
  | 'overview'
  | 'model-lab'
  | 'optimization-lab'
  | 'experiments'
  | 'settings';

interface SidebarProps {
  activeNav: NavItemKey;
  onNavigate: (key: NavItemKey) => void;
  activeModel: ActiveModelInfo;
  backendState: BackendConnectionState;
}

const OptimizationNetworkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="5" cy="5" r="2" />
    <circle cx="15" cy="5" r="2" />
    <circle cx="5" cy="15" r="2" />
    <circle cx="15" cy="15" r="2" />
    <path d="M6.8 6.2L13.2 13.8M13.2 6.2L6.8 13.8M5 7V13M15 7V13" strokeLinecap="round" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavigate,
  activeModel,
  backendState,
}) => {
  const navItems: Array<{
    key: NavItemKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
      { key: 'overview', label: 'Overview', icon: Home },
      { key: 'model-lab', label: 'Model Lab', icon: Layers },
      { key: 'optimization-lab', label: 'Optimization Lab', icon: OptimizationNetworkIcon },
      { key: 'experiments', label: 'Experiments', icon: FlaskConical },
      { key: 'settings', label: 'Settings', icon: Settings },
    ];

  return (
    <aside
      aria-label="Primary Navigation"
      className="w-[208px] xl:w-[220px] shrink-0 h-screen bg-[#F8F9FB] border-r border-[#D9DEE7] flex flex-col justify-between p-4 overflow-y-auto select-none"
    >
      {/* Top: Brand Identity & Navigation */}
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1 pb-4 mb-3 border-b border-[#E6EAF0]">
          <div className="w-8 h-8 rounded-md bg-white border border-[#D9DEE7] flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-[#7562E8]"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="22,3 39,12.5 39,31.5 22,41 5,31.5 5,12.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path
                d="M22,3 L22,41 M5,12.5 L39,31.5 M39,12.5 L5,31.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeOpacity="0.5"
              />
              <circle cx="22" cy="22" r="2.8" fill="#7562E8" />
            </svg>
          </div>

          <div className="min-w-0 text-left">
            <h1 className="text-[13px] font-semibold tracking-[0.14em] text-[#222938] leading-none">
              LATTICE
            </h1>
            <span className="text-[10px] font-medium text-[#647187] block mt-1 truncate">
              Inference Optimizer
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors text-left cursor-pointer ${isActive
                    ? 'bg-[#F2F0FD] text-[#222938] font-semibold border border-[#D8D1FA]'
                    : 'text-[#647187] hover:text-[#222938] hover:bg-[#EDEFF3]/60 font-medium border border-transparent'
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#7562E8] rounded-r-sm" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#7562E8]' : 'text-[#647187]'
                    }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Active Model Context & Backend Telemetry */}
      <div className="space-y-3 pt-3 border-t border-[#E6EAF0] text-left">
        {/* Current Active Model Box */}
        <div className="p-2.5 rounded-md bg-white border border-[#D9DEE7]">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#647187] mb-1.5">
            <span>Active Model</span>
            <span className="font-mono text-[10.5px] text-[#222938] bg-[#F8F9FB] px-1.5 py-0.5 rounded-sm border border-[#E6EAF0]">
              {activeModel.quantization}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#D9DEE7] text-[#647187] flex items-center justify-center shrink-0">
              <Box className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-[#222938] truncate leading-tight">
                {activeModel.name}
              </div>
              <div className="text-[11px] text-[#647187] truncate mt-0.5">
                Runtime: <span className="font-mono">{activeModel.runtime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Backend Status Row */}
        <div className="px-0.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${backendState.connected ? 'bg-[#0D8A58]' : 'bg-[#D97706]'
                }`}
            />
            <span className="text-[11.5px] font-medium text-[#222938]">
              {backendState.connected ? 'Backend Connected' : 'Demo Fixture Mode'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#647187] ml-4 mt-0.5 truncate">
            {backendState.endpoint}
          </div>
        </div>

        {/* Version Footer */}
        <div className="flex items-center justify-between text-[11px] text-[#8A94A6] px-0.5 pt-1 border-t border-[#E6EAF0]">
          <span className="font-mono">v0.1.0</span>
          <span>Research Preview</span>
        </div>
      </div>
    </aside>
  );
};