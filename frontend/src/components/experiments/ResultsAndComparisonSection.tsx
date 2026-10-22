import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Download,
  Clock,
  Zap,
  HardDrive,
  Award,
  TrendingUp,
  Search,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ExperimentsDataset,
  BenchmarkRunRecord,
} from '../../types/experiments';
import { exportExperimentData } from '../../lib/experiments/experimentsService';

interface ResultsAndComparisonSectionProps {
  dataset: ExperimentsDataset;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  selectedQuantizationName: string;
}

type ResultTabKey = 'summary' | 'runs' | 'comparison' | 'quality';

export const ResultsAndComparisonSection: React.FC<ResultsAndComparisonSectionProps> = ({
  dataset,
  selectedRunId,
  onSelectRun,
  selectedQuantizationName,
}) => {
  const [activeTab, setActiveTab] = useState<ResultTabKey>('summary');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [searchQuery, setSearchQuery] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'fixed' | 'adaptive'>('all');
  const [sortField, setSortField] = useState<keyof BenchmarkRunRecord>('runIndex');
  const [sortAsc, setSortAsc] = useState(true);

  // Filtered & sorted runs for Run Details tab
  const filteredRuns = useMemo(() => {
    return dataset.allRuns
      .filter((r) => {
        if (strategyFilter === 'fixed' && r.strategy !== 'Fixed Configuration') return false;
        if (strategyFilter === 'adaptive' && r.strategy !== 'Adaptive (Lattice)') return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.id.toLowerCase().includes(q) ||
            r.modelName.toLowerCase().includes(q) ||
            r.quantization.toLowerCase().includes(q) ||
            r.strategy.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [dataset.allRuns, strategyFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (field: keyof BenchmarkRunRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExport = () => {
    exportExperimentData(dataset, exportFormat);
  };

  // ECharts Scatter Plot for Performance Comparison (Latency vs Throughput)
  const chartOption = useMemo<EChartsOption>(() => {
    const fixedPoints = dataset.fixedRuns.map((r) => [r.throughputToks, r.latencyMs, r]);
    const adaptivePoints = dataset.adaptiveRuns.map((r) => [r.throughputToks, r.latencyMs, r]);

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      grid: {
        top: 25,
        right: 20,
        bottom: 45,
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
        extraCssText:
          'box-shadow: 0 8px 24px rgba(24, 33, 59, 0.08); border-radius: 12px; backdrop-filter: blur(8px);',
        formatter: (params: any) => {
          const run: BenchmarkRunRecord = params.data?.[2];
          if (!run) return '';
          return `
            <div style="min-width: 170px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 13px; color: #18213B;">Run #${run.runIndex}</span>
                <span style="font-size: 10px; font-weight: 700; color: ${
                  run.strategy.includes('Adaptive') ? '#10B981' : '#7C6AF2'
                }; background: ${
            run.strategy.includes('Adaptive') ? '#10B98115' : '#7C6AF215'
          }; padding: 2px 6px; border-radius: 6px;">
                  ${run.strategy}
                </span>
              </div>
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
                Throughput: <strong style="color: #18213B;">${run.throughputToks} tok/s</strong>
              </div>
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
                Latency: <strong style="color: #18213B;">${run.latencyMs} ms</strong>
              </div>
              <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
                Peak Memory: <strong style="color: #18213B;">${run.memoryGb} GB</strong>
              </div>
              ${
                run.qualityScore
                  ? `<div style="font-size: 11px; color: #64748B;">Quality Score: <strong style="color: #18213B;">${run.qualityScore}</strong></div>`
                  : ''
              }
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'Throughput (tokens/s)',
        nameLocation: 'middle',
        nameGap: 24,
        min: 0,
        max: 100,
        splitNumber: 5,
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
        },
        splitLine: {
          lineStyle: { color: '#F1F5F9', type: 'dashed' },
        },
      },
      yAxis: {
        type: 'log',
        name: 'Latency (ms)',
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
        // 1. Fixed Configuration: Purple Circles
        {
          name: `Fixed Configuration (${selectedQuantizationName})`,
          type: 'scatter',
          symbol: 'circle',
          symbolSize: 8,
          data: fixedPoints as any,
          itemStyle: {
            color: '#8B5CF6',
            opacity: 0.9,
          },
          z: 3,
        },
        // 2. Adaptive Lattice: Mint / Green Triangles
        {
          name: 'Adaptive (Lattice)',
          type: 'scatter',
          symbol: 'triangle',
          symbolSize: 9,
          data: adaptivePoints as any,
          itemStyle: {
            color: '#10B981',
            opacity: 0.95,
          },
          z: 4,
        },
      ] as any,
    };
  }, [dataset, selectedQuantizationName]);

  // Click on chart point handler
  const onEvents = useMemo(() => {
    return {
      click: (params: any) => {
        const run: BenchmarkRunRecord = params.data?.[2];
        if (run) {
          onSelectRun(run.id);
        }
      },
    };
  }, [onSelectRun]);

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* 1. Header with View Tabs and Export Action */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-extrabold text-[#18213B] tracking-tight">
            3. Results &amp; Comparison
          </h2>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Detailed results for all runs and aggregated statistics.
          </span>
        </div>

        {/* Right Controls: Tabs + Export Button */}
        <div className="flex items-center gap-3">
          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-white text-[#7C6AF2] shadow-2xs'
                  : 'text-slate-600 hover:text-[#18213B]'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'runs'
                  ? 'bg-white text-[#7C6AF2] shadow-2xs'
                  : 'text-slate-600 hover:text-[#18213B]'
              }`}
            >
              Run Details
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'comparison'
                  ? 'bg-white text-[#7C6AF2] shadow-2xs'
                  : 'text-slate-600 hover:text-[#18213B]'
              }`}
            >
              Comparison
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'quality'
                  ? 'bg-white text-[#7C6AF2] shadow-2xs'
                  : 'text-slate-600 hover:text-[#18213B]'
              }`}
            >
              Quality Analysis
            </button>
          </div>

          {/* Export Action */}
          <div className="flex items-center gap-1">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
              className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <button
              onClick={handleExport}
              title={`Export results as ${exportFormat.toUpperCase()}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-[#18213B] bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#7C6AF2]" />
              <span>Export Results</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Contents */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Performance Comparison Plot (Col 7) matching screenshot */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200/80 bg-white p-4 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#18213B]">
                    Performance Comparison
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Latency vs Throughput (lower latency and higher throughput is better)
                  </span>
                </div>
              </div>

              {/* Interactive ECharts Scatter Plot */}
              <div className="h-[260px] w-full mt-2">
                <ReactECharts
                  option={chartOption}
                  style={{ height: '100%', width: '100%' }}
                  onEvents={onEvents}
                />
              </div>
            </div>

            {/* Custom Legend at bottom matching screenshot */}
            <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                <span>Fixed Configuration ({selectedQuantizationName})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px] border-b-[#10B981]" />
                <span>Adaptive (Lattice)</span>
              </div>
            </div>
          </div>

          {/* Right: Aggregated Results Table (Col 5) matching screenshot */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white p-4 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black text-[#18213B]">
                  Aggregated Results
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  Mean ± Std Dev across all runs
                </span>
              </div>

              {/* Table with Fixed vs Adaptive */}
              <div className="mt-2 divide-y divide-slate-100">
                {/* Column Headers */}
                <div className="grid grid-cols-12 py-2 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-5">Metric</div>
                  <div className="col-span-3 text-center text-[#7C6AF2]">
                    Fixed ({selectedQuantizationName})
                  </div>
                  <div className="col-span-4 text-right text-emerald-600">
                    Adaptive (Lattice)
                  </div>
                </div>

                {/* Metric Rows */}
                {dataset.aggregatedComparison.map((row) => {
                  const isPositiveDelta = row.deltaPct > 0;
                  const deltaPrefix = isPositiveDelta ? '+' : '';

                  return (
                    <div
                      key={row.metric}
                      className="grid grid-cols-12 py-2.5 items-center text-xs hover:bg-slate-50/80 px-1 rounded-lg transition-colors"
                    >
                      {/* Metric Name with Icon */}
                      <div className="col-span-5 flex items-center gap-2 font-bold text-[#18213B]">
                        <span className="text-slate-400">
                          {row.metric.includes('Token') ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : row.metric.includes('Time') ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : row.metric.includes('Throughput') ? (
                            <Zap className="w-3.5 h-3.5" />
                          ) : row.metric.includes('Memory') ? (
                            <HardDrive className="w-3.5 h-3.5" />
                          ) : (
                            <Award className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="truncate" title={row.description}>
                          {row.metric}
                        </span>
                      </div>

                      {/* Fixed Configuration Mean ± Std */}
                      <div className="col-span-3 text-center font-bold text-slate-700 font-mono text-[11px]">
                        {row.fixedValue}
                      </div>

                      {/* Adaptive Mean ± Std and Delta Pill */}
                      <div className="col-span-4 flex items-center justify-end gap-2 font-bold">
                        <span className="font-mono text-[11px] text-slate-900">
                          {row.adaptiveValue}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                            row.isBetter
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {deltaPrefix}
                          {row.deltaPct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Provenance Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400 font-medium">
              <span>{dataset.provenance}</span>
              <span>N = {dataset.fixedRuns.length} runs per strategy</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Run Details Tab */}
      {activeTab === 'runs' && (
        <div className="flex flex-col gap-3">
          {/* Search & Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search run ID, model, strategy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-[#18213B] shadow-2xs focus:outline-none focus:border-[#7C6AF2] w-56"
                />
              </div>

              {/* Strategy Filter */}
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <button
                  onClick={() => setStrategyFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    strategyFilter === 'all'
                      ? 'bg-white text-[#7C6AF2] shadow-2xs'
                      : 'text-slate-600 hover:text-[#18213B]'
                  }`}
                >
                  All Runs ({dataset.allRuns.length})
                </button>
                <button
                  onClick={() => setStrategyFilter('fixed')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    strategyFilter === 'fixed'
                      ? 'bg-white text-[#7C6AF2] shadow-2xs'
                      : 'text-slate-600 hover:text-[#18213B]'
                  }`}
                >
                  Fixed
                </button>
                <button
                  onClick={() => setStrategyFilter('adaptive')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    strategyFilter === 'adaptive'
                      ? 'bg-white text-emerald-600 shadow-2xs'
                      : 'text-slate-600 hover:text-[#18213B]'
                  }`}
                >
                  Adaptive
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Showing {filteredRuns.length} of {dataset.allRuns.length} runs
            </div>
          </div>

          {/* Runs Table */}
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold text-[11px] select-none">
                  <th
                    onClick={() => handleSort('runIndex')}
                    className="p-3 cursor-pointer hover:text-[#7C6AF2]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Run #</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('strategy')}
                    className="p-3 cursor-pointer hover:text-[#7C6AF2]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Strategy</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3">Configuration</th>
                  <th
                    onClick={() => handleSort('latencyMs')}
                    className="p-3 cursor-pointer hover:text-[#7C6AF2]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Latency (ms)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('throughputToks')}
                    className="p-3 cursor-pointer hover:text-[#7C6AF2]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Throughput (tok/s)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('memoryGb')}
                    className="p-3 cursor-pointer hover:text-[#7C6AF2]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Memory (GB)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('qualityScore')}
                    className="p-3 cursor-pointer hover:text-[#7C6AF2]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Quality</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRuns.map((r) => {
                  const isSelected = selectedRunId === r.id;
                  const isAdaptive = r.strategy.includes('Adaptive');

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onSelectRun(r.id)}
                      className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
                        isSelected ? 'bg-purple-50/50 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-[11px] font-black text-[#18213B]">
                        #{r.runIndex}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            isAdaptive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-[#7C6AF2] border border-purple-200'
                          }`}
                        >
                          {r.strategy}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {r.quantization}
                      </td>
                      <td className="p-3 font-mono font-bold text-[#18213B]">
                        {r.latencyMs} ms
                      </td>
                      <td className="p-3 font-mono font-bold text-[#18213B]">
                        {r.throughputToks}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {r.memoryGb} GB
                      </td>
                      <td className="p-3 font-mono font-bold text-[#18213B]">
                        {r.qualityScore ?? '—'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{r.status}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-400 font-mono text-[11px]">
                        {r.timestamp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Comparison Deep Dive Tab */}
      {activeTab === 'comparison' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Latency & Speed Trade-off */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#7C6AF2] font-black text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>Throughput Acceleration</span>
            </div>
            <div className="text-2xl font-black text-[#18213B]">
              +
              {(
                ((dataset.adaptiveAggregates.throughputMean -
                  dataset.fixedAggregates.throughputMean) /
                  dataset.fixedAggregates.throughputMean) *
                100
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Adaptive execution dynamically switches to non-dominated quantization levels
              during decoding, driving average throughput from{' '}
              <strong className="text-slate-800">
                {dataset.fixedAggregates.throughputMean.toFixed(1)} tok/s
              </strong>{' '}
              to{' '}
              <strong className="text-emerald-700">
                {dataset.adaptiveAggregates.throughputMean.toFixed(1)} tok/s
              </strong>
              .
            </p>
          </div>

          {/* Card 2: Memory Efficiency */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col gap-3">
            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs">
              <HardDrive className="w-4 h-4" />
              <span>VRAM Footprint Reduction</span>
            </div>
            <div className="text-2xl font-black text-[#18213B]">
              {(
                ((dataset.adaptiveAggregates.memoryMean -
                  dataset.fixedAggregates.memoryMean) /
                  dataset.fixedAggregates.memoryMean) *
                100
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Peak memory allocation drops by approximately{' '}
              <strong className="text-slate-800">
                {(
                  dataset.fixedAggregates.memoryMean - dataset.adaptiveAggregates.memoryMean
                ).toFixed(1)}{' '}
                GB
              </strong>
              , enabling multi-tenant scheduling and reducing out-of-memory risks.
            </p>
          </div>

          {/* Card 3: Quality Parity */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
              <Award className="w-4 h-4" />
              <span>Quality Parity Score</span>
            </div>
            <div className="text-2xl font-black text-[#18213B]">
              {dataset.adaptiveAggregates.qualityMean?.toFixed(1) || '—'}
              <span className="text-xs font-bold text-slate-400 ml-1">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Output quality remains virtually identical to the fixed baseline (
              {dataset.fixedAggregates.qualityMean?.toFixed(1)} vs{' '}
              {dataset.adaptiveAggregates.qualityMean?.toFixed(1)}), confirming that faster
              inference is achieved without semantic fidelity degradation.
            </p>
          </div>
        </div>
      )}

      {/* 4. Quality Analysis Tab */}
      {activeTab === 'quality' && (
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-black text-[#18213B]">
                {dataset.evaluatorInfo?.name || 'Evaluator Methodology'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {dataset.evaluatorInfo?.methodology}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#7C6AF2] border border-purple-200">
              Dataset: {dataset.evaluatorInfo?.dataset}
            </span>
          </div>

          {/* Honesty & Limitation Notice */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Evaluation Integrity Notice:</span>{' '}
              {dataset.evaluatorInfo?.limitations} Faster token generation does not guarantee
              higher semantic accuracy. All scores reflect measured empirical test batches.
            </div>
          </div>

          {/* Quality Scores Comparison Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Fixed Configuration ({selectedQuantizationName})
              </span>
              <div className="text-xl font-black text-[#18213B] mt-1">
                {dataset.fixedAggregates.qualityMean?.toFixed(1)} ±{' '}
                {dataset.fixedAggregates.qualityStd?.toFixed(1)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                Measured on {dataset.fixedRuns.length} trials
              </span>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/80">
              <span className="text-[10px] font-bold text-[#7C6AF2] uppercase">
                Adaptive (Lattice Strategy)
              </span>
              <div className="text-xl font-black text-[#18213B] mt-1">
                {dataset.adaptiveAggregates.qualityMean?.toFixed(1)} ±{' '}
                {dataset.adaptiveAggregates.qualityStd?.toFixed(1)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                Measured on {dataset.adaptiveRuns.length} trials
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
