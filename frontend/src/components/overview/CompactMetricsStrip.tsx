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
      <div className="p-4 rounded-[20px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F3F0FF] text-[#7C6AF2] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <span className="text-[12px] font-medium text-slate-500 block">
              Inference Latency
            </span>
            <div className="text-[24px] leading-tight font-extrabold text-[#18213B] tracking-tight mt-0.5">
              {metrics.inferenceLatencyMs}{' '}
              <span className="text-[18px] font-bold">ms</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between mt-2 pl-12">
          <div className="flex items-center gap-0.5 text-[12px] font-bold text-[#10B981]">
            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{Math.abs(metrics.inferenceLatencyChangePct)}%</span>
          </div>

          {/* Crisp Angular Sparkline */}
          <svg className="w-28 h-8 overflow-visible" viewBox="0 0 110 30">
            <defs>
              <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8174F5" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#8174F5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0,26 L20,21 L38,14 L56,20 L74,10 L92,16 L110,4 L110,30 L0,30 Z"
              fill="url(#latencyGrad)"
            />
            <polyline
              points="0,26 20,21 38,14 56,20 74,10 92,16 110,4"
              fill="none"
              stroke="#7C6AF2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* 2. Generation Speed Card */}
      <div className="p-4 rounded-[20px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F0F4FF] text-[#6366F1] flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <span className="text-[12px] font-medium text-slate-500 block">
              Generation Speed
            </span>
            <div className="text-[24px] leading-tight font-extrabold text-[#18213B] tracking-tight mt-0.5">
              {metrics.generationSpeedToks}{' '}
              <span className="text-[18px] font-bold">tok/s</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between mt-2 pl-12">
          <div className="flex items-center gap-0.5 text-[12px] font-bold text-[#10B981]">
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{metrics.generationSpeedChangePct}%</span>
          </div>

          {/* Crisp Blue Sparkline */}
          <svg className="w-28 h-8 overflow-visible" viewBox="0 0 110 30">
            <defs>
              <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0,26 L22,19 L40,24 L60,14 L78,19 L95,12 L110,4 L110,30 L0,30 Z"
              fill="url(#speedGrad)"
            />
            <polyline
              points="0,26 22,19 40,24 60,14 78,19 95,12 110,4"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* 3. GPU Memory Card */}
      <div className="p-4 rounded-[20px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F3F0FF] text-[#7C6AF2] flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <span className="text-[12px] font-medium text-slate-500 block">
                GPU Memory
              </span>
              <div className="text-[24px] leading-tight font-extrabold text-[#18213B] tracking-tight mt-0.5">
                {metrics.gpuMemoryUsedGb} GB{' '}
                <span className="text-[15px] font-normal text-slate-400">
                  / {metrics.gpuMemoryTotalGb} GB
                </span>
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

        {/* Inline Progress Bar & Percentage Matching Reference */}
        <div className="flex items-center gap-3 mt-3 pt-1">
          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C6AF2] to-[#A78BFA] transition-all duration-500"
              style={{ width: `${metrics.gpuMemoryUsagePct}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold text-slate-500 shrink-0">
            {metrics.gpuMemoryUsagePct}%
          </span>
        </div>
      </div>
    </div>
  );
};