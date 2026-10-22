import React from 'react';
import {
  Monitor,
  Cpu,
  Layers,
  HardDrive,
  BarChart,
  Code2,
  Zap,
  RotateCw,
} from 'lucide-react';
import { SystemInfoData } from '../../types/settings';

interface SystemInformationCardProps {
  systemInfo: SystemInfoData;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const SystemInformationCard: React.FC<SystemInformationCardProps> = ({
  systemInfo,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
            <Monitor className="w-5 h-5 stroke-[1.9]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#18213B] tracking-tight">
              System Information
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Detected system hardware and environment.
            </p>
          </div>
        </div>

        {/* Refresh Hardware Detection */}
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh detected system hardware"
          className="text-slate-400 hover:text-[#7C6AF2] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <RotateCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7C6AF2]' : ''}`}
          />
        </button>
      </div>

      {/* Hardware Key-Value List */}
      <div className="flex flex-col divide-y divide-slate-100 text-xs">
        {/* Operating System */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Monitor className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Operating System</span>
          </div>
          <span className="font-bold text-[#18213B] text-right truncate">
            {systemInfo.os}
          </span>
        </div>

        {/* CPU */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>CPU</span>
          </div>
          <span className="font-bold text-[#18213B] text-right truncate">
            {systemInfo.cpu}
          </span>
        </div>

        {/* GPU */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>GPU</span>
          </div>
          <span className="font-bold text-[#18213B] text-right truncate">
            {systemInfo.gpu}
          </span>
        </div>

        {/* Total Memory */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Total Memory</span>
          </div>
          <span className="font-bold text-[#18213B] text-right font-mono">
            {systemInfo.totalMemory}
          </span>
        </div>

        {/* Available Memory */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <BarChart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Available Memory</span>
          </div>
          <span className="font-bold text-[#18213B] text-right font-mono">
            {systemInfo.availableMemory}
          </span>
        </div>

        {/* Python Version */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Code2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>Python Version</span>
          </div>
          <span className="font-bold text-[#18213B] text-right font-mono">
            {systemInfo.pythonVersion}
          </span>
        </div>

        {/* CUDA Available */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>CUDA Available</span>
          </div>
          <span className="font-bold text-[#18213B] text-right">
            {systemInfo.cudaAvailable}
          </span>
        </div>
      </div>
    </div>
  );
};
