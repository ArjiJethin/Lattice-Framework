import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
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
      animationDuration: 1000,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        borderColor: 'rgba(226, 232, 240, 0.9)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#18213B',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
        extraCssText:
          'box-shadow: 0 12px 32px -4px rgba(24, 33, 59, 0.12), inset 0 1px 1px 0 rgba(255, 255, 255, 1); border-radius: 14px; backdrop-filter: blur(12px);',
        formatter: (params: Array<{ seriesName: string; value: number; marker: string; dataIndex: number }>) => {
          if (!params || params.length === 0) return '';
          const runNumber = params[0].dataIndex + 1;
          let html = `<div style="font-weight: 700; margin-bottom: 6px; font-size: 11px; color: #64748B;">Run ${runNumber}</div>`;
          params.forEach((item) => {
            let unit = '';
            let val = item.value;
            if (item.seriesName.includes('Latency')) unit = ' ms';
            else if (item.seriesName.includes('Throughput')) unit = ' tok/s';
            else if (item.seriesName.includes('GPU')) {
              unit = ' GB';
              val = parseFloat((val / 10).toFixed(1));
            }
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
        top: 20,
        left: 32,
        right: 32,
        bottom: 22,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: runs,
        boundaryGap: false,
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
              color: 'rgba(241, 245, 249, 0.8)',
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
          lineStyle: { width: 2.4, color: '#8174F5' },
          // Rich purple underhue gradient
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(129, 116, 245, 0.28)' },
              { offset: 0.65, color: 'rgba(129, 116, 245, 0.06)' },
              { offset: 1, color: 'rgba(129, 116, 245, 0.00)' },
            ]),
          },
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
          // Rich sky blue underhue gradient
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(85, 152, 247, 0.22)' },
              { offset: 0.65, color: 'rgba(85, 152, 247, 0.05)' },
              { offset: 1, color: 'rgba(85, 152, 247, 0.00)' },
            ]),
          },
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
          // Rich mint teal underhue gradient
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.18)' },
              { offset: 0.65, color: 'rgba(16, 185, 129, 0.04)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.00)' },
            ]),
          },
          data: gpuMemory.map((g) => g * 10),
        },
      ],
    };
  }, [trendData]);

  return (
    <div className="h-full p-4 rounded-2xl glass-panel flex flex-col justify-between select-none">
      {/* Chart Top Header & Legends */}
      <div>
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100/80">
          <h3 className="text-[13px] font-semibold text-[#18213B] tracking-tight">
            Performance Trends
          </h3>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white border border-slate-200/80 text-xs font-medium text-slate-700 transition-colors shadow-sm">
              <span>{trendData.timeRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              title="Expand Chart"
              className="p-1 rounded-md text-slate-400 hover:text-[#18213B] hover:bg-white/80 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Legend row matching reference */}
        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600 mb-0.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8174F5] shadow-sm shadow-[#8174F5]/40" />
            <span>Latency (ms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5598F7] shadow-sm shadow-[#5598F7]/40" />
            <span>Throughput (tok/s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-sm shadow-[#10B981]/40" />
            <span>GPU Memory (GB)</span>
          </div>
        </div>
      </div>

      {/* ECharts Canvas Container */}
      <div className="w-full flex-1 min-h-[160px]">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};
