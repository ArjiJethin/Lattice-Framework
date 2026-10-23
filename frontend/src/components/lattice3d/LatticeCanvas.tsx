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
import { Button } from '../ui/primitives';
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
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#F8F9FB] rounded-lg border border-[#D9DEE7]">
          <div className="w-10 h-10 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center mb-3">
            <RotateCcw className="w-5 h-5" />
          </div>
          <h3 className="text-[14px] font-semibold text-[#222938] mb-1">
            3D Canvas Acceleration Fallback
          </h3>
          <p className="text-[12px] text-[#647187] max-w-sm mb-4">
            WebGL context could not initialize or encountered a shader error. Running in 2D fallback mode.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
          >
            Retry WebGL Context
          </Button>
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
      controlsRef.current.target.set(0.1, 0.55, 0.2);
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
    <div className="relative w-full h-full select-none overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,_#FFFFFF_0%,_#F1F4F9_58%,_#E4E9F2_100%)] border-b border-[#D9DEE7]">
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
      <div className="absolute bottom-3 left-6 z-10 flex items-center gap-0.5 p-1 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs text-[#647187]">
        <button
          type="button"
          onClick={() => handleZoom(-0.15)}
          aria-label="Zoom In"
          title="Zoom In"
          className="h-7 w-7 rounded-sm flex items-center justify-center hover:bg-[#F8F9FB] hover:text-[#222938] transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.15)}
          aria-label="Zoom Out"
          title="Zoom Out"
          className="h-7 w-7 rounded-sm flex items-center justify-center hover:bg-[#F8F9FB] hover:text-[#222938] transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-[#E6EAF0] mx-0.5" />
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Isometric View"
          className="h-7 px-2 rounded-sm hover:bg-[#F8F9FB] hover:text-[#7562E8] transition-colors flex items-center gap-1.5 text-[11.5px] font-medium cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {isOrbiting && (
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 pointer-events-none px-2.5 py-1 bg-[#222938]/85 backdrop-blur-sm text-white text-[11px] rounded-sm font-mono">
          Orbiting Topology View
        </div>
      )}
    </div>
  );
};