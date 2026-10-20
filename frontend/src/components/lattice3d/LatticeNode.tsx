import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ConfigurationCandidate } from '../../types';

interface LatticeNodeProps {
  candidate: ConfigurationCandidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const LatticeNode: React.FC<LatticeNodeProps> = ({
  candidate,
  isSelected,
  onSelect,
}) => {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  const isOptimizer = candidate.nodeRole === 'optimizer';
  const size = isOptimizer ? 1.5 : 0.95;

  // Derive node colors based on status and role matching the reference
  const getNodeColor = (): { main: string; core: string } => {
    if (isOptimizer || isSelected) {
      return { main: '#8174F5', core: '#A78BFA' };
    }
    if (candidate.id === 'cand-c') {
      return { main: '#10B981', core: '#34D399' }; // Mint green crystal
    }
    switch (candidate.status) {
      case 'selected':
        return { main: '#8174F5', core: '#A78BFA' };
      case 'feasible':
        return { main: '#5598F7', core: '#93C5FD' };
      case 'evaluating':
        return { main: '#F59E0B', core: '#FCD34D' };
      case 'rejected':
        return { main: '#EF4444', core: '#FCA5A5' };
      case 'unprofiled':
      default:
        return { main: '#94A3B8', core: '#CBD5E1' };
    }
  };

  const { main: colorHex, core: coreColorHex } = getNodeColor();

  // Subtle continuous geometric rotation for high visual fidelity
  useFrame((state, delta) => {
    if (innerRef.current) {
      innerRef.current.rotation.y += delta * (isOptimizer ? 0.35 : 0.2);
      innerRef.current.rotation.x += delta * (isOptimizer ? 0.2 : 0.1);
    }
    if (outerRef.current && isSelected) {
      // Gentle floating bob for the selected active candidate
      outerRef.current.position.y =
        candidate.position3D[1] + Math.sin(state.clock.elapsedTime * 2.5) * 0.04;
    }
  });

  return (
    <group position={candidate.position3D}>
      {/* Outer translucent crystalline glass cube */}
      <mesh
        ref={outerRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(candidate.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'default';
        }}
        scale={isHovered ? 1.08 : 1.0}
      >
        <boxGeometry args={[size, size, size]} />
        <meshPhysicalMaterial
          color={colorHex}
          roughness={0.12}
          metalness={0.1}
          transmission={0.65}
          thickness={0.8}
          transparent
          opacity={0.88}
          reflectivity={0.8}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Internal rotating geometric wireframe core */}
      <group ref={innerRef}>
        <mesh scale={size * 0.55}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={coreColorHex}
            emissive={coreColorHex}
            emissiveIntensity={isHovered || isSelected ? 0.9 : 0.4}
            wireframe
          />
        </mesh>
        <mesh scale={size * 0.25}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive={coreColorHex}
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>

      {/* Selected glowing ring under the platform */}
      {isSelected && (
        <mesh position={[0, -size / 2 - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 0.65, size * 0.85, 32]} />
          <meshBasicMaterial
            color="#8174F5"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Floating Spatial Label Matching Screenshot Reference */}
      {(candidate.subLabel || isSelected || isHovered) && (
        <Html
          position={[size * 0.75, size * 0.55, 0]}
          center={false}
          distanceFactor={18}
          zIndexRange={[100, 0]}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(candidate.id);
            }}
            className={`cursor-pointer whitespace-nowrap px-3 py-1.5 rounded-xl border text-left transition-all duration-200 select-none backdrop-blur-xl ${
              isSelected
                ? 'bg-white/95 border-[#8174F5] ring-2 ring-[#8174F5]/30 shadow-lg shadow-[#8174F5]/15'
                : isHovered
                ? 'bg-white/95 border-[#8174F5]/70 shadow-md shadow-[#8174F5]/10 scale-105'
                : 'bg-white/85 border-white/90 shadow-glass-sm'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[#18213B] tracking-tight">
                {candidate.name}
              </span>
              {isSelected && (
                <span className="text-[9px] font-medium px-1.5 py-0.2 bg-[#EEEBFF] text-[#8174F5] rounded">
                  Active
                </span>
              )}
            </div>
            {candidate.subLabel && (
              <div className="text-[10px] text-slate-500 font-normal">
                {candidate.subLabel}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
