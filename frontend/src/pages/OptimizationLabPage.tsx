import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  // 1. Optimization Constraints State (Preserved across navigation)
  const [constraints, setConstraints] = useState<OptimizationConstraints>(
    DEFAULT_OPTIMIZATION_CONSTRAINTS
  );

  // 2. Optimization Candidates derived from active model & constraints
  const candidates = useMemo(() => {
    return buildOptimizationCandidates(selectedModel, allModels, constraints);
  }, [selectedModel, allModels, constraints]);

  // 3. Selection & Decision States
  const [selectedCandidate, setSelectedCandidate] = useState<OptimizationCandidate | null>(null);
  const [decision, setDecision] = useState<OptimizationDecisionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run optimization planning calculation or API request
  const runOptimization = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await evaluateOptimization(
        selectedModel,
        allModels,
        constraints,
        backendState.connected
      );
      setDecision(result);
      if (result.recommendedCandidate) {
        setSelectedCandidate(result.recommendedCandidate);
      }
    } catch (err: any) {
      setError(err?.message || 'Optimization plan request failed.');
      // Important integrity requirement: Do NOT replace failed live request with fake demo data!
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, allModels, constraints, backendState.connected]);

  // Initial calculation and re-evaluation when active model or objective changes
  useEffect(() => {
    runOptimization();
  }, [selectedModel.id, runOptimization]);

  // If selectedCandidate is null or belongs to old model, point to default or first feasible candidate
  useEffect(() => {
    if (candidates.length > 0) {
      const currentModelCands = candidates.filter((c) => c.isCurrentModelVariant);
      const match =
        currentModelCands.find((c) => c.quantization === selectedVariant?.name) ||
        currentModelCands.find((c) => c.status === 'feasible') ||
        currentModelCands[0];
      setSelectedCandidate(match || null);
    }
  }, [selectedModel.id, selectedVariant?.id, candidates]);

  const handleUpdateConstraints = (updated: Partial<OptimizationConstraints>) => {
    setConstraints((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="flex-1 w-full p-4 lg:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto select-none animate-fadeIn pb-16">
      {/* 1. Header with Breadcrumb & Summary Metrics */}
      <OptimizationLabHeader
        stats={summaryStats}
        backendState={backendState}
        onRefreshConnection={onRefreshConnection}
        onBackToOverview={() => onNavigate('overview')}
        onBackToModelLab={() => onNavigate('model-lab')}
      />

      {/* 2. Top Selected Model Summary Card */}
      <SelectedModelSummaryCard
        model={selectedModel}
        selectedVariant={selectedVariant}
        onChangeModel={() => onNavigate('model-lab')}
      />

      {/* 3. Section 1: Optimization Requirements (Constraint Studio) */}
      <ConstraintStudio
        constraints={constraints}
        onChangeConstraints={handleUpdateConstraints}
        onRunOptimization={runOptimization}
        isLoading={isLoading}
        error={error}
      />

      {/* 4. Split Layout: Candidate Statistics (Left 60%) & Optimization Results (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: 2. Candidate Statistics */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <CandidateStatistics
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={(cand) => setSelectedCandidate(cand)}
            constraints={constraints}
          />
        </div>

        {/* Right Column: 3. Optimization Results (Decision Inspector) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <OptimizationResultsInspector
            decision={decision}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={(cand) => setSelectedCandidate(cand)}
            constraints={constraints}
            candidates={candidates}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};
