import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { OptimizationCandidate } from '../../types/optimizationLab';
import { TrendingUp, Zap, HardDrive, Award } from 'lucide-react';

interface MetricsComparisonViewProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
}

export const MetricsComparisonView: React.FC<MetricsComparisonViewProps> = ({
  candidates,
  selectedCandidate,
}) => {
  // Compare selected candidate with top 3 alternatives
  const currentModelCandidates = useMemo(() => {
    return candidates.filter((c) => c.isCurrentModelVariant && c.status !== 'unprofiled');
  }, [candidates]);

  const activeCandidate = selectedCandidate || currentModelCandidates[0];

  const comparisonSet = useMemo(() => {
    if (!activeCandidate) return [];
    const others = currentModelCandidates
      .filter((c) => c.id !== activeCandidate.id)
      .slice(0, 3);
    return [activeCandidate, ...others];
  }, [activeCandidate, currentModelCandidates]);

  // Radar Chart Option
  const radarOption = useMemo<EChartsOption>(() => {
    if (comparisonSet.length === 0) return {};

    const indicators = [
      { name: 'Low Latency\n(Speed)', max: 100 },
      { name: 'Memory Efficiency\n(VRAM)', max: 100 },
      { name: 'Quality Retention\n(Perplexity)', max: 100 },
      { name: 'Throughput\n(tok/s)', max: 100 },
      { name: 'Compression\nRatio', max: 100 },
    ];

    const colors = ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B'];

    const seriesData = comparisonSet.map((cand, idx) => {
      // Normalize metrics to 0-100 scale (higher = better)
      const lat = cand.inferenceLatencyMs ?? 500;
      const speedScore = Math.max(10, Math.min(100, Math.round(100 - (lat / 600) * 80)));

      const mem = cand.memoryUsageGb ?? 8;
      const memScore = Math.max(10, Math.min(100, Math.round(100 - (mem / 8) * 80)));

      const qual = cand.qualityScore ?? 75;
      const qualScore = Math.max(20, Math.min(100, Math.round(qual)));

      const toks = cand.generationSpeedToks ?? 30;
      const tokScore = Math.max(20, Math.min(100, Math.round((toks / 60) * 100)));

      const compScore = Math.max(20, Math.min(100, Math.round(100 - (mem / 10) * 70)));

      return {
        value: [speedScore, memScore, qualScore, tokScore, compScore],
        name: cand.name,
        itemStyle: { color: colors[idx] },
        areaStyle: {
          color: idx === 0 ? 'rgba(139, 92, 246, 0.25)' : 'rgba(0, 0, 0, 0.04)',
        },
        lineStyle: {
          width: idx === 0 ? 3 : 1.5,
          color: colors[idx],
        },
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E8F0',
        padding: [8, 12],
        textStyle: { color: '#18213B', fontSize: 11 },
        extraCssText: 'border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);',
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#64748B', fontSize: 11, fontWeight: 600 },
        itemGap: 16,
      },
      radar: {
        indicator: indicators,
        radius: '65%',
        center: ['50%', '46%'],
        splitNumber: 4,
        axisName: {
          color: '#64748B',
          fontSize: 10,
          fontWeight: 600,
        },
        splitLine: {
          lineStyle: { color: '#E2E8F0' },
        },
        splitArea: {
          areaStyle: {
            color: ['#FFFFFF', '#F8FAFC', '#FFFFFF', '#F8FAFC'],
          },
        },
        axisLine: {
          lineStyle: { color: '#E2E8F0' },
        },
      },
      series: [
        {
          type: 'radar',
          data: seriesData,
        },
      ],
    };
  }, [comparisonSet]);

  if (!activeCandidate) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs">
        No profiled candidates available for metrics comparison.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Multi-Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8B5CF6]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Memory</span>
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-[#18213B]">
              {activeCandidate.memoryUsageGb !== null ? `${activeCandidate.memoryUsageGb} GB` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">VRAM Footprint</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#3B82F6]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Latency</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-[#18213B]">
              {activeCandidate.inferenceLatencyMs !== null ? `${activeCandidate.inferenceLatencyMs} ms` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">Per-Token Latency</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#10B981]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Speed</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-[#18213B]">
              {activeCandidate.generationSpeedToks !== null ? `${activeCandidate.generationSpeedToks} tok/s` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">Generation Speed</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#F59E0B]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Quality</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-[#18213B]">
              {activeCandidate.qualityScore !== null ? activeCandidate.qualityScore : '—'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">Benchmark Score</span>
          </div>
        </div>
      </div>

      {/* Radar Chart Visualizer */}
      <div className="w-full h-[320px] bg-white rounded-xl border border-slate-200/90 p-2 shadow-2xs">
        <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};
