import React from 'react';
import {
  Download,
  Database,
  BarChart2,
  FlaskConical,
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
    <header className="flex flex-col gap-2 pb-2.5 border-b border-[#D9DEE7]">
      {/* Top Utility Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#647187]">
          <button
            type="button"
            onClick={onBackToOptimizationLab || onBackToOverview}
            className="flex items-center gap-1 hover:text-[#222938] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-semibold text-[#222938]">Experiments</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshConnection}
            title={
              backendState.connected
                ? `Connected to ${backendState.endpoint}`
                : `Demo Mode: Backend offline at ${backendState.endpoint} (Click to re-check)`
            }
            className={`flex items-center gap-2 h-7 px-2.5 rounded-md border text-[11.5px] font-medium transition-colors cursor-pointer ${backendState.connected
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0D8A58] hover:bg-[#D1FAE5]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]'
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${backendState.connected ? 'bg-[#0D8A58]' : 'bg-[#D97706]'
                }`}
            />
            <span className="font-semibold">
              {backendState.connected ? 'Live Backend' : 'Demo Mode'}
            </span>
            <span className="font-mono text-[11px] opacity-85">
              {backendState.endpoint}
            </span>
          </button>

          <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-[#D9DEE7]">
            <button
              type="button"
              aria-label="Minimize Window"
              className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              aria-label="Maximize Window"
              className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              aria-label="Close Window"
              className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#DC2626] hover:bg-red-50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Title & Global Stats Counter Strip */}
      <div className="flex items-end justify-between flex-wrap gap-3 pt-0.5">
        <div>
          <h1 className="text-[22px] font-semibold text-[#222938] tracking-tight leading-none">
            Experiments
          </h1>
          <p className="text-[12.5px] text-[#647187] font-normal mt-1">
            Run and compare inference experiments to evaluate Lattice&apos;s optimization strategy.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <Download className="w-3.5 h-3.5 text-[#7562E8]" />
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[13px] font-bold font-mono text-[#222938] tabular-nums">
                {stats.installed}
              </span>
              <span className="text-[11px] text-[#647187] font-medium">Installed</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <Database className="w-3.5 h-3.5 text-[#2563EB]" />
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[13px] font-bold font-mono text-[#222938] tabular-nums">
                {stats.totalModels}
              </span>
              <span className="text-[11px] text-[#647187] font-medium">Total Models</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <BarChart2 className="w-3.5 h-3.5 text-[#0D8A58]" />
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[13px] font-bold font-mono text-[#222938] tabular-nums">
                {stats.profiled}
              </span>
              <span className="text-[11px] text-[#647187] font-medium">Profiled</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-white border border-[#D9DEE7] shadow-2xs">
            <FlaskConical className="w-3.5 h-3.5 text-[#7562E8]" />
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[13px] font-bold font-mono text-[#222938] tabular-nums">
                {stats.readyToTest}
              </span>
              <span className="text-[11px] text-[#647187] font-medium">Ready to Test</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};