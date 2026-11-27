import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';
import {
  WorkloadOption,
  ObjectiveOption,
  WorkloadType,
  OptimizationConstraints,
  OptimizationCandidate,
  OptimizationDecisionResult,
  OptimizationAlternative,
  OptimizationProgress,
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
    helperText:
      'Prioritizes lowest execution time per token while respecting memory & quality thresholds',
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

interface WorkloadPhysics {
  kvCacheOverheadGb: number;
  latencyFactor: number;
  throughputFactor: number;
  qualityBias: number;
  ttftRatio: number;
}

const WORKLOAD_PHYSICS: Record<WorkloadType, WorkloadPhysics> = {
  general: {
    kvCacheOverheadGb: 0.0,
    latencyFactor: 1.0,
    throughputFactor: 1.0,
    qualityBias: 0.0,
    ttftRatio: 0.45,
  },
  code: {
    kvCacheOverheadGb: 0.35,
    latencyFactor: 1.12,
    throughputFactor: 0.94,
    qualityBias: -0.6,
    ttftRatio: 0.5,
  },
  chat: {
    kvCacheOverheadGb: 0.1,
    latencyFactor: 0.92,
    throughputFactor: 1.04,
    qualityBias: 0.2,
    ttftRatio: 0.4,
  },
  summarization: {
    kvCacheOverheadGb: 0.75,
    latencyFactor: 1.32,
    throughputFactor: 0.86,
    qualityBias: -0.4,
    ttftRatio: 0.62,
  },
  latency_critical: {
    kvCacheOverheadGb: -0.15,
    latencyFactor: 0.84,
    throughputFactor: 1.1,
    qualityBias: 0.0,
    ttftRatio: 0.36,
  },
};

interface HardwareProfile {
  label: string;
  vramGb: number | null;
  isCpuOnly: boolean;
  latencyFactor: number;
  throughputFactor: number;
}

function parseHardwareProfile(targetHardware?: string): HardwareProfile {
  const raw = (targetHardware || 'RTX 3050 (4 GB)').trim();
  const lower = raw.toLowerCase();
  const memMatch = raw.match(/(\d+(?:\.\d+)?)\s*gb/i);
  const parsedGb = memMatch ? parseFloat(memMatch[1]) : null;

  if (lower.includes('cpu')) {
    return {
      label: raw || 'CPU Only',
      vramGb: null,
      isCpuOnly: true,
      latencyFactor: 2.05,
      throughputFactor: 0.44,
    };
  }
  if (
    lower.includes('4090') ||
    lower.includes('a100') ||
    lower.includes('h100') ||
    lower.includes('m3 max') ||
    lower.includes('m4 max')
  ) {
    return {
      label: raw,
      vramGb: parsedGb ?? 24.0,
      isCpuOnly: false,
      latencyFactor: 0.58,
      throughputFactor: 1.55,
    };
  }
  if (
    lower.includes('4070') ||
    lower.includes('4080') ||
    lower.includes('3080') ||
    lower.includes('3090')
  ) {
    return {
      label: raw,
      vramGb: parsedGb ?? 12.0,
      isCpuOnly: false,
      latencyFactor: 0.72,
      throughputFactor: 1.3,
    };
  }
  if (
    lower.includes('4060') ||
    lower.includes('3060') ||
    lower.includes('m2') ||
    lower.includes('m3') ||
    lower.includes('m4')
  ) {
    return {
      label: raw,
      vramGb: parsedGb ?? 8.0,
      isCpuOnly: false,
      latencyFactor: 0.85,
      throughputFactor: 1.15,
    };
  }
  return {
    label: raw || 'RTX 3050 (4 GB)',
    vramGb: parsedGb ?? 4.0,
    isCpuOnly: false,
    latencyFactor: 1.0,
    throughputFactor: 1.0,
  };
}

interface QuantTierTemplate {
  name: string;
  descriptionTag: string;
  memRatio: number;
  latRatio: number;
  spdRatio: number;
  qualDelta: number;
  defaultProfiled: boolean;
}

const STANDARD_QUANT_LADDER: QuantTierTemplate[] = [
  {
    name: 'Q2_K',
    descriptionTag: 'Smallest size',
    memRatio: 0.56,
    latRatio: 1.52,
    spdRatio: 0.72,
    qualDelta: -8.2,
    defaultProfiled: false,
  },
  {
    name: 'Q3_K_M',
    descriptionTag: 'Lower memory',
    memRatio: 0.72,
    latRatio: 1.24,
    spdRatio: 0.86,
    qualDelta: -4.0,
    defaultProfiled: true,
  },
  {
    name: 'Q4_K_M',
    descriptionTag: 'Balanced',
    memRatio: 1.0,
    latRatio: 1.0,
    spdRatio: 1.0,
    qualDelta: 0.0,
    defaultProfiled: true,
  },
  {
    name: 'Q5_K_M',
    descriptionTag: 'Higher quality',
    memRatio: 1.18,
    latRatio: 0.86,
    spdRatio: 1.12,
    qualDelta: 2.1,
    defaultProfiled: true,
  },
  {
    name: 'Q6_K',
    descriptionTag: 'High precision',
    memRatio: 1.36,
    latRatio: 0.76,
    spdRatio: 1.2,
    qualDelta: 3.4,
    defaultProfiled: false,
  },
  {
    name: 'Q8_0',
    descriptionTag: 'Highest quality',
    memRatio: 1.74,
    latRatio: 0.68,
    spdRatio: 1.26,
    qualDelta: 4.5,
    defaultProfiled: false,
  },
];

const CORE_PROFILED_QUANTS = new Set(['Q3_K_M', 'Q4_K_M', 'Q5_K_M']);

interface ExpandedVariant {
  id: string;
  name: string;
  descriptionTag: string;
  memoryGb: number | null;
  latencyMs: number | null;
  speedToks: number | null;
  qualityScore: number | null;
  isProfiled: boolean;
}

/**
 * Expands a model family's catalog variants into a complete, deterministic quantization ladder
 * so every model in the library produces a consistent multi-point Pareto space.
 */
function expandModelVariants(model: ModelFamily): ExpandedVariant[] {
  const byName = new Map<string, QuantizationVariant>();
  model.variants.forEach((v) => byName.set(v.name.toUpperCase(), v));

  // If all variants lack latency/quality measurements (e.g. unmeasured large model), keep catalog variants as-is
  const anchor =
    model.variants.find((v) => v.name.toUpperCase() === 'Q4_K_M' && v.inferenceLatencyMs !== null) ||
    model.variants.find((v) => v.inferenceLatencyMs !== null && v.memoryUsageGb !== null);

  if (!anchor) {
    return model.variants.map((v) => ({
      id: v.id,
      name: v.name,
      descriptionTag: v.descriptionTag || `${v.name} quantization`,
      memoryGb: v.memoryUsageGb ?? v.fileSizeGb,
      latencyMs: v.inferenceLatencyMs,
      speedToks: v.generationSpeedToks,
      qualityScore: v.qualityScore,
      isProfiled: v.isProfiled,
    }));
  }

  const anchorTier =
    STANDARD_QUANT_LADDER.find((t) => t.name === anchor.name.toUpperCase()) ||
    STANDARD_QUANT_LADDER[2];

  const anchorMem = (anchor.memoryUsageGb ?? anchor.fileSizeGb ?? 2.7) / anchorTier.memRatio;
  const anchorLat = (anchor.inferenceLatencyMs ?? 184) / anchorTier.latRatio;
  const anchorSpd = (anchor.generationSpeedToks ?? 42) / anchorTier.spdRatio;
  const anchorQual = (anchor.qualityScore ?? 85) - anchorTier.qualDelta;

  const expanded: ExpandedVariant[] = STANDARD_QUANT_LADDER.map((tier) => {
    const existing = byName.get(tier.name);
    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        descriptionTag: existing.descriptionTag || tier.descriptionTag,
        memoryGb: existing.memoryUsageGb ?? existing.fileSizeGb,
        latencyMs: existing.inferenceLatencyMs,
        speedToks: existing.generationSpeedToks,
        qualityScore: existing.qualityScore,
        isProfiled:
          existing.inferenceLatencyMs !== null &&
          (existing.isProfiled || CORE_PROFILED_QUANTS.has(tier.name)),
      };
    }

    return {
      id: `${model.id}-${tier.name.toLowerCase()}`,
      name: tier.name,
      descriptionTag: tier.descriptionTag,
      memoryGb: Number(Math.max(0.5, anchorMem * tier.memRatio).toFixed(2)),
      latencyMs: Math.max(25, Math.round(anchorLat * tier.latRatio)),
      speedToks: Math.max(4, Math.round(anchorSpd * tier.spdRatio)),
      qualityScore: Number(Math.min(97.5, Math.max(55, anchorQual + tier.qualDelta)).toFixed(1)),
      isProfiled: tier.defaultProfiled,
    };
  });

  // Append any custom non-standard variant names from the catalog if present
  model.variants.forEach((v) => {
    if (!STANDARD_QUANT_LADDER.some((t) => t.name === v.name.toUpperCase())) {
      expanded.push({
        id: v.id,
        name: v.name,
        descriptionTag: v.descriptionTag || `${v.name} quantization`,
        memoryGb: v.memoryUsageGb ?? v.fileSizeGb,
        latencyMs: v.inferenceLatencyMs,
        speedToks: v.generationSpeedToks,
        qualityScore: v.qualityScore,
        isProfiled: v.isProfiled,
      });
    }
  });

  return expanded;
}

function applyConstraintPhysics(
  variant: ExpandedVariant,
  model: ModelFamily,
  constraints: OptimizationConstraints,
  activeVariantName?: string
): {
  memoryGb: number | null;
  latencyMs: number | null;
  speedToks: number | null;
  qualityScore: number | null;
  ttftMs: number | null;
  effectiveLatencyMs: number | null;
  vramOverflowGb: number;
} {
  if (variant.memoryGb === null) {
    return {
      memoryGb: null,
      latencyMs: null,
      speedToks: null,
      qualityScore: null,
      ttftMs: null,
      effectiveLatencyMs: null,
      vramOverflowGb: 0,
    };
  }

  const workload = WORKLOAD_PHYSICS[constraints.workloadType] || WORKLOAD_PHYSICS.general;
  const hw = parseHardwareProfile(constraints.targetHardware);
  const paramScale = Math.min(2.2, Math.max(0.55, (model.parametersCountNum ?? 3.0) / 3.0));

  // Memory scales deterministically with workload KV cache overhead
  const kvAdjustment = workload.kvCacheOverheadGb * (0.55 + 0.45 * paramScale);
  const adjustedMemory = Number(Math.max(0.4, variant.memoryGb + kvAdjustment).toFixed(2));

  if (variant.latencyMs === null || variant.qualityScore === null) {
    return {
      memoryGb: adjustedMemory,
      latencyMs: null,
      speedToks: null,
      qualityScore: null,
      ttftMs: null,
      effectiveLatencyMs: null,
      vramOverflowGb: 0,
    };
  }

  // GPU VRAM offload penalty if adjustedMemory exceeds target hardware VRAM
  const vramOverflowGb =
    !hw.isCpuOnly && hw.vramGb !== null && adjustedMemory > hw.vramGb
      ? Number((adjustedMemory - hw.vramGb).toFixed(2))
      : 0;
  const offloadLatencyPenaltyMs = vramOverflowGb > 0 ? Math.round(vramOverflowGb * 68) : 0;

  const adjustedLatency = Math.max(
    18,
    Math.round(variant.latencyMs * workload.latencyFactor * hw.latencyFactor + offloadLatencyPenaltyMs)
  );

  const offloadSpeedPenalty = vramOverflowGb > 0 ? 1 / (1 + vramOverflowGb * 0.22) : 1.0;
  const baseSpeed = variant.speedToks ?? Math.max(5, Math.round(7500 / adjustedLatency));
  const adjustedSpeed = Math.max(
    2,
    Math.round(baseSpeed * workload.throughputFactor * hw.throughputFactor * offloadSpeedPenalty)
  );

  // Lower-bit quantizations experience slightly steeper quality drop on code/summarization workloads
  const quantSensitivity = variant.name.startsWith('Q2')
    ? 1.8
    : variant.name.startsWith('Q3')
      ? 1.3
      : 1.0;
  const qualityShift =
    workload.qualityBias < 0 ? workload.qualityBias * quantSensitivity : workload.qualityBias;
  const adjustedQuality = Number(
    Math.min(98.0, Math.max(40.0, variant.qualityScore + qualityShift)).toFixed(1)
  );

  const isResidentBaseline =
    Boolean(activeVariantName) &&
    variant.name.toUpperCase() === activeVariantName?.toUpperCase();
  const switchPenalty = isResidentBaseline ? 0 : Math.max(0, constraints.switchingOverheadMs ?? 0);

  const ttftMs = Math.max(10, Math.round(adjustedLatency * workload.ttftRatio + switchPenalty * 0.15));
  const effectiveLatencyMs = adjustedLatency + switchPenalty;

  return {
    memoryGb: adjustedMemory,
    latencyMs: adjustedLatency,
    speedToks: adjustedSpeed,
    qualityScore: adjustedQuality,
    ttftMs,
    effectiveLatencyMs,
    vramOverflowGb,
  };
}

/**
 * Builds deterministic, constraint-consistent candidate records for the Optimization Lab.
 */
export function buildOptimizationCandidates(
  selectedModel: ModelFamily,
  allModels: ModelFamily[],
  constraints: OptimizationConstraints,
  activeVariantName?: string
): OptimizationCandidate[] {
  const result: OptimizationCandidate[] = [];
  const hw = parseHardwareProfile(constraints.targetHardware);

  const evaluatePoolItem = (
    id: string,
    name: string,
    model: ModelFamily,
    variant: ExpandedVariant,
    isCurrentModelVariant: boolean
  ): OptimizationCandidate => {
    const physics = applyConstraintPhysics(variant, model, constraints, activeVariantName);
    const memory = physics.memoryGb;
    const latency = physics.latencyMs;
    const quality = physics.qualityScore;
    const speed = physics.speedToks;

    const hasMeasurements = memory !== null && latency !== null && quality !== null;
    const canEvaluate =
      hasMeasurements && (variant.isProfiled || Boolean(constraints.allowUnprofiled));

    const withinMemory = memory !== null ? memory <= constraints.maxMemoryGb : null;
    const meetsLatency = latency !== null ? latency <= constraints.maxLatencyMs : null;
    const meetsQuality = quality !== null ? quality >= constraints.minQualityScore : null;

    const rejectionReasons: string[] = [];
    if (!hasMeasurements) {
      rejectionReasons.push('Unmeasured runtime profile (missing latency or quality benchmark)');
    } else if (!variant.isProfiled && !constraints.allowUnprofiled) {
      rejectionReasons.push(
        'Unprofiled configuration (enable "Include unbenchmarked profiles" to evaluate)'
      );
    }

    if (withinMemory === false && memory !== null) {
      rejectionReasons.push(
        `Exceeds memory budget (${memory.toFixed(1)} GB > ${constraints.maxMemoryGb.toFixed(1)} GB)`
      );
    }
    if (meetsLatency === false && latency !== null) {
      rejectionReasons.push(
        `Exceeds latency limit (${latency} ms > ${constraints.maxLatencyMs} ms)`
      );
    }
    if (meetsQuality === false && quality !== null) {
      rejectionReasons.push(
        `Below minimum quality (${quality.toFixed(1)} < ${constraints.minQualityScore})`
      );
    }
    if (physics.vramOverflowGb > 0 && hw.vramGb !== null) {
      rejectionReasons.push(
        `Exceeds ${hw.vramGb.toFixed(1)} GB ${hw.label} VRAM (+${physics.vramOverflowGb.toFixed(1)} GB CPU offload)`
      );
    }

    let status: CandidateFeasibility = 'unprofiled';
    if (!canEvaluate) {
      status = 'unprofiled';
    } else if (withinMemory && meetsLatency && meetsQuality) {
      status = 'feasible';
    } else {
      const memRatio = memory! / Math.max(0.1, constraints.maxMemoryGb);
      const latRatio = latency! / Math.max(1, constraints.maxLatencyMs);
      const qualGap = Math.max(0, constraints.minQualityScore - quality!);
      const withinTolerance = memRatio <= 1.12 && latRatio <= 1.15 && qualGap <= 3.5;
      const relViolation =
        Math.max(0, memRatio - 1) + Math.max(0, latRatio - 1) + qualGap / 100;

      if (withinTolerance && relViolation <= 0.18) {
        status = 'near_feasible';
      } else {
        status = 'rejected';
      }
    }

    return {
      id,
      name,
      modelName: model.name,
      quantization: variant.name,
      description: variant.descriptionTag || `${variant.name} quantization`,
      format: model.fileFormat,
      memoryUsageGb: memory,
      inferenceLatencyMs: latency,
      generationSpeedToks: speed,
      qualityScore: quality,
      ttftMs: physics.ttftMs,
      effectiveLatencyMs: physics.effectiveLatencyMs,
      vramOverflowGb: physics.vramOverflowGb,
      isProfiled: variant.isProfiled,
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
      isCurrentModelVariant,
    };
  };

  // Primary candidates: Complete quantization space of the active model
  const activeExpanded = expandModelVariants(selectedModel);
  activeExpanded.forEach((v) => {
    result.push(evaluatePoolItem(v.id, v.name, selectedModel, v, true));
  });

  // Reference candidates from other catalog models
  allModels.forEach((m) => {
    if (m.id === selectedModel.id) return;
    m.variants.forEach((v) => {
      const expandedRef: ExpandedVariant = {
        id: v.id,
        name: v.name,
        descriptionTag: v.descriptionTag || v.name,
        memoryGb: v.memoryUsageGb ?? v.fileSizeGb,
        latencyMs: v.inferenceLatencyMs,
        speedToks: v.generationSpeedToks,
        qualityScore: v.qualityScore,
        isProfiled: v.isProfiled,
      };
      result.push(
        evaluatePoolItem(`${m.id}-${v.id}`, `${m.name} (${v.name})`, m, expandedRef, false)
      );
    });
  });

  // Score and rank evaluable current-model candidates deterministically
  const evaluableCurrent = result.filter(
    (c) =>
      c.isCurrentModelVariant &&
      c.status !== 'unprofiled' &&
      c.memoryUsageGb !== null &&
      c.inferenceLatencyMs !== null &&
      c.qualityScore !== null
  );

  if (evaluableCurrent.length > 0) {
    const memVals = evaluableCurrent.map((c) => c.memoryUsageGb!);
    const latVals = evaluableCurrent.map((c) => c.inferenceLatencyMs!);
    const spdVals = evaluableCurrent.map((c) => c.generationSpeedToks ?? 0);
    const qualVals = evaluableCurrent.map((c) => c.qualityScore!);

    const minMaxNorm = (val: number, arr: number[], invert = false): number => {
      const lo = Math.min(...arr);
      const hi = Math.max(...arr);
      if (hi === lo) return 1.0;
      const norm = (val - lo) / (hi - lo);
      return invert ? 1 - norm : norm;
    };

    evaluableCurrent.forEach((c) => {
      const memScore = minMaxNorm(c.memoryUsageGb!, memVals, true);
      const latScore = minMaxNorm(c.inferenceLatencyMs!, latVals, true);
      const spdScore = minMaxNorm(c.generationSpeedToks ?? 0, spdVals, false);
      const qualScore = minMaxNorm(c.qualityScore!, qualVals, false);

      let objScore = 0;
      switch (constraints.objective) {
        case 'latency':
          objScore = latScore * 0.8 + memScore * 0.1 + qualScore * 0.1;
          break;
        case 'memory':
          objScore = memScore * 0.8 + latScore * 0.1 + qualScore * 0.1;
          break;
        case 'throughput':
          objScore = spdScore * 0.8 + latScore * 0.1 + qualScore * 0.1;
          break;
        case 'balanced':
        default:
          objScore = qualScore * 0.35 + latScore * 0.35 + memScore * 0.3;
          break;
      }
      c.feasibilityScore = Number((objScore * 100).toFixed(1));
    });

    // Rank feasible candidates first, then near-feasible, then rejected
    const statusOrder: Record<CandidateFeasibility, number> = {
      selected: 0,
      feasible: 1,
      near_feasible: 2,
      rejected: 3,
      unprofiled: 4,
    };

    const rankedPool = [...evaluableCurrent].sort((a, b) => {
      const sDiff = statusOrder[a.status] - statusOrder[b.status];
      if (sDiff !== 0) return sDiff;
      return compareByObjective(a, b, constraints.objective);
    });

    rankedPool.forEach((cand, idx) => {
      cand.rank = idx + 1;
    });
  }

  // Mark Pareto optimal candidates strictly among evaluable current-model candidates
  evaluableCurrent.forEach((c1) => {
    const isDominated = evaluableCurrent.some((c2) => {
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

function compareByObjective(
  a: OptimizationCandidate,
  b: OptimizationCandidate,
  objective: OptimizationConstraints['objective']
): number {
  switch (objective) {
    case 'latency': {
      const diff = (a.inferenceLatencyMs ?? Infinity) - (b.inferenceLatencyMs ?? Infinity);
      if (diff !== 0) return diff;
      return (a.memoryUsageGb ?? Infinity) - (b.memoryUsageGb ?? Infinity);
    }
    case 'memory': {
      const diff = (a.memoryUsageGb ?? Infinity) - (b.memoryUsageGb ?? Infinity);
      if (diff !== 0) return diff;
      return (a.inferenceLatencyMs ?? Infinity) - (b.inferenceLatencyMs ?? Infinity);
    }
    case 'throughput': {
      const diff = (b.generationSpeedToks ?? 0) - (a.generationSpeedToks ?? 0);
      if (diff !== 0) return diff;
      return (a.inferenceLatencyMs ?? Infinity) - (b.inferenceLatencyMs ?? Infinity);
    }
    case 'balanced':
    default: {
      const diff = (b.feasibilityScore ?? 0) - (a.feasibilityScore ?? 0);
      if (diff !== 0) return diff;
      return (a.inferenceLatencyMs ?? Infinity) - (b.inferenceLatencyMs ?? Infinity);
    }
  }
}

/**
 * Computes the non-dominated Pareto frontier curve points (sorted by memory) for evaluable variants.
 */
export function computeParetoFrontierPoints(
  candidates: OptimizationCandidate[]
): Array<[number, number]> {
  const points = candidates
    .filter(
      (c) =>
        c.isCurrentModelVariant &&
        c.status !== 'unprofiled' &&
        c.memoryUsageGb !== null &&
        c.inferenceLatencyMs !== null
    )
    .map((c) => [c.memoryUsageGb!, c.inferenceLatencyMs!] as [number, number]);

  if (points.length === 0) return [];

  points.sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));

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

function buildDiagnosticSuggestions(
  currentModelCandidates: OptimizationCandidate[],
  constraints: OptimizationConstraints
): string[] {
  const points: string[] = [];
  const evaluable = currentModelCandidates.filter((c) => c.status !== 'unprofiled');
  const unprofiledCount = currentModelCandidates.filter((c) => c.status === 'unprofiled').length;

  points.push(
    `0 of ${evaluable.length} evaluable configuration(s) for ${currentModelCandidates[0]?.modelName || 'this model'} satisfied all active constraints.`
  );

  if (evaluable.length > 0) {
    const memFails = evaluable.filter((c) => c.audit.withinMemoryBudget === false);
    const latFails = evaluable.filter((c) => c.audit.meetsLatencyConstraint === false);
    const qualFails = evaluable.filter((c) => c.audit.qualityThresholdSatisfied === false);

    if (memFails.length > 0) {
      const minMem = Math.min(...evaluable.map((c) => c.memoryUsageGb ?? Infinity));
      if (minMem > constraints.maxMemoryGb && Number.isFinite(minMem)) {
        points.push(
          `Memory bottleneck: smallest evaluable profile needs ${minMem.toFixed(1)} GB (budget ≤ ${constraints.maxMemoryGb.toFixed(1)} GB).`
        );
      } else {
        points.push(`${memFails.length} configuration(s) exceeded the ≤ ${constraints.maxMemoryGb.toFixed(1)} GB memory limit.`);
      }
    }
    if (latFails.length > 0) {
      const minLat = Math.min(...evaluable.map((c) => c.inferenceLatencyMs ?? Infinity));
      if (minLat > constraints.maxLatencyMs && Number.isFinite(minLat)) {
        points.push(
          `Latency bottleneck: fastest evaluable profile takes ${minLat} ms (limit ≤ ${constraints.maxLatencyMs} ms).`
        );
      } else {
        points.push(`${latFails.length} configuration(s) exceeded the ≤ ${constraints.maxLatencyMs} ms latency limit.`);
      }
    }
    if (qualFails.length > 0) {
      const maxQual = Math.max(...evaluable.map((c) => c.qualityScore ?? -Infinity));
      if (maxQual < constraints.minQualityScore && Number.isFinite(maxQual)) {
        points.push(
          `Quality bottleneck: highest evaluable quality is ${maxQual.toFixed(1)} (minimum ≥ ${constraints.minQualityScore}).`
        );
      } else {
        points.push(`${qualFails.length} configuration(s) fell below the ≥ ${constraints.minQualityScore} quality threshold.`);
      }
    }
  }

  if (unprofiledCount > 0 && !constraints.allowUnprofiled) {
    points.push(
      `${unprofiledCount} unbenchmarked profile(s) were skipped — enable "Include unbenchmarked profiles" in Advanced Options to expand the search space.`
    );
  }

  return points;
}

function buildDeterministicDecision(
  selectedModel: ModelFamily,
  allModels: ModelFamily[],
  constraints: OptimizationConstraints,
  solveDurationMs: number,
  activeVariantName?: string,
  liveOverrides?: {
    decisionId?: string;
    rationale?: string;
    isLiveResponse?: boolean;
  }
): OptimizationDecisionResult {
  const candidates = buildOptimizationCandidates(
    selectedModel,
    allModels,
    constraints,
    activeVariantName
  );
  const currentModelCandidates = candidates.filter((c) => c.isCurrentModelVariant);

  const feasible = currentModelCandidates
    .filter((c) => c.status === 'feasible')
    .sort((a, b) => compareByObjective(a, b, constraints.objective));

  const nearFeasible = currentModelCandidates
    .filter((c) => c.status === 'near_feasible')
    .sort((a, b) => {
      const violA =
        Math.max(0, (a.audit.memoryDeltaGb ?? 0) / Math.max(0.1, constraints.maxMemoryGb)) +
        Math.max(0, (a.audit.latencyDeltaMs ?? 0) / Math.max(1, constraints.maxLatencyMs)) +
        Math.max(0, -(a.audit.qualityDeltaScore ?? 0) / 100);
      const violB =
        Math.max(0, (b.audit.memoryDeltaGb ?? 0) / Math.max(0.1, constraints.maxMemoryGb)) +
        Math.max(0, (b.audit.latencyDeltaMs ?? 0) / Math.max(1, constraints.maxLatencyMs)) +
        Math.max(0, -(b.audit.qualityDeltaScore ?? 0) / 100);
      if (Math.abs(violA - violB) > 0.001) return violA - violB;
      return compareByObjective(a, b, constraints.objective);
    });

  const winner: OptimizationCandidate | null =
    feasible[0] || nearFeasible[0] || null;

  const workloadMeta =
    WORKLOAD_OPTIONS.find((w) => w.id === constraints.workloadType) || WORKLOAD_OPTIONS[0];

  const whyPoints: string[] = [];
  if (winner) {
    if (winner.status === 'feasible') {
      const runnerUp = feasible[1];
      if (constraints.objective === 'latency') {
        whyPoints.push(
          runnerUp
            ? `Lowest latency (${winner.inferenceLatencyMs} ms vs ${runnerUp.inferenceLatencyMs} ms for ${runnerUp.quantization}) among ${feasible.length} feasible candidates`
            : `Lowest inference latency (${winner.inferenceLatencyMs} ms) satisfying all constraints`
        );
      } else if (constraints.objective === 'memory') {
        whyPoints.push(
          runnerUp
            ? `Smallest footprint (${winner.memoryUsageGb?.toFixed(1)} GB vs ${runnerUp.memoryUsageGb?.toFixed(1)} GB for ${runnerUp.quantization}) among ${feasible.length} feasible candidates`
            : `Smallest memory footprint (${winner.memoryUsageGb?.toFixed(1)} GB) satisfying all constraints`
        );
      } else if (constraints.objective === 'throughput') {
        whyPoints.push(
          runnerUp
            ? `Peak throughput (${winner.generationSpeedToks} tok/s vs ${runnerUp.generationSpeedToks} tok/s for ${runnerUp.quantization}) among ${feasible.length} feasible candidates`
            : `Highest sustained throughput (${winner.generationSpeedToks} tok/s) satisfying all constraints`
        );
      } else {
        whyPoints.push(
          `Top Balanced Pareto score (${winner.feasibilityScore?.toFixed(1) ?? '—'}/100) across memory, latency, and quality`
        );
      }

      const memHeadroom = (constraints.maxMemoryGb - (winner.memoryUsageGb ?? 0)).toFixed(1);
      const latHeadroom = Math.round(constraints.maxLatencyMs - (winner.inferenceLatencyMs ?? 0));
      const qualMargin = ((winner.qualityScore ?? 0) - constraints.minQualityScore).toFixed(1);

      whyPoints.push(
        `Memory: ${winner.memoryUsageGb?.toFixed(1)} GB ≤ ${constraints.maxMemoryGb.toFixed(1)} GB budget (${memHeadroom} GB headroom)`
      );
      whyPoints.push(
        `Latency: ${winner.inferenceLatencyMs} ms ≤ ${constraints.maxLatencyMs} ms limit (${latHeadroom} ms headroom)`
      );
      whyPoints.push(
        `Quality: ${winner.qualityScore?.toFixed(1)} ≥ ${constraints.minQualityScore} minimum (+${qualMargin} margin)`
      );
      whyPoints.push(
        `${workloadMeta.label} (${workloadMeta.recommendedContext} ctx) on ${constraints.targetHardware || 'RTX 3050 (4 GB)'}${winner.isParetoOptimal ? ' · Pareto optimal' : ''}`
      );
    } else {
      whyPoints.push(
        `No configuration strictly satisfied all limits; ${winner.quantization} is the closest near-feasible match`
      );
      winner.rejectionReasons.forEach((reason) => whyPoints.push(reason));
      whyPoints.push(
        `Adjusting constraints slightly around this threshold will promote ${winner.quantization} to Feasible.`
      );
    }
  } else {
    whyPoints.push(...buildDiagnosticSuggestions(currentModelCandidates, constraints));
  }

  const alternatives: OptimizationAlternative[] = currentModelCandidates
    .filter((c) => c.id !== winner?.id)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((c) => {
      let reason = 'Sub-optimal trade-off for current objective';
      if (c.rejectionReasons.length > 0) {
        reason = c.rejectionReasons[0];
      } else if (winner) {
        if (
          constraints.objective === 'latency' &&
          c.inferenceLatencyMs !== null &&
          winner.inferenceLatencyMs !== null &&
          c.inferenceLatencyMs >= winner.inferenceLatencyMs
        ) {
          reason = `Feasible, but slower latency (${c.inferenceLatencyMs} ms vs ${winner.inferenceLatencyMs} ms)`;
        } else if (
          constraints.objective === 'memory' &&
          c.memoryUsageGb !== null &&
          winner.memoryUsageGb !== null &&
          c.memoryUsageGb >= winner.memoryUsageGb
        ) {
          reason = `Feasible, but higher memory (${c.memoryUsageGb.toFixed(1)} GB vs ${winner.memoryUsageGb.toFixed(1)} GB)`;
        } else if (
          constraints.objective === 'throughput' &&
          c.generationSpeedToks !== null &&
          winner.generationSpeedToks !== null &&
          c.generationSpeedToks <= winner.generationSpeedToks
        ) {
          reason = `Feasible, but lower throughput (${c.generationSpeedToks} tok/s vs ${winner.generationSpeedToks} tok/s)`;
        } else if (
          c.feasibilityScore !== undefined &&
          winner.feasibilityScore !== undefined
        ) {
          reason = `Feasible, lower Pareto composite score (${c.feasibilityScore.toFixed(1)} vs ${winner.feasibilityScore.toFixed(1)})`;
        }
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

  const paretoCount = currentModelCandidates.filter((c) => c.isParetoOptimal).length;
  const evaluatedCount = currentModelCandidates.filter((c) => c.status !== 'unprofiled').length;

  return {
    decisionId: liveOverrides?.decisionId || `dec-${selectedModel.id}-${Date.now().toString(36)}`,
    status: feasible.length > 0 ? 'optimal' : winner ? 'feasible' : 'infeasible',
    recommendedCandidate: winner,
    candidates,
    whyThisConfiguration: whyPoints,
    alternatives,
    rationale:
      liveOverrides?.rationale ||
      (winner
        ? winner.status === 'feasible'
          ? `Selected ${winner.quantization} for ${selectedModel.name} under ${workloadMeta.label} (${constraints.objective} objective), balancing ${winner.memoryUsageGb?.toFixed(1)} GB memory, ${winner.inferenceLatencyMs} ms latency, and ${winner.qualityScore?.toFixed(1)} quality.`
          : `No strictly feasible candidate found; ${winner.quantization} is the closest near-feasible configuration within tolerance.`
        : `No evaluable configuration for ${selectedModel.name} satisfied memory (≤ ${constraints.maxMemoryGb.toFixed(1)} GB), latency (≤ ${constraints.maxLatencyMs} ms), and quality (≥ ${constraints.minQualityScore}).`),
    timestamp: new Date().toISOString(),
    isLiveResponse: Boolean(liveOverrides?.isLiveResponse),
    algorithm: 'Lattice Deterministic Pareto Solver v1.0',
    solveDurationMs,
    evaluatedCount,
    feasibleCount: feasible.length,
    paretoCount,
  };
}

async function waitWithSolverProgress(
  totalDurationMs: number,
  constraints: OptimizationConstraints,
  onProgress?: (progress: OptimizationProgress) => void,
  signal?: AbortSignal
): Promise<number> {
  if (totalDurationMs <= 0) {
    onProgress?.({ percent: 100, stage: 'Finalized', elapsedMs: 0 });
    return 0;
  }

  const workload =
    WORKLOAD_OPTIONS.find((w) => w.id === constraints.workloadType) || WORKLOAD_OPTIONS[0];
  const hwLabel = constraints.targetHardware || 'RTX 3050 (4 GB)';

  const getStage = (pct: number): string => {
    if (pct < 24) return `Resolving candidate space & ${hwLabel} limits...`;
    if (pct < 52) return `Modeling ${workload.label} (${workload.recommendedContext} KV cache)...`;
    if (pct < 80) {
      return `Auditing ≤ ${constraints.maxMemoryGb.toFixed(1)} GB · ≤ ${constraints.maxLatencyMs} ms · ≥ ${constraints.minQualityScore} Q...`;
    }
    return 'Computing Pareto frontier & ranking feasible candidates...';
  };

  const startedAt = performance.now();

  return new Promise<number>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Optimization aborted', 'AbortError'));
      return;
    }

    onProgress?.({ percent: 4, stage: getStage(4), elapsedMs: 0 });

    const intervalId = window.setInterval(() => {
      if (signal?.aborted) {
        window.clearInterval(intervalId);
        reject(new DOMException('Optimization aborted', 'AbortError'));
        return;
      }
      const elapsed = performance.now() - startedAt;
      const rawPct = Math.min(98, Math.round((elapsed / totalDurationMs) * 100));
      onProgress?.({
        percent: Math.max(4, rawPct),
        stage: getStage(rawPct),
        elapsedMs: Math.round(elapsed),
      });

      if (elapsed >= totalDurationMs) {
        window.clearInterval(intervalId);
        onProgress?.({
          percent: 100,
          stage: 'Pareto frontier & decision ready',
          elapsedMs: Math.round(elapsed),
        });
        resolve(Math.round(elapsed));
      }
    }, 90);

    const onAbort = () => {
      window.clearInterval(intervalId);
      reject(new DOMException('Optimization aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface EvaluateOptimizationOptions {
  /** When true, runs a realistic 3-7s solver simulation with staged progress updates. */
  simulateDuration?: boolean;
  /** Optional explicit duration override in ms. */
  durationMs?: number;
  /** Callback invoked during solver execution for progress feedback. */
  onProgress?: (progress: OptimizationProgress) => void;
  /** Optional abort signal to cancel an in-flight optimization run. */
  signal?: AbortSignal;
  /** Active baseline quantization name for zero switching overhead comparison. */
  activeVariantName?: string;
}

/**
 * Computes a realistic, constraint-aware solver duration in [3000, 7000] ms
 * with natural runtime variance so light vs. heavy searches feel distinct.
 */
function computeRealisticSolveDurationMs(
  selectedModel: ModelFamily,
  constraints: OptimizationConstraints
): number {
  let complexity = 0;

  if (constraints.allowUnprofiled) complexity += 0.25;

  if (constraints.objective === 'balanced') complexity += 0.25;
  else if (constraints.objective === 'throughput') complexity += 0.12;
  else complexity += 0.05;

  if (constraints.workloadType === 'summarization') complexity += 0.25;
  else if (constraints.workloadType === 'code') complexity += 0.16;
  else if (constraints.workloadType === 'general') complexity += 0.1;
  else if (constraints.workloadType === 'chat') complexity += 0.08;

  complexity += Math.min(0.15, ((selectedModel.parametersCountNum ?? 2) / 16) * 0.15);
  if (constraints.maxMemoryGb <= 3.0) complexity += 0.05;
  if (constraints.maxLatencyMs <= 200) complexity += 0.05;

  const clampedComplexity = Math.min(1, Math.max(0, complexity));
  const complexityCenter = 3400 + clampedComplexity * 2700;
  const jitter = (Math.random() - 0.45) * 2600;

  return Math.round(Math.min(7000, Math.max(3000, complexityCenter + jitter)));
}

/**
 * Executes the optimization solver.
 * Produces deterministic, constraint-consistent Pareto, table, metrics, and decision data.
 * Explicit runs execute for a realistic 3–7 second window with live progress stages.
 */
export async function evaluateOptimization(
  selectedModel: ModelFamily,
  allModels: ModelFamily[],
  constraints: OptimizationConstraints,
  isConnectedToBackend: boolean,
  options: EvaluateOptimizationOptions = {}
): Promise<OptimizationDecisionResult> {
  const {
    simulateDuration = true,
    durationMs,
    onProgress,
    signal,
    activeVariantName,
  } = options;

  const targetDurationMs = simulateDuration
    ? durationMs ?? computeRealisticSolveDurationMs(selectedModel, constraints)
    : 0;

  let liveOverrides:
    | { decisionId?: string; rationale?: string; isLiveResponse?: boolean }
    | undefined;

  const startedAt = performance.now();

  if (isConnectedToBackend) {
    const req: OptimizationPlanRequest = {
      modelName: selectedModel.name,
      targetHardware: constraints.targetHardware,
      memoryBudgetGb: constraints.maxMemoryGb,
      maxLatencyMs: constraints.maxLatencyMs,
      minQualityScore: constraints.minQualityScore,
      objective: constraints.objective,
    };
    try {
      const response = await apiClient.submitOptimizationPlan(req, signal);
      liveOverrides = {
        decisionId: response.decisionId,
        rationale: response.rationale,
        isLiveResponse: true,
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      // Backend /optimization/plan is optional; fall back seamlessly to local Pareto solver
    }
  }

  const elapsedSoFar = performance.now() - startedAt;
  const remainingMs = Math.max(0, targetDurationMs - elapsedSoFar);

  await waitWithSolverProgress(remainingMs, constraints, onProgress, signal);

  const totalElapsedMs = Math.max(1, Math.round(performance.now() - startedAt));

  return buildDeterministicDecision(
    selectedModel,
    allModels,
    constraints,
    totalElapsedMs,
    activeVariantName,
    liveOverrides
  );
}
