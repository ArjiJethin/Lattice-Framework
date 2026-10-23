import React from 'react';
import {
  Clock,
  Cpu,
  Zap,
  HardDrive,
  Trash2,
  Square,
  Terminal,
} from 'lucide-react';
import { LiveExperimentProgress, ExperimentRunStatus } from '../../types/experiments';
import { StatusBadge, Button } from '../ui/primitives';

interface LiveProgressSectionProps {
  progress: LiveExperimentProgress;
  isBackendConnected?: boolean;
  onClearLogs?: () => void;
  onCancelExperiment?: () => void;
}

function getStatusPresentation(
  status: ExperimentRunStatus,
  isBackendConnected: boolean
): {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';
  pulse: boolean;
  ringColor: string;
  barColor: string;
} {
  if (!isBackendConnected && status === 'running') {
    return {
      label: 'Recorded Fixture Preview',
      tone: 'neutral',
      pulse: false,
      ringColor: 'stroke-[#7562E8]',
      barColor: 'bg-[#7562E8]',
    };
  }

  switch (status) {
    case 'queued':
      return {
        label: 'Queued',
        tone: 'info',
        pulse: true,
        ringColor: 'stroke-[#2563EB]',
        barColor: 'bg-[#2563EB]',
      };
    case 'preparing':
      return {
        label: 'Preparing Runtime',
        tone: 'info',
        pulse: true,
        ringColor: 'stroke-[#2563EB]',
        barColor: 'bg-[#2563EB]',
      };
    case 'running':
      return {
        label: 'Active Run',
        tone: 'accent',
        pulse: true,
        ringColor: 'stroke-[#7562E8]',
        barColor: 'bg-[#7562E8]',
      };
    case 'completed':
      return {
        label: 'Run Completed',
        tone: 'success',
        pulse: false,
        ringColor: 'stroke-[#0D8A58]',
        barColor: 'bg-[#0D8A58]',
      };
    case 'failed':
      return {
        label: 'Execution Failed',
        tone: 'danger',
        pulse: false,
        ringColor: 'stroke-[#DC2626]',
        barColor: 'bg-[#DC2626]',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        tone: 'warning',
        pulse: false,
        ringColor: 'stroke-[#D97706]',
        barColor: 'bg-[#D97706]',
      };
    case 'idle':
    default:
      return {
        label: 'Standby / Ready',
        tone: 'neutral',
        pulse: false,
        ringColor: 'stroke-[#8A94A6]',
        barColor: 'bg-[#8A94A6]',
      };
  }
}

export const LiveProgressSection: React.FC<LiveProgressSectionProps> = ({
  progress,
  isBackendConnected = false,
  onClearLogs,
  onCancelExperiment,
}) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, progress.progressPct));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  const statusMeta = getStatusPresentation(progress.status, isBackendConnected);
  const canCancel =
    isBackendConnected &&
    (progress.status === 'running' ||
      progress.status === 'queued' ||
      progress.status === 'preparing');

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
      {/* 1. Section Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#222938] tracking-tight">
            2. Live Progress &amp; Telemetry
          </h2>
          <p className="text-[12px] text-[#647187] mt-0.5">
            Real-time iteration progress, active memory footprint, and execution log stream.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge tone={statusMeta.tone} pulse={statusMeta.pulse}>
            {statusMeta.label}
          </StatusBadge>
          {canCancel && onCancelExperiment && (
            <Button
              variant="destructive"
              size="xs"
              onClick={onCancelExperiment}
              leftIcon={<Square className="w-3 h-3 fill-current" />}
            >
              Cancel Run
            </Button>
          )}
        </div>
      </div>

      {/* 2. Main Progress Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Progress Ring, Linear Bar, and 4 Live Metric Cards (Col 8) */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-3">
          {/* Top Row: Circular Gauge + Linear Progress Bar */}
          <div className="flex items-center gap-5 p-3.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
            {/* Circular Progress Gauge */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 92 92">
                <circle
                  cx="46"
                  cy="46"
                  r={radius}
                  className="stroke-[#E2E6EE]"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="46"
                  cy="46"
                  r={radius}
                  className={`${statusMeta.ringColor} transition-all duration-300 ease-out`}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums">
                  {progress.currentRun}/{progress.totalRuns}
                </span>
                <span className="text-[9.5px] font-medium text-[#647187] mt-1">
                  Runs
                </span>
              </div>
            </div>

            {/* Evaluation Details & Linear Progress Bar */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                  Evaluating Configuration
                </span>
                <span className="text-[11.5px] font-mono font-semibold text-[#222938] tabular-nums">
                  {clampedPct}%
                </span>
              </div>

              <div className="text-[15px] font-semibold font-mono text-[#222938] tracking-tight mt-0.5 truncate">
                {progress.configurationName}
              </div>

              <div className="w-full h-2 rounded-sm bg-[#E2E6EE] overflow-hidden mt-2.5 border border-[#D9DEE7]/60">
                <div
                  className={`h-full ${statusMeta.barColor} transition-all duration-300 ease-out`}
                  style={{ width: `${clampedPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#647187] mt-1.5 gap-2">
                <span className="font-medium text-[#222938] truncate">
                  {progress.statusMessage}
                </span>
                <span className="font-mono text-[10.5px] shrink-0 tabular-nums">
                  {progress.estimatedTimeRemaining
                    ? `ETA: ${progress.estimatedTimeRemaining}`
                    : ' Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Grid: 4 Live Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-md bg-white border border-[#D9DEE7] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] text-[#2563EB] flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-medium text-[#647187] block truncate">
                  Current Latency
                </span>
                <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums block mt-0.5">
                  {progress.currentLatencyMs !== null
                    ? `${progress.currentLatencyMs} ms`
                    : '—'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-md bg-white border border-[#D9DEE7] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] text-[#7562E8] flex items-center justify-center shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-medium text-[#647187] block truncate">
                  Generated Tokens
                </span>
                <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums block mt-0.5">
                  {progress.generatedTokens
                    ? `${progress.generatedTokens.current} / ${progress.generatedTokens.total}`
                    : '—'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-md bg-white border border-[#D9DEE7] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] text-[#7562E8] flex items-center justify-center shrink-0">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-medium text-[#647187] block truncate">
                  Current Memory
                </span>
                <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums block mt-0.5">
                  {progress.currentMemoryGb !== null
                    ? `${progress.currentMemoryGb.toFixed(1)} GB`
                    : '—'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-md bg-white border border-[#D9DEE7] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] text-[#0D8A58] flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-medium text-[#647187] block truncate">
                  Throughput
                </span>
                <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums block mt-0.5">
                  {progress.currentThroughputToks !== null
                    ? `${progress.currentThroughputToks.toFixed(1)} tok/s`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Execution Logs Panel (Col 4) */}
        <div className="lg:col-span-4 rounded-md border border-[#D9DEE7] bg-[#F8F9FB] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6EAF0]">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#222938]">
              <Terminal className="w-3.5 h-3.5 text-[#647187]" />
              <span>Execution Logs</span>
              <span className="text-[11px] font-mono text-[#647187] tabular-nums">
                ({progress.logs.length})
              </span>
            </div>

            {onClearLogs && progress.logs.length > 0 && (
              <button
                type="button"
                onClick={onClearLogs}
                className="text-[11px] font-medium text-[#647187] hover:text-[#222938] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[145px] max-h-[165px] overflow-y-auto py-2 flex flex-col gap-1 font-mono text-[11px]">
            {progress.logs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[#8A94A6] text-[11.5px] font-sans">
                No execution events recorded
              </div>
            ) : (
              progress.logs.map((log) => {
                const isHighlight = log.level === 'active';
                const dotColor =
                  log.level === 'active'
                    ? 'bg-[#7562E8]'
                    : log.level === 'success'
                      ? 'bg-[#0D8A58]'
                      : log.level === 'warn'
                        ? 'bg-[#D97706]'
                        : log.level === 'error'
                          ? 'bg-[#DC2626]'
                          : 'bg-[#2563EB]';

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 px-2 py-1 rounded-sm transition-colors ${isHighlight
                        ? 'bg-[#F2F0FD] text-[#222938] font-semibold border border-[#D8D1FA]'
                        : log.level === 'error'
                          ? 'bg-[#FEF2F2] text-[#DC2626]'
                          : log.level === 'warn'
                            ? 'bg-[#FFFBEB] text-[#B45309]'
                            : 'text-[#222938] hover:bg-white'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${dotColor}`}
                    />
                    <span className="text-[10.5px] text-[#647187] shrink-0 tabular-nums">
                      {log.timestamp}
                    </span>
                    <span className="leading-snug break-words">{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};