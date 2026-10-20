import React from 'react';
import { OverviewMetrics } from '../../types';
import { Zap, Gauge, Cpu, Maximize2, ArrowDown, ArrowUp } from 'lucide-react';

interface CompactMetricsStripProps {
  metrics: OverviewMetrics;
}

export const CompactMetricsStrip: React.FC<CompactMetricsStripProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 select-none">
      {/* 1. Inference Latency Card */}
      <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-card flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEEBFF] text-[#8174F5] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 fill-[#8174F5]/20 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500">Inference Latency</span>
            <div className="text-xl font-bold text-[#18213B] tracking-tight">
              {metrics.inferenceLatencyMs} ms
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/80">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <ArrowDown className="w-3 h-3" />
            <span>{Math.abs(metrics.inferenceLatencyChangePct)}%</span>
          </div>

          {/* Mini decorative SVG Sparkline */}
          <svg className="w-24 h-6 overflow-visible text-[#8174F5]" viewBox="0 0 100 25">
            <path
              d="M0,18 Q15,10 30,16 T60,8 T85,14 T100,6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 2. Generation Speed Card */}
      <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-card flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FF] text-[#5598F7] flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500">Generation Speed</span>
            <div className="text-xl font-bold text-[#18213B] tracking-tight">
              {metrics.generationSpeedToks} tok/s
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/80">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <ArrowUp className="w-3 h-3" />
            <span>{metrics.generationSpeedChangePct}%</span>
          </div>

          {/* Mini decorative SVG Sparkline */}
          <svg className="w-24 h-6 overflow-visible text-[#5598F7]" viewBox="0 0 100 25">
            <path
              d="M0,15 Q20,20 40,12 T70,16 T90,6 T100,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 3. GPU Memory Card */}
      <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEEBFF] text-[#8174F5] flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500">GPU Memory</span>
              <div className="text-xl font-bold text-[#18213B] tracking-tight">
                {metrics.gpuMemoryUsedGb} GB <span className="text-sm font-normal text-slate-400">/ {metrics.gpuMemoryTotalGb} GB</span>
              </div>
            </div>
          </div>

          <button
            title="Expand GPU details"
            className="text-slate-400 hover:text-[#18213B] transition-colors p-1 rounded-md"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100/80">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
            <span>Allocation</span>
            <span className="font-semibold text-[#18213B]">{metrics.gpuMemoryUsagePct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8174F5] to-[#5598F7] transition-all duration-500"
              style={{ width: `${metrics.gpuMemoryUsagePct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
