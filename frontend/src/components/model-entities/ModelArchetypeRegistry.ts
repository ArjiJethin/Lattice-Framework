import { ModelArchetype, ModelColorPaletteId } from '../../types/modelLibrary';

const ARCHETYPE_STORAGE_KEY = 'lattice_config_archetypes_v2';
const PALETTE_STORAGE_KEY = 'lattice_config_palettes_v1';

const ARCHETYPES_LIST: ModelArchetype[] = ['orbital', 'fractal', 'lattice'];

const PALETTE_IDS_LIST: ModelColorPaletteId[] = [
  'violet-cyan',
  'sapphire-ice',
  'emerald-mint',
  'amber-gold',
  'rose-coral',
  'teal-aqua',
  'magenta-violet',
  'indigo-sky',
  'crimson-amber',
  'jade-cyan',
];

const INITIAL_ARCHETYPE_MAP: Record<string, ModelArchetype> = {
  'qwen3-1.7b': 'orbital',
  'llama-3.1-8b': 'lattice',
  'phi-3-mini': 'fractal',
  'mistral-7b': 'lattice',
  'gemma-2-2b': 'fractal',
  'deepseek-r1-7b': 'orbital',
  'phi-3.5-moe': 'fractal',

  'qwen3-1.7b::q2_k': 'lattice',
  'qwen3-1.7b::q3_k_m': 'fractal',
  'qwen3-1.7b::q4_k_m': 'orbital',
  'qwen3-1.7b::q5_k_m': 'lattice',
  'qwen3-1.7b::q6_k': 'fractal',
  'qwen3-1.7b::q8_0': 'orbital',

  'llama-3.1-8b::q3_k_m': 'orbital',
  'llama-3.1-8b::q4_k_m': 'lattice',
  'llama-3.1-8b::q5_k_m': 'fractal',

  'phi-3-mini::q4_k_m': 'fractal',
  'phi-3-mini::q5_k_m': 'orbital',

  'mistral-7b::q4_k_m': 'lattice',
  'mistral-7b::q5_k_m': 'fractal',
};

const INITIAL_PALETTE_MAP: Record<string, ModelColorPaletteId> = {
  // Diverse base model palettes
  'qwen3-1.7b': 'violet-cyan',
  'llama-3.1-8b': 'sapphire-ice',
  'phi-3-mini': 'magenta-violet',
  'mistral-7b': 'amber-gold',
  'gemma-2-2b': 'emerald-mint',
  'deepseek-r1-7b': 'teal-aqua',
  'phi-3.5-moe': 'rose-coral',
  'starcoder-2-3b': 'indigo-sky',
  'codellama-7b': 'jade-cyan',
  'smollm-1.7b': 'crimson-amber',

  // Independent palettes per Qwen3-1.7B quantization variant
  'qwen3-1.7b::q2_k': 'teal-aqua',
  'qwen3-1.7b::q3_k_m': 'sapphire-ice',
  'qwen3-1.7b::q4_k_m': 'violet-cyan',
  'qwen3-1.7b::q5_k_m': 'emerald-mint',
  'qwen3-1.7b::q6_k': 'rose-coral',
  'qwen3-1.7b::q8_0': 'amber-gold',

  // Independent palettes per Llama-3.1-8B quantization variant
  'llama-3.1-8b::q3_k_m': 'indigo-sky',
  'llama-3.1-8b::q4_k_m': 'sapphire-ice',
  'llama-3.1-8b::q5_k_m': 'magenta-violet',

  // Independent palettes per Phi-3-mini quantization variant
  'phi-3-mini::q4_k_m': 'magenta-violet',
  'phi-3-mini::q5_k_m': 'jade-cyan',

  // Independent palettes per Mistral-7B quantization variant
  'mistral-7b::q4_k_m': 'amber-gold',
  'mistral-7b::q5_k_m': 'crimson-amber',
};

function computeDeterministicHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function buildConfigurationId(modelFamilyId: string, variantNameOrId?: string): string {
  const familyKey = modelFamilyId.toLowerCase().trim();
  if (!variantNameOrId) return familyKey;
  const variantKey = variantNameOrId.toLowerCase().trim();
  return `${familyKey}::${variantKey}`;
}

class ModelArchetypeRegistry {
  private archetypeAssignments: Record<string, ModelArchetype> = {};
  private paletteAssignments: Record<string, ModelColorPaletteId> = {};

  constructor() {
    this.loadAssignments();
  }

  private loadAssignments(): void {
    if (typeof window === 'undefined') {
      this.archetypeAssignments = { ...INITIAL_ARCHETYPE_MAP };
      this.paletteAssignments = { ...INITIAL_PALETTE_MAP };
      return;
    }

    try {
      const storedArch = localStorage.getItem(ARCHETYPE_STORAGE_KEY);
      if (storedArch) {
        this.archetypeAssignments = { ...INITIAL_ARCHETYPE_MAP, ...JSON.parse(storedArch) };
      } else {
        this.archetypeAssignments = { ...INITIAL_ARCHETYPE_MAP };
        this.saveArchetypes();
      }
    } catch {
      this.archetypeAssignments = { ...INITIAL_ARCHETYPE_MAP };
    }

    try {
      const storedPal = localStorage.getItem(PALETTE_STORAGE_KEY);
      if (storedPal) {
        this.paletteAssignments = { ...INITIAL_PALETTE_MAP, ...JSON.parse(storedPal) };
      } else {
        this.paletteAssignments = { ...INITIAL_PALETTE_MAP };
        this.savePalettes();
      }
    } catch {
      this.paletteAssignments = { ...INITIAL_PALETTE_MAP };
    }
  }

  private saveArchetypes(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ARCHETYPE_STORAGE_KEY, JSON.stringify(this.archetypeAssignments));
    } catch (e) {
      console.warn('Could not persist archetype assignments:', e);
    }
  }

  private savePalettes(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(this.paletteAssignments));
    } catch (e) {
      console.warn('Could not persist palette assignments:', e);
    }
  }

  private assignBalancedArchetype(canonicalKey: string): ModelArchetype {
    const counts: Record<ModelArchetype, number> = { orbital: 0, fractal: 0, lattice: 0 };
    for (const val of Object.values(this.archetypeAssignments)) {
      if (counts[val] !== undefined) counts[val]++;
    }
    const minCount = Math.min(counts.orbital, counts.fractal, counts.lattice);
    const candidates = ARCHETYPES_LIST.filter((a) => counts[a] === minCount);
    const hash = computeDeterministicHash(canonicalKey);
    return candidates[hash % candidates.length];
  }

  private assignBalancedPalette(canonicalKey: string): ModelColorPaletteId {
    const counts: Record<ModelColorPaletteId, number> = {
      'violet-cyan': 0,
      'sapphire-ice': 0,
      'emerald-mint': 0,
      'amber-gold': 0,
      'rose-coral': 0,
      'teal-aqua': 0,
      'magenta-violet': 0,
      'indigo-sky': 0,
      'crimson-amber': 0,
      'jade-cyan': 0,
    };

    for (const val of Object.values(this.paletteAssignments)) {
      if (counts[val] !== undefined) counts[val]++;
    }

    const minCount = Math.min(...Object.values(counts));
    const leastUsed = PALETTE_IDS_LIST.filter((p) => counts[p] === minCount);

    // Offset salt so archetype hash and palette hash are uncorrelated
    const hash = computeDeterministicHash(`palette_salt_${canonicalKey}`);
    return leastUsed[hash % leastUsed.length];
  }

  public getOrAssignArchetype(idKey: string): ModelArchetype {
    const canonicalKey = idKey.toLowerCase().trim();
    if (this.archetypeAssignments[canonicalKey]) {
      return this.archetypeAssignments[canonicalKey];
    }
    const assigned = this.assignBalancedArchetype(canonicalKey);
    this.archetypeAssignments[canonicalKey] = assigned;
    this.saveArchetypes();
    return assigned;
  }

  public getOrAssignConfigurationArchetype(
    modelFamilyId: string,
    variantName?: string,
    variantId?: string
  ): ModelArchetype {
    const configKey = buildConfigurationId(modelFamilyId, variantName || variantId);
    return this.getOrAssignArchetype(configKey);
  }

  public getOrAssignPalette(idKey: string): ModelColorPaletteId {
    const canonicalKey = idKey.toLowerCase().trim();
    if (this.paletteAssignments[canonicalKey]) {
      return this.paletteAssignments[canonicalKey];
    }
    const assigned = this.assignBalancedPalette(canonicalKey);
    this.paletteAssignments[canonicalKey] = assigned;
    this.savePalettes();
    return assigned;
  }

  public getOrAssignConfigurationPalette(
    modelFamilyId: string,
    variantName?: string,
    variantId?: string
  ): ModelColorPaletteId {
    const configKey = buildConfigurationId(modelFamilyId, variantName || variantId);
    return this.getOrAssignPalette(configKey);
  }
}

export const modelArchetypeRegistry = new ModelArchetypeRegistry();