import React from 'react';
import {
  Home,
  Layers,
  FlaskConical,
  Settings,
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

// Custom 4-node network topology icon matching "Optimization Lab" in the reference
const OptimizationNetworkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
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
    <aside className="w-[200px] xl:w-[215px] shrink-0 h-screen bg-[#F5F7FB]/90 backdrop-blur-xl border-r border-white/80 flex flex-col justify-between p-3.5 overflow-y-auto select-none">
      {/* Top: Brand Header & Navigation */}
      <div>
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pt-1 pb-3 mb-2">
          {/* 3D Isometric Cube Wireframe Logo */}
          <div className="w-11 h-11 mb-2 flex items-center justify-center relative">
            <svg
              className="w-10 h-10 text-[#7C6AF2] drop-shadow-[0_4px_10px_rgba(124,106,242,0.25)]"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="22,3 39,12.5 39,31.5 22,41 5,31.5 5,12.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                fill="rgba(129, 116, 245, 0.06)"
              />
              {/* Internal lattice diagonals */}
              <path
                d="M22,3 L22,41 M5,12.5 L39,31.5 M39,12.5 L5,31.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.55"
              />
              {/* Inner hexagon */}
              <polygon
                points="22,12 31,17 31,27 22,32 13,27 13,17"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeOpacity="0.85"
                fill="rgba(129, 116, 245, 0.1)"
              />
              <circle cx="22" cy="22" r="2.2" fill="#7C6AF2" />
            </svg>
          </div>

          <h1 className="text-[14px] font-extrabold tracking-[0.2em] text-[#18213B] pl-[0.2em]">
            LATTICE
          </h1>
          <span className="text-[8.5px] font-medium tracking-[0.08em] text-slate-400 mt-0.5 leading-tight">
            LLM INFERENCE
            <br />
            OPTIMIZATION
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 text-left ${isActive
                    ? 'bg-gradient-to-r from-[#E5DFFF] via-[#EDE9FF] to-[#F5F3FF] text-[#18213B] shadow-[0_2px_10px_rgba(129,116,245,0.12)]'
                    : 'text-slate-600 hover:text-[#18213B] hover:bg-white/60'
                  }`}
              >
                {/* Left Vertical Accent Pill */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#7C6AF2] rounded-r-full" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#18213B]' : 'text-slate-500'
                    }`}
                />
                <span className="tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Current Model Card, Progress Bar & Status Footer */}
      <div className="space-y-2.5 px-0.5 text-left">
        <div>
          <div className="text-[10.5px] font-medium text-slate-400 mb-1.5 px-0.5">
            Current Model
          </div>
          <div className="flex items-center gap-2">
            {/* Rounded White Icon Box with Purple Cube */}
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 shadow-sm flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#7C6AF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-[#18213B] truncate leading-tight">
                {activeModel.name}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                {activeModel.quantization}
              </div>
            </div>
          </div>

          {/* Lavender Progress Bar under Current Model matching Reference */}
          <div className="w-full h-1 rounded-full bg-slate-200/80 overflow-hidden mt-2">
            <div className="w-[68%] h-full rounded-full bg-gradient-to-r from-[#7C6AF2] to-[#B4A8FF]" />
          </div>
        </div>

        {/* Backend Status Indicator */}
        <div className="pt-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${backendState.connected
                  ? 'bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                  : 'bg-amber-500'
                }`}
            />
            <span className="text-[10.5px] font-semibold text-slate-600">
              {backendState.connected ? 'Backend Connected' : 'Demo Fixture Mode'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 ml-[14px] mt-0.5">
            {backendState.endpoint}
          </div>
        </div>

        {/* Version Footer */}
        <div className="text-[10px] text-slate-400 pt-0.5 leading-snug">
          <div className="font-medium text-slate-400">LATTICE v0.1.0</div>
          <div className="text-slate-400/90">Research Preview</div>
        </div>
      </div>
    </aside>
  );
};