import React, { useMemo } from 'react';
import { OverviewMetrics, PerformanceTrendPoint } from '../../types';
import { Zap, Gauge, Cpu, ArrowDown, ArrowUp } from 'lucide-react';

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
    <div className="flex flex-col gap-2 select-none">
      {/* Provenance Header */}
      <div className="flex items-center justify-between px-0.5 text-[11px] text-[#647187]">
        <span className="uppercase tracking-wider font-semibold text-[#647187]">
          Inference Summary · Active Runtime (Qwen3-1.7B · Q4_K_M)
        </span>
        {dataSourceLabel && (
          <span className="flex items-center gap-1.5 text-[#647187] font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7562E8]" />
            <span>{dataSourceLabel}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Inference Latency Card */}
        <div className="p-3.5 rounded-lg bg-white border border-[#D9DEE7] shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[12px] font-medium text-[#647187] block">
                Inference Latency
              </span>
              <div className="text-[20px] leading-tight font-semibold text-[#222938] tracking-tight mt-1 tabular-nums">
                {metrics.inferenceLatencyMs !== null ? (
                  <>
                    {metrics.inferenceLatencyMs}{' '}
                    <span className="text-[13px] font-medium text-[#647187]">ms</span>
                  </>
                ) : (
                  <span className="text-[#8A94A6] text-[13px] font-normal">Unmeasured</span>
                )}
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-[#F8F9FB] border border-[#E6EAF0] text-[#7562E8] flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-end justify-between mt-3 pt-2 border-t border-[#E6EAF0]">
            {metrics.inferenceLatencyChangePct !== null ? (
              <div
                className={`flex items-center gap-0.5 text-[11.5px] font-mono font-semibold tabular-nums ${metrics.inferenceLatencyChangePct <= 0 ? 'text-[#0D8A58]' : 'text-[#DC2626]'
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
              <span className="text-[11px] text-[#8A94A6]">Baseline</span>
            )}

            {latencySparkline ? (
              <svg className="w-24 h-6 overflow-visible" viewBox="0 0 96 24">
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7562E8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#7562E8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon points={latencySparkline.area} fill="url(#latencyGrad)" />
                <polyline
                  points={latencySparkline.polyline}
                  fill="none"
                  stroke="#7562E8"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span className="text-[10.5px] text-[#8A94A6] font-mono">
                {hasHistory ? '' : 'No history'}
              </span>
            )}
          </div>
        </div>

        {/* 2. Generation Speed Card */}
        <div className="p-3.5 rounded-lg bg-white border border-[#D9DEE7] shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[12px] font-medium text-[#647187] block">
                Generation Speed
              </span>
              <div className="text-[20px] leading-tight font-semibold text-[#222938] tracking-tight mt-1 tabular-nums">
                {metrics.generationSpeedToks !== null ? (
                  <>
                    {metrics.generationSpeedToks}{' '}
                    <span className="text-[13px] font-medium text-[#647187]">tok/s</span>
                  </>
                ) : (
                  <span className="text-[#8A94A6] text-[13px] font-normal">Evaluating</span>
                )}
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-[#F8F9FB] border border-[#E6EAF0] text-[#2563EB] flex items-center justify-center shrink-0">
              <Gauge className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-end justify-between mt-3 pt-2 border-t border-[#E6EAF0]">
            {metrics.generationSpeedChangePct !== null ? (
              <div
                className={`flex items-center gap-0.5 text-[11.5px] font-mono font-semibold tabular-nums ${metrics.generationSpeedChangePct >= 0 ? 'text-[#0D8A58]' : 'text-[#DC2626]'
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
              <span className="text-[11px] text-[#8A94A6]">Baseline</span>
            )}

            {throughputSparkline ? (
              <svg className="w-24 h-6 overflow-visible" viewBox="0 0 96 24">
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon points={throughputSparkline.area} fill="url(#speedGrad)" />
                <polyline
                  points={throughputSparkline.polyline}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span className="text-[10.5px] text-[#8A94A6] font-mono">
                {hasHistory ? '' : 'No history'}
              </span>
            )}
          </div>
        </div>

        {/* 3. GPU Memory Card */}
        <div className="p-3.5 rounded-lg bg-white border border-[#D9DEE7] shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[12px] font-medium text-[#647187] block">
                GPU Memory
              </span>
              <div className="text-[20px] leading-tight font-semibold text-[#222938] tracking-tight mt-1 tabular-nums">
                {metrics.gpuMemoryUsedGb !== null ? (
                  <>
                    {metrics.gpuMemoryUsedGb.toFixed(1)} GB{' '}
                    <span className="text-[13px] font-normal text-[#647187]">
                      / {metrics.gpuMemoryTotalGb.toFixed(1)} GB
                    </span>
                  </>
                ) : (
                  <span className="text-[#8A94A6] text-[13px] font-normal">Unallocated</span>
                )}
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-[#F8F9FB] border border-[#E6EAF0] text-[#0D8A58] flex items-center justify-center shrink-0">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-3 pt-2 border-t border-[#E6EAF0]">
            <div className="flex-1 h-2 rounded-sm bg-[#EEF1F6] overflow-hidden border border-[#D9DEE7]/60">
              <div
                className="h-full bg-[#7562E8] transition-all duration-300"
                style={{ width: `${metrics.gpuMemoryUsagePct || 0}%` }}
              />
            </div>
            <span className="text-[11.5px] font-mono font-semibold text-[#222938] tabular-nums shrink-0">
              {metrics.gpuMemoryUsagePct !== null ? `${metrics.gpuMemoryUsagePct}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};