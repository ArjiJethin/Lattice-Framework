import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ModelFamily, QuantizationVariant, ModelAnimationState } from '../../types/modelLibrary';
import { ModelEntityRenderer } from '../model-entities/ModelEntityRenderer';
import { ModelEntityLighting } from '../model-entities/ModelEntityLighting';
import { getColorPaletteById } from '../model-entities/SharedModelMaterials';
import { ModelAnnotations } from './ModelAnnotations';
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ModelEntitySceneProps {
  model: ModelFamily;
  selectedVariant: QuantizationVariant;
  animationState?: ModelAnimationState;
  onMaximize3D?: () => void;
}

export const ModelEntityScene: React.FC<ModelEntitySceneProps> = ({
  model,
  selectedVariant,
  animationState = 'idle',
  onMaximize3D,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [isOrbiting, setIsOrbiting] = useState(false);

  const activeArchetype = selectedVariant.archetype || model.archetype;
  const activePaletteId = selectedVariant.paletteId || model.paletteId;
  const activePalette = getColorPaletteById(activePaletteId);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(0, 0.95, 7.35);
      controlsRef.current.target.set(0, -0.05, 0);
      controlsRef.current.update();
    }
  };

  const handleZoom = (delta: number) => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object as THREE.PerspectiveCamera;
      const factor = 1 + delta;
      camera.position.multiplyScalar(factor);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full min-h-0 select-none overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_50%_46%,_#FFFFFF_0%,_#F1F4F9_52%,_#E4E9F2_100%)] border border-[#D9DEE7] shadow-2xs">
      {/* Subtle Ambient Aura Behind 3D Entity */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={`w-[320px] h-[320px] rounded-full blur-3xl opacity-[0.12] transition-all duration-700 bg-gradient-to-tr ${activePalette.auraGradient}`}
        />
      </div>

      {/* Top Header Overlay: Model Title & View in 3D Button */}
      <div className="absolute top-3.5 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
        <div>
          <h2 className="text-[18px] font-semibold text-[#222938] tracking-tight leading-tight">
            {model.name}
          </h2>
          <p className="text-[12px] font-medium text-[#647187] mt-0.5">
            <span className="font-mono">{model.parameters}</span> Parameters &nbsp;·&nbsp; {model.architecture.split(' ')[0]} &nbsp;·&nbsp; <span className="font-mono">{model.fileFormat}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onMaximize3D || resetCamera}
          className="pointer-events-auto flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/95 hover:bg-white text-[#222938] hover:text-[#7562E8] text-[11.5px] font-semibold border border-[#D9DEE7] shadow-2xs transition-colors cursor-pointer"
        >
          <span>View in 3D</span>
          <Maximize2 className="w-3 h-3 text-[#647187]" />
        </button>
      </div>

      {/* Floating Annotations Layer */}
      <ModelAnnotations model={model} selectedVariant={selectedVariant} />

      {/* Three.js Interactive Canvas */}
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{
          position: [0, 0.95, 7.35],
          fov: 32,
          near: 0.5,
          far: 60,
        }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          powerPreference: 'high-performance',
        }}
        onPointerDown={() => setIsOrbiting(true)}
        onPointerUp={() => setIsOrbiting(false)}
      >
        <OrbitControls
          ref={controlsRef}
          target={[0, -0.05, 0]}
          enableDamping
          dampingFactor={0.08}
          enableZoom={true}
          zoomSpeed={0.8}
          minDistance={4.2}
          maxDistance={15}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.92}
          rotateSpeed={0.65}
        />

        <ModelEntityLighting
          primaryColor={activePalette.primaryShell}
          glowColor={activePalette.coreGlow}
        />

        <ModelEntityRenderer
          archetype={activeArchetype}
          paletteId={activePaletteId}
          animationState={animationState}
        />
      </Canvas>

      {/* Camera Controls Bottom Overlay */}
      <div className="absolute bottom-2.5 left-4 z-20 flex items-center gap-0.5 p-1 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs text-[#647187]">
        <button
          type="button"
          onClick={() => handleZoom(-0.15)}
          aria-label="Zoom In"
          title="Zoom In"
          className="h-6 w-6 rounded-sm flex items-center justify-center hover:bg-[#F8F9FB] hover:text-[#222938] transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.15)}
          aria-label="Zoom Out"
          title="Zoom Out"
          className="h-6 w-6 rounded-sm flex items-center justify-center hover:bg-[#F8F9FB] hover:text-[#222938] transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-[#E6EAF0] mx-0.5" />
        <button
          type="button"
          onClick={resetCamera}
          title="Reset View"
          className="h-6 px-2 rounded-sm hover:bg-[#F8F9FB] hover:text-[#7562E8] transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {isOrbiting && (
        <div className="absolute bottom-3 right-4 pointer-events-none px-2.5 py-0.5 bg-[#222938]/85 backdrop-blur-sm text-white text-[10.5px] rounded-sm font-mono">
          Inspecting 3D Entity
        </div>
      )}
    </div>
  );
};