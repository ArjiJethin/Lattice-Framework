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
  OptimizationProgress,
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
  const [solvedConstraints, setSolvedConstraints] = useState<OptimizationConstraints>(
    DEFAULT_OPTIMIZATION_CONSTRAINTS
  );
  const [hasUnsolvedChanges, setHasUnsolvedChanges] = useState(false);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [decision, setDecision] = useState<OptimizationDecisionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep refs to latest constraints and in-flight abort controller
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSolver = useCallback(
    async (activeConstraints: OptimizationConstraints, simulateDuration = true) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);
      if (simulateDuration) {
        setProgress({
          percent: 4,
          stage: 'Initializing Pareto constraint solver...',
          elapsedMs: 0,
        });
      }

      try {
        const result = await evaluateOptimization(
          selectedModel,
          allModels,
          activeConstraints,
          backendState.connected,
          {
            simulateDuration,
            onProgress: (p) => {
              if (!controller.signal.aborted) {
                setProgress(p);
              }
            },
            signal: controller.signal,
            activeVariantName: selectedVariant?.name,
          }
        );

        if (controller.signal.aborted) return;

        setSolvedConstraints(activeConstraints);
        setDecision(result);
        setHasUnsolvedChanges(false);

        if (result.recommendedCandidate) {
          setSelectedCandidateId(result.recommendedCandidate.id);
        } else {
          const fallbackCand = result.candidates?.find((c) => c.isCurrentModelVariant);
          if (fallbackCand) {
            setSelectedCandidateId(fallbackCand.id);
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Optimization plan request failed.';
        setError(message);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
          setProgress(null);
        }
      }
    },
    [selectedModel, allModels, backendState.connected, selectedVariant?.name]
  );

  // Hydrate initial state on mount or model switch; explicit runs use 3-7s simulation
  useEffect(() => {
    executeSolver(constraintsRef.current, false);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [selectedModel.id, executeSolver]);

  // Candidates always stay synchronized with the latest committed solver run
  const candidates = useMemo(() => {
    if (decision?.candidates && decision.candidates.length > 0) {
      return decision.candidates;
    }
    return buildOptimizationCandidates(
      selectedModel,
      allModels,
      solvedConstraints,
      selectedVariant?.name
    );
  }, [decision?.candidates, selectedModel, allModels, solvedConstraints, selectedVariant?.name]);

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
    setHasUnsolvedChanges(false);
    executeSolver(DEFAULT_OPTIMIZATION_CONSTRAINTS, true);
  }, [executeSolver]);

  const handleRunOptimization = useCallback(() => {
    executeSolver(constraints, true);
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
        progress={progress}
        lastSolveDurationMs={decision?.solveDurationMs}
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
            constraints={solvedConstraints}
            isLoading={isLoading}
            progress={progress}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <OptimizationResultsInspector
            decision={decision}
            selectedCandidate={selectedCandidate}
            activeVariantName={selectedVariant?.name}
            onSelectCandidate={(cand) => setSelectedCandidateId(cand.id)}
            onNavigateToExperiments={() => onNavigate('experiments')}
            constraints={solvedConstraints}
            candidates={candidates}
            isLoading={isLoading}
            progress={progress}
            hasUnsolvedChanges={hasUnsolvedChanges}
          />
        </div>
      </div>
    </div>
  );
};
