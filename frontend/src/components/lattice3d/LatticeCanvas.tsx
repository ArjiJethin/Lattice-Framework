import React, { useRef, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { SceneLights } from './SceneLights';
import { Foundation } from './Foundation';
import { ConnectingBridges } from './ConnectingBridges';
import { LatticeNode } from './LatticeNode';
import { ConfigurationCandidate } from '../../types';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WebGL Rendering Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-100 rounded-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#18213B] mb-1">
            3D Canvas Acceleration Fallback
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            WebGL context could not initialize or encountered a shader error. Running in 2D fallback mode.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="px-4 py-2 bg-[#8174F5] text-white text-xs font-medium rounded-lg hover:bg-[#7162F3] transition-colors"
          >
            Retry WebGL Context
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LatticeCanvasProps {
  candidates: ConfigurationCandidate[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
}

export const LatticeCanvas: React.FC<LatticeCanvasProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [isOrbiting, setIsOrbiting] = useState(false);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(13.2, 10.8, 14.2);
      controlsRef.current.target.set(0.1, 0., 0.2);
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
    <div className="relative w-full h-full select-none overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,_#FFFFFF_0%,_#EEF2F8_55%,_#DCE3EE_100%)]">
      <WebGLErrorBoundary>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{
            position: [13.2, 10.8, 14.2],
            fov: 28,
            near: 0.5,
            far: 80,
          }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.12,
            powerPreference: 'high-performance',
          }}
          onPointerDown={() => setIsOrbiting(true)}
          onPointerUp={() => setIsOrbiting(false)}
        >
          <OrbitControls
            ref={controlsRef}
            target={[0.1, 0.55, 0.2]}
            enableDamping
            dampingFactor={0.08}
            enableZoom={true}
            zoomSpeed={0.85}
            minDistance={8}
            maxDistance={32}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.35}
            rotateSpeed={0.65}
          />

          <SceneLights />
          <Foundation />
          <ConnectingBridges />

          {candidates.map((cand) => (
            <LatticeNode
              key={cand.id}
              candidate={cand}
              isSelected={cand.id === selectedCandidateId}
              onSelect={onSelectCandidate}
            />
          ))}
        </Canvas>
      </WebGLErrorBoundary>

      {/* Floating Canvas Camera Controls Overlay */}
      <div className="absolute bottom-3 left-6 z-10 flex items-center gap-1.5 p-1 rounded-xl bg-white/80 backdrop-blur-md border border-white shadow-sm text-slate-600">
        <button
          onClick={() => handleZoom(-0.15)}
          title="Zoom In"
          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-[#18213B] transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.15)}
          title="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-[#18213B] transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
        <button
          onClick={resetCamera}
          title="Reset Isometric View"
          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-[#8174F5] transition-colors flex items-center gap-1 text-xs font-medium px-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {isOrbiting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 bg-slate-900/70 backdrop-blur-md text-white text-[11px] rounded-full font-medium">
          Rotating Isometric View
        </div>
      )}
    </div>
  );
};