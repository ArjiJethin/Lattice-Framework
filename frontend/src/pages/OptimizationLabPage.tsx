import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OptimizationLabHeader } from '../components/optimization-lab/OptimizationLabHeader';
import { SelectedModelSummaryCard } from '../components/optimization-lab/SelectedModelSummaryCard';
import { ConstraintStudio } from '../components/optimization-lab/ConstraintStudio';
import { CandidateStatistics } from '../components/optimization-lab/CandidateStatistics';
import { OptimizationResultsInspector } from '../components/optimization-lab/OptimizationResultsInspector';
import {
  OptimizationConstraints,
  OptimizationCandidate,
  OptimizationDecisionResult,
} from '../types/optimizationLab';
import {
  DEFAULT_OPTIMIZATION_CONSTRAINTS,
  buildOptimizationCandidates,
  evaluateOptimization,
} from '../lib/optimization-lab/optimizationLabService';
import { ModelFamily, QuantizationVariant, ModelLibrarySummaryStats } from '../types/modelLibrary';
import { BackendConnectionState } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';

interface OptimizationLabPageProps {
  selectedModel: ModelFamily;
  selectedVariant?: QuantizationVariant;
  allModels: ModelFamily[];
  summaryStats: ModelLibrarySummaryStats;
  backendState: BackendConnectionState;
  onRefreshConnection: () => void;
  onNavigate: (key: NavItemKey) => void;
}

export const OptimizationLabPage: React.FC<OptimizationLabPageProps> = ({
  selectedModel,
  selectedVariant,
  allModels,
  summaryStats,
  backendState,
  onRefreshConnection,
  onNavigate,
}) => {
  const [constraints, setConstraints] = useState<OptimizationConstraints>(
    DEFAULT_OPTIMIZATION_CONSTRAINTS
  );
  const [hasUnsolvedChanges, setHasUnsolvedChanges] = useState(false);

  const candidates = useMemo(() => {
    return buildOptimizationCandidates(selectedModel, allModels, constraints);
  }, [selectedModel, allModels, constraints]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [decision, setDecision] = useState<OptimizationDecisionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to latest constraints so model-change effect doesn't auto-fire on every slider drag
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;

  const executeSolver = useCallback(
    async (activeConstraints: OptimizationConstraints) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await evaluateOptimization(
          selectedModel,
          allModels,
          activeConstraints,
          backendState.connected
        );
        setDecision(result);
        setHasUnsolvedChanges(false);
        if (result.recommendedCandidate) {
          setSelectedCandidateId(result.recommendedCandidate.id);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Optimization plan request failed.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModel, allModels, backendState.connected]
  );

  // Run optimization automatically only when the selected model or backend connection changes
  useEffect(() => {
    executeSolver(constraintsRef.current);
  }, [selectedModel.id, executeSolver]);

  // Ensure a valid candidate is always selected for inspection
  const selectedCandidate = useMemo<OptimizationCandidate | null>(() => {
    if (candidates.length === 0) return null;
    if (selectedCandidateId) {
      const found = candidates.find((c) => c.id === selectedCandidateId);
      if (found) return found;
    }
    const currentModelCands = candidates.filter((c) => c.isCurrentModelVariant);
    return (
      currentModelCands.find((c) => c.quantization === selectedVariant?.name) ||
      currentModelCands.find((c) => c.status === 'feasible') ||
      currentModelCands[0] ||
      null
    );
  }, [candidates, selectedCandidateId, selectedVariant?.name]);

  const handleUpdateConstraints = useCallback(
    (updated: Partial<OptimizationConstraints>) => {
      setConstraints((prev) => ({ ...prev, ...updated }));
      setHasUnsolvedChanges(true);
    },
    []
  );

  const handleResetConstraints = useCallback(() => {
    setConstraints(DEFAULT_OPTIMIZATION_CONSTRAINTS);
    executeSolver(DEFAULT_OPTIMIZATION_CONSTRAINTS);
  }, [executeSolver]);

  const handleRunOptimization = useCallback(() => {
    executeSolver(constraints);
  }, [executeSolver, constraints]);

  return (
    <div className="flex-1 w-full p-4 lg:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto select-none pb-16">
      <OptimizationLabHeader
        stats={summaryStats}
        backendState={backendState}
        onRefreshConnection={onRefreshConnection}
        onBackToOverview={() => onNavigate('overview')}
        onBackToModelLab={() => onNavigate('model-lab')}
      />

      <SelectedModelSummaryCard
        model={selectedModel}
        selectedVariant={selectedVariant}
        recommendedCandidate={decision?.recommendedCandidate || null}
        onChangeModel={() => onNavigate('model-lab')}
      />

      <ConstraintStudio
        constraints={constraints}
        onChangeConstraints={handleUpdateConstraints}
        onResetConstraints={handleResetConstraints}
        onRunOptimization={handleRunOptimization}
        isLoading={isLoading}
        hasUnsolvedChanges={hasUnsolvedChanges}
        error={error}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <CandidateStatistics
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            recommendedCandidateId={decision?.recommendedCandidate?.id || null}
            onSelectCandidate={(cand) => setSelectedCandidateId(cand.id)}
            constraints={constraints}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <OptimizationResultsInspector
            decision={decision}
            selectedCandidate={selectedCandidate}
            activeVariantName={selectedVariant?.name}
            onSelectCandidate={(cand) => setSelectedCandidateId(cand.id)}
            onNavigateToExperiments={() => onNavigate('experiments')}
            constraints={constraints}
            candidates={candidates}
            isLoading={isLoading}
            hasUnsolvedChanges={hasUnsolvedChanges}
          />
        </div>
      </div>
    </div>
  );
};