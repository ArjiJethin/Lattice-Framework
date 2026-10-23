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
  AlertCircle,
  X,
} from 'lucide-react';
import {
  ExperimentsDataset,
  BenchmarkRunRecord,
  ExperimentConfiguration,
} from '../../types/experiments';
import { exportExperimentData } from '../../lib/experiments/experimentsService';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  SegmentedTabs,
} from '../ui/primitives';

interface ResultsAndComparisonSectionProps {
  dataset: ExperimentsDataset;
  config?: ExperimentConfiguration;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  selectedQuantizationName: string;
}

type ResultTabKey = 'summary' | 'runs' | 'comparison' | 'quality';

export const ResultsAndComparisonSection: React.FC<ResultsAndComparisonSectionProps> = ({
  dataset,
  config,
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

  const selectedRun = useMemo(() => {
    if (!selectedRunId) return null;
    return dataset.allRuns.find((r) => r.id === selectedRunId) || null;
  }, [dataset.allRuns, selectedRunId]);

  // Filter aggregated rows according to active metric checkboxes when provided
  const visibleAggregatedRows = useMemo(() => {
    if (!config?.metrics) return dataset.aggregatedComparison;
    const m = config.metrics;
    const filtered = dataset.aggregatedComparison.filter((row) => {
      if (row.metric === 'Time to First Token') return m.latencyTtft;
      if (row.metric === 'Total Generation Time') return m.totalGenerationTime;
      if (row.metric === 'Throughput') return m.throughput;
      if (row.metric === 'Peak Memory Usage') return m.memoryUsagePeak;
      if (row.metric === 'Output Quality') return m.outputQuality;
      return true;
    });
    return filtered.length > 0 ? filtered : dataset.aggregatedComparison;
  }, [dataset.aggregatedComparison, config?.metrics]);

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

  const chartOption = useMemo<EChartsOption>(() => {
    const fixedPoints = dataset.fixedRuns.map((r) => [r.throughputToks, r.latencyMs, r]);
    const adaptivePoints = dataset.adaptiveRuns.map((r) => [
      r.throughputToks,
      r.latencyMs,
      r,
    ]);
    const selectedPoint = selectedRun
      ? [[selectedRun.throughputToks, selectedRun.latencyMs, selectedRun]]
      : [];

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        top: 22,
        right: 24,
        bottom: 40,
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
          const run: BenchmarkRunRecord | undefined = params.data?.[2];
          if (!run) return '';
          const isAdaptive = run.strategy.includes('Adaptive');
          return `
            <div style="min-width: 185px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap: 8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #E6EAF0;">
                <span style="font-weight: 600; font-family: monospace; font-size: 12px; color: #222938;">Run #${run.runIndex}</span>
                <span style="font-size: 10px; font-weight: 600; color: ${isAdaptive ? '#0D8A58' : '#634FDB'
            }; background: ${isAdaptive ? '#ECFDF5' : '#F2F0FD'
            }; padding: 1px 6px; border-radius: 4px; border: 1px solid ${isAdaptive ? '#A7F3D0' : '#D8D1FA'
            };">
                  ${run.strategy}
                </span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size: 11px; margin-bottom: 3px;">
                <span style="color: #647187;">Throughput:</span>
                <span style="font-family: monospace; font-weight: 600; color: #222938;">${run.throughputToks} tok/s</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size: 11px; margin-bottom: 3px;">
                <span style="color: #647187;">Latency (TTFT):</span>
                <span style="font-family: monospace; font-weight: 600; color: #222938;">${run.latencyMs} ms</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size: 11px; margin-bottom: 3px;">
                <span style="color: #647187;">Peak Memory:</span>
                <span style="font-family: monospace; font-weight: 600; color: #222938;">${run.memoryGb.toFixed(1)} GB</span>
              </div>
              ${run.qualityScore !== null
              ? `<div style="display:flex; justify-content:space-between; font-size: 11px;">
                      <span style="color: #647187;">Quality Score:</span>
                      <span style="font-family: monospace; font-weight: 600; color: #222938;">${run.qualityScore.toFixed(1)}</span>
                    </div>`
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
          color: '#647187',
          fontSize: 11,
          fontWeight: 600,
        },
        axisLine: { lineStyle: { color: '#D9DEE7' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#647187',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        },
        splitLine: {
          lineStyle: { color: '#F1F3F7', type: 'dashed' },
        },
      },
      yAxis: {
        type: 'log',
        name: 'Latency (ms, log scale)',
        nameLocation: 'middle',
        nameGap: 40,
        min: 50,
        max: 2000,
        logBase: 10,
        nameTextStyle: {
          color: '#647187',
          fontSize: 11,
          fontWeight: 600,
        },
        axisLine: { lineStyle: { color: '#D9DEE7' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#647187',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (value: number) => `${value}`,
        },
        splitLine: {
          lineStyle: { color: '#E6EAF0', type: 'dashed' },
        },
      },
      series: [
        {
          name: `Fixed Configuration (${selectedQuantizationName})`,
          type: 'scatter',
          symbol: 'circle',
          symbolSize: 8,
          data: fixedPoints as any,
          itemStyle: {
            color: '#7562E8',
            opacity: 0.9,
          },
          z: 3,
        },
        {
          name: 'Adaptive (Lattice)',
          type: 'scatter',
          symbol: 'triangle',
          symbolSize: 9,
          data: adaptivePoints as any,
          itemStyle: {
            color: '#0D8A58',
            opacity: 0.95,
          },
          z: 4,
        },
        ...(selectedPoint.length > 0
          ? [
            {
              name: 'Inspected Run',
              type: 'scatter',
              symbol: selectedRun?.strategy.includes('Adaptive')
                ? 'triangle'
                : 'circle',
              symbolSize: 15,
              data: selectedPoint as any,
              itemStyle: {
                color: selectedRun?.strategy.includes('Adaptive')
                  ? '#0D8A58'
                  : '#7562E8',
                borderColor: '#222938',
                borderWidth: 2,
              },
              z: 10,
            },
          ]
          : []),
      ] as any,
    };
  }, [dataset, selectedQuantizationName, selectedRun]);

  const onEvents = useMemo(() => {
    return {
      click: (params: any) => {
        const run: BenchmarkRunRecord | undefined = params.data?.[2];
        if (run) {
          onSelectRun(run.id);
        }
      },
    };
  }, [onSelectRun]);

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
      {/* 1. Header with View Tabs and Export Action */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E6EAF0] flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[#222938] tracking-tight">
            3. Results &amp; Comparison
          </h2>
          <p className="text-[12px] text-[#647187] mt-0.5">
            Statistical comparison (Mean ± Std Dev) and individual trial telemetry across strategies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <SegmentedTabs
            value={activeTab}
            onChange={(tab) => setActiveTab(tab)}
            options={[
              { id: 'summary', label: 'Summary' },
              { id: 'runs', label: 'Run Details', count: dataset.allRuns.length },
              { id: 'comparison', label: 'Comparison' },
              { id: 'quality', label: 'Quality Analysis' },
            ]}
          />

          <div className="flex items-center gap-1.5">
            <div className="w-20">
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </Select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              leftIcon={<Download className="w-3.5 h-3.5 text-[#7562E8]" />}
            >
              Export Results
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Run Drilldown Strip (when a scatter point or row is clicked) */}
      {selectedRun && (
        <div className="p-2.5 px-3 rounded-md bg-[#F2F0FD] border border-[#7562E8] flex items-center justify-between flex-wrap gap-2 text-[12px]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono font-semibold text-[#222938]">
              Inspected Trial #{selectedRun.runIndex} ({selectedRun.id})
            </span>
            <StatusBadge
              tone={
                selectedRun.strategy.includes('Adaptive') ? 'success' : 'accent'
              }
              dot={false}
            >
              {selectedRun.strategy}
            </StatusBadge>
            <span className="font-mono text-[#647187] tabular-nums">
              TTFT: <strong className="text-[#222938]">{selectedRun.latencyMs} ms</strong> ·
              Total: <strong className="text-[#222938]">{selectedRun.totalGenTimeS} s</strong> ·
              Speed: <strong className="text-[#222938]">{selectedRun.throughputToks} tok/s</strong> ·
              Memory: <strong className="text-[#222938]">{selectedRun.memoryGb.toFixed(1)} GB</strong>
              {selectedRun.qualityScore !== null && (
                <>
                  {' '}
                  · Quality:{' '}
                  <strong className="text-[#222938]">
                    {selectedRun.qualityScore.toFixed(1)}
                  </strong>
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectRun('')}
            className="text-[11px] font-medium text-[#647187] hover:text-[#222938] flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear selection</span>
          </button>
        </div>
      )}

      {/* 2. Tab 1: Summary */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Performance Comparison Scatter Plot (Col 7) */}
          <div className="lg:col-span-7 rounded-md border border-[#D9DEE7] bg-[#F8F9FB] p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#222938]">
                    Performance Comparison
                  </h3>
                  <span className="text-[11.5px] text-[#647187]">
                    Latency vs Throughput across runs (lower latency and higher throughput is better)
                  </span>
                </div>
              </div>

              <div className="h-[260px] w-full mt-2 bg-white rounded-sm border border-[#E6EAF0] p-1">
                <ReactECharts
                  option={chartOption}
                  style={{ height: '100%', width: '100%' }}
                  onEvents={onEvents}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2.5 mt-2 border-t border-[#E6EAF0] text-[11.5px] font-medium text-[#222938]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7562E8]" />
                <span>Fixed Configuration ({selectedQuantizationName})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px] border-b-[#0D8A58]" />
                <span>Adaptive (Lattice)</span>
              </div>
            </div>
          </div>

          {/* Right: Aggregated Results Table (Col 5) */}
          <div className="lg:col-span-5 rounded-md border border-[#D9DEE7] bg-white p-3.5 flex flex-col justify-between">
            <div>
              <div className="pb-2.5 border-b border-[#E6EAF0] flex items-center justify-between">
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#222938]">
                    Aggregated Results
                  </h3>
                  <span className="text-[11.5px] text-[#647187]">
                    Mean ± Std Dev across {dataset.fixedRuns.length} runs per strategy
                  </span>
                </div>
                <StatusBadge tone="neutral" dot={false}>
                  <span className="font-mono">N = {dataset.fixedRuns.length}</span>
                </StatusBadge>
              </div>

              <div className="mt-1 divide-y divide-[#E6EAF0]">
                <div className="grid grid-cols-12 py-2 text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider bg-[#F8F9FB] px-2 rounded-t-sm">
                  <div className="col-span-5">Metric</div>
                  <div className="col-span-3 text-right text-[#7562E8]">
                    Fixed ({selectedQuantizationName})
                  </div>
                  <div className="col-span-4 text-right text-[#0D8A58]">
                    Adaptive (Lattice)
                  </div>
                </div>

                {visibleAggregatedRows.map((row) => {
                  const isPositiveDelta = row.deltaPct > 0;
                  const deltaPrefix = isPositiveDelta ? '+' : '';

                  return (
                    <div
                      key={row.metric}
                      className="grid grid-cols-12 py-2.5 px-2 items-center text-[12px] hover:bg-[#F8F9FB] transition-colors"
                    >
                      <div className="col-span-5 flex items-center gap-2 font-medium text-[#222938] min-w-0 pr-1">
                        <span className="text-[#647187] shrink-0">
                          {row.metric.includes('Token') || row.metric.includes('Time') ? (
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

                      <div className="col-span-3 text-right font-mono text-[11.5px] text-[#222938] tabular-nums">
                        {row.fixedValue}
                      </div>

                      <div className="col-span-4 flex items-center justify-end gap-1.5">
                        <span className="font-mono font-semibold text-[11.5px] text-[#222938] tabular-nums">
                          {row.adaptiveValue}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm border tabular-nums ${row.isBetter
                              ? 'bg-[#ECFDF5] text-[#0D8A58] border-[#A7F3D0]'
                              : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
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

            <div className="pt-2.5 mt-2 border-t border-[#E6EAF0] flex items-center justify-between text-[11px] text-[#647187]">
              <span className="truncate">{dataset.provenance}</span>
              <span className="font-mono shrink-0 tabular-nums">
                {dataset.allRuns.length} total trials
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Tab 2: Run Details */}
      {activeTab === 'runs' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-64">
                <Input
                  type="text"
                  placeholder="Search run ID, model, strategy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                  rightElement={
                    searchQuery ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearchQuery('')}
                        className="text-[#647187] hover:text-[#222938] cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : undefined
                  }
                />
              </div>

              <SegmentedTabs
                value={strategyFilter}
                onChange={(val) => setStrategyFilter(val)}
                options={[
                  { id: 'all', label: 'All Runs', count: dataset.allRuns.length },
                  { id: 'fixed', label: 'Fixed', count: dataset.fixedRuns.length },
                  { id: 'adaptive', label: 'Adaptive', count: dataset.adaptiveRuns.length },
                ]}
              />
            </div>

            <div className="text-[11.5px] font-mono text-[#647187] tabular-nums">
              Showing {filteredRuns.length} of {dataset.allRuns.length} runs
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-md border border-[#D9DEE7] bg-white max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-[12px] border-collapse">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#E6EAF0] text-[#647187] font-semibold text-[10.5px] uppercase tracking-wider sticky top-0 z-10 select-none">
                  <th
                    onClick={() => handleSort('runIndex')}
                    className="py-2 px-3 cursor-pointer hover:text-[#222938]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Run #</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('strategy')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Strategy</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th className="py-2 px-2.5">Configuration</th>
                  <th
                    onClick={() => handleSort('latencyMs')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>TTFT (ms)</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalGenTimeS')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Gen Time (s)</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('throughputToks')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Throughput</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('memoryGb')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Memory</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('qualityScore')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Quality</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF0]">
                {filteredRuns.map((r) => {
                  const isSelected = selectedRunId === r.id;
                  const isAdaptive = r.strategy.includes('Adaptive');

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onSelectRun(r.id)}
                      className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#F2F0FD] font-semibold' : 'hover:bg-[#F8F9FB]'
                        }`}
                    >
                      <td className="py-2 px-3 font-mono text-[11.5px] font-semibold text-[#222938] tabular-nums">
                        #{r.runIndex}
                      </td>
                      <td className="py-2 px-2.5">
                        <StatusBadge
                          tone={isAdaptive ? 'success' : 'accent'}
                          dot={false}
                        >
                          {r.strategy}
                        </StatusBadge>
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-[#222938]">
                        {r.quantization}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-right text-[#222938] tabular-nums">
                        {r.latencyMs} ms
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-right text-[#222938] tabular-nums">
                        {r.totalGenTimeS.toFixed(1)} s
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-right text-[#222938] tabular-nums">
                        {r.throughputToks.toFixed(1)} tok/s
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-right text-[#222938] tabular-nums">
                        {r.memoryGb.toFixed(1)} GB
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-right text-[#222938] tabular-nums">
                        {r.qualityScore !== null ? r.qualityScore.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 px-2.5">
                        <StatusBadge tone="success">{r.status}</StatusBadge>
                      </td>
                      <td className="py-2 px-3 text-right text-[#647187] font-mono text-[11px] tabular-nums">
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

      {/* 4. Tab 3: Comparison Deep Dive */}
      {activeTab === 'comparison' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 rounded-md border border-[#D9DEE7] bg-[#F8F9FB] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#7562E8] font-semibold text-[12px]">
              <TrendingUp className="w-4 h-4" />
              <span>Throughput Acceleration</span>
            </div>
            <div className="text-[22px] font-mono font-semibold text-[#222938] tabular-nums">
              +
              {(
                ((dataset.adaptiveAggregates.throughputMean -
                  dataset.fixedAggregates.throughputMean) /
                  dataset.fixedAggregates.throughputMean) *
                100
              ).toFixed(1)}
              %
            </div>
            <p className="text-[12px] text-[#647187] leading-relaxed">
              Adaptive execution switches to non-dominated quantization levels during decoding,
              increasing mean throughput from{' '}
              <strong className="font-mono text-[#222938]">
                {dataset.fixedAggregates.throughputMean.toFixed(1)} tok/s
              </strong>{' '}
              to{' '}
              <strong className="font-mono text-[#0D8A58]">
                {dataset.adaptiveAggregates.throughputMean.toFixed(1)} tok/s
              </strong>
              .
            </p>
          </div>

          <div className="p-4 rounded-md border border-[#D9DEE7] bg-[#F8F9FB] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#2563EB] font-semibold text-[12px]">
              <HardDrive className="w-4 h-4" />
              <span>VRAM Footprint Reduction</span>
            </div>
            <div className="text-[22px] font-mono font-semibold text-[#222938] tabular-nums">
              {(
                ((dataset.adaptiveAggregates.memoryMean -
                  dataset.fixedAggregates.memoryMean) /
                  dataset.fixedAggregates.memoryMean) *
                100
              ).toFixed(1)}
              %
            </div>
            <p className="text-[12px] text-[#647187] leading-relaxed">
              Peak memory allocation drops by{' '}
              <strong className="font-mono text-[#222938]">
                {(
                  dataset.fixedAggregates.memoryMean -
                  dataset.adaptiveAggregates.memoryMean
                ).toFixed(1)}{' '}
                GB
              </strong>
              , preserving VRAM headroom for KV cache growth and concurrent workloads.
            </p>
          </div>

          <div className="p-4 rounded-md border border-[#D9DEE7] bg-[#F8F9FB] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#0D8A58] font-semibold text-[12px]">
              <Award className="w-4 h-4" />
              <span>Quality Parity Score</span>
            </div>
            <div className="text-[22px] font-mono font-semibold text-[#222938] tabular-nums">
              {dataset.adaptiveAggregates.qualityMean?.toFixed(1) || '—'}
              <span className="text-[12px] font-normal text-[#647187] ml-1">/ 100</span>
            </div>
            <p className="text-[12px] text-[#647187] leading-relaxed">
              Output quality remains aligned with the fixed baseline (
              <span className="font-mono">
                {dataset.fixedAggregates.qualityMean?.toFixed(1)}
              </span>{' '}
              vs{' '}
              <span className="font-mono">
                {dataset.adaptiveAggregates.qualityMean?.toFixed(1)}
              </span>
              ), confirming lower latency without semantic degradation.
            </p>
          </div>
        </div>
      )}

      {/* 5. Tab 4: Quality Analysis */}
      {activeTab === 'quality' && (
        <div className="flex flex-col gap-3.5 p-4 rounded-md border border-[#D9DEE7] bg-[#F8F9FB]">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E6EAF0] flex-wrap gap-2">
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#222938]">
                {dataset.evaluatorInfo?.name || 'Evaluator Methodology'}
              </h3>
              <p className="text-[12px] text-[#647187] mt-0.5">
                {dataset.evaluatorInfo?.methodology}
              </p>
            </div>
            <StatusBadge tone="accent" dot={false}>
              Dataset: <span className="font-mono ml-1">{dataset.evaluatorInfo?.dataset}</span>
            </StatusBadge>
          </div>

          <div className="p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[12px] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-[#92400E]">
                Evaluation Integrity Notice:
              </span>{' '}
              {dataset.evaluatorInfo?.limitations} Faster token generation does not guarantee
              higher semantic accuracy. All scores reflect empirical test batches.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-md bg-white border border-[#D9DEE7]">
              <span className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                Fixed Configuration ({selectedQuantizationName})
              </span>
              <div className="text-[20px] font-mono font-semibold text-[#222938] mt-1 tabular-nums">
                {dataset.fixedAggregates.qualityMean?.toFixed(1)} ±{' '}
                {dataset.fixedAggregates.qualityStd?.toFixed(1)}
              </div>
              <span className="text-[11px] text-[#647187] block mt-1">
                Measured across {dataset.fixedRuns.length} trials
              </span>
            </div>

            <div className="p-3.5 rounded-md bg-white border border-[#7562E8]">
              <span className="text-[10.5px] font-semibold text-[#7562E8] uppercase tracking-wider">
                Adaptive (Lattice Strategy)
              </span>
              <div className="text-[20px] font-mono font-semibold text-[#222938] mt-1 tabular-nums">
                {dataset.adaptiveAggregates.qualityMean?.toFixed(1)} ±{' '}
                {dataset.adaptiveAggregates.qualityStd?.toFixed(1)}
              </div>
              <span className="text-[11px] text-[#647187] block mt-1">
                Measured across {dataset.adaptiveRuns.length} trials
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};