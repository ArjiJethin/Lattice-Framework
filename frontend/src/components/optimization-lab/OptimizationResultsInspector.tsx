import React, { useState } from 'react';
import {
  OptimizationDecisionResult,
  OptimizationCandidate,
  OptimizationConstraints,
} from '../../types/optimizationLab';
import { StatusBadge, SegmentedTabs, Button } from '../ui/primitives';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Box,
  HardDrive,
  Zap,
  Award,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface OptimizationResultsInspectorProps {
  decision: OptimizationDecisionResult | null;
  selectedCandidate: OptimizationCandidate | null;
  activeVariantName?: string;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
  onNavigateToExperiments?: () => void;
  constraints: OptimizationConstraints;
  candidates: OptimizationCandidate[];
  isLoading: boolean;
  hasUnsolvedChanges?: boolean;
}

type InspectorTab = 'alternatives' | 'constraints' | 'analysis';

export const OptimizationResultsInspector: React.FC<OptimizationResultsInspectorProps> = ({
  decision,
  selectedCandidate,
  activeVariantName,
  onSelectCandidate,
  onNavigateToExperiments,
  constraints,
  candidates,
  isLoading,
  hasUnsolvedChanges = false,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('alternatives');

  const recommended = decision?.recommendedCandidate || null;
  const inspected = selectedCandidate || recommended;
  const currentModelCandidates = candidates.filter((c) => c.isCurrentModelVariant);

  const isInspectingDifferentFromRecommended =
    Boolean(recommended && inspected && recommended.id !== inspected.id);

  const renderSolverStatusBadge = () => {
    if (isLoading) {
      return (
        <StatusBadge tone="accent" pulse>
          Solving...
        </StatusBadge>
      );
    }
    if (!decision) {
      return <StatusBadge tone="neutral">Awaiting Plan</StatusBadge>;
    }
    if (decision.status === 'optimal') {
      return <StatusBadge tone="success">Optimal Found</StatusBadge>;
    }
    if (decision.status === 'feasible') {
      return <StatusBadge tone="warning">Near-Feasible Fallback</StatusBadge>;
    }
    return <StatusBadge tone="danger">No Feasible Candidate</StatusBadge>;
  };

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#222938] tracking-tight">
            3. Optimization Decision &amp; Inspector
          </h2>
          <p className="text-[11.5px] text-[#647187] mt-0.5">
            {decision?.isLiveResponse
              ? 'Live backend solver decision'
              : 'Deterministic Pareto evaluation'}
          </p>
        </div>

        {renderSolverStatusBadge()}
      </div>

      {/* Infeasible Alert State */}
      {decision?.status === 'infeasible' && (
        <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-start gap-2.5">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-[12px] leading-relaxed">
            <span className="font-semibold block text-[#991B1B]">
              No Strictly Feasible Configuration Found
            </span>
            <span className="text-[#DC2626]">{decision.rationale}</span>
          </div>
        </div>
      )}

      {/* Primary Recommendation Card (when a recommendation exists) */}
      {recommended && (
        <div
          className={`rounded-md border p-3.5 flex flex-col gap-2.5 ${decision?.status === 'optimal'
              ? 'border-[#A7F3D0] bg-[#ECFDF5]/40'
              : 'border-[#FDE68A] bg-[#FFFBEB]/50'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0D8A58]">
              {decision?.status === 'optimal'
                ? 'Recommended Configuration'
                : 'Closest Near-Feasible Candidate'}
            </span>
            <div className="flex items-center gap-1.5">
              {activeVariantName && activeVariantName === recommended.quantization && (
                <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-mono bg-white text-[#647187] border border-[#D9DEE7]">
                  Matches Active Baseline
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-semibold bg-white text-[#7562E8] border border-[#D9DEE7]">
                {decision?.isLiveResponse ? 'LIVE SOLVER' : 'PARETO SOLVER'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-md bg-white border border-[#D9DEE7] text-[#7562E8] flex items-center justify-center shrink-0">
                <Box className="w-4 h-4" />
              </div>

              <div>
                <h3 className="text-[14.5px] font-semibold text-[#222938] leading-tight">
                  {recommended.modelName} —{' '}
                  <span className="font-mono text-[#7562E8]">{recommended.quantization}</span>
                </h3>
                <p className="text-[11.5px] text-[#647187] mt-0.5">
                  {recommended.description} · Objective:{' '}
                  <span className="font-mono uppercase">{constraints.objective}</span>
                </p>
              </div>
            </div>

            {isInspectingDifferentFromRecommended && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => onSelectCandidate(recommended)}
              >
                Focus Optimal
              </Button>
            )}
          </div>

          <p className="text-[11.5px] text-[#222938] leading-relaxed">
            {decision?.rationale}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-[#D9DEE7]/60">
            <div className="p-2 rounded-sm bg-white border border-[#D9DEE7] text-center">
              <div className="flex items-center justify-center gap-1 text-[#647187] text-[10.5px] mb-0.5">
                <HardDrive className="w-3 h-3" />
                <span>Memory</span>
              </div>
              <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums block">
                {recommended.memoryUsageGb !== null
                  ? `${recommended.memoryUsageGb.toFixed(1)} GB`
                  : '—'}
              </span>
            </div>

            <div className="p-2 rounded-sm bg-white border border-[#D9DEE7] text-center">
              <div className="flex items-center justify-center gap-1 text-[#647187] text-[10.5px] mb-0.5">
                <Zap className="w-3 h-3" />
                <span>Latency</span>
              </div>
              <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums block">
                {recommended.inferenceLatencyMs !== null
                  ? `${recommended.inferenceLatencyMs} ms`
                  : '—'}
              </span>
            </div>

            <div className="p-2 rounded-sm bg-white border border-[#D9DEE7] text-center">
              <div className="flex items-center justify-center gap-1 text-[#647187] text-[10.5px] mb-0.5">
                <Award className="w-3 h-3" />
                <span>Quality</span>
              </div>
              <span className="text-[13px] font-mono font-semibold text-[#222938] tabular-nums block">
                {recommended.qualityScore !== null
                  ? `${recommended.qualityScore.toFixed(1)} / 100`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Currently Inspected Candidate Banner (when user clicks a different row/point) */}
      {inspected && isInspectingDifferentFromRecommended && (
        <div className="p-3 rounded-md bg-[#F2F0FD] border border-[#7562E8] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#634FDB] uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Currently Inspecting: {inspected.quantization}</span>
            </span>
            <StatusBadge
              tone={
                inspected.status === 'feasible'
                  ? 'success'
                  : inspected.status === 'near_feasible'
                    ? 'warning'
                    : inspected.status === 'rejected'
                      ? 'danger'
                      : 'neutral'
              }
              dot={false}
            >
              {inspected.status.replace('_', ' ')}
            </StatusBadge>
          </div>
          {inspected.rejectionReasons.length > 0 ? (
            <div className="text-[11.5px] text-[#DC2626] flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{inspected.rejectionReasons.join(' · ')}</span>
            </div>
          ) : (
            <div className="text-[11.5px] text-[#222938]">
              Memory: <span className="font-mono">{inspected.memoryUsageGb?.toFixed(1)} GB</span> ·
              Latency: <span className="font-mono">{inspected.inferenceLatencyMs} ms</span> ·
              Quality: <span className="font-mono">{inspected.qualityScore?.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* Decision Rationale Checklist */}
      <div className="flex flex-col gap-1.5 p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647187]">
            Decision Rationale
          </span>
          {hasUnsolvedChanges && (
            <span className="text-[10.5px] font-mono text-[#B45309]">
              Pending re-solve
            </span>
          )}
        </div>
        <ul className="space-y-1.5 text-[11.5px] text-[#222938]">
          {(decision?.whyThisConfiguration || []).map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-snug">
              {decision?.status === 'infeasible' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0D8A58] shrink-0 mt-0.5" />
              )}
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Inspector Detail Tabs */}
      {inspected && (
        <div className="flex flex-col gap-2.5">
          <SegmentedTabs
            fullWidth
            value={activeTab}
            onChange={(tab) => setActiveTab(tab)}
            options={[
              {
                id: 'alternatives',
                label: 'Alternatives',
                count: decision?.alternatives.length || 0,
              },
              { id: 'constraints', label: `Audit (${inspected.quantization})` },
              { id: 'analysis', label: 'Telemetry' },
            ]}
          />

          {activeTab === 'alternatives' && (
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
              {(decision?.alternatives || []).length === 0 ? (
                <div className="py-4 text-center text-[11.5px] text-[#647187]">
                  No alternative variants available for this model.
                </div>
              ) : (
                (decision?.alternatives || []).map((alt) => {
                  const targetCand = currentModelCandidates.find(
                    (c) => c.id === alt.candidateId
                  );
                  const isAltSelected = selectedCandidate?.id === alt.candidateId;
                  const statusTone =
                    alt.status === 'feasible'
                      ? 'success'
                      : alt.status === 'near_feasible'
                        ? 'warning'
                        : alt.status === 'rejected'
                          ? 'danger'
                          : 'neutral';

                  return (
                    <div
                      key={alt.candidateId}
                      onClick={() => targetCand && onSelectCandidate(targetCand)}
                      className={`flex items-center justify-between p-2.5 rounded-md border transition-colors cursor-pointer ${isAltSelected
                          ? 'bg-[#F2F0FD] border-[#7562E8]'
                          : 'bg-white hover:bg-[#F8F9FB] border-[#D9DEE7]'
                        }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                        <StatusBadge tone={statusTone} dot={false} className="mt-0.5">
                          {alt.quantization}
                        </StatusBadge>
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono text-[#222938] tabular-nums">
                            {alt.memoryUsageGb !== null ? `${alt.memoryUsageGb.toFixed(1)} GB` : '—'}{' '}
                            · {alt.inferenceLatencyMs !== null ? `${alt.inferenceLatencyMs} ms` : '—'}{' '}
                            · Q: {alt.qualityScore !== null ? alt.qualityScore.toFixed(1) : '—'}
                          </div>
                          <span
                            className="text-[11px] text-[#647187] truncate block mt-0.5"
                            title={alt.reasonNotPreferred}
                          >
                            {alt.reasonNotPreferred}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant={isAltSelected ? 'subtle' : 'secondary'}
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (targetCand) onSelectCandidate(targetCand);
                        }}
                      >
                        {isAltSelected ? 'Active' : 'Inspect'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'constraints' && (
            <div className="space-y-2 text-[12px]">
              {/* Memory Audit */}
              <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#647187]">
                    Memory Budget (≤ {constraints.maxMemoryGb.toFixed(1)} GB)
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${inspected.audit.withinMemoryBudget === false
                        ? 'text-[#DC2626]'
                        : 'text-[#0D8A58]'
                      }`}
                  >
                    {inspected.memoryUsageGb !== null
                      ? `${inspected.memoryUsageGb.toFixed(1)} GB (${inspected.audit.memoryDeltaGb && inspected.audit.memoryDeltaGb > 0
                        ? `+${inspected.audit.memoryDeltaGb.toFixed(1)}`
                        : inspected.audit.memoryDeltaGb?.toFixed(1)
                      } GB)`
                      : 'Unmeasured'}
                  </span>
                </div>
                <div className="w-full bg-[#E2E6EE] h-1.5 rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${inspected.audit.withinMemoryBudget === false
                        ? 'bg-[#DC2626]'
                        : 'bg-[#0D8A58]'
                      }`}
                    style={{
                      width: `${Math.min(100, ((inspected.memoryUsageGb || 0) / 8) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Latency Audit */}
              <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#647187]">
                    Latency Limit (≤ {constraints.maxLatencyMs} ms)
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${inspected.audit.meetsLatencyConstraint === false
                        ? 'text-[#DC2626]'
                        : 'text-[#0D8A58]'
                      }`}
                  >
                    {inspected.inferenceLatencyMs !== null
                      ? `${inspected.inferenceLatencyMs} ms (${inspected.audit.latencyDeltaMs && inspected.audit.latencyDeltaMs > 0
                        ? `+${inspected.audit.latencyDeltaMs}`
                        : inspected.audit.latencyDeltaMs
                      } ms)`
                      : 'Unmeasured'}
                  </span>
                </div>
                <div className="w-full bg-[#E2E6EE] h-1.5 rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${inspected.audit.meetsLatencyConstraint === false
                        ? 'bg-[#DC2626]'
                        : 'bg-[#0D8A58]'
                      }`}
                    style={{
                      width: `${Math.min(
                        100,
                        ((inspected.inferenceLatencyMs || 0) / 500) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Quality Audit */}
              <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#647187]">
                    Minimum Quality (≥ {constraints.minQualityScore})
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${inspected.audit.qualityThresholdSatisfied === false
                        ? 'text-[#DC2626]'
                        : 'text-[#0D8A58]'
                      }`}
                  >
                    {inspected.qualityScore !== null
                      ? `${inspected.qualityScore.toFixed(1)} (${inspected.audit.qualityDeltaScore &&
                        inspected.audit.qualityDeltaScore >= 0
                        ? `+${inspected.audit.qualityDeltaScore.toFixed(1)}`
                        : inspected.audit.qualityDeltaScore?.toFixed(1)
                      })`
                      : 'Unmeasured'}
                  </span>
                </div>
                <div className="w-full bg-[#E2E6EE] h-1.5 rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${inspected.audit.qualityThresholdSatisfied === false
                        ? 'bg-[#DC2626]'
                        : 'bg-[#0D8A58]'
                      }`}
                    style={{
                      width: `${Math.min(100, inspected.qualityScore || 0)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] divide-y divide-[#E6EAF0] text-[12px]">
              <div className="flex justify-between py-1.5">
                <span className="text-[#647187]">Inspected Configuration</span>
                <span className="font-mono font-semibold text-[#222938]">
                  {inspected.modelName} ({inspected.quantization})
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#647187]">Sustained Throughput</span>
                <span className="font-mono font-semibold text-[#222938] tabular-nums">
                  {inspected.generationSpeedToks
                    ? `${inspected.generationSpeedToks} tok/s`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#647187]">Estimated TTFT</span>
                <span className="font-mono font-semibold text-[#222938] tabular-nums">
                  {inspected.ttftMs ? `${inspected.ttftMs} ms` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#647187]">Pareto Frontier Status</span>
                <span
                  className={`font-semibold ${inspected.isParetoOptimal ? 'text-[#0D8A58]' : 'text-[#647187]'
                    }`}
                >
                  {inspected.isParetoOptimal ? 'Non-Dominated (Pareto Optimal)' : 'Dominated'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#647187]">Switching Overhead Budget</span>
                <span className="font-mono font-semibold text-[#222938] tabular-nums">
                  {constraints.switchingOverheadMs ?? 120} ms
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer CTA to Evaluate in Experiments */}
      {onNavigateToExperiments && (
        <div className="pt-2 border-t border-[#E6EAF0] flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#647187] font-mono truncate">
            ID: {decision?.decisionId || 'pending'}
          </span>
          <Button
            variant="subtle"
            size="sm"
            onClick={onNavigateToExperiments}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Evaluate in Experiments
          </Button>
        </div>
      )}
    </div>
  );
};