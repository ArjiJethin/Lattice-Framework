import React, { useState, useMemo } from 'react';
import { OptimizationCandidate, OptimizationConstraints } from '../../types/optimizationLab';
import { Input, StatusBadge, Button, Switch } from '../ui/primitives';
import { Search, ArrowUpDown, X } from 'lucide-react';

interface PerformanceTableViewProps {
  candidates: OptimizationCandidate[];
  selectedCandidate: OptimizationCandidate | null;
  recommendedCandidateId?: string | null;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
  constraints?: OptimizationConstraints;
}

type SortField =
  | 'name'
  | 'quantization'
  | 'memoryUsageGb'
  | 'inferenceLatencyMs'
  | 'generationSpeedToks'
  | 'qualityScore'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const PerformanceTableView: React.FC<PerformanceTableViewProps> = ({
  candidates,
  selectedCandidate,
  recommendedCandidateId,
  onSelectCandidate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllModels, setShowAllModels] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'feasible' | 'near_feasible' | 'rejected' | 'unprofiled'
  >('all');
  const [sortField, setSortField] = useState<SortField>('memoryUsageGb');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const scopedCandidates = useMemo(() => {
    return showAllModels
      ? candidates
      : candidates.filter((c) => c.isCurrentModelVariant);
  }, [candidates, showAllModels]);

  const filteredCandidates = useMemo(() => {
    return scopedCandidates.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.quantization.toLowerCase().includes(q) ||
        c.modelName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [scopedCandidates, searchQuery, statusFilter]);

  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      return sortDir === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
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
    <div className="w-full flex flex-col gap-2.5">
      {/* Filter & Search Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-60">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter variant or model..."
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

          <Switch
            id="scope-all-models"
            checked={showAllModels}
            onCheckedChange={setShowAllModels}
            label="Include Reference Models"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[#EEF1F6] border border-[#D9DEE7] text-[11px]">
          {(
            [
              { id: 'all', label: `All (${scopedCandidates.length})` },
              { id: 'feasible', label: 'Feasible' },
              { id: 'near_feasible', label: 'Near' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'unprofiled', label: 'Unprofiled' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2 py-1 rounded-sm font-semibold transition-colors cursor-pointer ${statusFilter === tab.id
                  ? 'bg-white text-[#222938] shadow-2xs'
                  : 'text-[#647187] hover:text-[#222938]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-hidden rounded-md border border-[#D9DEE7] bg-white">
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          {sortedCandidates.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-[#647187]">
              No candidate configurations match the current filter criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F8F9FB] text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider border-b border-[#E6EAF0] sticky top-0 z-10 select-none">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-2 px-3 cursor-pointer hover:text-[#222938]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Configuration</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('quantization')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Quantization</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('memoryUsageGb')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Memory</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('inferenceLatencyMs')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Latency</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8A94A6]" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('generationSpeedToks')}
                    className="py-2 px-2.5 cursor-pointer hover:text-[#222938] text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Throughput</span>
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
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF0]">
                {sortedCandidates.map((cand) => {
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
                      <td className="py-2 px-3 text-[#222938]">
                        <div className="flex items-center gap-1.5">
                          <span>{cand.modelName}</span>
                          {isRecommended && (
                            <span className="px-1.5 py-0.2 rounded-sm text-[9.5px] font-semibold bg-[#ECFDF5] text-[#0D8A58] border border-[#A7F3D0]">
                              Optimal
                            </span>
                          )}
                          {!cand.isCurrentModelVariant && (
                            <span className="text-[10px] text-[#647187] font-normal">
                              (Ref)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-[#7562E8] font-semibold">
                        {cand.quantization}
                      </td>
                      <td
                        className={`py-2 px-2.5 font-mono text-[11.5px] text-right tabular-nums ${cand.audit.withinMemoryBudget === false
                            ? 'text-[#DC2626]'
                            : 'text-[#222938]'
                          }`}
                      >
                        {cand.memoryUsageGb !== null
                          ? `${cand.memoryUsageGb.toFixed(1)} GB`
                          : '—'}
                      </td>
                      <td
                        className={`py-2 px-2.5 font-mono text-[11.5px] text-right tabular-nums ${cand.audit.meetsLatencyConstraint === false
                            ? 'text-[#DC2626]'
                            : 'text-[#222938]'
                          }`}
                      >
                        {cand.inferenceLatencyMs !== null
                          ? `${cand.inferenceLatencyMs} ms`
                          : '—'}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11.5px] text-right tabular-nums text-[#222938]">
                        {cand.generationSpeedToks !== null
                          ? `${cand.generationSpeedToks} tok/s`
                          : '—'}
                      </td>
                      <td
                        className={`py-2 px-2.5 font-mono text-[11.5px] text-right tabular-nums ${cand.audit.qualityThresholdSatisfied === false
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
                      <td className="py-2 pr-3 text-right">
                        <Button
                          variant={isSelected ? 'subtle' : 'secondary'}
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCandidate(cand);
                          }}
                        >
                          {isSelected ? 'Inspecting' : 'Inspect'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};