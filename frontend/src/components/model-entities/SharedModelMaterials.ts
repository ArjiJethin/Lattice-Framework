import * as THREE from 'three';
import {
  ModelAnimationState,
  ModelColorPalette,
  ModelColorPaletteId,
} from '../../types/modelLibrary';

export const MODEL_COLOR_PALETTES: Record<ModelColorPaletteId, ModelColorPalette> = {
  'violet-cyan': {
    id: 'violet-cyan',
    name: 'Iris & Cyber Cyan',
    primaryShell: '#8B5CF6',
    secondaryShell: '#6366F1',
    coreGlow: '#38BDF8',
    secondaryGlow: '#A78BFA',
    wireframe: '#DDD6FE',
    edgeHighlight: '#FFFFFF',
    ringPrimary: '#8B5CF6',
    ringSecondary: '#38BDF8',
    pedestalColor: '#8174F5',
    pedestalGlow: '#38BDF8',
    badgeBg: 'rgba(139, 92, 246, 0.14)',
    badgeBorder: 'rgba(139, 92, 246, 0.35)',
    auraGradient: 'from-purple-300 via-indigo-300 to-sky-300',
  },
  'sapphire-ice': {
    id: 'sapphire-ice',
    name: 'Cobalt Sapphire & Ice',
    primaryShell: '#2563EB',
    secondaryShell: '#0284C7',
    coreGlow: '#38BDF8',
    secondaryGlow: '#60A5FA',
    wireframe: '#BAE6FD',
    edgeHighlight: '#FFFFFF',
    ringPrimary: '#3B82F6',
    ringSecondary: '#06B6D4',
    pedestalColor: '#3B82F6',
    pedestalGlow: '#38BDF8',
    badgeBg: 'rgba(59, 130, 246, 0.14)',
    badgeBorder: 'rgba(59, 130, 246, 0.35)',
    auraGradient: 'from-blue-300 via-sky-300 to-cyan-200',
  },
  'emerald-mint': {
    id: 'emerald-mint',
    name: 'Emerald & Aqua Mint',
    primaryShell: '#10B981',
    secondaryShell: '#0D9488',
    coreGlow: '#34D399',
    secondaryGlow: '#2DD4BF',
    wireframe: '#A7F3D0',
    edgeHighlight: '#ECFDF5',
    ringPrimary: '#10B981',
    ringSecondary: '#14B8A6',
    pedestalColor: '#10B981',
    pedestalGlow: '#2DD4BF',
    badgeBg: 'rgba(16, 185, 129, 0.14)',
    badgeBorder: 'rgba(16, 185, 129, 0.35)',
    auraGradient: 'from-emerald-300 via-teal-300 to-cyan-200',
  },
  'amber-gold': {
    id: 'amber-gold',
    name: 'Solar Amber & Gold',
    primaryShell: '#F59E0B',
    secondaryShell: '#D97706',
    coreGlow: '#FBBF24',
    secondaryGlow: '#FB923C',
    wireframe: '#FDE68A',
    edgeHighlight: '#FFFBEB',
    ringPrimary: '#F59E0B',
    ringSecondary: '#FB923C',
    pedestalColor: '#F59E0B',
    pedestalGlow: '#FBBF24',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.38)',
    auraGradient: 'from-amber-300 via-orange-200 to-yellow-200',
  },
  'rose-coral': {
    id: 'rose-coral',
    name: 'Rose Quartz & Coral',
    primaryShell: '#EC4899',
    secondaryShell: '#F43F5E',
    coreGlow: '#FB7185',
    secondaryGlow: '#F472B6',
    wireframe: '#FBCFE8',
    edgeHighlight: '#FFF1F2',
    ringPrimary: '#EC4899',
    ringSecondary: '#FB7185',
    pedestalColor: '#EC4899',
    pedestalGlow: '#FB7185',
    badgeBg: 'rgba(236, 72, 153, 0.14)',
    badgeBorder: 'rgba(236, 72, 153, 0.35)',
    auraGradient: 'from-pink-300 via-rose-300 to-purple-200',
  },
  'teal-aqua': {
    id: 'teal-aqua',
    name: 'Arctic Teal & Cyan',
    primaryShell: '#0D9488',
    secondaryShell: '#0891B2',
    coreGlow: '#22D3EE',
    secondaryGlow: '#2DD4BF',
    wireframe: '#99F6E4',
    edgeHighlight: '#F0FDFA',
    ringPrimary: '#14B8A6',
    ringSecondary: '#06B6D4',
    pedestalColor: '#14B8A6',
    pedestalGlow: '#22D3EE',
    badgeBg: 'rgba(20, 184, 166, 0.14)',
    badgeBorder: 'rgba(20, 184, 166, 0.35)',
    auraGradient: 'from-teal-300 via-cyan-300 to-sky-200',
  },
  'magenta-violet': {
    id: 'magenta-violet',
    name: 'Amethyst & Electric Magenta',
    primaryShell: '#A855F7',
    secondaryShell: '#D946EF',
    coreGlow: '#F0ABFC',
    secondaryGlow: '#C084FC',
    wireframe: '#F5D0FE',
    edgeHighlight: '#FAF5FF',
    ringPrimary: '#A855F7',
    ringSecondary: '#EC4899',
    pedestalColor: '#A855F7',
    pedestalGlow: '#E879F9',
    badgeBg: 'rgba(168, 85, 247, 0.14)',
    badgeBorder: 'rgba(168, 85, 247, 0.35)',
    auraGradient: 'from-fuchsia-300 via-purple-300 to-pink-200',
  },
  'indigo-sky': {
    id: 'indigo-sky',
    name: 'Deep Indigo & Starlight',
    primaryShell: '#4F46E5',
    secondaryShell: '#6366F1',
    coreGlow: '#818CF8',
    secondaryGlow: '#38BDF8',
    wireframe: '#C7D2FE',
    edgeHighlight: '#EEF2FF',
    ringPrimary: '#6366F1',
    ringSecondary: '#60A5FA',
    pedestalColor: '#6366F1',
    pedestalGlow: '#818CF8',
    badgeBg: 'rgba(99, 102, 241, 0.14)',
    badgeBorder: 'rgba(99, 102, 241, 0.35)',
    auraGradient: 'from-indigo-300 via-blue-300 to-violet-200',
  },
  'crimson-amber': {
    id: 'crimson-amber',
    name: 'Crimson Flare & Sunset',
    primaryShell: '#E11D48',
    secondaryShell: '#EA580C',
    coreGlow: '#FB923C',
    secondaryGlow: '#FDA4AF',
    wireframe: '#FECDD3',
    edgeHighlight: '#FFF1F2',
    ringPrimary: '#F43F5E',
    ringSecondary: '#F59E0B',
    pedestalColor: '#F43F5E',
    pedestalGlow: '#FB923C',
    badgeBg: 'rgba(244, 63, 94, 0.14)',
    badgeBorder: 'rgba(244, 63, 94, 0.35)',
    auraGradient: 'from-rose-300 via-orange-200 to-amber-200',
  },
  'jade-cyan': {
    id: 'jade-cyan',
    name: 'Celestial Jade & Violet',
    primaryShell: '#059669',
    secondaryShell: '#6366F1',
    coreGlow: '#34D399',
    secondaryGlow: '#818CF8',
    wireframe: '#A7F3D0',
    edgeHighlight: '#FFFFFF',
    ringPrimary: '#10B981',
    ringSecondary: '#818CF8',
    pedestalColor: '#10B981',
    pedestalGlow: '#818CF8',
    badgeBg: 'rgba(5, 150, 105, 0.14)',
    badgeBorder: 'rgba(5, 150, 105, 0.35)',
    auraGradient: 'from-emerald-300 via-teal-200 to-indigo-200',
  },
};

export function getColorPaletteById(paletteId?: ModelColorPaletteId): ModelColorPalette {
  if (paletteId && MODEL_COLOR_PALETTES[paletteId]) {
    return MODEL_COLOR_PALETTES[paletteId];
  }
  return MODEL_COLOR_PALETTES['violet-cyan'];
}

export const SHARED_GEOMETRIES = {
  octahedron: new THREE.OctahedronGeometry(1, 0),
  icosahedron: new THREE.IcosahedronGeometry(1, 0),
  icosahedronDetail1: new THREE.IcosahedronGeometry(1, 1),
  dodecahedron: new THREE.DodecahedronGeometry(1, 0),
  tetrahedron: new THREE.TetrahedronGeometry(1, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphereLow: new THREE.SphereGeometry(1, 10, 10),
  cylinderLow: new THREE.CylinderGeometry(1, 1, 1, 8),
};

export function createCrystalShellMaterial(
  colorHex: string,
  opacity = 0.28,
  emissiveHex?: string,
  emissiveIntensity = 0.25
) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    emissive: new THREE.Color(emissiveHex || colorHex),
    emissiveIntensity: emissiveIntensity * 0.35, // Reduced by 65% from baseline
    metalness: 0.08,
    roughness: 0.06,
    reflectivity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    flatShading: true,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function createAdditivePrismMaterial(colorHex: string, opacity = 0.38) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.19, // Reduced by 65% from 0.55
    roughness: 0.08,
    metalness: 0.1,
    flatShading: true,
    transparent: true,
    opacity: opacity * 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createCrispWireframeMaterial(colorHex = '#FFFFFF', opacity = 0.65) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    wireframe: true,
    transparent: true,
    opacity: opacity * 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createRibbonRingMaterial(colorHex: string, opacity = 0.72) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.38, // Reduced by 65% from 1.1
    metalness: 0.3,
    roughness: 0.15,
    transparent: true,
    opacity: opacity * 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function getStateVisualModifiers(state: ModelAnimationState = 'idle') {
  switch (state) {
    case 'selected':
      return { speed: 1.45, glowMult: 1.25, scaleBoost: 1.03, evaluatingMix: 0 };
    case 'evaluating':
      return { speed: 2.35, glowMult: 1.65, scaleBoost: 1.05, evaluatingMix: 1 };
    case 'completed':
      return { speed: 1.2, glowMult: 1.35, scaleBoost: 1.02, evaluatingMix: 0 };
    case 'idle':
    default:
      return { speed: 1.0, glowMult: 1.0, scaleBoost: 1.0, evaluatingMix: 0 };
  }
}