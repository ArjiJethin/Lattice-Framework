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
import { StatusBadge, Button } from '../ui/primitives';

interface SystemInformationCardProps {
  systemInfo: SystemInfoData;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const SystemInformationCard: React.FC<SystemInformationCardProps> = ({
  systemInfo,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center text-[#2563EB] shrink-0">
            <Monitor className="w-4 h-4 stroke-[1.9]" />
          </div>
          <div>
            <h2 className="text-[14.5px] font-semibold text-[#222938] tracking-tight">
              System Information
            </h2>
            <p className="text-[12px] text-[#647187]">
              Detected client hardware and backend runtime status.
            </p>
          </div>
        </div>

        <Button
          variant="icon"
          size="iconSm"
          onClick={onRefresh}
          aria-label="Refresh Hardware Detection"
          title="Refresh Hardware Detection"
        >
          <RotateCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7562E8]' : ''
              }`}
          />
        </Button>
      </div>

      {/* Provenance Strip */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] text-[11px]">
        <span className="text-[#647187] font-medium">Telemetry Source</span>
        <StatusBadge
          tone={systemInfo.isDetectedLive ? 'success' : 'neutral'}
          dot={true}
        >
          {systemInfo.isDetectedLive
            ? 'Live Host + Backend'
            : 'Browser WebGL Probe Only'}
        </StatusBadge>
      </div>

      {/* Hardware Key-Value List */}
      <div className="flex flex-col divide-y divide-[#E6EAF0] text-[12px]">
        <div className="py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#647187] shrink-0">
            <Monitor className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Operating System</span>
          </div>
          <span className="font-semibold text-[#222938] text-right truncate">
            {systemInfo.os}
          </span>
        </div>

        <div className="py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#647187] shrink-0">
            <Cpu className="w-3.5 h-3.5 text-[#7562E8]" />
            <span>CPU</span>
          </div>
          <span
            className="font-semibold text-[#222938] text-right truncate"
            title={systemInfo.cpu}
          >
            {systemInfo.cpu}
          </span>
        </div>

        <div className="py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#647187] shrink-0">
            <Layers className="w-3.5 h-3.5 text-[#0D8A58]" />
            <span>GPU Renderer</span>
          </div>
          <span
            className="font-semibold text-[#222938] text-right truncate"
            title={systemInfo.gpu}
          >
            {systemInfo.gpu}
          </span>
        </div>

        <div className="py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#647187] shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-[#7562E8]" />
            <span>System Memory</span>
          </div>
          <span className="font-mono font-semibold text-[#222938] text-right tabular-nums">
            {systemInfo.totalMemory}
          </span>
        </div>

        <div className="py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#647187] shrink-0">
            <BarChart className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Available Memory</span>
          </div>
          <span
            className={`font-mono text-right tabular-nums ${systemInfo.isDetectedLive
                ? 'font-semibold text-[#222938]'
                : 'text-[11px] text-[#8A94A6]'
              }`}
          >
            {systemInfo.availableMemory}
          </span>
        </div>

        <div className="py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#647187] shrink-0">
            <Code2 className="w-3.5 h-3.5 text-[#0D8A58]" />
            <span>Python Runtime</span>
          </div>
          <span
            className={`font-mono text-right tabular-nums ${systemInfo.isDetectedLive
                ? 'font-semibold text-[#222938]'
                : 'text-[11px] text-[#8A94A6]'
              }`}
          >
            {systemInfo.pythonVersion}
          </span>
        </div>

        <div className="py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#647187] shrink-0">
            <Zap className="w-3.5 h-3.5 text-[#D97706]" />
            <span>CUDA Acceleration</span>
          </div>
          <span
            className={`font-mono text-right ${systemInfo.isDetectedLive
                ? 'font-semibold text-[#0D8A58]'
                : 'text-[11px] text-[#8A94A6]'
              }`}
          >
            {systemInfo.cudaAvailable}
          </span>
        </div>
      </div>

      <div className="pt-1 border-t border-[#E6EAF0] flex items-center justify-between text-[10.5px] font-mono text-[#8A94A6]">
        <span>Last probed: {systemInfo.lastDetectedAt}</span>
        <span>WebGL2 / Navigator</span>
      </div>
    </div>
  );
};