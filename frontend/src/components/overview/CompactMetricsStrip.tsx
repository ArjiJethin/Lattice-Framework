import React, { useMemo } from 'react';
import { OverviewMetrics, PerformanceTrendPoint } from '../../types';
import { Zap, Gauge, Cpu, Maximize2, ArrowDown, ArrowUp } from 'lucide-react';

interface CompactMetricsStripProps {
  metrics: OverviewMetrics;
  historicalPoints?: PerformanceTrendPoint[];
  dataSourceLabel?: string;
}

export const CompactMetricsStrip: React.FC<CompactMetricsStripProps> = ({
  metrics,
  historicalPoints = [],
  dataSourceLabel,
}) => {
  const hasHistory = historicalPoints.length >= 2;

  // Compute dynamic SVG sparkline paths from real historical points
  const latencySparkline = useMemo(() => {
    if (!hasHistory) return null;
    const pts = historicalPoints.slice(-8);
    const values = pts.map((p) => p.latencyMs);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 96;
    const height = 24;
    const step = width / (pts.length - 1);

    const coords = pts.map((p, i) => {
      const x = i * step;
      const y = height - ((p.latencyMs - min) / range) * (height - 6) - 3;
      return [x, y];
    });

    const polyline = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `0,${height} ${polyline} ${width},${height}`;

    return { polyline, area, width, height };
  }, [historicalPoints, hasHistory]);

  const throughputSparkline = useMemo(() => {
    if (!hasHistory) return null;
    const pts = historicalPoints.slice(-8);
    const values = pts.map((p) => p.throughputToks);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 96;
    const height = 24;
    const step = width / (pts.length - 1);

    const coords = pts.map((p, i) => {
      const x = i * step;
      const y = height - ((p.throughputToks - min) / range) * (height - 6) - 3;
      return [x, y];
    });

    const polyline = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `0,${height} ${polyline} ${width},${height}`;

    return { polyline, area, width, height };
  }, [historicalPoints, hasHistory]);

  return (
    <div className="flex flex-col gap-1.5 select-none">
      {/* Provenance Header Badge */}
      <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-medium">
        <span className="uppercase tracking-wider font-bold text-slate-500 text-[10px]">
          Inference Summary · Active Runtime (Qwen3-1.7B · Q4_K_M)
        </span>
        {dataSourceLabel && (
          <span className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C6AF2]" />
            <span>{dataSourceLabel}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 1. Inference Latency Card */}
        <div className="p-3 rounded-[16px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F3F0FF] text-[#7C6AF2] flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Inference Latency
              </span>
              <div className="text-[19px] leading-tight font-extrabold text-[#18213B] tracking-tight mt-0.5">
                {metrics.inferenceLatencyMs !== null ? (
                  <>
                    {metrics.inferenceLatencyMs}{' '}
                    <span className="text-[13px] font-bold">ms</span>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm font-normal italic">— Unmeasured</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between mt-1.5 pl-9">
            {metrics.inferenceLatencyChangePct !== null ? (
              <div
                className={`flex items-center gap-0.5 text-[11px] font-bold ${
                  metrics.inferenceLatencyChangePct <= 0 ? 'text-[#10B981]' : 'text-rose-500'
                }`}
              >
                {metrics.inferenceLatencyChangePct <= 0 ? (
                  <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                )}
                <span>{Math.abs(metrics.inferenceLatencyChangePct)}%</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Baseline</span>
            )}

            {/* Sparkline only rendered when sufficient historical runs exist */}
            {latencySparkline ? (
              <svg className="w-24 h-6 overflow-visible" viewBox="0 0 96 24">
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8174F5" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8174F5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon points={latencySparkline.area} fill="url(#latencyGrad)" />
                <polyline
                  points={latencySparkline.polyline}
                  fill="none"
                  stroke="#7C6AF2"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span className="text-[9.5px] text-slate-400 italic font-mono">
                {hasHistory ? '' : 'No history'}
              </span>
            )}
          </div>
        </div>

        {/* 2. Generation Speed Card */}
        <div className="p-3 rounded-[16px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F0F4FF] text-[#6366F1] flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Generation Speed
              </span>
              <div className="text-[19px] leading-tight font-extrabold text-[#18213B] tracking-tight mt-0.5">
                {metrics.generationSpeedToks !== null ? (
                  <>
                    {metrics.generationSpeedToks}{' '}
                    <span className="text-[13px] font-bold">tok/s</span>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm font-normal italic">— Evaluating</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between mt-1.5 pl-9">
            {metrics.generationSpeedChangePct !== null ? (
              <div
                className={`flex items-center gap-0.5 text-[11px] font-bold ${
                  metrics.generationSpeedChangePct >= 0 ? 'text-[#10B981]' : 'text-rose-500'
                }`}
              >
                {metrics.generationSpeedChangePct >= 0 ? (
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                )}
                <span>{metrics.generationSpeedChangePct}%</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Baseline</span>
            )}

            {/* Sparkline only rendered when sufficient historical runs exist */}
            {throughputSparkline ? (
              <svg className="w-24 h-6 overflow-visible" viewBox="0 0 96 24">
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon points={throughputSparkline.area} fill="url(#speedGrad)" />
                <polyline
                  points={throughputSparkline.polyline}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span className="text-[9.5px] text-slate-400 italic font-mono">
                {hasHistory ? '' : 'No history'}
              </span>
            )}
          </div>
        </div>

        {/* 3. GPU Memory Card */}
        <div className="p-3 rounded-[16px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#F3F0FF] text-[#7C6AF2] flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">
                  GPU Memory
                </span>
                <div className="text-[19px] leading-tight font-extrabold text-[#18213B] tracking-tight mt-0.5">
                  {metrics.gpuMemoryUsedGb !== null ? (
                    <>
                      {metrics.gpuMemoryUsedGb.toFixed(1)} GB{' '}
                      <span className="text-[13px] font-normal text-slate-400">
                        / {metrics.gpuMemoryTotalGb} GB
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm font-normal italic">— Unallocated</span>
                  )}
                </div>
              </div>
            </div>

            <button
              title="GPU Resource details"
              className="text-slate-400 hover:text-[#18213B] transition-colors p-1 rounded-md"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Inline Progress Bar & Percentage */}
          <div className="flex items-center gap-2.5 mt-2 pt-0.5">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C6AF2] to-[#A78BFA] transition-all duration-500"
                style={{ width: `${metrics.gpuMemoryUsagePct || 0}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              {metrics.gpuMemoryUsagePct !== null ? `${metrics.gpuMemoryUsagePct}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};