import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { ConfigurationCandidate } from '../../types';

interface LatticeNodeProps {
  candidate: ConfigurationCandidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// Shared geometries created once in memory for maximum performance
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_OCTA = new THREE.OctahedronGeometry(1, 0);
const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 6);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

const DIAGONAL_QUATERNIONS = [
  new THREE.Vector3(1, 1, 1).normalize(),
  new THREE.Vector3(-1, 1, 1).normalize(),
  new THREE.Vector3(1, 1, -1).normalize(),
  new THREE.Vector3(-1, 1, -1).normalize(),
].map((d) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));

/**
 * Lightweight internal glowing X-lattice struts using Additive Blending
 * so the inside of the crystal looks bright, airy, and luminous like the reference.
 */
const InternalLatticeStruts: React.FC<{
  size: number;
  glowColor: string;
}> = React.memo(({ size, glowColor }) => {
  const diagLen = size * Math.sqrt(3) * 0.94;
  const r = size * 0.014;

  const strutMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const haloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [glowColor]
  );

  return (
    <group>
      {/* 4 Space Diagonals (White Core + Colored Glow Halo) */}
      {DIAGONAL_QUATERNIONS.map((q, i) => (
        <group key={i} quaternion={q}>
          <mesh geometry={UNIT_CYLINDER} material={strutMaterial} scale={[r, diagLen, r]} />
          <mesh
            geometry={UNIT_CYLINDER}
            material={haloMaterial}
            scale={[r * 2.6, diagLen, r * 2.6]}
          />
        </group>
      ))}

      {/* 3 Central X/Y/Z Axis Spindles */}
      <mesh geometry={UNIT_CYLINDER} material={strutMaterial} scale={[r * 0.9, size * 0.96, r * 0.9]} />
      <mesh
        geometry={UNIT_CYLINDER}
        material={strutMaterial}
        rotation={[0, 0, Math.PI / 2]}
        scale={[r * 0.9, size * 0.96, r * 0.9]}
      />
      <mesh
        geometry={UNIT_CYLINDER}
        material={strutMaterial}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[r * 0.9, size * 0.96, r * 0.9]}
      />
    </group>
  );
});

/**
 * Clean brushed-silver socket mount underneath each crystal
 */
const PedestalSocket: React.FC<{
  size: number;
  glowColor: string;
}> = React.memo(({ size, glowColor }) => {
  const baseWidth = size * 1.18;
  const collarWidth = size * 1.04;
  const pinOffset = baseWidth * 0.45;

  return (
    <group position={[0, -size / 2, 0]}>
      {/* Upper silver-slate collar */}
      <mesh
        geometry={UNIT_BOX}
        scale={[collarWidth, 0.06, collarWidth]}
        position={[0, -0.02, 0]}
      >
        <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Soft upward base light reflection pad */}
      <mesh
        geometry={UNIT_PLANE}
        scale={[size * 0.96, size * 0.96, 1]}
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Lower brushed aluminum plate */}
      <mesh
        geometry={UNIT_BOX}
        scale={[baseWidth, 0.08, baseWidth]}
        position={[0, -0.08, 0]}
      >
        <meshStandardMaterial color="#CBD5E1" metalness={0.5} roughness={0.25} />
      </mesh>

      {/* 4 Corner Pins */}
      {[
        [-pinOffset, -pinOffset],
        [pinOffset, -pinOffset],
        [-pinOffset, pinOffset],
        [pinOffset, pinOffset],
      ].map(([cx, cz], idx) => (
        <mesh
          key={idx}
          geometry={UNIT_CYLINDER}
          scale={[0.028, 0.12, 0.028]}
          position={[cx, 0.01, cz]}
        >
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
});

export const LatticeNode: React.FC<LatticeNodeProps> = ({
  candidate,
  isSelected,
  onSelect,
}) => {
  const crystalGroupRef = useRef<THREE.Group>(null);
  const innerCoreRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  const isOptimizer = candidate.nodeRole === 'optimizer';
  const size = isOptimizer ? 1.55 : 0.94;

  // Match the exact airy pastel colors of the reference image
  const palette = useMemo(() => {
    const nameLower = (candidate.name || '').toLowerCase();
    const idLower = (candidate.id || '').toLowerCase();

    if (isOptimizer || nameLower.includes('optimizer')) {
      return {
        shellTint: '#DDD6FE',
        innerFacet: '#A78BFA',
        edge: '#F5F3FF',
        glow: '#8B5CF6',
        shellOpacity: 0.24,
      };
    }
    // Candidate B in reference is clear diamond/silver-white (NOT solid red)
    if (idLower.includes('cand-b') || nameLower.includes('candidate b')) {
      return {
        shellTint: '#F1F5F9',
        innerFacet: '#CBD5E1',
        edge: '#FFFFFF',
        glow: '#94A3B8',
        shellOpacity: 0.2,
      };
    }
    // Candidate C & Evaluation Engine in reference are soft mint-aqua
    if (
      idLower.includes('cand-c') ||
      nameLower.includes('candidate c') ||
      nameLower.includes('evaluation')
    ) {
      return {
        shellTint: '#A7F3D0',
        innerFacet: '#34D399',
        edge: '#ECFDF5',
        glow: '#10B981',
        shellOpacity: 0.22,
      };
    }
    // Candidate A & Model Runtime in reference are ice-blue
    return {
      shellTint: '#BAE6FD',
      innerFacet: '#60A5FA',
      edge: '#EFF6FF',
      glow: '#3B82F6',
      shellOpacity: 0.23,
    };
  }, [candidate.id, candidate.name, isOptimizer]);

  // Compute non-overlapping label placement matching the reference image layout
  const labelPlacement = useMemo(() => {
    const nameLower = (candidate.name || '').toLowerCase();
    if (isOptimizer || nameLower.includes('optimizer')) {
      return { pos: [0, size * 0.72, 0] as [number, number, number], align: 'top' };
    }
    if (nameLower.includes('candidate a')) {
      return { pos: [-size * 0.7, size * 0.45, -size * 0.3] as [number, number, number], align: 'left' };
    }
    if (nameLower.includes('candidate b')) {
      return { pos: [-size * 0.75, size * 0.4, size * 0.2] as [number, number, number], align: 'left' };
    }
    if (nameLower.includes('candidate c')) {
      return { pos: [size * 0.75, -size * 0.05, size * 0.4] as [number, number, number], align: 'right' };
    }
    if (nameLower.includes('evaluation')) {
      return { pos: [size * 0.8, size * 0.2, 0] as [number, number, number], align: 'right' };
    }
    if (nameLower.includes('runtime')) {
      return { pos: [size * 0.75, size * 0.35, -size * 0.2] as [number, number, number], align: 'right' };
    }
    return { pos: [0, size * 0.7, 0] as [number, number, number], align: 'top' };
  }, [candidate.name, isOptimizer, size]);

  useFrame((state, delta) => {
    if (innerCoreRef.current) {
      innerCoreRef.current.rotation.y += delta * (isOptimizer ? 0.35 : 0.2);
    }
    if (crystalGroupRef.current && (isSelected || isOptimizer)) {
      crystalGroupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 2.0) * 0.025;
    }
  });

  return (
    <group position={candidate.position3D}>
      {/* Brushed-Silver Socket Pedestal */}
      <PedestalSocket size={size} glowColor={palette.glow} />

      {/* Interactive Crystal Cube */}
      <group
        ref={crystalGroupRef}
        scale={isHovered ? 1.05 : 1.0}
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
      >
        {/* 1. Outer Translucent Glass Cube (No opaque transmission bottleneck) */}
        <mesh geometry={UNIT_BOX} scale={[size, size, size]}>
          <meshPhysicalMaterial
            color={palette.shellTint}
            transparent
            opacity={palette.shellOpacity}
            roughness={0.05}
            metalness={0.05}
            reflectivity={0.9}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
          {/* Crisp White/Pastel Outer Cube Wireframe Edges */}
          <Edges scale={1.001} threshold={15} color={palette.edge} />
        </mesh>

        {/* 2. Inner Faceted Diamond Chamber (Creates the multi-faceted prism look) */}
        <mesh geometry={UNIT_OCTA} scale={size * 0.68}>
          <meshPhysicalMaterial
            color={palette.innerFacet}
            transparent
            opacity={0.28}
            roughness={0.08}
            clearcoat={1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
          <Edges scale={1.0} threshold={10} color="#FFFFFF" />
        </mesh>

        {/* 3. Glowing White & Pastel Internal X-Lattice Struts */}
        <InternalLatticeStruts size={size} glowColor={palette.glow} />

        {/* 4. Rotating Bright Diamond Energy Core */}
        <group ref={innerCoreRef}>
          <mesh geometry={UNIT_OCTA} scale={size * 0.22}>
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh geometry={UNIT_OCTA} scale={size * 0.36}>
            <meshBasicMaterial
              color={palette.glow}
              wireframe
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>

        {/* Soft Volumetric Glow Sprite inside the cube */}
        <mesh geometry={UNIT_OCTA} scale={size * 0.5}>
          <meshBasicMaterial
            color={palette.glow}
            transparent
            opacity={isOptimizer ? 0.32 : 0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Compact Non-Overlapping Callout Badge Matching Reference */}
      {(candidate.subLabel || isSelected || isHovered || isOptimizer) && (
        <Html
          position={labelPlacement.pos}
          center
          zIndexRange={[50, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(candidate.id);
            }}
            style={{ pointerEvents: 'auto' }}
            className={`cursor-pointer whitespace-nowrap px-2.5 py-1 rounded-lg border text-left transition-all duration-150 select-none backdrop-blur-md ${isSelected || isOptimizer
                ? 'bg-white/95 border-[#8174F5]/50 shadow-[0_4px_14px_rgba(129,116,245,0.18)]'
                : isHovered
                  ? 'bg-white/95 border-slate-300 shadow-md scale-105'
                  : 'bg-white/85 border-slate-200/80 shadow-sm'
              }`}
          >
            <div className="text-[11px] font-bold text-[#1E293B] leading-tight">
              {candidate.name}
            </div>
            {candidate.subLabel && (
              <div className="text-[9.5px] text-slate-500 font-medium leading-tight">
                {candidate.subLabel}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};