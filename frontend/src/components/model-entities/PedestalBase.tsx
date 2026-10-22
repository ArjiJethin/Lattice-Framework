import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface PedestalBaseProps {
  color?: string;
  glowColor?: string;
  state?: 'idle' | 'selected' | 'evaluating' | 'completed';
}

const FLUTE_COUNT = 36;
const FLOOR_SHARDS: Array<{ pos: [number, number, number]; rot: [number, number, number]; size: number }> = [
  { pos: [-2.15, -0.18, 1.05], rot: [0.4, 0.8, 0.2], size: 0.085 },
  { pos: [2.05, -0.18, 1.25], rot: [0.7, -0.4, 0.5], size: 0.095 },
  { pos: [-1.75, -0.18, 1.75], rot: [-0.3, 0.5, -0.4], size: 0.075 },
  { pos: [2.45, -0.18, 0.35], rot: [0.2, 1.1, -0.3], size: 0.07 },
  { pos: [-2.55, -0.18, -0.25], rot: [0.5, -0.7, 0.4], size: 0.08 },
];

export const PedestalBase: React.FC<PedestalBaseProps> = React.memo(({
  color = '#8174F5',
  glowColor = '#38BDF8',
  state = 'idle',
}) => {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  // Precompute vertical fluted ribs around the cylinder rim like the reference pedestal
  const flutes = useMemo(() => {
    const arr: Array<{ x: number; z: number; angle: number }> = [];
    const radius = 1.96;
    for (let i = 0; i < FLUTE_COUNT; i++) {
      const angle = (i / FLUTE_COUNT) * Math.PI * 2;
      arr.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        angle,
      });
    }
    return arr;
  }, []);

  // Subtle perspective floor grid lines around the pedestal
  const floorGridGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const span = 4.8;
    const step = 0.6;
    for (let i = -span; i <= span; i += step) {
      pts.push(new THREE.Vector3(i, 0, -span), new THREE.Vector3(i, 0, span));
      pts.push(new THREE.Vector3(-span, 0, i), new THREE.Vector3(span, 0, i));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame((_, delta) => {
    const mult = state === 'evaluating' ? 2.2 : 1.0;
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * 0.18 * mult;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * 0.25 * mult;
    }
  });

  const activeColor = state === 'evaluating' ? '#F59E0B' : color;
  const activeGlow = state === 'evaluating' ? '#EC4899' : glowColor;

  return (
    <group position={[0, -1.52, 0]}>
      {/* Subtle Perspective Studio Grid on the Floor */}
      <lineSegments geometry={floorGridGeo} position={[0, -0.22, 0]}>
        <lineBasicMaterial color="#CBD5E1" transparent opacity={0.28} />
      </lineSegments>

      {/* Outer Soft Floor Reflection Halo */}
      <mesh position={[0, -0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.15, 3.1, 64]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Tier 1: Wide Brushed-Silver Lower Rim */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[2.18, 2.32, 0.14, 64]} />
        <meshStandardMaterial color="#D8E1EE" metalness={0.55} roughness={0.24} />
      </mesh>

      {/* Tier 2: Fluted Metallic Cylinder Body */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <cylinderGeometry args={[1.95, 2.04, 0.18, 64]} />
        <meshStandardMaterial color="#E8EEF7" metalness={0.48} roughness={0.2} />
      </mesh>

      {/* Vertical Fluted Ribbing Details Around Pedestal Wall */}
      {flutes.map((f, i) => (
        <mesh
          key={i}
          position={[f.x, -0.02, f.z]}
          rotation={[0, -f.angle, 0]}
        >
          <boxGeometry args={[0.025, 0.16, 0.045]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.2} />
        </mesh>
      ))}

      {/* Tier 3: Top Chamfered Acrylic & Chrome Collar */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.78, 1.92, 0.06, 64]} />
        <meshPhysicalMaterial
          color="#F8FAFC"
          metalness={0.2}
          roughness={0.1}
          clearcoat={1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Recessed Glowing Well Top Surface */}
      <mesh position={[0, 0.112, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.68, 64]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={0.10}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Neon Ring 1 (Outer Cyan/Violet Track) */}
      <mesh ref={outerRingRef} position={[0, 0.116, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.52, 1.62, 64]} />
        <meshBasicMaterial
          color={activeGlow}
          transparent
          opacity={0.30}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Neon Ring 2 (Mid White-Core Ring) */}
      <mesh position={[0, 0.118, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.22, 1.28, 64]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Neon Ring 3 (Inner Rotating Energy Ring) */}
      <mesh ref={innerRingRef} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 0.94, 48]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Central Upward Core Light Disc */}
      <mesh position={[0, 0.122, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Decorative Tiny Crystal Shards Resting on the Studio Floor Around the Pedestal */}
      {FLOOR_SHARDS.map((s, idx) => (
        <mesh
          key={idx}
          position={s.pos}
          rotation={s.rot}
          scale={[s.size, s.size * 1.4, s.size]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color={idx % 2 === 0 ? activeColor : activeGlow}
            transparent
            opacity={0.65}
            roughness={0.05}
            clearcoat={1}
          />
          <Edges scale={1} color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
});