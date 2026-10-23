import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { PerformanceTrendData } from '../../types';
import { Button } from '../ui/primitives';
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
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
        smooth: 0.2,
        showSymbol: trendData.points.length <= 15,
        symbolSize: 5,
        itemStyle: { color: '#7562E8', borderColor: '#FFFFFF', borderWidth: 1.5 },
        lineStyle: { width: 1.75, color: '#7562E8' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(117, 98, 232, 0.16)' },
            { offset: 0.8, color: 'rgba(117, 98, 232, 0.02)' },
            { offset: 1, color: 'rgba(117, 98, 232, 0.00)' },
          ]),
        },
        data: latency,
      });
    }

    if (visibleSeries.throughput) {
      series.push({
        name: 'Throughput',
        type: 'line',
        smooth: 0.2,
        showSymbol: trendData.points.length <= 15,
        symbolSize: 5,
        itemStyle: { color: '#2563EB', borderColor: '#FFFFFF', borderWidth: 1.5 },
        lineStyle: { width: 1.75, color: '#2563EB' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37, 99, 235, 0.12)' },
            { offset: 0.8, color: 'rgba(37, 99, 235, 0.02)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.00)' },
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
        smooth: 0.2,
        showSymbol: trendData.points.length <= 15,
        symbolSize: 5,
        itemStyle: { color: '#0D8A58', borderColor: '#FFFFFF', borderWidth: 1.5 },
        lineStyle: { width: 1.75, color: '#0D8A58' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(13, 138, 88, 0.12)' },
            { offset: 0.8, color: 'rgba(13, 138, 88, 0.02)' },
            { offset: 1, color: 'rgba(13, 138, 88, 0.00)' },
          ]),
        },
        data: gpuMemory.map((g) => g * 10),
      });
    }

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#D9DEE7',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: '#222938',
          fontSize: 11.5,
          fontFamily: 'Inter, sans-serif',
        },
        extraCssText:
          'box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border-radius: 6px;',
        formatter: (
          params: Array<{
            seriesName: string;
            value: number;
            marker: string;
            dataIndex: number;
          }>
        ) => {
          if (!params || params.length === 0) return '';
          const runNumber = runs[params[0].dataIndex] || params[0].dataIndex + 1;
          let html = `<div style="font-weight: 600; margin-bottom: 4px; font-size: 11px; color: #647187; font-family: monospace;">Run #${runNumber}</div>`;
          params.forEach((item) => {
            let unit = '';
            let val = item.value;
            if (item.seriesName.includes('Latency')) unit = ' ms';
            else if (item.seriesName.includes('Throughput')) unit = ' tok/s';
            else if (item.seriesName.includes('GPU')) {
              unit = ' GB';
              val = parseFloat((val / 10).toFixed(1));
            }
            html += `<div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 3px; font-size: 11.5px;">
              <span>${item.marker} <span style="color: #647187;">${item.seriesName}</span></span>
              <span style="font-weight: 600; font-family: monospace; color: #222938;">${val}${unit}</span>
            </div>`;
          });
          return html;
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#7562E8',
            width: 1,
            type: 'dashed',
          },
        },
      },
      grid: {
        top: 12,
        left: 30,
        right: 26,
        bottom: 20,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: runs,
        boundaryGap: false,
        axisLine: {
          show: true,
          lineStyle: { color: '#D9DEE7' },
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#647187',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          interval: Math.max(0, Math.floor(runs.length / 6)),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#F1F3F7',
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
            color: '#647187',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#E6EAF0',
              type: 'dashed',
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
            color: '#647187',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
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
        <div className="w-full flex-1 min-h-[140px] flex flex-col items-center justify-center text-[#647187] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#7562E8]" />
          <span className="text-[12px]">Loading performance trend telemetry...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full flex-1 min-h-[140px] flex flex-col items-center justify-center text-[#B45309] bg-[#FFFBEB] rounded-md p-4 gap-1.5 border border-[#FDE68A]">
          <AlertCircle className="w-4 h-4" />
          <span className="text-[12px] font-semibold">Failed to load trend data</span>
          <span className="text-[11px] text-[#647187] text-center">{error}</span>
        </div>
      );
    }

    if (trendData.points.length === 0) {
      return (
        <div className="w-full flex-1 min-h-[140px] flex flex-col items-center justify-center text-[#647187] bg-[#F8F9FB] rounded-md p-4 gap-1 border border-dashed border-[#D9DEE7]">
          <Activity className="w-5 h-5 text-[#8A94A6] stroke-[1.5]" />
          <span className="text-[12px] font-semibold text-[#222938]">No trend measurements</span>
          <span className="text-[11px] text-[#647187] text-center">
            No benchmark runs found for {activeTimeRange}.
          </span>
        </div>
      );
    }

    if (trendData.points.length === 1) {
      const p = trendData.points[0];
      return (
        <div className="w-full flex-1 min-h-[140px] flex flex-col justify-center bg-[#F8F9FB] rounded-md p-3 border border-[#D9DEE7]">
          <div className="flex items-center gap-1.5 text-[#222938] text-[11.5px] font-semibold mb-1.5">
            <Info className="w-3.5 h-3.5 text-[#7562E8]" />
            <span>Single recorded run (#{p.run})</span>
          </div>
          <p className="text-[11px] text-[#647187] mb-2.5 leading-relaxed">
            Historical trend lines require at least 2 recorded benchmark runs.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-sm bg-white border border-[#D9DEE7] text-center">
              <span className="text-[10px] text-[#647187] block">Latency</span>
              <span className="text-[12.5px] font-mono font-semibold text-[#222938] tabular-nums">
                {p.latencyMs} ms
              </span>
            </div>
            <div className="p-2 rounded-sm bg-white border border-[#D9DEE7] text-center">
              <span className="text-[10px] text-[#647187] block">Throughput</span>
              <span className="text-[12.5px] font-mono font-semibold text-[#222938] tabular-nums">
                {p.throughputToks} tok/s
              </span>
            </div>
            <div className="p-2 rounded-sm bg-white border border-[#D9DEE7] text-center">
              <span className="text-[10px] text-[#647187] block">GPU Memory</span>
              <span className="text-[12.5px] font-mono font-semibold text-[#222938] tabular-nums">
                {p.gpuMemoryGb.toFixed(1)} GB
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (!option) return null;

    return (
      <div className="w-full flex-1 min-h-[210px] mt-1">
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
      <div className="p-4 rounded-lg bg-white border border-[#D9DEE7] shadow-2xs flex flex-col justify-between select-none min-h-[360px] h-full">
        <div>
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E6EAF0]">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-[#222938] tracking-tight">
                Performance Trends
              </h3>
              <span className="text-[11px] text-[#647187] font-mono tabular-nums">
                ({trendData.points.length})
              </span>
            </div>

            <div className="flex items-center gap-1.5 relative">
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-[#F8F9FB] hover:bg-[#EDEFF3] border border-[#D9DEE7] text-[11.5px] font-medium text-[#222938] transition-colors cursor-pointer"
                >
                  <span>{activeTimeRange}</span>
                  <ChevronDown className="w-3 h-3 text-[#647187]" />
                </button>

                {showRangeDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-36 rounded-md bg-white shadow-glass border border-[#D9DEE7] py-1 z-50 text-[11.5px]">
                    {AVAILABLE_RANGES.map((rng) => (
                      <button
                        key={rng}
                        type="button"
                        onClick={() => {
                          onRangeChange?.(rng);
                          setShowRangeDropdown(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between transition-colors cursor-pointer ${activeTimeRange === rng
                            ? 'bg-[#F2F0FD] text-[#634FDB] font-semibold'
                            : 'text-[#222938] hover:bg-[#F8F9FB]'
                          }`}
                      >
                        <span>{rng}</span>
                        {activeTimeRange === rng && <Check className="w-3.5 h-3.5 text-[#7562E8]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                aria-label="Expand Chart View"
                title="Expand Chart View"
                className="h-7 w-7 rounded-sm bg-[#F8F9FB] hover:bg-[#EDEFF3] border border-[#D9DEE7] flex items-center justify-center text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Series Visibility Toggles */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium mb-1 flex-wrap">
            <button
              type="button"
              onClick={() => toggleSeries('latency')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${visibleSeries.latency
                  ? 'bg-[#F2F0FD] text-[#222938] font-semibold border-[#D8D1FA]'
                  : 'bg-[#F8F9FB] text-[#8A94A6] border-[#E6EAF0] line-through'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${visibleSeries.latency ? 'bg-[#7562E8]' : 'bg-[#CBD2DF]'
                  }`}
              />
              <span>Latency (ms)</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSeries('throughput')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${visibleSeries.throughput
                  ? 'bg-[#EFF6FF] text-[#222938] font-semibold border-[#BFDBFE]'
                  : 'bg-[#F8F9FB] text-[#8A94A6] border-[#E6EAF0] line-through'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${visibleSeries.throughput ? 'bg-[#2563EB]' : 'bg-[#CBD2DF]'
                  }`}
              />
              <span>Throughput (tok/s)</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSeries('gpuMemory')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition-colors cursor-pointer ${visibleSeries.gpuMemory
                  ? 'bg-[#ECFDF5] text-[#222938] font-semibold border-[#A7F3D0]'
                  : 'bg-[#F8F9FB] text-[#8A94A6] border-[#E6EAF0] line-through'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${visibleSeries.gpuMemory ? 'bg-[#0D8A58]' : 'bg-[#CBD2DF]'
                  }`}
              />
              <span>GPU Memory (GB)</span>
            </button>
          </div>
        </div>

        {renderChartContent()}
      </div>

      {/* Expanded Chart Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-[#222938]/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-4xl h-[70vh] bg-white rounded-lg shadow-glass border border-[#D9DEE7] flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0]">
              <div>
                <h2 className="text-[16px] font-semibold text-[#222938]">
                  Performance Trends Analysis
                </h2>
                <p className="text-[12px] text-[#647187]">
                  Telemetry across {trendData.points.length} consecutive optimization runs ({activeTimeRange})
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Expanded Chart"
                onClick={() => setIsExpanded(false)}
                className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
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

            <div className="pt-3 border-t border-[#E6EAF0] flex items-center justify-between text-[12px] text-[#647187]">
              <span className="font-mono">Provenance: {trendData.provenance}</span>
              <Button variant="secondary" size="sm" onClick={() => setIsExpanded(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};