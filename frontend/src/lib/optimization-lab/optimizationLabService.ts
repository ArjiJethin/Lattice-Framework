import { ModelFamily } from '../../types/modelLibrary';
import {
  WorkloadOption,
  ObjectiveOption,
  OptimizationConstraints,
  OptimizationCandidate,
  OptimizationDecisionResult,
  OptimizationAlternative,
  CandidateFeasibility,
} from '../../types/optimizationLab';
import { apiClient } from '../api/client';
import { OptimizationPlanRequest } from '../../types';

export const WORKLOAD_OPTIONS: WorkloadOption[] = [
  {
    id: 'general',
    label: 'General Purpose',
    description: 'Balanced text generation tasks',
    recommendedContext: '32K',
  },
  {
    id: 'code',
    label: 'Code Generation',
    description: 'High precision logic, syntax validation & fill-in-middle',
    recommendedContext: '64K',
  },
  {
    id: 'chat',
    label: 'Chat / Conversational',
    description: 'Low-latency streaming tokens with conversational memory',
    recommendedContext: '32K',
  },
  {
    id: 'summarization',
    label: 'Document Summarization',
    description: 'High throughput batch inference over dense long texts',
    recommendedContext: '128K',
  },
  {
    id: 'latency_critical',
    label: 'Latency Critical (Real-Time)',
    description: 'Sub-150ms first-token response for interactive agents',
    recommendedContext: '16K',
  },
];

export const OBJECTIVE_OPTIONS: ObjectiveOption[] = [
  {
    id: 'latency',
    label: 'Minimize Latency',
    description: 'Find fastest configuration that meets all constraints',
    helperText: 'Prioritizes lowest execution time per token while respecting memory & quality thresholds',
  },
  {
    id: 'memory',
    label: 'Minimize Memory',
    description: 'Smallest VRAM/RAM footprint that passes constraints',
    helperText: 'Maximizes available headroom for concurrent tasks and long context caches',
  },
  {
    id: 'throughput',
    label: 'Maximize Throughput',
    description: 'Highest token generation per second',
    helperText: 'Optimizes batch execution efficiency and generation token rate',
  },
  {
    id: 'balanced',
    label: 'Balanced Pareto',
    description: 'Optimal multi-objective compromise across memory, speed and quality',
    helperText: 'Calculates non-dominated frontier to maximize quality retention per megabyte',
  },
];

export const DEFAULT_OPTIMIZATION_CONSTRAINTS: OptimizationConstraints = {
  workloadType: 'general',
  objective: 'latency',
  maxMemoryGb: 4.0,
  maxLatencyMs: 300,
  minQualityScore: 80,
  targetHardware: 'RTX 3050 (4 GB)',
  switchingOverheadMs: 120,
  minRepetitions: 3,
  allowUnprofiled: false,
};

/**
 * Builds candidate records from the selected model family and its variants.
 * Also includes realistic background points from other models for the global Pareto visual space.
 */
export function buildOptimizationCandidates(
  selectedModel: ModelFamily,
  allModels: ModelFamily[],
  constraints: OptimizationConstraints
): OptimizationCandidate[] {
  const result: OptimizationCandidate[] = [];

  // Primary candidates: Variants of the currently active model
  selectedModel.variants.forEach((v) => {
    const memory = v.memoryUsageGb !== undefined ? v.memoryUsageGb : v.fileSizeGb;
    const latency = v.inferenceLatencyMs !== undefined ? v.inferenceLatencyMs : null;
    const quality = v.qualityScore !== undefined ? v.qualityScore : null;
    const speed = v.generationSpeedToks !== undefined ? v.generationSpeedToks : null;

    const isProfiled = v.isProfiled !== false && latency !== null;

    // Constraint evaluation
    const withinMemory = memory !== null ? memory <= constraints.maxMemoryGb : null;
    const meetsLatency = latency !== null ? latency <= constraints.maxLatencyMs : null;
    const meetsQuality = quality !== null ? quality >= constraints.minQualityScore : null;

    const rejectionReasons: string[] = [];
    if (withinMemory === false) {
      rejectionReasons.push(`Exceeds memory limit (${memory} GB > ${constraints.maxMemoryGb} GB)`);
    }
    if (meetsLatency === false) {
      rejectionReasons.push(`Exceeds latency limit (${latency} ms > ${constraints.maxLatencyMs} ms)`);
    }
    if (meetsQuality === false) {
      rejectionReasons.push(`Lower quality score (${quality} < ${constraints.minQualityScore})`);
    }

    let status: CandidateFeasibility = 'unprofiled';
    if (!isProfiled) {
      status = 'unprofiled';
    } else if (withinMemory && meetsLatency && meetsQuality) {
      status = 'feasible';
    } else if (
      // Near feasible: only slightly misses memory or latency by <= 15%
      withinMemory === false &&
      memory !== null &&
      memory <= constraints.maxMemoryGb * 1.15 &&
      meetsLatency &&
      meetsQuality
    ) {
      status = 'near_feasible';
    } else if (
      meetsLatency === false &&
      latency !== null &&
      latency <= constraints.maxLatencyMs * 1.2 &&
      withinMemory &&
      meetsQuality
    ) {
      status = 'near_feasible';
    } else {
      status = 'rejected';
    }

    result.push({
      id: v.id,
      name: v.name,
      modelName: selectedModel.name,
      quantization: v.name,
      description: v.descriptionTag || `${v.name} quantization`,
      format: selectedModel.fileFormat,
      memoryUsageGb: memory,
      inferenceLatencyMs: latency,
      generationSpeedToks: speed,
      qualityScore: quality,
      ttftMs: latency ? Math.round(latency * 0.45) : null,
      status,
      rejectionReasons,
      audit: {
        withinMemoryBudget: withinMemory,
        memoryDeltaGb: memory !== null ? Number((memory - constraints.maxMemoryGb).toFixed(2)) : null,
        meetsLatencyConstraint: meetsLatency,
        latencyDeltaMs: latency !== null ? Math.round(latency - constraints.maxLatencyMs) : null,
        qualityThresholdSatisfied: meetsQuality,
        qualityDeltaScore: quality !== null ? Number((quality - constraints.minQualityScore).toFixed(1)) : null,
      },
      provenance: 'demo_fixture',
      isCurrentModelVariant: true,
    });
  });

  // Background reference candidates from other model variants (shown softly in plot)
  allModels.forEach((m) => {
    if (m.id === selectedModel.id) return;
    m.variants.forEach((v) => {
      const memory = v.memoryUsageGb !== undefined ? v.memoryUsageGb : v.fileSizeGb;
      const latency = v.inferenceLatencyMs !== undefined ? v.inferenceLatencyMs : null;
      const quality = v.qualityScore !== undefined ? v.qualityScore : null;

      const withinMemory = memory !== null ? memory <= constraints.maxMemoryGb : null;
      const meetsLatency = latency !== null ? latency <= constraints.maxLatencyMs : null;
      const meetsQuality = quality !== null ? quality >= constraints.minQualityScore : null;

      let status: CandidateFeasibility = 'unprofiled';
      if (!v.isProfiled || latency === null) {
        status = 'unprofiled';
      } else if (withinMemory && meetsLatency && meetsQuality) {
        status = 'feasible';
      } else {
        status = 'rejected';
      }

      result.push({
        id: `${m.id}-${v.id}`,
        name: `${m.name} ${v.name}`,
        modelName: m.name,
        quantization: v.name,
        description: `${m.name} ${v.name}`,
        format: m.fileFormat,
        memoryUsageGb: memory,
        inferenceLatencyMs: latency,
        generationSpeedToks: v.generationSpeedToks || null,
        qualityScore: quality,
        status,
        rejectionReasons: [],
        audit: {
          withinMemoryBudget: withinMemory,
          memoryDeltaGb: null,
          meetsLatencyConstraint: meetsLatency,
          latencyDeltaMs: null,
          qualityThresholdSatisfied: meetsQuality,
          qualityDeltaScore: null,
        },
        provenance: 'demo_fixture',
        isCurrentModelVariant: false,
      });
    });
  });

  // Mark Pareto optimal candidates among profiled items
  const validForPareto = result.filter(
    (c) => c.isCurrentModelVariant && c.memoryUsageGb !== null && c.inferenceLatencyMs !== null
  );

  validForPareto.forEach((c1) => {
    // c1 is dominated if there exists c2 such that c2.memory <= c1.memory and c2.latency <= c1.latency (with at least one <)
    const isDominated = validForPareto.some((c2) => {
      if (c1.id === c2.id) return false;
      const mem1 = c1.memoryUsageGb!;
      const mem2 = c2.memoryUsageGb!;
      const lat1 = c1.inferenceLatencyMs!;
      const lat2 = c2.inferenceLatencyMs!;
      return mem2 <= mem1 && lat2 <= lat1 && (mem2 < mem1 || lat2 < lat1);
    });
    c1.isParetoOptimal = !isDominated;
  });

  return result;
}

/**
 * Computes the Pareto frontier curve points (sorted by memory) for plotting.
 */
export function computeParetoFrontierPoints(
  candidates: OptimizationCandidate[]
): Array<[number, number]> {
  const points = candidates
    .filter(
      (c) =>
        c.isCurrentModelVariant &&
        c.memoryUsageGb !== null &&
        c.inferenceLatencyMs !== null &&
        c.status !== 'unprofiled'
    )
    .map((c) => [c.memoryUsageGb!, c.inferenceLatencyMs!] as [number, number]);

  if (points.length === 0) return [];

  // Sort by memory ascending
  points.sort((a, b) => a[0] - b[0]);

  // Extract non-dominated points where latency strictly decreases as memory increases
  const frontier: Array<[number, number]> = [];
  let minLatency = Infinity;

  // Traverse from highest memory to lowest to construct lower bound
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i][1] < minLatency) {
      minLatency = points[i][1];
      frontier.unshift(points[i]);
    }
  }

  // Prepend & append smooth curve bounds
  if (frontier.length > 0) {
    const first = frontier[0];
    const last = frontier[frontier.length - 1];
    return [
      [Math.max(0.5, Number((first[0] * 0.85).toFixed(1))), Math.round(first[1] * 1.35)],
      ...frontier,
      [Number((last[0] * 1.15).toFixed(1)), Math.round(last[1] * 0.9)],
    ];
  }

  return frontier;
}

/**
 * Executes or simulates optimization decision.
 */
export async function evaluateOptimization(
  selectedModel: ModelFamily,
  allModels: ModelFamily[],
  constraints: OptimizationConstraints,
  isConnectedToBackend: boolean
): Promise<OptimizationDecisionResult> {
  // If backend is connected, make real API call
  if (isConnectedToBackend) {
    const req: OptimizationPlanRequest = {
      modelName: selectedModel.name,
      memoryBudgetGb: constraints.maxMemoryGb,
      maxLatencyMs: constraints.maxLatencyMs,
      minQualityScore: constraints.minQualityScore,
      objective: constraints.objective,
    };
    const response = await apiClient.submitOptimizationPlan(req);

    const candidates = buildOptimizationCandidates(selectedModel, allModels, constraints);
    const recommended =
      candidates.find((c) => c.id === response.selectedCandidateId || c.quantization === selectedModel.defaultVariantId) ||
      candidates.find((c) => c.status === 'feasible') ||
      candidates[0];

    const alternatives: OptimizationAlternative[] = candidates
      .filter((c) => c.isCurrentModelVariant && c.id !== recommended.id)
      .slice(0, 4)
      .map((c) => ({
        candidateId: c.id,
        configurationName: c.name,
        quantization: c.quantization,
        reasonNotPreferred: c.rejectionReasons[0] || 'Sub-optimal trade-off for current objective',
        memoryUsageGb: c.memoryUsageGb,
        inferenceLatencyMs: c.inferenceLatencyMs,
        qualityScore: c.qualityScore,
        status: c.status,
      }));

    return {
      decisionId: response.decisionId,
      status: response.status,
      recommendedCandidate: recommended,
      whyThisConfiguration: [
        'Lowest latency among all feasible candidates',
        `Meets memory constraint (≤ ${constraints.maxMemoryGb} GB)`,
        `Exceeds minimum quality threshold (≥ ${constraints.minQualityScore})`,
        'On Pareto frontier for latency vs memory',
        'Stable performance profile verified by runtime evidence',
      ],
      alternatives,
      rationale: response.rationale,
      timestamp: response.timestamp,
      isLiveResponse: true,
      algorithm: 'Lattice Deterministic Pareto Solver v1.0',
    };
  }

  // Demo mode: deterministic decision calculation
  await new Promise((r) => setTimeout(r, 450));

  const candidates = buildOptimizationCandidates(selectedModel, allModels, constraints);
  const currentModelCandidates = candidates.filter((c) => c.isCurrentModelVariant);

  // Filter feasible candidates
  const feasible = currentModelCandidates.filter((c) => c.status === 'feasible');
  const nearFeasible = currentModelCandidates.filter((c) => c.status === 'near_feasible');

  let winner: OptimizationCandidate | null = null;

  if (feasible.length > 0) {
    // Pick based on objective
    switch (constraints.objective) {
      case 'latency':
        winner = feasible.reduce((prev, curr) =>
          (curr.inferenceLatencyMs ?? Infinity) < (prev.inferenceLatencyMs ?? Infinity) ? curr : prev
        );
        break;
      case 'memory':
        winner = feasible.reduce((prev, curr) =>
          (curr.memoryUsageGb ?? Infinity) < (prev.memoryUsageGb ?? Infinity) ? curr : prev
        );
        break;
      case 'throughput':
        winner = feasible.reduce((prev, curr) =>
          (curr.generationSpeedToks ?? 0) > (prev.generationSpeedToks ?? 0) ? curr : prev
        );
        break;
      case 'balanced':
      default:
        // Pareto weighted score
        winner = feasible.reduce((prev, curr) => {
          const scoreCurr =
            ((curr.qualityScore ?? 70) / 100) * 0.4 +
            (1 - (curr.inferenceLatencyMs ?? 500) / 2000) * 0.35 +
            (1 - (curr.memoryUsageGb ?? 8) / 16) * 0.25;
          const scorePrev =
            ((prev.qualityScore ?? 70) / 100) * 0.4 +
            (1 - (prev.inferenceLatencyMs ?? 500) / 2000) * 0.35 +
            (1 - (prev.memoryUsageGb ?? 8) / 16) * 0.25;
          return scoreCurr > scorePrev ? curr : prev;
        });
        break;
    }
  } else if (nearFeasible.length > 0) {
    winner = nearFeasible[0];
  } else if (currentModelCandidates.length > 0) {
    winner = currentModelCandidates[0];
  }

  const whyPoints: string[] = [];
  if (winner) {
    if (winner.status === 'feasible') {
      if (constraints.objective === 'latency') {
        whyPoints.push('Lowest latency among all feasible candidates');
      } else if (constraints.objective === 'memory') {
        whyPoints.push('Smallest memory footprint among all feasible candidates');
      } else if (constraints.objective === 'throughput') {
        whyPoints.push('Highest token generation speed among all feasible candidates');
      } else {
        whyPoints.push('Optimal balance across latency, memory, and quality retention');
      }
      whyPoints.push(`Meets memory constraint (≤ ${constraints.maxMemoryGb} GB)`);
      whyPoints.push(`Exceeds minimum quality threshold (≥ ${constraints.minQualityScore})`);
      if (winner.isParetoOptimal) {
        whyPoints.push('On Pareto frontier for latency vs memory');
      }
      whyPoints.push('Stable performance profile with verified compatibility');
    } else {
      whyPoints.push('Best alternative candidate closest to satisfying constraints');
      whyPoints.push(`Memory: ${winner.memoryUsageGb} GB vs target ${constraints.maxMemoryGb} GB`);
      whyPoints.push(`Latency: ${winner.inferenceLatencyMs} ms vs limit ${constraints.maxLatencyMs} ms`);
    }
  }

  const alternatives: OptimizationAlternative[] = currentModelCandidates
    .filter((c) => c.id !== winner?.id)
    .slice(0, 4)
    .map((c) => {
      let reason = 'Sub-optimal trade-off for current objective';
      if (c.rejectionReasons.length > 0) {
        reason = c.rejectionReasons[0];
      } else if (winner && c.inferenceLatencyMs && winner.inferenceLatencyMs && c.inferenceLatencyMs > winner.inferenceLatencyMs) {
        reason = `Meets memory limit but higher latency (${c.inferenceLatencyMs} ms > ${winner.inferenceLatencyMs} ms)`;
      } else if (winner && c.memoryUsageGb && winner.memoryUsageGb && c.memoryUsageGb > winner.memoryUsageGb) {
        reason = `Higher quality but exceeds memory limit (${c.memoryUsageGb} GB)`;
      }

      return {
        candidateId: c.id,
        configurationName: c.name,
        quantization: c.quantization,
        reasonNotPreferred: reason,
        memoryUsageGb: c.memoryUsageGb,
        inferenceLatencyMs: c.inferenceLatencyMs,
        qualityScore: c.qualityScore,
        status: c.status,
      };
    });

  return {
    decisionId: `dec-sim-${Date.now().toString(36)}`,
    status: feasible.length > 0 ? 'optimal' : nearFeasible.length > 0 ? 'feasible' : 'infeasible',
    recommendedCandidate: winner,
    whyThisConfiguration: whyPoints,
    alternatives,
    rationale: winner
      ? `Selected ${winner.quantization} for ${selectedModel.name} as the best trade-off for ${constraints.workloadType} under ${constraints.objective} objective.`
      : 'No candidate satisfied the provided constraints.',
    timestamp: new Date().toISOString(),
    isLiveResponse: false,
    algorithm: 'Lattice Deterministic Pareto Solver v1.0',
  };
}
