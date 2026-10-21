import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { PerformanceTrendData } from '../../types';
import {
  Maximize2,
  ChevronDown,
  Check,
  Activity,
  AlertCircle,
  Loader2,
  Info,
  X,
} from 'lucide-react';

interface PerformanceTrendsChartProps {
  trendData: PerformanceTrendData;
  currentTimeRange?: string;
  onRangeChange?: (range: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

const AVAILABLE_RANGES = [
  'Last 10 runs',
  'Last 20 runs',
  'Last 30 runs',
  'All runs',
];

export const PerformanceTrendsChart: React.FC<PerformanceTrendsChartProps> = ({
  trendData,
  currentTimeRange,
  onRangeChange,
  isLoading = false,
  error = null,
}) => {
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTimeRange = currentTimeRange || trendData.timeRange || 'Last 30 runs';

  // Clickable legend visibility state
  const [visibleSeries, setVisibleSeries] = useState<{
    latency: boolean;
    throughput: boolean;
    gpuMemory: boolean;
  }>({
    latency: true,
    throughput: true,
    gpuMemory: true,
  });

  const toggleSeries = (key: 'latency' | 'throughput' | 'gpuMemory') => {
    setVisibleSeries((prev) => {
      // Toggle the selected series
      return { ...prev, [key]: !prev[key] };
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowRangeDropdown(false);
      }
    };
    if (showRangeDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showRangeDropdown]);

  const option = useMemo(() => {
    if (trendData.points.length < 2) return null;

    const runs = trendData.points.map((p) => p.run);
    const latency = trendData.points.map((p) => p.latencyMs);
    const throughput = trendData.points.map((p) => p.throughputToks);
    const gpuMemory = trendData.points.map((p) => p.gpuMemoryGb);

    const series = [];

    if (visibleSeries.latency) {
      series.push({
        name: 'Latency',
        type: 'line',
        smooth: 0.25,
        showSymbol: trendData.points.length <= 15,
        symbolSize: 6,
        itemStyle: { color: '#7C6AF2', borderColor: '#FFFFFF', borderWidth: 2 },
        lineStyle: { width: 2, color: '#7C6AF2' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(124, 106, 242, 0.22)' },
            { offset: 0.7, color: 'rgba(124, 106, 242, 0.04)' },
            { offset: 1, color: 'rgba(124, 106, 242, 0.00)' },
          ]),
        },
        data: latency,
      });
    }

    if (visibleSeries.throughput) {
      series.push({
        name: 'Throughput',
        type: 'line',
        smooth: 0.25,
        showSymbol: trendData.points.length <= 15,
        symbolSize: 6,
        itemStyle: { color: '#3B82F6', borderColor: '#FFFFFF', borderWidth: 2 },
        lineStyle: { width: 1.8, color: '#3B82F6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.16)' },
            { offset: 0.7, color: 'rgba(59, 130, 246, 0.03)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.00)' },
          ]),
        },
        data: throughput,
      });
    }

    if (visibleSeries.gpuMemory) {
      series.push({
        name: 'GPU Memory',
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.25,
        showSymbol: trendData.points.length <= 15,
        symbolSize: 6,
        itemStyle: { color: '#10B981', borderColor: '#FFFFFF', borderWidth: 2 },
        lineStyle: { width: 1.8, color: '#10B981' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16, 185, 129, 0.15)' },
            { offset: 0.7, color: 'rgba(16, 185, 129, 0.03)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0.00)' },
          ]),
        },
        data: gpuMemory.map((g) => g * 10),
      });
    }

    return {
      backgroundColor: 'transparent',
      animationDuration: 400,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'rgba(226, 232, 240, 0.9)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#18213B',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
        extraCssText:
          'box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1); border-radius: 14px; backdrop-filter: blur(10px);',
        formatter: (
          params: Array<{
            seriesName: string;
            value: number;
            marker: string;
            dataIndex: number;
          }>
        ) => {
          if (!params || params.length === 0) return '';
          const runNumber = runs[params[0].dataIndex] || `Run ${params[0].dataIndex}`;
          let html = `<div style="font-weight: 700; margin-bottom: 6px; font-size: 11.5px; color: #18213B;">${runNumber}</div>`;
          params.forEach((item) => {
            let unit = '';
            let val = item.value;
            if (item.seriesName.includes('Latency')) unit = ' ms';
            else if (item.seriesName.includes('Throughput')) unit = ' tok/s';
            else if (item.seriesName.includes('GPU')) {
              unit = ' GB';
              val = parseFloat((val / 10).toFixed(1));
            }
            html += `<div style="display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-top: 4px; font-size: 11.5px;">
              <span>${item.marker} <span style="color: #64748B;">${item.seriesName}</span></span>
              <span style="font-weight: 700; color: #18213B;">${val}${unit}</span>
            </div>`;
          });
          return html;
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#7C6AF2',
            width: 1.5,
            type: 'dashed',
          },
        },
      },
      grid: {
        top: 12,
        left: 28,
        right: 24,
        bottom: 18,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: runs,
        boundaryGap: false,
        axisLine: {
          show: true,
          lineStyle: { color: '#E2E8F0' },
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 9.5,
          interval: Math.max(0, Math.floor(runs.length / 6)),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#F1F5F9',
            type: 'solid',
          },
        },
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: '#94A3B8',
            fontSize: 9.5,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#F1F5F9',
              type: 'solid',
            },
          },
        },
        {
          type: 'value',
          min: 0,
          max: 80,
          interval: 20,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: '#94A3B8',
            fontSize: 9.5,
          },
          splitLine: { show: false },
        },
      ],
      series,
    };
  }, [trendData, visibleSeries]);

  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div className="w-full flex-1 min-h-[140px] flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#7C6AF2]" />
          <span className="text-xs font-medium">Fetching performance trend telemetry...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full flex-1 min-h-[140px] flex flex-col items-center justify-center text-amber-600 bg-amber-50/50 rounded-xl p-4 gap-1.5 border border-amber-200/60">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-semibold">Failed to load trend data</span>
          <span className="text-[11px] text-slate-500 text-center">{error}</span>
        </div>
      );
    }

    if (trendData.points.length === 0) {
      return (
        <div className="w-full flex-1 min-h-[140px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/60 rounded-xl p-4 gap-1 border border-dashed border-slate-200">
          <Activity className="w-5 h-5 text-slate-300 stroke-[1.5]" />
          <span className="text-xs font-semibold text-slate-500">No trend measurements</span>
          <span className="text-[11px] text-slate-400 text-center">
            No benchmark runs found for {activeTimeRange}.
          </span>
        </div>
      );
    }

    if (trendData.points.length === 1) {
      const p = trendData.points[0];
      return (
        <div className="w-full flex-1 min-h-[140px] flex flex-col justify-center bg-slate-50/70 rounded-xl p-3 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-semibold mb-2">
            <Info className="w-3.5 h-3.5 text-[#7C6AF2]" />
            <span>Single recorded run ({p.run})</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mb-2 leading-relaxed">
            Historical trend lines require at least 2 recorded benchmark runs to plot progression.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-white border border-slate-200/80 text-center">
              <span className="text-[10px] text-slate-400 block">Latency</span>
              <span className="text-[13px] font-bold text-[#18213B]">{p.latencyMs} ms</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200/80 text-center">
              <span className="text-[10px] text-slate-400 block">Throughput</span>
              <span className="text-[13px] font-bold text-[#18213B]">{p.throughputToks} tok/s</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200/80 text-center">
              <span className="text-[10px] text-slate-400 block">GPU Memory</span>
              <span className="text-[13px] font-bold text-[#18213B]">{p.gpuMemoryGb.toFixed(1)} GB</span>
            </div>
          </div>
        </div>
      );
    }

    if (!option) return null;

    return (
      <div className="w-full flex-1 min-h-[220px] mt-1">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    );
  };

  return (
    <>
      <div className="p-4 rounded-[20px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between select-none min-h-[380px] h-full">
        <div>
          {/* Title & Controls */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[13.5px] font-bold text-[#18213B] tracking-tight">
                Performance Trends
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {trendData.points.length} runs
              </span>
            </div>

            <div className="flex items-center gap-1.5 relative">
              {/* Range Selector Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50/90 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-[#18213B] transition-colors"
                >
                  <span>{activeTimeRange}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showRangeDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-white shadow-lg border border-slate-200/90 py-1 z-50 text-[11px]">
                    {AVAILABLE_RANGES.map((rng) => (
                      <button
                        key={rng}
                        onClick={() => {
                          onRangeChange?.(rng);
                          setShowRangeDropdown(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between transition-colors ${
                          activeTimeRange === rng
                            ? 'bg-[#F3F0FF] text-[#7C6AF2] font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{rng}</span>
                        {activeTimeRange === rng && <Check className="w-3 h-3 text-[#7C6AF2]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Expand Modal Button */}
              <button
                onClick={() => setIsExpanded(true)}
                title="Expand Chart View"
                className="p-1 rounded-lg bg-slate-50/90 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-[#18213B] transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Clickable Legend: Toggles Series Visibility */}
          <div className="flex items-center gap-2 text-[10.5px] font-medium mb-1 flex-wrap">
            <button
              onClick={() => toggleSeries('latency')}
              title="Click to toggle Latency series"
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                visibleSeries.latency
                  ? 'bg-[#F3F0FF] text-[#18213B] font-semibold border border-[#7C6AF2]/30 shadow-xs'
                  : 'bg-slate-100/70 text-slate-400 opacity-60 border border-slate-200/60 line-through'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  visibleSeries.latency ? 'bg-[#7C6AF2]' : 'bg-slate-400'
                }`}
              />
              <span>Latency (ms)</span>
            </button>

            <button
              onClick={() => toggleSeries('throughput')}
              title="Click to toggle Throughput series"
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                visibleSeries.throughput
                  ? 'bg-[#EFF6FF] text-[#18213B] font-semibold border border-[#3B82F6]/30 shadow-xs'
                  : 'bg-slate-100/70 text-slate-400 opacity-60 border border-slate-200/60 line-through'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  visibleSeries.throughput ? 'bg-[#3B82F6]' : 'bg-slate-400'
                }`}
              />
              <span>Throughput (tok/s)</span>
            </button>

            <button
              onClick={() => toggleSeries('gpuMemory')}
              title="Click to toggle GPU Memory series"
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                visibleSeries.gpuMemory
                  ? 'bg-[#ECFDF5] text-[#18213B] font-semibold border border-[#10B981]/30 shadow-xs'
                  : 'bg-slate-100/70 text-slate-400 opacity-60 border border-slate-200/60 line-through'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  visibleSeries.gpuMemory ? 'bg-[#10B981]' : 'bg-slate-400'
                }`}
              />
              <span>GPU Memory (GB)</span>
            </button>
          </div>
        </div>

        {/* ECharts Canvas or Status View */}
        {renderChartContent()}
      </div>

      {/* Expanded Modal when user clicks Maximize */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#18213B]">Performance Trends Analysis</h2>
                <p className="text-xs text-slate-500">
                  Telemetry across {trendData.points.length} consecutive optimization runs ({activeTimeRange})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 py-4 min-h-0">
              {option ? (
                <ReactECharts
                  option={option}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                renderChartContent()
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">Provenance: {trendData.provenance}</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-1.5 rounded-lg bg-[#7C6AF2] text-white font-medium hover:bg-[#6854E8] transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};