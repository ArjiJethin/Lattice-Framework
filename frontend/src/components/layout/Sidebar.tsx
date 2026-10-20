import React from 'react';
import {
  Home,
  Layers,
  SlidersHorizontal,
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavigate,
  activeModel,
  backendState,
}) => {
  const navItems: Array<{ key: NavItemKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'overview', label: 'Overview', icon: Home },
    { key: 'model-lab', label: 'Model Lab', icon: Layers },
    { key: 'optimization-lab', label: 'Optimization Lab', icon: SlidersHorizontal },
    { key: 'experiments', label: 'Experiments', icon: FlaskConical },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[215px] shrink-0 h-screen bg-[#F1F3F6] border-r border-slate-200/80 flex flex-col justify-between p-4 select-none">
      {/* Top: Lattice Geometric Logo & Navigation */}
      <div>
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pb-5 mb-3 border-b border-slate-200/60">
          {/* Geometric wireframe lattice hexagon logo */}
          <div className="w-12 h-12 mb-2 flex items-center justify-center relative">
            <svg
              className="w-10 h-10 text-[#8174F5]"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer hexagon */}
              <polygon
                points="20,2 36,11 36,29 20,38 4,29 4,11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Isometric inner cube vertices */}
              <path
                d="M20,2 L20,20 M36,11 L20,20 M4,11 L20,20 M20,20 L20,38 M20,20 L36,29 M20,20 L4,29"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.8"
              />
              {/* Center node */}
              <circle cx="20" cy="20" r="2.2" fill="#8174F5" />
            </svg>
          </div>

          <h1 className="text-sm font-extrabold tracking-[0.16em] text-[#18213B]">
            LATTICE
          </h1>
          <span className="text-[9px] font-semibold tracking-wider text-slate-400 mt-0.5">
            LLM INFERENCE OPTIMIZATION
          </span>
        </div>

        {/* Navigation links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-[#EEEBFF] text-[#18213B] shadow-sm'
                    : 'text-slate-600 hover:text-[#18213B] hover:bg-slate-200/50'
                }`}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#8174F5] rounded-r-full" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#8174F5]' : 'text-slate-400'
                  }`}
                />
                <span className="tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Current Model & Backend Connection Indicator */}
      <div className="space-y-3 pt-3 border-t border-slate-200/60 text-left">
        {/* Current Model Badge */}
        <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/70 shadow-sm">
          <div className="text-[10px] font-semibold text-slate-400 mb-1">
            Current Model
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#EEEBFF] text-[#8174F5] flex items-center justify-center shrink-0">
              <Box className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#18213B] truncate">
                {activeModel.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {activeModel.quantization}
              </div>
            </div>
          </div>
        </div>

        {/* Backend Connection Status */}
        <div className="px-1 py-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  backendState.connected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  backendState.connected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-[11px] font-semibold text-[#18213B]">
              {backendState.connected ? 'Backend Connected' : 'Demo Fixture Mode'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 ml-4 mt-0.5">
            {backendState.endpoint}
          </div>
        </div>

        {/* System Version Footer */}
        <div className="text-[10px] text-slate-400 px-1 pt-1">
          <div className="font-semibold text-slate-500">LATTICE v0.1.0</div>
          <div>Research Preview</div>
        </div>
      </div>
    </aside>
  );
};
