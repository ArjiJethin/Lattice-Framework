import React, { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { OptimizationCandidate, OptimizationConstraints } from '../../types/optimizationLab';
import { computeParetoFrontierPoints } from '../../lib/optimization-lab/optimizationLabService';
import { StatusBadge } from '../ui/primitives';

interface ParetoPlotViewProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
  recommendedCandidateId?: string | null;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
  constraints: OptimizationConstraints;
}

export const ParetoPlotView: React.FC<ParetoPlotViewProps> = ({
  candidates,
  selectedCandidate,
  recommendedCandidateId,
  onSelectCandidate,
  constraints,
}) => {
  const chartRef = useRef<ReactECharts>(null);

  const {
    feasiblePoints,
    nearFeasiblePoints,
    rejectedPoints,
    unprofiledPoints,
    selectedPoint,
    unplottableCount,
  } = useMemo(() => {
    const feasible: Array<[number, number, OptimizationCandidate]> = [];
    const nearFeasible: Array<[number, number, OptimizationCandidate]> = [];
    const rejected: Array<[number, number, OptimizationCandidate]> = [];
    const unprofiled: Array<[number, number, OptimizationCandidate]> = [];
    let selected: [number, number, OptimizationCandidate] | null = null;
    let unplottable = 0;

    candidates.forEach((c) => {
      // Only plot points that have actual numeric memory & latency coordinates
      if (c.memoryUsageGb === null || c.inferenceLatencyMs === null || c.inferenceLatencyMs <= 0) {
        if (c.isCurrentModelVariant) unplottable++;
        return;
      }

      const pt: [number, number, OptimizationCandidate] = [
        c.memoryUsageGb,
        c.inferenceLatencyMs,
        c,
      ];

      if (selectedCandidate && c.id === selectedCandidate.id) {
        selected = pt;
      }

      if (c.status === 'unprofiled') {
        unprofiled.push(pt);
      } else if (c.status === 'feasible') {
        feasible.push(pt);
      } else if (c.status === 'near_feasible') {
        nearFeasible.push(pt);
      } else {
        rejected.push(pt);
      }
    });

    return {
      feasiblePoints: feasible,
      nearFeasiblePoints: nearFeasible,
      rejectedPoints: rejected,
      unprofiledPoints: unprofiled,
      selectedPoint: selected,
      unplottableCount: unplottable,
    };
  }, [candidates, selectedCandidate]);

  const paretoFrontierPoints = useMemo(() => {
    return computeParetoFrontierPoints(candidates);
  }, [candidates]);

  const chartOption = useMemo<EChartsOption>(() => {
    const maxMemBound = Math.max(8, Math.ceil(constraints.maxMemoryGb + 2), 16);

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        top: 24,
        right: 28,
        bottom: 38,
        left: 54,
        containLabel: false,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#FFFFFF',
        borderColor: '#D9DEE7',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#222938', fontSize: 11.5, fontFamily: 'Inter, sans-serif' },
        extraCssText: 'box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border-radius: 6px;',
        formatter: (params: any) => {
          if (params.seriesName === 'Pareto Frontier') {
            return `<div style="font-weight: 600; color: #7562E8;">Pareto Efficiency Frontier</div><div style="font-size: 11px; color: #647187;">Non-dominated memory vs latency boundary</div>`;
          }
          if (params.seriesName === 'Memory Limit' || params.seriesName === 'Latency Limit') {
            return '';
          }
          const cand: OptimizationCandidate | undefined = params.data?.[2];
          if (!cand) return '';

          const memOk = cand.audit.withinMemoryBudget;
          const latOk = cand.audit.meetsLatencyConstraint;
          const qualOk = cand.audit.qualityThresholdSatisfied;

          return `
            <div style="min-width: 190px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #E6EAF0;">
                <span style="font-weight: 600; font-size: 12.5px; color: #222938;">${cand.modelName} · ${cand.quantization}</span>
                <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; color: #647187;">${cand.status.replace('_', ' ')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
                <span style="color: #647187;">Memory:</span>
                <span style="font-family: monospace; font-weight: 600; color: ${memOk === false ? '#DC2626' : '#222938'};">
                  ${cand.memoryUsageGb !== null ? `${cand.memoryUsageGb.toFixed(1)} GB` : '—'} (≤ ${constraints.maxMemoryGb.toFixed(1)} GB)
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
                <span style="color: #647187;">Latency:</span>
                <span style="font-family: monospace; font-weight: 600; color: ${latOk === false ? '#DC2626' : '#222938'};">
                  ${cand.inferenceLatencyMs !== null ? `${cand.inferenceLatencyMs} ms` : '—'} (≤ ${constraints.maxLatencyMs} ms)
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #647187;">Quality:</span>
                <span style="font-family: monospace; font-weight: 600; color: ${qualOk === false ? '#DC2626' : '#222938'};">
                  ${cand.qualityScore !== null ? cand.qualityScore.toFixed(1) : '—'} (≥ ${constraints.minQualityScore})
                </span>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'Memory Footprint (GB)',
        nameLocation: 'middle',
        nameGap: 24,
        min: 0,
        max: maxMemBound,
        splitNumber: 8,
        nameTextStyle: { color: '#647187', fontSize: 11, fontWeight: 600 },
        axisLine: { lineStyle: { color: '#D9DEE7' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#647187',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (val: number) => `${val}G`,
        },
        splitLine: { lineStyle: { color: '#F1F3F7', type: 'dashed' } },
      },
      yAxis: {
        type: 'log',
        name: 'Inference Latency (ms, log scale)',
        nameLocation: 'middle',
        nameGap: 40,
        min: 50,
        max: 2000,
        logBase: 10,
        nameTextStyle: { color: '#647187', fontSize: 11, fontWeight: 600 },
        axisLine: { lineStyle: { color: '#D9DEE7' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#647187',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (val: number) => `${val}`,
        },
        splitLine: { lineStyle: { color: '#E6EAF0', type: 'dashed' } },
      },
      series: [
        // Vertical Max Memory Threshold Line
        {
          name: 'Memory Limit',
          type: 'line',
          symbol: 'none',
          silent: true,
          data: [
            [constraints.maxMemoryGb, 50],
            [constraints.maxMemoryGb, 2000],
          ],
          lineStyle: { color: '#2563EB', width: 1, type: 'dotted', opacity: 0.7 },
          z: 1,
        },
        // Horizontal Max Latency Threshold Line
        {
          name: 'Latency Limit',
          type: 'line',
          symbol: 'none',
          silent: true,
          data: [
            [0, constraints.maxLatencyMs],
            [maxMemBound, constraints.maxLatencyMs],
          ],
          lineStyle: { color: '#D97706', width: 1, type: 'dotted', opacity: 0.7 },
          z: 1,
        },
        // Pareto Frontier Curve
        {
          name: 'Pareto Frontier',
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          data: paretoFrontierPoints,
          lineStyle: { color: '#7562E8', width: 1.75, type: 'dashed' },
          z: 2,
        },
        // Unprofiled Points (with estimated coords)
        {
          name: 'Unprofiled',
          type: 'scatter',
          symbolSize: (data: any) => (data?.[2]?.isCurrentModelVariant ? 8 : 5),
          data: unprofiledPoints as any,
          itemStyle: { color: '#8A94A6', opacity: 0.65 },
          z: 3,
        },
        // Rejected Points
        {
          name: 'Rejected',
          type: 'scatter',
          symbolSize: (data: any) => (data?.[2]?.isCurrentModelVariant ? 9 : 6),
          data: rejectedPoints as any,
          itemStyle: { color: '#DC2626', opacity: 0.85 },
          z: 4,
        },
        // Near Feasible Points
        {
          name: 'Near Feasible',
          type: 'scatter',
          symbolSize: 9,
          data: nearFeasiblePoints as any,
          itemStyle: { color: '#D97706', opacity: 0.9 },
          z: 5,
        },
        // Feasible Points
        {
          name: 'Feasible',
          type: 'scatter',
          symbolSize: (data: any) => (data?.[2]?.isCurrentModelVariant ? 10 : 7),
          data: feasiblePoints as any,
          itemStyle: { color: '#0D8A58', opacity: 0.95 },
          z: 6,
        },
        // Currently Selected / Inspected Point Highlight Ring
        ...(selectedPoint
          ? [
            {
              name: 'Selected',
              type: 'scatter',
              symbolSize: 15,
              data: [selectedPoint] as any,
              itemStyle: {
                color: '#7562E8',
                borderColor: '#FFFFFF',
                borderWidth: 2.5,
                shadowBlur: 6,
                shadowColor: 'rgba(117, 98, 232, 0.45)',
              },
              z: 10,
            },
          ]
          : []),
      ] as any,
    };
  }, [
    feasiblePoints,
    nearFeasiblePoints,
    rejectedPoints,
    unprofiledPoints,
    selectedPoint,
    paretoFrontierPoints,
    constraints.maxMemoryGb,
    constraints.maxLatencyMs,
    constraints.minQualityScore,
  ]);

  const onEvents = useMemo(() => {
    return {
      click: (params: any) => {
        if (params.seriesType === 'scatter') {
          const candidate: OptimizationCandidate | undefined = params.data?.[2];
          if (candidate) {
            onSelectCandidate(candidate);
          }
        }
      },
    };
  }, [onSelectCandidate]);

  const tableCandidates = useMemo(() => {
    return candidates.filter((c) => c.isCurrentModelVariant);
  }, [candidates]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* ECharts Scatter Canvas */}
      <div className="relative w-full h-[270px] bg-[#F8F9FB] rounded-md border border-[#D9DEE7] p-1">
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
        />
      </div>

      {/* Plot Legend & Constraint Reference Key */}
      <div className="flex items-center justify-between px-1 py-0.5 text-[11px] font-medium text-[#647187] flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7562E8] border border-white shadow-2xs" />
            <span className="text-[#222938] font-semibold">Inspected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0D8A58]" />
            <span>Feasible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D97706]" />
            <span>Near Feasible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
            <span>Rejected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8A94A6]" />
            <span>Unprofiled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-[1.5px] border-t border-dashed border-[#7562E8]" />
            <span>Pareto Frontier</span>
          </div>
        </div>

        {unplottableCount > 0 && (
          <span className="text-[10.5px] font-mono text-[#8A94A6]">
            {unplottableCount} unmeasured variant(s) shown in table below
          </span>
        )}
      </div>

      {/* Active Model Variants Quick-Select Table */}
      <div className="w-full overflow-hidden rounded-md border border-[#D9DEE7] bg-white">
        <div className="overflow-x-auto max-h-[210px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F8F9FB] text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider border-b border-[#E6EAF0] sticky top-0 z-10">
                <th className="py-2 pl-3 pr-1 w-6"></th>
                <th className="py-2 px-2.5">Variant</th>
                <th className="py-2 px-2.5">Profile Tag</th>
                <th className="py-2 px-2.5 text-right">Memory</th>
                <th className="py-2 px-2.5 text-right">Latency</th>
                <th className="py-2 px-2.5 text-right">Throughput</th>
                <th className="py-2 px-2.5 text-right">Quality</th>
                <th className="py-2 px-2.5">Feasibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EAF0]">
              {tableCandidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                const isRecommended = recommendedCandidateId === cand.id;
                const statusTone =
                  cand.status === 'feasible'
                    ? 'success'
                    : cand.status === 'near_feasible'
                      ? 'warning'
                      : cand.status === 'rejected'
                        ? 'danger'
                        : 'neutral';

                return (
                  <tr
                    key={cand.id}
                    onClick={() => onSelectCandidate(cand)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#F2F0FD] font-semibold' : 'hover:bg-[#F8F9FB]'
                      }`}
                  >
                    <td className="py-2 pl-3 pr-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full block ${isSelected ? 'bg-[#7562E8]' : 'bg-transparent'
                          }`}
                      />
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[12px] text-[#222938] flex items-center gap-1.5">
                      <span>{cand.quantization}</span>
                      {isRecommended && (
                        <span className="px-1.5 py-0.2 rounded-sm text-[9.5px] font-sans font-semibold bg-[#ECFDF5] text-[#0D8A58] border border-[#A7F3D0]">
                          Recommended
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-[11.5px] text-[#647187]">
                      {cand.description}
                    </td>
                    <td
                      className={`py-2 px-2.5 font-mono text-right tabular-nums ${cand.audit.withinMemoryBudget === false
                          ? 'text-[#DC2626]'
                          : 'text-[#222938]'
                        }`}
                    >
                      {cand.memoryUsageGb !== null ? `${cand.memoryUsageGb.toFixed(1)} GB` : '—'}
                    </td>
                    <td
                      className={`py-2 px-2.5 font-mono text-right tabular-nums ${cand.audit.meetsLatencyConstraint === false
                          ? 'text-[#DC2626]'
                          : 'text-[#222938]'
                        }`}
                    >
                      {cand.inferenceLatencyMs !== null ? `${cand.inferenceLatencyMs} ms` : '—'}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-right tabular-nums text-[#222938]">
                      {cand.generationSpeedToks !== null
                        ? `${cand.generationSpeedToks} tok/s`
                        : '—'}
                    </td>
                    <td
                      className={`py-2 px-2.5 font-mono text-right tabular-nums ${cand.audit.qualityThresholdSatisfied === false
                          ? 'text-[#DC2626]'
                          : 'text-[#222938]'
                        }`}
                    >
                      {cand.qualityScore !== null ? cand.qualityScore.toFixed(1) : '—'}
                    </td>
                    <td className="py-2 px-2.5">
                      <StatusBadge tone={statusTone} dot={cand.status === 'feasible'}>
                        {cand.status.replace('_', ' ')}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};