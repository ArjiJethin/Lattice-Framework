import React from 'react';
import {
  ModelArchetype,
  ModelAnimationState,
  ModelColorPaletteId,
} from '../../types/modelLibrary';
import { OrbitalEntity } from './OrbitalEntity';
import { FractalEntity } from './FractalEntity';
import { LatticeEntity } from './LatticeEntity';
import { PedestalBase } from './PedestalBase';
import { getColorPaletteById } from './SharedModelMaterials';

interface ModelEntityRendererProps {
  archetype: ModelArchetype;
  paletteId?: ModelColorPaletteId;
  animationState?: ModelAnimationState;
  wireframeOnly?: boolean;
}

export const ModelEntityRenderer: React.FC<ModelEntityRendererProps> = ({
  archetype,
  paletteId,
  animationState = 'idle',
  wireframeOnly = false,
}) => {
  const palette = getColorPaletteById(paletteId);

  return (
    <group>
      {/* Supporting Pedestal Base colored by the configuration's palette */}
      <PedestalBase
        color={palette.pedestalColor}
        glowColor={palette.pedestalGlow}
        state={animationState}
      />

      {/* Dynamic Procedural 3D Entity */}
      {archetype === 'orbital' && (
        <OrbitalEntity
          palette={palette}
          state={animationState}
          wireframeOnly={wireframeOnly}
        />
      )}
      {archetype === 'fractal' && (
        <FractalEntity
          palette={palette}
          state={animationState}
          wireframeOnly={wireframeOnly}
        />
      )}
      {archetype === 'lattice' && (
        <LatticeEntity
          palette={palette}
          state={animationState}
          wireframeOnly={wireframeOnly}
        />
      )}
    </group>
  );
};