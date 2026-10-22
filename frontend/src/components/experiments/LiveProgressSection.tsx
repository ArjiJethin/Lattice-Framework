import React from 'react';
import {
  Clock,
  Cpu,
  Zap,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { LiveExperimentProgress } from '../../types/experiments';

interface LiveProgressSectionProps {
  progress: LiveExperimentProgress;
  onClearLogs?: () => void;
}

export const LiveProgressSection: React.FC<LiveProgressSectionProps> = ({
  progress,
  onClearLogs,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progress.progressPct / 100) * circumference;

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* 1. Header with section title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-extrabold text-[#18213B] tracking-tight">
            2. Live Progress
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Real-time progress and current run status.
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-[#7C6AF2] border border-purple-200/80">
          <span className="w-2 h-2 rounded-full bg-[#7C6AF2] animate-pulse" />
          <span>
            {progress.status === 'running'
              ? 'Active Run'
              : progress.status === 'completed'
              ? 'Run Completed'
              : 'Standby / Ready'}
          </span>
        </div>
      </div>

      {/* 2. Main Progress Layout (Left Progress & Metrics + Right Logs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Progress Ring, Eval Info, and 4 Metric Cards (Col 8) */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          {/* Top Row: Circular Ring + Progress Bar Info */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            {/* Circular Progress Gauge */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-200"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-[#7C6AF2] transition-all duration-500 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
                <span className="text-sm font-black text-[#18213B]">
                  {progress.currentRun} / {progress.totalRuns}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  Runs Completed
                </span>
              </div>
            </div>

            {/* Evaluation Details & Linear Progress Bar */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Evaluating Configuration
              </div>
              <div className="text-lg font-black text-[#18213B] tracking-tight mt-0.5">
                {progress.configurationName}
              </div>

              {/* Linear Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7C6AF2] to-[#B4A8FF] transition-all duration-500 ease-out"
                  style={{ width: `${progress.progressPct}%` }}
                />
              </div>

              {/* Progress Labels */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mt-1.5">
                <span className="text-[#7C6AF2]">{progress.statusMessage}</span>
                <span>
                  {progress.estimatedTimeRemaining
                    ? `Estimated time remaining: ${progress.estimatedTimeRemaining}`
                    : 'Calculation complete'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Grid: 4 Live Metric Badges matching reference */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Current Latency */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Current Latency
                </span>
                <span className="text-xs font-black text-[#18213B] block mt-0.5">
                  {progress.currentLatencyMs !== null
                    ? `${progress.currentLatencyMs} ms`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Generated Tokens */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7C6AF2] flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Generated Tokens
                </span>
                <span className="text-xs font-black text-[#18213B] block mt-0.5">
                  {progress.generatedTokens
                    ? `${progress.generatedTokens.current} / ${progress.generatedTokens.total}`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Current Memory */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Current Memory
                </span>
                <span className="text-xs font-black text-[#18213B] block mt-0.5">
                  {progress.currentMemoryGb !== null
                    ? `${progress.currentMemoryGb} GB`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Throughput */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Throughput
                </span>
                <span className="text-xs font-black text-[#18213B] block mt-0.5">
                  {progress.currentThroughputToks !== null
                    ? `${progress.currentThroughputToks} tok/s`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Logs Panel (Col 4) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-xs font-bold text-[#18213B]">Live Logs</span>
            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Log Lines Container */}
          <div className="flex-1 min-h-[140px] max-h-[160px] overflow-y-auto py-2 flex flex-col gap-1.5 font-mono text-[11px]">
            {progress.logs.length === 0 ? (
              <div className="text-slate-400 text-xs italic text-center py-6">
                No active execution events
              </div>
            ) : (
              progress.logs.map((log) => {
                const isHighlight = log.level === 'active';
                const dotColor =
                  log.level === 'active'
                    ? 'bg-[#7C6AF2]'
                    : log.level === 'success'
                    ? 'bg-emerald-500'
                    : log.level === 'warn'
                    ? 'bg-amber-500'
                    : log.level === 'error'
                    ? 'bg-rose-500'
                    : 'bg-blue-400';

                return (
                  <div
                    key={log.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
                      isHighlight
                        ? 'bg-purple-100/70 text-[#5B46D8] font-bold'
                        : 'text-slate-600 hover:bg-white/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {log.timestamp}
                    </span>
                    <span className="truncate">{log.message}</span>
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
