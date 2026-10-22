/**
 * Types for Lattice Model Library & Procedural 3D Model Entities
 */

export type ModelArchetype = 'orbital' | 'fractal' | 'lattice';

export type ModelColorPaletteId =
  | 'violet-cyan'
  | 'sapphire-ice'
  | 'emerald-mint'
  | 'amber-gold'
  | 'rose-coral'
  | 'teal-aqua'
  | 'magenta-violet'
  | 'indigo-sky'
  | 'crimson-amber'
  | 'jade-cyan';

export interface ModelColorPalette {
  id: ModelColorPaletteId;
  name: string;
  primaryShell: string;
  secondaryShell: string;
  coreGlow: string;
  secondaryGlow: string;
  wireframe: string;
  edgeHighlight: string;
  ringPrimary: string;
  ringSecondary: string;
  pedestalColor: string;
  pedestalGlow: string;
  badgeBg: string;
  badgeBorder: string;
  auraGradient: string;
}

export type ModelAnimationState = 'idle' | 'selected' | 'evaluating' | 'completed';

export type ModelInstallationStatus = 'Installed' | 'Ready' | 'Not Installed' | 'Incompatible';

export type VariantProfilingStatus = 'Profiled' | 'Not Profiled' | 'Evaluating' | 'Failed';

export interface QuantizationVariant {
  id: string;
  name: string;
  familyId: string;
  descriptionTag: string;
  fileSizeGb: number | null;
  inferenceLatencyMs: number | null;
  generationSpeedToks: number | null;
  memoryUsageGb: number | null;
  qualityScore: number | null;
  isProfiled: boolean;
  isInstalled: boolean;
  archetype?: ModelArchetype;
  paletteId?: ModelColorPaletteId;
  filePath?: string;
  contextWindow?: number;
  hardwareRequirement?: string;
  isCompatible?: boolean;
}

export interface ModelFamily {
  id: string;
  name: string;
  parameters: string;
  parametersCountNum?: number;
  architecture: string;
  category: string;
  fileFormat: string;
  status: ModelInstallationStatus;
  description: string;
  contextLength: string;
  defaultVariantId: string;
  variants: QuantizationVariant[];
  archetype: ModelArchetype;
  paletteId?: ModelColorPaletteId;
  lastBenchmark?: string;
  evaluationDataset?: string;
  runtime?: string;
  hardwareRequirement?: string;
  isCompatible?: boolean;
  incompatibilityReason?: string;
}

export type ModelFilterMode = 'all' | 'installed' | 'ready';

export type ModelInspectorTab = 'overview' | 'performance' | 'compatibility' | 'files';

export interface ModelLibrarySummaryStats {
  installed: number;
  totalModels: number;
  profiled: number;
  readyToTest: number;
}

export interface FloatingAnnotationItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
  iconType: 'size' | 'quant' | 'memory' | 'latency' | 'speed' | 'quality';
  position: 'top-left' | 'top-right' | 'mid-left' | 'mid-right' | 'bottom-left' | 'bottom-right';
  isMeasured: boolean;
}