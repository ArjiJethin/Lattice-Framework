import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PerformanceTrendData } from '../../types';
import { Maximize2, ChevronDown } from 'lucide-react';

interface PerformanceTrendsChartProps {
  trendData: PerformanceTrendData;
  onRangeChange?: (range: string) => void;
}

export const PerformanceTrendsChart: React.FC<PerformanceTrendsChartProps> = ({
  trendData,
}) => {
  const option = useMemo(() => {
    const runs = trendData.points.map((p) => p.run);
    const latency = trendData.points.map((p) => p.latencyMs);
    const throughput = trendData.points.map((p) => p.throughputToks);
    const gpuMemory = trendData.points.map((p) => p.gpuMemoryGb);

    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#18213B',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
        extraCssText:
          'box-shadow: 0 8px 24px -4px rgba(24, 33, 59, 0.12); border-radius: 12px;',
        formatter: (params: Array<{ seriesName: string; value: number; marker: string; dataIndex: number }>) => {
          if (!params || params.length === 0) return '';
          const runNumber = params[0].dataIndex + 1;
          let html = `<div style="font-weight: 700; margin-bottom: 6px; font-size: 11px; color: #64748B;">Run ${runNumber}</div>`;
          params.forEach((item) => {
            let unit = '';
            let val = item.value;
            if (item.seriesName.includes('Latency')) unit = ' ms';
            else if (item.seriesName.includes('Throughput')) unit = ' tok/s';
            else if (item.seriesName.includes('GPU')) unit = ' GB';
            html += `<div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 3px; font-size: 11px;">
              <span>${item.marker} <span style="color: #475569;">${item.seriesName}</span></span>
              <span style="font-weight: 700; font-family: monospace; color: #18213B;">${val}${unit}</span>
            </div>`;
          });
          return html;
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#8174F5',
            width: 1.5,
            type: 'dashed',
          },
        },
      },
      grid: {
        top: 24,
        left: 36,
        right: 36,
        bottom: 24,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: runs,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          interval: 4,
        },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: 400,
          interval: 100,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: '#94A3B8',
            fontSize: 10,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#F1F5F9',
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
            color: '#94A3B8',
            fontSize: 10,
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Latency',
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#8174F5' },
          lineStyle: { width: 2.2, color: '#8174F5' },
          data: latency,
        },
        {
          name: 'Throughput',
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#5598F7' },
          lineStyle: { width: 2.2, color: '#5598F7' },
          data: throughput,
        },
        {
          name: 'GPU Memory',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#10B981' },
          lineStyle: { width: 2.2, color: '#10B981' },
          data: gpuMemory.map((g) => g * 10), // Scaled to right axis
        },
      ],
    };
  }, [trendData]);

  return (
    <div className="h-full p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-card flex flex-col justify-between select-none">
      {/* Chart Top Header & Legends */}
      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h3 className="text-[13px] font-semibold text-[#18213B] tracking-tight">
            Performance Trends
          </h3>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors">
              <span>{trendData.timeRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              title="Expand Chart"
              className="p-1 rounded-md text-slate-400 hover:text-[#18213B] hover:bg-slate-100 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Legend row */}
        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600 mb-1 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8174F5]" />
            <span>Latency (ms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5598F7]" />
            <span>Throughput (tok/s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>GPU Memory (GB)</span>
          </div>
        </div>
      </div>

      {/* ECharts Canvas Container */}
      <div className="w-full h-[180px] mt-1">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};
