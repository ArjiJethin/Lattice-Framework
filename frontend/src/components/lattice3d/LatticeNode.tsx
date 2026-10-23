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

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_OCTA = new THREE.OctahedronGeometry(1, 0);
const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 8);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 10, 10);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

const CUBE_FACE_DIAGONALS_GEO = (() => {
  const h = 0.5;
  const c = [
    new THREE.Vector3(-h, -h, -h),
    new THREE.Vector3(h, -h, -h),
    new THREE.Vector3(h, h, -h),
    new THREE.Vector3(-h, h, -h),
    new THREE.Vector3(-h, -h, h),
    new THREE.Vector3(h, -h, h),
    new THREE.Vector3(h, h, h),
    new THREE.Vector3(-h, h, h),
  ];
  const pairs = [
    [0, 2], [1, 3],
    [4, 6], [5, 7],
    [0, 7], [3, 4],
    [1, 6], [2, 5],
    [3, 6], [2, 7],
    [0, 5], [1, 4],
  ];
  const pts: THREE.Vector3[] = [];
  pairs.forEach(([a, b]) => {
    pts.push(c[a], c[b]);
  });
  return new THREE.BufferGeometry().setFromPoints(pts);
})();

const DIAGONAL_QUATERNIONS = [
  new THREE.Vector3(1, 1, 1).normalize(),
  new THREE.Vector3(-1, 1, 1).normalize(),
  new THREE.Vector3(1, 1, -1).normalize(),
  new THREE.Vector3(-1, 1, -1).normalize(),
].map((d) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));

const VERTEX_OFFSETS: Array<[number, number, number]> = [
  [-0.48, -0.48, -0.48],
  [0.48, -0.48, -0.48],
  [-0.48, 0.48, -0.48],
  [0.48, 0.48, -0.48],
  [-0.48, -0.48, 0.48],
  [0.48, -0.48, 0.48],
  [-0.48, 0.48, 0.48],
  [0.48, 0.48, 0.48],
  [0.49, 0, 0],
  [-0.49, 0, 0],
  [0, 0.49, 0],
  [0, -0.49, 0],
  [0, 0, 0.49],
  [0, 0, -0.49],
];

const InternalLatticeStructure: React.FC<{
  size: number;
  glowColor: string;
}> = React.memo(({ size, glowColor }) => {
  const diagLen = size * Math.sqrt(3) * 0.95;
  const r = size * 0.013;

  return (
    <group>
      {DIAGONAL_QUATERNIONS.map((q, i) => (
        <group key={i} quaternion={q}>
          <mesh geometry={UNIT_CYLINDER} scale={[r, diagLen, r]}>
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.92}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh geometry={UNIT_CYLINDER} scale={[r * 2.8, diagLen, r * 2.8]}>
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      <mesh geometry={UNIT_CYLINDER} scale={[r, size * 0.96, r]}>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh geometry={UNIT_CYLINDER} rotation={[0, 0, Math.PI / 2]} scale={[r, size * 0.96, r]}>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh geometry={UNIT_CYLINDER} rotation={[Math.PI / 2, 0, 0]} scale={[r, size * 0.96, r]}>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {VERTEX_OFFSETS.map(([vx, vy, vz], idx) => (
        <mesh
          key={idx}
          geometry={UNIT_SPHERE}
          scale={size * 0.024}
          position={[vx * size, vy * size, vz * size]}
        >
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
});

const PedestalSocket: React.FC<{
  size: number;
  glowColor: string;
  isOptimizer: boolean;
}> = React.memo(({ size, glowColor, isOptimizer }) => {
  const outerPlate = size * 1.26;
  const midCollar = size * 1.08;
  const pinOffset = outerPlate * 0.44;

  return (
    <group position={[0, -size / 2, 0]}>
      <mesh
        geometry={UNIT_BOX}
        scale={[midCollar, 0.08, midCollar]}
        position={[0, -0.03, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#475569" metalness={0.78} roughness={0.2} />
        <Edges scale={1} threshold={15} color="#CBD5E1" />
      </mesh>

      <mesh
        geometry={UNIT_PLANE}
        scale={[size * 0.98, size * 0.98, 1]}
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isOptimizer ? 0.95 : 0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh
        geometry={UNIT_PLANE}
        scale={[size * 0.65, size * 0.65, 1]}
        position={[0, 0.018, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        geometry={UNIT_BOX}
        scale={[outerPlate, 0.11, outerPlate]}
        position={[0, -0.11, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#94A3B8" metalness={0.65} roughness={0.22} />
        <Edges scale={1} threshold={15} color="#F1F5F9" />
      </mesh>

      {[
        [-pinOffset, -pinOffset],
        [pinOffset, -pinOffset],
        [-pinOffset, pinOffset],
        [pinOffset, pinOffset],
      ].map(([cx, cz], idx) => (
        <group key={idx} position={[cx, -0.01, cz]}>
          <mesh geometry={UNIT_CYLINDER} scale={[0.032, 0.14, 0.032]}>
            <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh geometry={UNIT_SPHERE} scale={0.025} position={[0, 0.075, 0]}>
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
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
  const size = isOptimizer ? 1.56 : 0.95;

  const palette = useMemo(() => {
    const nameLower = (candidate.name || '').toLowerCase();
    const idLower = (candidate.id || '').toLowerCase();

    if (isOptimizer || nameLower.includes('optimizer')) {
      return {
        shellTint: '#DDD6FE',
        innerOcta: '#7C3AED',
        edge: '#FFFFFF',
        faceDiag: '#DDD6FE',
        glow: '#8B5CF6',
        shellOpacity: 0.26,
      };
    }
    if (idLower.includes('cand-b') || nameLower.includes('candidate b')) {
      return {
        shellTint: '#F1F5F9',
        innerOcta: '#64748B',
        edge: '#FFFFFF',
        faceDiag: '#E2E8F0',
        glow: '#94A3B8',
        shellOpacity: 0.22,
      };
    }
    if (
      idLower.includes('cand-c') ||
      nameLower.includes('candidate c') ||
      nameLower.includes('evaluation')
    ) {
      return {
        shellTint: '#A7F3D0',
        innerOcta: '#059669',
        edge: '#ECFDF5',
        faceDiag: '#6EE7B7',
        glow: '#10B981',
        shellOpacity: 0.24,
      };
    }
    return {
      shellTint: '#BAE6FD',
      innerOcta: '#2563EB',
      edge: '#EFF6FF',
      faceDiag: '#93C5FD',
      glow: '#3B82F6',
      shellOpacity: 0.25,
    };
  }, [candidate.id, candidate.name, isOptimizer]);

  const labelPlacement = useMemo(() => {
    const nameLower = (candidate.name || '').toLowerCase();
    if (isOptimizer || nameLower.includes('optimizer')) {
      return [0, size * 0.72, 0] as [number, number, number];
    }
    if (nameLower.includes('candidate a')) {
      return [-size * 0.75, size * 0.48, -size * 0.25] as [number, number, number];
    }
    if (nameLower.includes('candidate b')) {
      return [-size * 0.8, size * 0.42, size * 0.2] as [number, number, number];
    }
    if (nameLower.includes('candidate c')) {
      return [size * 0.85, -size * 0.05, size * 0.35] as [number, number, number];
    }
    if (nameLower.includes('evaluation')) {
      return [size * 0.88, size * 0.22, 0] as [number, number, number];
    }
    if (nameLower.includes('runtime')) {
      return [size * 0.82, size * 0.38, -size * 0.2] as [number, number, number];
    }
    return [0, size * 0.7, 0] as [number, number, number];
  }, [candidate.name, isOptimizer, size]);

  useFrame((state, delta) => {
    if (innerCoreRef.current) {
      innerCoreRef.current.rotation.y += delta * (isOptimizer ? 0.32 : 0.18);
    }
    if (crystalGroupRef.current && (isSelected || isOptimizer)) {
      crystalGroupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 2.0) * 0.022;
    }
  });

  return (
    <group position={candidate.position3D}>
      <PedestalSocket size={size} glowColor={palette.glow} isOptimizer={isOptimizer} />

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
        <mesh geometry={UNIT_BOX} scale={[size, size, size]}>
          <meshPhysicalMaterial
            color={palette.shellTint}
            transparent
            opacity={palette.shellOpacity}
            roughness={0.04}
            metalness={0.08}
            reflectivity={0.95}
            clearcoat={1.0}
            clearcoatRoughness={0.04}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
          <Edges scale={1.001} threshold={15} color={palette.edge} />
        </mesh>

        <lineSegments
          geometry={CUBE_FACE_DIAGONALS_GEO}
          scale={[size * 1.002, size * 1.002, size * 1.002]}
        >
          <lineBasicMaterial
            color={palette.faceDiag}
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>

        <mesh geometry={UNIT_OCTA} scale={size * 0.7}>
          <meshPhysicalMaterial
            color={palette.innerOcta}
            transparent
            opacity={0.34}
            roughness={0.06}
            metalness={0.1}
            clearcoat={1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
          <Edges scale={1.0} threshold={10} color="#FFFFFF" />
        </mesh>

        <mesh geometry={UNIT_OCTA} scale={size * 0.52} rotation={[0, Math.PI / 4, 0]}>
          <meshBasicMaterial
            color={palette.glow}
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
          <Edges scale={1.0} threshold={10} color={palette.faceDiag} />
        </mesh>

        <InternalLatticeStructure size={size} glowColor={palette.glow} />

        <group ref={innerCoreRef}>
          <mesh geometry={UNIT_OCTA} scale={size * 0.24}>
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.98}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh geometry={UNIT_OCTA} scale={size * 0.36}>
            <meshBasicMaterial
              color={palette.glow}
              wireframe
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>

      {/* Restrained Engineering Callout Tag */}
      {(candidate.subLabel || isSelected || isHovered || isOptimizer) && (
        <Html
          position={labelPlacement}
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
            className={`cursor-pointer whitespace-nowrap px-2.5 py-1 rounded-md border text-left transition-colors duration-150 select-none backdrop-blur-md ${isSelected
                ? 'bg-white/95 border-[#7562E8] shadow-sm'
                : isHovered
                  ? 'bg-white/95 border-[#647187] shadow-2xs'
                  : 'bg-white/90 border-[#D9DEE7] shadow-2xs'
              }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11.5px] font-semibold text-[#222938] leading-tight">
                {candidate.name}
              </span>
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#7562E8]" />
              )}
            </div>
            {candidate.subLabel && (
              <div className="text-[10px] font-mono text-[#647187] leading-tight mt-0.5">
                {candidate.subLabel}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};