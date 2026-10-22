import React, { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { OptimizationCandidate, OptimizationConstraints } from '../../types/optimizationLab';
import { computeParetoFrontierPoints } from '../../lib/optimization-lab/optimizationLabService';
import { Check } from 'lucide-react';

interface ParetoPlotViewProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
  constraints?: OptimizationConstraints;
}

export const ParetoPlotView: React.FC<ParetoPlotViewProps> = ({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  constraints: _constraints,
}) => {
  const chartRef = useRef<ReactECharts>(null);

  // Separate points by status for series assignment
  const {
    feasiblePoints,
    nearFeasiblePoints,
    rejectedPoints,
    unprofiledPoints,
    selectedPoint,
  } = useMemo(() => {
    const feasible: Array<[number, number, OptimizationCandidate]> = [];
    const nearFeasible: Array<[number, number, OptimizationCandidate]> = [];
    const rejected: Array<[number, number, OptimizationCandidate]> = [];
    const unprofiled: Array<[number, number, OptimizationCandidate]> = [];
    let selected: [number, number, OptimizationCandidate] | null = null;

    candidates.forEach((c) => {
      const mem = c.memoryUsageGb ?? 0;
      const lat = c.inferenceLatencyMs ?? 0;
      const pt: [number, number, OptimizationCandidate] = [mem, lat, c];

      if (selectedCandidate && c.id === selectedCandidate.id) {
        selected = pt;
      }

      if (c.status === 'unprofiled' || lat === 0) {
        unprofiled.push([mem, 20, c]); // bottom row indicator for unprofiled
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
    };
  }, [candidates, selectedCandidate]);

  // Compute smooth Pareto frontier points
  const paretoFrontierPoints = useMemo(() => {
    return computeParetoFrontierPoints(candidates);
  }, [candidates]);

  // ECharts Option configuration
  const chartOption = useMemo<EChartsOption>(() => {
    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 600,
      grid: {
        top: 25,
        right: 25,
        bottom: 35,
        left: 55,
        containLabel: false,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#18213B', fontSize: 12, fontFamily: 'inherit' },
        extraCssText: 'box-shadow: 0 8px 24px rgba(24, 33, 59, 0.08); border-radius: 12px; backdrop-filter: blur(8px);',
        formatter: (params: any) => {
          if (params.seriesType === 'line') {
            return `<div class="font-bold text-xs text-[#7C6AF2]">Pareto Optimal Frontier</div><div class="text-[11px] text-slate-500 mt-0.5">Non-dominated latency vs memory boundary</div>`;
          }
          const cand: OptimizationCandidate = params.data?.[2];
          if (!cand) return '';

          const statusColor =
            cand.status === 'feasible'
              ? '#10B981'
              : cand.status === 'near_feasible'
              ? '#F59E0B'
              : cand.status === 'rejected'
              ? '#EF4444'
              : '#94A3B8';

          const statusLabel =
            cand.status === 'feasible'
              ? 'Feasible'
              : cand.status === 'near_feasible'
              ? 'Near Feasible'
              : cand.status === 'rejected'
              ? 'Rejected'
              : 'Unprofiled';

          return `
            <div style="min-width: 170px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 13px; color: #18213B;">${cand.name}</span>
                <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; background: ${statusColor}15; padding: 2px 6px; border-radius: 6px;">
                  ${statusLabel}
                </span>
              </div>
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
                Memory: <strong style="color: #18213B;">${cand.memoryUsageGb !== null ? `${cand.memoryUsageGb} GB` : 'Unmeasured'}</strong>
              </div>
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
                Latency: <strong style="color: #18213B;">${cand.inferenceLatencyMs !== null ? `${cand.inferenceLatencyMs} ms` : 'Unmeasured'}</strong>
              </div>
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
                Quality: <strong style="color: #18213B;">${cand.qualityScore !== null ? cand.qualityScore : 'Unrated'}</strong>
              </div>
              ${cand.generationSpeedToks ? `<div style="font-size: 11px; color: #64748B;">Speed: <strong style="color: #18213B;">${cand.generationSpeedToks} tok/s</strong></div>` : ''}
              ${cand.rejectionReasons.length > 0 ? `<div style="font-size: 10px; color: #EF4444; margin-top: 6px; border-top: 1px solid #F1F5F9; padding-top: 4px;">⚠ ${cand.rejectionReasons[0]}</div>` : ''}
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'Memory Usage (GB)',
        nameLocation: 'middle',
        nameGap: 24,
        min: 0,
        max: 16,
        splitNumber: 8,
        nameTextStyle: {
          color: '#64748B',
          fontSize: 11,
          fontWeight: 600,
        },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          fontWeight: 600,
          formatter: '{value}',
        },
        splitLine: {
          lineStyle: { color: '#F1F5F9', type: 'dashed' },
        },
      },
      yAxis: {
        type: 'log',
        name: 'Inference Latency (ms)',
        nameLocation: 'middle',
        nameGap: 40,
        min: 10,
        max: 10000,
        logBase: 10,
        nameTextStyle: {
          color: '#64748B',
          fontSize: 11,
          fontWeight: 600,
        },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          fontWeight: 600,
          formatter: (value: number) => {
            if (value >= 1000) return `${value / 1000}K`;
            return `${value}`;
          },
        },
        splitLine: {
          lineStyle: { color: '#F1F5F9', type: 'dashed' },
        },
      },
      series: [
        // 1. Pareto Frontier Smooth Curve
        {
          name: 'Pareto Frontier',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: paretoFrontierPoints,
          lineStyle: {
            color: '#8B5CF6',
            width: 2,
            type: 'dashed',
          },
          z: 2,
        },
        // 2. Unprofiled Candidates (Soft Slate)
        {
          name: 'Unprofiled',
          type: 'scatter',
          symbolSize: (data: any) => (data?.[2]?.isCurrentModelVariant ? 8 : 6),
          data: unprofiledPoints as any,
          itemStyle: {
            color: '#94A3B8',
            opacity: 0.5,
          },
          z: 3,
        },
        // 3. Rejected Candidates (Coral / Red)
        {
          name: 'Rejected',
          type: 'scatter',
          symbolSize: (data: any) => (data?.[2]?.isCurrentModelVariant ? 10 : 7),
          data: rejectedPoints as any,
          itemStyle: {
            color: '#EF4444',
            opacity: 0.85,
          },
          z: 4,
        },
        // 4. Near Feasible Candidates (Amber)
        {
          name: 'Near Feasible',
          type: 'scatter',
          symbolSize: (data: any) => (data?.[2]?.isCurrentModelVariant ? 11 : 8),
          data: nearFeasiblePoints as any,
          itemStyle: {
            color: '#F59E0B',
            opacity: 0.9,
          },
          z: 5,
        },
        // 5. Feasible Candidates (Emerald Green)
        {
          name: 'Feasible',
          type: 'scatter',
          symbolSize: (data: any) => (data?.[2]?.isCurrentModelVariant ? 12 : 9),
          data: feasiblePoints as any,
          itemStyle: {
            color: '#10B981',
            opacity: 0.95,
          },
          z: 6,
        },
        // 6. Selected Candidate Target Highlight
        ...(selectedPoint
          ? [
              {
                name: 'Selected',
                type: 'effectScatter',
                symbolSize: 18,
                rippleEffect: {
                  brushType: 'stroke',
                  scale: 2.4,
                  period: 3,
                },
                data: [selectedPoint] as any,
                itemStyle: {
                  color: '#8B5CF6',
                  shadowBlur: 10,
                  shadowColor: '#8B5CF6',
                },
                label: {
                  show: true,
                  position: 'top',
                  distance: 12,
                  formatter: (params: any) => {
                    const c: OptimizationCandidate = params.data?.[2];
                    return `{box|${c.name}\n${c.memoryUsageGb} GB · ${c.inferenceLatencyMs} ms · ${c.qualityScore}}`;
                  },
                  rich: {
                    box: {
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: [4, 8],
                      color: '#18213B',
                      fontSize: 10,
                      fontWeight: 700,
                      shadowBlur: 8,
                      shadowColor: 'rgba(24, 33, 59, 0.08)',
                      align: 'center',
                    },
                  },
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
  ]);

  // Chart point click handler
  const onEvents = useMemo(() => {
    return {
      click: (params: any) => {
        if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
          const candidate: OptimizationCandidate = params.data?.[2];
          if (candidate) {
            onSelectCandidate(candidate);
          }
        }
      },
    };
  }, [onSelectCandidate]);

  // Synchronized table candidates: current model variants
  const tableCandidates = useMemo(() => {
    return candidates.filter((c) => c.isCurrentModelVariant);
  }, [candidates]);

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Main ECharts Plot Container */}
      <div className="relative w-full h-[290px] bg-slate-50/40 rounded-xl border border-slate-100 p-1">
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>

      {/* 2. Legend Row matching the reference screenshot */}
      <div className="flex items-center justify-center gap-6 py-1 text-[11px] font-semibold text-slate-500 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <span>Feasible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <span>Near Feasible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span>Rejected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
          <span>Unprofiled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-[#8B5CF6]" />
          <span>Pareto Frontier</span>
        </div>
      </div>

      {/* 3. Synchronized Performance Mini-Table matching the screenshot */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/80 sticky top-0 z-10 backdrop-blur-sm">
                <th className="py-2.5 pl-4 pr-1 w-8"></th>
                <th className="py-2.5 px-3">Configuration</th>
                <th className="py-2.5 px-3">Quantization</th>
                <th className="py-2.5 px-3">Memory (GB)</th>
                <th className="py-2.5 px-3">Latency (ms)</th>
                <th className="py-2.5 px-3">Quality Score</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableCandidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;

                const statusBadge =
                  cand.status === 'feasible' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Feasible</span>
                    </span>
                  ) : cand.status === 'near_feasible' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Near Feasible</span>
                    </span>
                  ) : cand.status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>Rejected</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>Unprofiled</span>
                    </span>
                  );

                return (
                  <tr
                    key={cand.id}
                    onClick={() => onSelectCandidate(cand)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-50/60 font-semibold'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Radio / Checkmark */}
                    <td className="py-2.5 pl-4 pr-1">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </td>

                    {/* Configuration */}
                    <td className="py-2.5 px-3 font-bold text-[#18213B]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cand.status === 'feasible'
                              ? 'bg-emerald-500'
                              : cand.status === 'near_feasible'
                              ? 'bg-amber-500'
                              : cand.status === 'rejected'
                              ? 'bg-red-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span>{cand.name}</span>
                      </div>
                    </td>

                    {/* Quantization */}
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {cand.quantization}
                    </td>

                    {/* Memory */}
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {cand.memoryUsageGb !== null ? cand.memoryUsageGb : '—'}
                    </td>

                    {/* Latency */}
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {cand.inferenceLatencyMs !== null ? cand.inferenceLatencyMs : '—'}
                    </td>

                    {/* Quality */}
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {cand.qualityScore !== null ? cand.qualityScore : '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">{statusBadge}</td>

                    {/* Actions */}
                    <td className="py-2.5 pr-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCandidate(cand);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all"
                      >
                        View
                      </button>
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
