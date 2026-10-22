import React, { useState, useMemo } from 'react';
import { OptimizationCandidate } from '../../types/optimizationLab';
import { Search, ArrowUpDown, Check } from 'lucide-react';

interface PerformanceTableViewProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
}

type SortField = 'name' | 'quantization' | 'memoryUsageGb' | 'inferenceLatencyMs' | 'generationSpeedToks' | 'qualityScore' | 'status';
type SortDirection = 'asc' | 'desc';

export const PerformanceTableView: React.FC<PerformanceTableViewProps> = ({
  candidates,
  selectedCandidate,
  onSelectCandidate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'feasible' | 'near_feasible' | 'rejected' | 'unprofiled'>('all');
  const [sortField, setSortField] = useState<SortField>('memoryUsageGb');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Focus on current model's variants first
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.quantization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.modelName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchQuery, statusFilter]);

  // Sort candidates
  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredCandidates, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 p-1">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search configuration or quantization..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C6AF2]"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-white text-[#18213B] shadow-2xs font-bold' : 'hover:text-slate-800'
            }`}
          >
            All ({candidates.length})
          </button>
          <button
            onClick={() => setStatusFilter('feasible')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'feasible' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'hover:text-emerald-700'
            }`}
          >
            Feasible
          </button>
          <button
            onClick={() => setStatusFilter('near_feasible')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'near_feasible' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'hover:text-amber-700'
            }`}
          >
            Near Feasible
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'rejected' ? 'bg-white text-red-700 shadow-2xs font-bold' : 'hover:text-red-700'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('unprofiled')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              statusFilter === 'unprofiled' ? 'bg-white text-slate-700 shadow-2xs font-bold' : 'hover:text-slate-700'
            }`}
          >
            Unprofiled
          </button>
        </div>
      </div>

      {/* Expanded Table */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/80 sticky top-0 z-10 backdrop-blur-sm">
                <th className="py-2.5 pl-4 pr-1 w-8"></th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Configuration</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('quantization')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Quantization</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('memoryUsageGb')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Memory (GB)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('inferenceLatencyMs')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Latency (ms)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('generationSpeedToks')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Speed (tok/s)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('qualityScore')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Quality</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Feasibility</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCandidates.map((cand) => {
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

                    <td className="py-2.5 px-3 font-bold text-[#18213B]">
                      <div className="flex items-center gap-2">
                        <span>{cand.name}</span>
                        {!cand.isCurrentModelVariant && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-normal">
                            {cand.modelName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {cand.quantization}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {cand.memoryUsageGb !== null ? `${cand.memoryUsageGb} GB` : '—'}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {cand.inferenceLatencyMs !== null ? `${cand.inferenceLatencyMs} ms` : '—'}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {cand.generationSpeedToks !== null ? `${cand.generationSpeedToks} tok/s` : '—'}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {cand.qualityScore !== null ? cand.qualityScore : '—'}
                    </td>

                    <td className="py-2.5 px-3">{statusBadge}</td>

                    <td className="py-2.5 pr-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCandidate(cand);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all"
                      >
                        Inspect
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
