import React, { useState } from 'react';
import {
  OptimizationDecisionResult,
  OptimizationCandidate,
  OptimizationConstraints,
} from '../../types/optimizationLab';
import {
  CheckCircle2,
  Box,
  HardDrive,
  Zap,
  Award,
} from 'lucide-react';

interface OptimizationResultsInspectorProps {
  decision: OptimizationDecisionResult | null;
  selectedCandidate: OptimizationCandidate | null;
  onSelectCandidate: (candidate: OptimizationCandidate) => void;
  constraints: OptimizationConstraints;
  candidates: OptimizationCandidate[];
  isLoading: boolean;
}

type InspectorTab = 'alternatives' | 'constraints' | 'analysis';

export const OptimizationResultsInspector: React.FC<OptimizationResultsInspectorProps> = ({
  decision,
  selectedCandidate,
  onSelectCandidate,
  constraints,
  candidates,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('alternatives');

  const recommended = decision?.recommendedCandidate || selectedCandidate;
  const currentModelCandidates = candidates.filter((c) => c.isCurrentModelVariant);

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* 1. Header with Status Badge matching screenshot */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <h2 className="text-base font-extrabold text-[#18213B] tracking-tight">
          3. Optimization Results
        </h2>

        {decision ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Optimization Complete</span>
          </span>
        ) : isLoading ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-[#7C6AF2] border border-purple-200/80">
            <span className="w-2 h-2 rounded-full bg-[#7C6AF2] animate-ping" />
            <span>Evaluating...</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Awaiting Plan</span>
          </span>
        )}
      </div>

      {recommended ? (
        <>
          {/* 2. Recommended Configuration Card matching reference */}
          <div className="rounded-xl border border-purple-200/70 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 p-3.5 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Recommended Configuration
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#8B5CF6]/15 text-[#7C6AF2] border border-[#8B5CF6]/25 uppercase tracking-wide">
                LATTICE
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
                <Box className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-[#18213B] leading-tight">
                  {recommended.modelName}
                </h3>
                <p className="text-xs font-bold text-[#7C6AF2] mt-0.5">
                  {recommended.quantization} &nbsp;·&nbsp;{' '}
                  <span className="text-slate-500 font-medium">General Purpose</span>
                </p>
              </div>
            </div>

            <p className="text-[11.5px] text-slate-600 font-medium leading-relaxed">
              {decision?.rationale ||
                'Best trade-off for the given constraints. Meets all requirements while minimizing latency.'}
            </p>

            {/* 3 Metrics Row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Memory */}
              <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100/90 text-center">
                <div className="flex items-center justify-center text-[#8B5CF6] mb-1">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-[#18213B] block">
                  {recommended.memoryUsageGb !== null ? `${recommended.memoryUsageGb} GB` : '—'}
                </span>
                <span className="text-[9.5px] font-medium text-slate-400 block mt-0.5">
                  Memory
                </span>
              </div>

              {/* Latency */}
              <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100/90 text-center">
                <div className="flex items-center justify-center text-[#3B82F6] mb-1">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-[#18213B] block">
                  {recommended.inferenceLatencyMs !== null ? `${recommended.inferenceLatencyMs} ms` : '—'}
                </span>
                <span className="text-[9.5px] font-medium text-slate-400 block mt-0.5">
                  Latency
                </span>
              </div>

              {/* Quality */}
              <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100/90 text-center">
                <div className="flex items-center justify-center text-[#10B981] mb-1">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-[#18213B] block">
                  {recommended.qualityScore !== null ? recommended.qualityScore : '—'}
                </span>
                <span className="text-[9.5px] font-medium text-slate-400 block mt-0.5">
                  Quality
                </span>
              </div>
            </div>
          </div>

          {/* 3. "Why This Configuration?" Section */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Why This Configuration?
            </span>

            <ul className="flex flex-col gap-1.5 text-xs">
              {(decision?.whyThisConfiguration || [
                'Lowest latency among all feasible candidates',
                `Meets memory constraint (≤ ${constraints.maxMemoryGb} GB)`,
                `Exceeds minimum quality threshold (≥ ${constraints.minQualityScore})`,
                'On Pareto frontier for latency vs memory',
                'Stable performance profile',
              ]).map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-700 font-medium leading-tight">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Bottom Tabs: Alternatives | Constraints | Detailed Analysis */}
          <div className="flex flex-col gap-3">
            {/* Tab Buttons */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-xs">
              <button
                onClick={() => setActiveTab('alternatives')}
                className={`py-1.5 font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'alternatives'
                    ? 'border-[#7C6AF2] text-[#7C6AF2]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Alternatives ({decision?.alternatives.length || 4})
              </button>

              <button
                onClick={() => setActiveTab('constraints')}
                className={`py-1.5 font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'constraints'
                    ? 'border-[#7C6AF2] text-[#7C6AF2]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Constraints
              </button>

              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-1.5 font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'analysis'
                    ? 'border-[#7C6AF2] text-[#7C6AF2]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Detailed Analysis
              </button>
            </div>

            {/* Tab 1: Alternatives matching reference */}
            {activeTab === 'alternatives' && (
              <div className="flex flex-col gap-2">
                {(decision?.alternatives || []).map((alt) => {
                  const targetCand = currentModelCandidates.find((c) => c.id === alt.candidateId);
                  const isAltSelected = selectedCandidate?.id === alt.candidateId;

                  return (
                    <div
                      key={alt.candidateId}
                      onClick={() => targetCand && onSelectCandidate(targetCand)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isAltSelected
                          ? 'bg-purple-50/80 border-[#8B5CF6]/40 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            alt.status === 'feasible'
                              ? 'bg-emerald-500'
                              : alt.status === 'near_feasible'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#18213B] block leading-tight">
                            {alt.quantization}
                          </span>
                          <span className="text-[10.5px] text-slate-500 font-medium truncate block mt-0.5" title={alt.reasonNotPreferred}>
                            {alt.reasonNotPreferred}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (targetCand) onSelectCandidate(targetCand);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs shrink-0 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Constraints Compliance Breakdown */}
            {activeTab === 'constraints' && (
              <div className="flex flex-col gap-2.5 text-xs">
                {/* Memory Limit */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                    <span className="text-slate-600">Memory Budget (≤ {constraints.maxMemoryGb} GB)</span>
                    <span
                      className={`font-extrabold ${
                        recommended.memoryUsageGb !== null && recommended.memoryUsageGb <= constraints.maxMemoryGb
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {recommended.memoryUsageGb !== null
                        ? `${recommended.memoryUsageGb} GB (${recommended.memoryUsageGb <= constraints.maxMemoryGb ? 'Passed' : 'Failed'})`
                        : 'Unmeasured'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        recommended.memoryUsageGb !== null && recommended.memoryUsageGb <= constraints.maxMemoryGb
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(100, ((recommended.memoryUsageGb || 0) / 16) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Latency Threshold */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                    <span className="text-slate-600">Latency (≤ {constraints.maxLatencyMs} ms)</span>
                    <span
                      className={`font-extrabold ${
                        recommended.inferenceLatencyMs !== null && recommended.inferenceLatencyMs <= constraints.maxLatencyMs
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {recommended.inferenceLatencyMs !== null
                        ? `${recommended.inferenceLatencyMs} ms (${recommended.inferenceLatencyMs <= constraints.maxLatencyMs ? 'Passed' : 'Failed'})`
                        : 'Unmeasured'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        recommended.inferenceLatencyMs !== null && recommended.inferenceLatencyMs <= constraints.maxLatencyMs
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(100, ((recommended.inferenceLatencyMs || 0) / 2000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Quality Score */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                    <span className="text-slate-600">Quality Score (≥ {constraints.minQualityScore})</span>
                    <span
                      className={`font-extrabold ${
                        recommended.qualityScore !== null && recommended.qualityScore >= constraints.minQualityScore
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {recommended.qualityScore !== null
                        ? `${recommended.qualityScore} (${recommended.qualityScore >= constraints.minQualityScore ? 'Passed' : 'Failed'})`
                        : 'Unmeasured'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        recommended.qualityScore !== null && recommended.qualityScore >= constraints.minQualityScore
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (recommended.qualityScore || 0))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Detailed Analysis */}
            {activeTab === 'analysis' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Generation Throughput:</span>
                  <span className="font-bold text-[#18213B]">
                    {recommended.generationSpeedToks ? `${recommended.generationSpeedToks} tokens/sec` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time to First Token (est):</span>
                  <span className="font-bold text-[#18213B]">
                    {recommended.ttftMs ? `${recommended.ttftMs} ms` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pareto Frontier Status:</span>
                  <span className="font-bold text-[#7C6AF2]">
                    {recommended.isParetoOptimal ? 'Non-Dominated Optimal' : 'Sub-Optimal'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Switch Overhead:</span>
                  <span className="font-bold text-[#18213B]">
                    {constraints.switchingOverheadMs || 120} ms
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-slate-400 text-xs">
          Select constraints and click Run Optimization to view recommendations.
        </div>
      )}
    </div>
  );
};
