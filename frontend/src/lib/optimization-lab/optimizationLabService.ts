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
 * Also includes reference points from other models for the global Pareto space.
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

    const hasMeasurements = memory !== null && latency !== null;
    const canEvaluate =
      hasMeasurements && (v.isProfiled !== false || Boolean(constraints.allowUnprofiled));

    // Constraint evaluation
    const withinMemory = memory !== null ? memory <= constraints.maxMemoryGb : null;
    const meetsLatency = latency !== null ? latency <= constraints.maxLatencyMs : null;
    const meetsQuality = quality !== null ? quality >= constraints.minQualityScore : null;

    const rejectionReasons: string[] = [];
    if (!v.isProfiled && !constraints.allowUnprofiled) {
      rejectionReasons.push('Unprofiled configuration (enable "Include unbenchmarked profiles" to evaluate)');
    }
    if (withinMemory === false) {
      rejectionReasons.push(
        `Exceeds memory budget (${memory?.toFixed(1)} GB > ${constraints.maxMemoryGb.toFixed(1)} GB)`
      );
    }
    if (meetsLatency === false) {
      rejectionReasons.push(
        `Exceeds latency limit (${latency} ms > ${constraints.maxLatencyMs} ms)`
      );
    }
    if (meetsQuality === false) {
      rejectionReasons.push(
        `Below minimum quality (${quality?.toFixed(1)} < ${constraints.minQualityScore})`
      );
    }

    let status: CandidateFeasibility = 'unprofiled';
    if (!canEvaluate) {
      status = 'unprofiled';
    } else if (withinMemory && meetsLatency && meetsQuality) {
      status = 'feasible';
    } else if (
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
    } else if (
      meetsQuality === false &&
      quality !== null &&
      quality >= constraints.minQualityScore - 4 &&
      withinMemory &&
      meetsLatency
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
        memoryDeltaGb:
          memory !== null ? Number((memory - constraints.maxMemoryGb).toFixed(2)) : null,
        meetsLatencyConstraint: meetsLatency,
        latencyDeltaMs:
          latency !== null ? Math.round(latency - constraints.maxLatencyMs) : null,
        qualityThresholdSatisfied: meetsQuality,
        qualityDeltaScore:
          quality !== null ? Number((quality - constraints.minQualityScore).toFixed(1)) : null,
      },
      provenance: 'demo_fixture',
      isCurrentModelVariant: true,
    });
  });

  // Reference candidates from other catalog models
  allModels.forEach((m) => {
    if (m.id === selectedModel.id) return;
    m.variants.forEach((v) => {
      const memory = v.memoryUsageGb !== undefined ? v.memoryUsageGb : v.fileSizeGb;
      const latency = v.inferenceLatencyMs !== undefined ? v.inferenceLatencyMs : null;
      const quality = v.qualityScore !== undefined ? v.qualityScore : null;

      const withinMemory = memory !== null ? memory <= constraints.maxMemoryGb : null;
      const meetsLatency = latency !== null ? latency <= constraints.maxLatencyMs : null;
      const meetsQuality = quality !== null ? quality >= constraints.minQualityScore : null;

      const canEvaluate =
        memory !== null &&
        latency !== null &&
        (v.isProfiled !== false || Boolean(constraints.allowUnprofiled));

      const rejectionReasons: string[] = [];
      if (withinMemory === false) {
        rejectionReasons.push(`Exceeds memory limit (${memory?.toFixed(1)} GB > ${constraints.maxMemoryGb.toFixed(1)} GB)`);
      }
      if (meetsLatency === false) {
        rejectionReasons.push(`Exceeds latency limit (${latency} ms > ${constraints.maxLatencyMs} ms)`);
      }
      if (meetsQuality === false) {
        rejectionReasons.push(`Below quality threshold (${quality?.toFixed(1)} < ${constraints.minQualityScore})`);
      }

      let status: CandidateFeasibility = 'unprofiled';
      if (!canEvaluate) {
        status = 'unprofiled';
      } else if (withinMemory && meetsLatency && meetsQuality) {
        status = 'feasible';
      } else {
        status = 'rejected';
      }

      result.push({
        id: `${m.id}-${v.id}`,
        name: `${m.name} (${v.name})`,
        modelName: m.name,
        quantization: v.name,
        description: `${m.name} · ${v.descriptionTag || v.name}`,
        format: m.fileFormat,
        memoryUsageGb: memory,
        inferenceLatencyMs: latency,
        generationSpeedToks: v.generationSpeedToks || null,
        qualityScore: quality,
        ttftMs: latency ? Math.round(latency * 0.45) : null,
        status,
        rejectionReasons,
        audit: {
          withinMemoryBudget: withinMemory,
          memoryDeltaGb:
            memory !== null ? Number((memory - constraints.maxMemoryGb).toFixed(2)) : null,
          meetsLatencyConstraint: meetsLatency,
          latencyDeltaMs:
            latency !== null ? Math.round(latency - constraints.maxLatencyMs) : null,
          qualityThresholdSatisfied: meetsQuality,
          qualityDeltaScore:
            quality !== null ? Number((quality - constraints.minQualityScore).toFixed(1)) : null,
        },
        provenance: 'demo_fixture',
        isCurrentModelVariant: false,
      });
    });
  });

  // Mark Pareto optimal candidates among evaluable current-model items
  const validForPareto = result.filter(
    (c) =>
      c.isCurrentModelVariant &&
      c.memoryUsageGb !== null &&
      c.inferenceLatencyMs !== null &&
      c.status !== 'unprofiled'
  );

  validForPareto.forEach((c1) => {
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
        c.inferenceLatencyMs !== null
    )
    .map((c) => [c.memoryUsageGb!, c.inferenceLatencyMs!] as [number, number]);

  if (points.length === 0) return [];

  points.sort((a, b) => a[0] - b[0]);

  const frontier: Array<[number, number]> = [];
  let minLatency = Infinity;

  for (let i = 0; i < points.length; i++) {
    if (points[i][1] < minLatency) {
      minLatency = points[i][1];
      frontier.push(points[i]);
    }
  }

  return frontier;
}

/**
 * Executes or simulates optimization decision.
 * Never fabricates a feasible winner when all candidates violate constraints.
 */
export async function evaluateOptimization(
  selectedModel: ModelFamily,
  allModels: ModelFamily[],
  constraints: OptimizationConstraints,
  isConnectedToBackend: boolean
): Promise<OptimizationDecisionResult> {
  if (isConnectedToBackend) {
    const req: OptimizationPlanRequest = {
      modelName: selectedModel.name,
      targetHardware: constraints.targetHardware,
      memoryBudgetGb: constraints.maxMemoryGb,
      maxLatencyMs: constraints.maxLatencyMs,
      minQualityScore: constraints.minQualityScore,
      objective: constraints.objective,
    };
    const response = await apiClient.submitOptimizationPlan(req);

    const candidates = buildOptimizationCandidates(selectedModel, allModels, constraints);
    const currentModelCandidates = candidates.filter((c) => c.isCurrentModelVariant);
    const recommended =
      currentModelCandidates.find(
        (c) => c.id === response.selectedCandidateId || c.quantization === response.selectedCandidateId
      ) ||
      currentModelCandidates.find((c) => c.status === 'feasible') ||
      null;

    const alternatives: OptimizationAlternative[] = currentModelCandidates
      .filter((c) => c.id !== recommended?.id)
      .map((c) => ({
        candidateId: c.id,
        configurationName: c.name,
        quantization: c.quantization,
        reasonNotPreferred:
          c.rejectionReasons[0] || 'Sub-optimal trade-off for current objective',
        memoryUsageGb: c.memoryUsageGb,
        inferenceLatencyMs: c.inferenceLatencyMs,
        qualityScore: c.qualityScore,
        status: c.status,
      }));

    return {
      decisionId: response.decisionId,
      status: response.status,
      recommendedCandidate: recommended,
      whyThisConfiguration: recommended
        ? [
          `Selected by backend solver for ${constraints.objective} objective`,
          `Memory usage ${recommended.memoryUsageGb?.toFixed(1)} GB within ≤ ${constraints.maxMemoryGb.toFixed(1)} GB budget`,
          `Inference latency ${recommended.inferenceLatencyMs} ms within ≤ ${constraints.maxLatencyMs} ms limit`,
          `Quality score ${recommended.qualityScore?.toFixed(1)} satisfies ≥ ${constraints.minQualityScore} threshold`,
        ]
        : ['No candidate profile satisfied all active constraints.'],
      alternatives,
      rationale: response.rationale,
      timestamp: response.timestamp,
      isLiveResponse: true,
      algorithm: 'Lattice Deterministic Pareto Solver v1.0',
    };
  }

  // Demo mode: deterministic decision calculation
  await new Promise((r) => setTimeout(r, 320));

  const candidates = buildOptimizationCandidates(selectedModel, allModels, constraints);
  const currentModelCandidates = candidates.filter((c) => c.isCurrentModelVariant);

  const feasible = currentModelCandidates.filter((c) => c.status === 'feasible');
  const nearFeasible = currentModelCandidates.filter((c) => c.status === 'near_feasible');

  let winner: OptimizationCandidate | null = null;

  const pickByObjective = (pool: OptimizationCandidate[]): OptimizationCandidate => {
    switch (constraints.objective) {
      case 'latency':
        return pool.reduce((prev, curr) =>
          (curr.inferenceLatencyMs ?? Infinity) < (prev.inferenceLatencyMs ?? Infinity)
            ? curr
            : prev
        );
      case 'memory':
        return pool.reduce((prev, curr) =>
          (curr.memoryUsageGb ?? Infinity) < (prev.memoryUsageGb ?? Infinity) ? curr : prev
        );
      case 'throughput':
        return pool.reduce((prev, curr) =>
          (curr.generationSpeedToks ?? 0) > (prev.generationSpeedToks ?? 0) ? curr : prev
        );
      case 'balanced':
      default:
        return pool.reduce((prev, curr) => {
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
    }
  };

  if (feasible.length > 0) {
    winner = pickByObjective(feasible);
  } else if (nearFeasible.length > 0) {
    winner = pickByObjective(nearFeasible);
  } else {
    winner = null;
  }

  const whyPoints: string[] = [];
  if (winner) {
    if (winner.status === 'feasible') {
      if (constraints.objective === 'latency') {
        whyPoints.push(
          `Lowest inference latency (${winner.inferenceLatencyMs} ms) among feasible candidates`
        );
      } else if (constraints.objective === 'memory') {
        whyPoints.push(
          `Smallest memory footprint (${winner.memoryUsageGb?.toFixed(1)} GB) among feasible candidates`
        );
      } else if (constraints.objective === 'throughput') {
        whyPoints.push(
          `Highest generation speed (${winner.generationSpeedToks} tok/s) among feasible candidates`
        );
      } else {
        whyPoints.push('Highest composite Pareto score across memory, latency, and quality');
      }
      whyPoints.push(
        `Fits within memory budget (${winner.memoryUsageGb?.toFixed(1)} GB ≤ ${constraints.maxMemoryGb.toFixed(1)} GB)`
      );
      whyPoints.push(
        `Satisfies latency limit (${winner.inferenceLatencyMs} ms ≤ ${constraints.maxLatencyMs} ms)`
      );
      whyPoints.push(
        `Exceeds minimum quality threshold (${winner.qualityScore?.toFixed(1)} ≥ ${constraints.minQualityScore})`
      );
      if (winner.isParetoOptimal) {
        whyPoints.push('Sits on the non-dominated Pareto efficiency frontier');
      }
    } else {
      whyPoints.push(
        'No configuration strictly satisfied all limits; showing closest near-feasible candidate'
      );
      whyPoints.push(
        `Memory: ${winner.memoryUsageGb?.toFixed(1)} GB vs ${constraints.maxMemoryGb.toFixed(1)} GB budget`
      );
      whyPoints.push(
        `Latency: ${winner.inferenceLatencyMs} ms vs ${constraints.maxLatencyMs} ms limit`
      );
      whyPoints.push(
        `Quality: ${winner.qualityScore?.toFixed(1)} vs ${constraints.minQualityScore} minimum`
      );
    }
  } else {
    whyPoints.push(
      `0 of ${currentModelCandidates.length} configurations for ${selectedModel.name} satisfied the active constraints.`
    );
    whyPoints.push(
      'Relax Max Memory, Max Latency, or Min Quality, or enable "Include unbenchmarked profiles" in Advanced Options.'
    );
  }

  const alternatives: OptimizationAlternative[] = currentModelCandidates
    .filter((c) => c.id !== winner?.id)
    .map((c) => {
      let reason = 'Sub-optimal trade-off for current objective';
      if (c.rejectionReasons.length > 0) {
        reason = c.rejectionReasons[0];
      } else if (
        winner &&
        c.inferenceLatencyMs !== null &&
        winner.inferenceLatencyMs !== null &&
        c.inferenceLatencyMs > winner.inferenceLatencyMs
      ) {
        reason = `Feasible, but slower latency (${c.inferenceLatencyMs} ms vs ${winner.inferenceLatencyMs} ms)`;
      } else if (
        winner &&
        c.memoryUsageGb !== null &&
        winner.memoryUsageGb !== null &&
        c.memoryUsageGb > winner.memoryUsageGb
      ) {
        reason = `Feasible, but higher memory (${c.memoryUsageGb.toFixed(1)} GB vs ${winner.memoryUsageGb.toFixed(1)} GB)`;
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
    status:
      feasible.length > 0 ? 'optimal' : nearFeasible.length > 0 ? 'feasible' : 'infeasible',
    recommendedCandidate: winner,
    whyThisConfiguration: whyPoints,
    alternatives,
    rationale: winner
      ? winner.status === 'feasible'
        ? `Selected ${winner.quantization} for ${selectedModel.name} as the optimal configuration for ${constraints.workloadType} workload under the ${constraints.objective} objective.`
        : `No strictly feasible candidate found; ${winner.quantization} is the closest near-feasible configuration within tolerance.`
      : `No candidate configuration for ${selectedModel.name} met the required memory (≤ ${constraints.maxMemoryGb.toFixed(1)} GB), latency (≤ ${constraints.maxLatencyMs} ms), and quality (≥ ${constraints.minQualityScore}) constraints.`,
    timestamp: new Date().toISOString(),
    isLiveResponse: false,
    algorithm: 'Lattice Deterministic Pareto Solver v1.0',
  };
}