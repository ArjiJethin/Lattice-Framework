import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface BridgeSegmentProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  glow?: boolean;
  pulseSpeed?: number;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 12);

const BridgeSegment: React.FC<BridgeSegmentProps> = React.memo(({
  start,
  end,
  color = '#A78BFA',
  glow = true,
  pulseSpeed = 0.85,
}) => {
  const pulseRef = useRef<THREE.Mesh>(null);

  const { distance, position, quaternion } = useMemo(() => {
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);
    const dist = vStart.distanceTo(vEnd);
    const pos = vStart.clone().add(vEnd).multiplyScalar(0.5);
    const orientation = new THREE.Matrix4();
    orientation.lookAt(vStart, vEnd, new THREE.Vector3(0, 1, 0));
    const quat = new THREE.Quaternion().setFromRotationMatrix(orientation);
    return { distance: dist, position: pos, quaternion: quat };
  }, [start, end]);

  useFrame((state) => {
    if (pulseRef.current && glow) {
      const t = (state.clock.elapsedTime * pulseSpeed) % 1;
      pulseRef.current.position.z = (t - 0.5) * distance;
    }
  });

  return (
    <group position={position} quaternion={quaternion}>
      {/* Clear Acrylic Busbar Casing */}
      <mesh geometry={UNIT_BOX} scale={[0.26, 0.036, distance]}>
        <meshPhysicalMaterial
          color="#E2EEF8"
          transparent
          opacity={0.48}
          roughness={0.06}
          clearcoat={1}
          depthWrite={false}
        />
        <Edges scale={1} color="#FFFFFF" />
      </mesh>

      {/* Left, Center & Right Chrome Guide Rails (Matches multi-rail tracks in reference) */}
      <mesh geometry={UNIT_BOX} scale={[0.02, 0.046, distance]} position={[-0.12, 0, 0]}>
        <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh geometry={UNIT_BOX} scale={[0.014, 0.042, distance]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh geometry={UNIT_BOX} scale={[0.02, 0.046, distance]} position={[0.12, 0, 0]}>
        <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.18} />
      </mesh>

      {/* Dual Parallel Optical Traces */}
      {glow && (
        <>
          <mesh geometry={UNIT_BOX} scale={[0.024, 0.016, distance]} position={[-0.055, 0.008, 0]}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh geometry={UNIT_BOX} scale={[0.024, 0.016, distance]} position={[0.055, 0.008, 0]}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Traveling Light Pulse */}
          <mesh
            ref={pulseRef}
            geometry={UNIT_BOX}
            scale={[0.12, 0.024, Math.min(0.45, distance * 0.3)]}
            position={[0, 0.014, 0]}
          >
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  );
});

export const ConnectingBridges: React.FC = React.memo(() => {
  // Height of the raised glass deck surface = 0.22
  const deckY = 0.23;
  const hubY = 0.48;

  return (
    <group position={[0, 0, 0]}>
      {/* Central Optimizer to Candidate A (Upper Left) */}
      <BridgeSegment start={[0, hubY, 0]} end={[-1.7, hubY, 0]} color="#A78BFA" />
      <BridgeSegment start={[-1.7, hubY, 0]} end={[-1.7, 0.42, -1.8]} color="#A78BFA" />
      <BridgeSegment start={[-1.7, 0.42, -1.8]} end={[-3.4, 0.42, -1.8]} color="#60A5FA" />

      {/* Central Optimizer to Candidate B (Lower Left) */}
      <BridgeSegment start={[0, hubY, 0]} end={[-2.0, hubY, 0]} color="#A78BFA" />
      <BridgeSegment start={[-2.0, hubY, 0]} end={[-2.0, deckY, 1.8]} color="#CBD5E1" />
      <BridgeSegment start={[-2.0, deckY, 1.8]} end={[-3.8, deckY, 1.8]} color="#E2E8F0" />

      {/* Central Optimizer to Candidate C (Lower Center) */}
      <BridgeSegment start={[0, hubY, 0]} end={[0, deckY, 1.5]} color="#A78BFA" />
      <BridgeSegment start={[0, deckY, 1.5]} end={[1.2, deckY, 1.5]} color="#34D399" />
      <BridgeSegment start={[1.2, deckY, 1.5]} end={[1.2, deckY, 2.4]} color="#34D399" />

      {/* Central Optimizer to Evaluation Engine (Right Front) */}
      <BridgeSegment start={[0, hubY, 0]} end={[2.5, hubY, 0]} color="#A78BFA" />
      <BridgeSegment start={[2.5, hubY, 0]} end={[2.5, 0.38, 1.4]} color="#34D399" />
      <BridgeSegment start={[2.5, 0.38, 1.4]} end={[4.4, 0.38, 1.4]} color="#34D399" />

      {/* Central Optimizer to Model Runtime (Right Rear) */}
      <BridgeSegment start={[0, hubY, 0]} end={[2.2, hubY, 0]} color="#A78BFA" />
      <BridgeSegment start={[2.2, hubY, 0]} end={[2.2, 0.48, -2.2]} color="#60A5FA" />
      <BridgeSegment start={[2.2, 0.48, -2.2]} end={[3.8, 0.48, -2.2]} color="#60A5FA" />

      {/* Clean Orthogonal Circuit Traces on the Glass Floor */}
      <BridgeSegment start={[-3.4, deckY, -1.8]} end={[-3.4, deckY, 1.8]} glow={false} />
      <BridgeSegment start={[1.2, deckY, 2.4]} end={[4.4, deckY, 2.4]} glow={false} />
      <BridgeSegment start={[4.4, deckY, 2.4]} end={[4.4, deckY, 1.4]} glow={false} />
      <BridgeSegment start={[4.4, deckY, 1.4]} end={[4.4, deckY, -2.2]} glow={false} />

      {/* Chrome Busbar Support Clamps on the Glass Deck */}
      {[
        [-1.7, 0.32, 0],
        [-1.7, 0.3, -1.8],
        [-2.0, 0.22, 1.8],
        [1.2, 0.22, 1.5],
        [2.5, 0.28, 1.4],
        [2.2, 0.32, -2.2],
      ].map(([x, y, z], idx) => (
        <group key={idx} position={[x, y, z]}>
          <mesh geometry={UNIT_CYL} scale={[0.05, 0.24, 0.05]}>
            <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh geometry={UNIT_BOX} scale={[0.28, 0.05, 0.28]} position={[0, 0.1, 0]}>
            <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
            <Edges scale={1} color="#FFFFFF" />
          </mesh>
        </group>
      ))}
    </group>
  );
});