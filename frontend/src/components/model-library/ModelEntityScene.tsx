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

  // Independent archetype and color palette for the active configuration
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
    <div className="relative w-full h-full min-h-0 select-none overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_46%,_#FFFFFF_0%,_#F3F6FD_52%,_#E4EAF7_100%)] border border-white/95 shadow-[0_4px_24px_rgba(24,33,59,0.04)]">
      {/* Dynamic Ambient Aura Behind 3D Entity matching the configuration's palette */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={`w-[340px] h-[340px] rounded-full blur-3xl opacity-[0.12] transition-all duration-700 bg-gradient-to-tr ${activePalette.auraGradient}`}
        />
      </div>

      {/* Top Header Overlay: Model Title & View in 3D Pill */}
      <div className="absolute top-3.5 left-5 right-5 z-20 flex items-start justify-between pointer-events-none">
        <div>
          <h2 className="text-[20px] font-extrabold text-[#18213B] tracking-tight leading-tight">
            {model.name}
          </h2>
          <p className="text-[11.5px] font-medium text-slate-500 mt-0.5">
            {model.parameters} Parameters &nbsp;·&nbsp; {model.architecture.split(' ')[0]} &nbsp;·&nbsp; {model.fileFormat}
          </p>
        </div>

        <button
          onClick={onMaximize3D || resetCamera}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#18213B] hover:text-[#7C6AF2] text-[11px] font-semibold backdrop-blur-md border border-slate-200/80 shadow-xs transition-all"
        >
          <span>View in 3D</span>
          <Maximize2 className="w-3 h-3 text-slate-500" />
        </button>
      </div>

      {/* Floating Holographic Annotations Layer */}
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
      <div className="absolute bottom-2.5 left-4 z-20 flex items-center gap-1 p-1 rounded-xl bg-white/80 backdrop-blur-md border border-white/90 shadow-2xs text-slate-600">
        <button
          onClick={() => handleZoom(-0.15)}
          title="Zoom In"
          className="p-1 rounded-lg hover:bg-slate-100 hover:text-[#18213B] transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom(0.15)}
          title="Zoom Out"
          className="p-1 rounded-lg hover:bg-slate-100 hover:text-[#18213B] transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3 bg-slate-200 mx-0.5" />
        <button
          onClick={resetCamera}
          title="Reset View"
          className="p-1 rounded-lg hover:bg-slate-100 hover:text-[#8174F5] transition-colors flex items-center gap-1 text-[10px] font-medium px-1.5"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
      </div>

      {isOrbiting && (
        <div className="absolute bottom-3 right-4 pointer-events-none px-2.5 py-0.5 bg-slate-900/70 backdrop-blur-md text-white text-[10px] rounded-full font-medium">
          Inspecting 3D Entity
        </div>
      )}
    </div>
  );
};