import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { OptimizationCandidate, OptimizationConstraints } from '../../types/optimizationLab';
import { TrendingUp, Zap, HardDrive, Award } from 'lucide-react';

interface MetricsComparisonViewProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
  recommendedCandidateId?: string | null;
  constraints: OptimizationConstraints;
  onSelectCandidate?: (candidate: OptimizationCandidate) => void;
}

export const MetricsComparisonView: React.FC<MetricsComparisonViewProps> = ({
  candidates,
  selectedCandidate,
  recommendedCandidateId,
  constraints,
  onSelectCandidate,
}) => {
  const currentModelCandidates = useMemo(() => {
    return candidates.filter(
      (c) => c.isCurrentModelVariant && c.inferenceLatencyMs !== null
    );
  }, [candidates]);

  const activeCandidate = selectedCandidate || currentModelCandidates[0] || null;

  const barOption = useMemo<EChartsOption>(() => {
    if (currentModelCandidates.length === 0) return {};

    const labels = currentModelCandidates.map((c) => c.quantization);
    const latencies = currentModelCandidates.map((c) => c.inferenceLatencyMs ?? 0);
    const speeds = currentModelCandidates.map((c) => c.generationSpeedToks ?? 0);
    const qualities = currentModelCandidates.map((c) => c.qualityScore ?? 0);

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D9DEE7',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#222938', fontSize: 11.5, fontFamily: 'Inter, sans-serif' },
        extraCssText: 'border-radius: 6px; box-shadow: 0 4px 12px rgba(15,23,42,0.08);',
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#647187', fontSize: 11, fontWeight: 500 },
        itemGap: 18,
      },
      grid: {
        top: 20,
        left: 48,
        right: 48,
        bottom: 34,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#D9DEE7' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#222938',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'JetBrains Mono, monospace',
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Latency (ms)',
          nameTextStyle: { color: '#647187', fontSize: 10.5 },
          axisLabel: {
            color: '#647187',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
          },
          splitLine: { lineStyle: { color: '#E6EAF0', type: 'dashed' } },
        },
        {
          type: 'value',
          name: 'Score / tok/s',
          min: 0,
          max: 100,
          nameTextStyle: { color: '#647187', fontSize: 10.5 },
          axisLabel: {
            color: '#647187',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Latency (ms)',
          type: 'bar',
          barMaxWidth: 22,
          data: latencies,
          itemStyle: { color: '#7562E8', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Throughput (tok/s)',
          type: 'bar',
          yAxisIndex: 1,
          barMaxWidth: 22,
          data: speeds,
          itemStyle: { color: '#2563EB', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Quality (/100)',
          type: 'line',
          yAxisIndex: 1,
          data: qualities,
          symbolSize: 6,
          itemStyle: { color: '#0D8A58' },
          lineStyle: { width: 2, color: '#0D8A58' },
        },
      ],
    };
  }, [currentModelCandidates]);

  if (!activeCandidate) {
    return (
      <div className="py-8 text-center text-[#647187] text-[12px]">
        No measured candidate configurations available for comparison.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Inspected Candidate Metric Cards with Constraint Deltas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#647187]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Memory</span>
            <HardDrive className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1.5">
            <span className="text-[16px] font-semibold font-mono text-[#222938] tabular-nums block">
              {activeCandidate.memoryUsageGb !== null
                ? `${activeCandidate.memoryUsageGb.toFixed(1)} GB`
                : '—'}
            </span>
            <span
              className={`text-[10.5px] font-mono tabular-nums block mt-0.5 ${activeCandidate.audit.withinMemoryBudget === false
                  ? 'text-[#DC2626]'
                  : 'text-[#0D8A58]'
                }`}
            >
              Budget: ≤ {constraints.maxMemoryGb.toFixed(1)} GB
            </span>
          </div>
        </div>

        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#647187]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Latency</span>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1.5">
            <span className="text-[16px] font-semibold font-mono text-[#222938] tabular-nums block">
              {activeCandidate.inferenceLatencyMs !== null
                ? `${activeCandidate.inferenceLatencyMs} ms`
                : '—'}
            </span>
            <span
              className={`text-[10.5px] font-mono tabular-nums block mt-0.5 ${activeCandidate.audit.meetsLatencyConstraint === false
                  ? 'text-[#DC2626]'
                  : 'text-[#0D8A58]'
                }`}
            >
              Limit: ≤ {constraints.maxLatencyMs} ms
            </span>
          </div>
        </div>

        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#647187]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">
              Throughput
            </span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1.5">
            <span className="text-[16px] font-semibold font-mono text-[#222938] tabular-nums block">
              {activeCandidate.generationSpeedToks !== null
                ? `${activeCandidate.generationSpeedToks} tok/s`
                : '—'}
            </span>
            <span className="text-[10.5px] text-[#647187] block mt-0.5">
              Sustained decode rate
            </span>
          </div>
        </div>

        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#647187]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider">Quality</span>
            <Award className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1.5">
            <span className="text-[16px] font-semibold font-mono text-[#222938] tabular-nums block">
              {activeCandidate.qualityScore !== null
                ? `${activeCandidate.qualityScore.toFixed(1)} / 100`
                : '—'}
            </span>
            <span
              className={`text-[10.5px] font-mono tabular-nums block mt-0.5 ${activeCandidate.audit.qualityThresholdSatisfied === false
                  ? 'text-[#DC2626]'
                  : 'text-[#0D8A58]'
                }`}
            >
              Min: ≥ {constraints.minQualityScore}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Metric Bar & Line Chart across Active Model Variants */}
      <div className="w-full h-[250px] bg-[#F8F9FB] rounded-md border border-[#D9DEE7] p-2">
        <ReactECharts
          option={barOption}
          style={{ height: '100%', width: '100%' }}
          onEvents={{
            click: (params: any) => {
              const target = currentModelCandidates[params.dataIndex];
              if (target && onSelectCandidate) {
                onSelectCandidate(target);
              }
            },
          }}
        />
      </div>

      <div className="text-[11px] text-[#647187] flex items-center justify-between px-1">
        <span>
          Currently inspecting:{' '}
          <strong className="font-mono text-[#222938]">{activeCandidate.quantization}</strong>
          {recommendedCandidateId === activeCandidate.id && (
            <span className="text-[#0D8A58] font-semibold ml-1.5">(Solver Recommended)</span>
          )}
        </span>
        <span>Click any bar to inspect configuration</span>
      </div>
    </div>
  );
};