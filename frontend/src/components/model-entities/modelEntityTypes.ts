import { ModelArchetype, ModelAnimationState } from '../../types/modelLibrary';

export interface ModelEntityProps {
  archetype: ModelArchetype;
  animationState?: ModelAnimationState;
  colorTheme?: 'violet' | 'blue' | 'teal';
  wireframeOnly?: boolean;
  scale?: number;
}

export interface ArchetypeVisualSpec {
  archetype: ModelArchetype;
  displayName: string;
  subtitle: string;
  tags: string[];
  description: string;
  primaryColor: string;
  glowColor: string;
  accentColor: string;
}

export const ARCHETYPE_SPECS: Record<ModelArchetype, ArchetypeVisualSpec> = {
  orbital: {
    archetype: 'orbital',
    displayName: '01 · ORBITAL',
    subtitle: 'The Organized Core',
    tags: ['Balanced', 'Precise', 'Structured'],
    description: 'A crystalline core surrounded by rotating orbital rings and data modules. Conveys an organized and engineered intelligence.',
    primaryColor: '#8174F5',
    glowColor: '#6366F1',
    accentColor: '#38BDF8',
  },
  fractal: {
    archetype: 'fractal',
    displayName: '02 · FRACTAL',
    subtitle: 'The Evolving Structure',
    tags: ['Dynamic', 'Exploratory', 'Intricate'],
    description: 'A branching, layered structure with interconnected geometry and flowing data strands. Conveys an evolving and adaptive intelligence.',
    primaryColor: '#6366F1',
    glowColor: '#A855F7',
    accentColor: '#06B6D4',
  },
  lattice: {
    archetype: 'lattice',
    displayName: '03 · LATTICE',
    subtitle: 'The Connected Core',
    tags: ['Connected', 'Architectural', 'Geometric'],
    description: 'A layered lattice of interconnected nodes and cores. Conveys a structured and scalable intelligence with clear internal organization.',
    primaryColor: '#0EA5E9',
    glowColor: '#14B8A6',
    accentColor: '#8174F5',
  },
};
