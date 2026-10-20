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
      animationDuration: 600,
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
          const runNumber = params[0].dataIndex;
          let html = `<div style="font-weight: 700; margin-bottom: 6px; font-size: 11.5px; color: #18213B;">Run ${runNumber}</div>`;
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
        top: 10,
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
          interval: 4,
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
          max: 400,
          interval: 100,
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
      series: [
        {
          name: 'Latency',
          type: 'line',
          smooth: 0.2,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#7C6AF2', borderColor: '#FFFFFF', borderWidth: 2 },
          lineStyle: { width: 2, color: '#7C6AF2' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(124, 106, 242, 0.24)' },
              { offset: 0.7, color: 'rgba(124, 106, 242, 0.05)' },
              { offset: 1, color: 'rgba(124, 106, 242, 0.00)' },
            ]),
          },
          data: latency,
        },
        {
          name: 'Throughput',
          type: 'line',
          smooth: 0.2,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#3B82F6', borderColor: '#FFFFFF', borderWidth: 2 },
          lineStyle: { width: 1.8, color: '#3B82F6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.18)' },
              { offset: 0.7, color: 'rgba(59, 130, 246, 0.04)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.00)' },
            ]),
          },
          data: throughput,
        },
        {
          name: 'GPU Memory',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.2,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#10B981', borderColor: '#FFFFFF', borderWidth: 2 },
          lineStyle: { width: 1.8, color: '#10B981' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.16)' },
              { offset: 0.7, color: 'rgba(16, 185, 129, 0.03)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.00)' },
            ]),
          },
          data: gpuMemory.map((g) => g * 10),
        },
      ],
    };
  }, [trendData]);

  return (
    <div className="h-full p-3.5 rounded-[18px] bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between select-none">
      <div>
        {/* Title & Controls */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13.5px] font-bold text-[#18213B] tracking-tight">
            Performance Trends
          </h3>

          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50/90 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-[#18213B] transition-colors">
              <span>{trendData.timeRange}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <button
              title="Expand Chart"
              className="p-1 rounded-lg bg-slate-50/90 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-[#18213B] transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Legend Row with Active Pill on Latency (ms) matching Reference */}
        <div className="flex items-center gap-3 text-[10.5px] font-medium text-slate-600 mb-0.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F3F0FF] text-[#18213B] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C6AF2]" />
            <span>Latency (ms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            <span>Throughput (tok/s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>GPU Memory (GB)</span>
          </div>
        </div>
      </div>

      {/* ECharts Canvas */}
      <div className="w-full flex-1 min-h-[140px]">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};