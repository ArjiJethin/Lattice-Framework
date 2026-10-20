import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BridgeSegmentProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  glow?: boolean;
  pulseSpeed?: number;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 8, 8);

const BridgeSegment: React.FC<BridgeSegmentProps> = React.memo(({
  start,
  end,
  color = '#A78BFA',
  glow = true,
  pulseSpeed = 1.0,
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
      {/* Frosted Acrylic Guide Channel */}
      <mesh geometry={UNIT_BOX} scale={[0.18, 0.035, distance]}>
        <meshStandardMaterial
          color="#F1F5F9"
          transparent
          opacity={0.75}
          roughness={0.15}
        />
      </mesh>

      {/* Left & Right Metallic Guide Rails */}
      <mesh geometry={UNIT_BOX} scale={[0.018, 0.045, distance]} position={[-0.09, 0, 0]}>
        <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh geometry={UNIT_BOX} scale={[0.018, 0.045, distance]} position={[0.09, 0, 0]}>
        <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Core Luminous Optical Trace */}
      {glow && (
        <>
          <mesh geometry={UNIT_BOX} scale={[0.035, 0.016, distance]} position={[0, 0.008, 0]}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Animated White/Pastel Optical Pulse */}
          <mesh
            ref={pulseRef}
            geometry={UNIT_BOX}
            scale={[0.06, 0.022, Math.min(0.4, distance * 0.3)]}
            position={[0, 0.012, 0]}
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
  return (
    <group position={[0, 0, 0]}>
      {/* Center Optimizer to Candidate A (Upper Left) */}
      <BridgeSegment start={[0, 0.85, 0]} end={[-1.7, 0.85, 0]} color="#A78BFA" />
      <BridgeSegment start={[-1.7, 0.85, 0]} end={[-1.7, 0.75, -1.8]} color="#A78BFA" />
      <BridgeSegment start={[-1.7, 0.75, -1.8]} end={[-3.4, 0.75, -1.8]} color="#60A5FA" />

      {/* Center Optimizer to Candidate B (Lower Left) */}
      <BridgeSegment start={[0, 0.85, 0]} end={[-2.0, 0.85, 0]} color="#A78BFA" />
      <BridgeSegment start={[-2.0, 0.85, 0]} end={[-2.0, 0.45, 1.8]} color="#CBD5E1" />
      <BridgeSegment start={[-2.0, 0.45, 1.8]} end={[-3.8, 0.45, 1.8]} color="#CBD5E1" />

      {/* Center Optimizer to Candidate C (Lower Center) */}
      <BridgeSegment start={[0, 0.85, 0]} end={[0, 0.45, 1.5]} color="#A78BFA" />
      <BridgeSegment start={[0, 0.45, 1.5]} end={[1.2, 0.45, 1.5]} color="#34D399" />
      <BridgeSegment start={[1.2, 0.45, 1.5]} end={[1.2, 0.45, 2.4]} color="#34D399" />

      {/* Center Optimizer to Evaluation Engine (Right Front) */}
      <BridgeSegment start={[0, 0.85, 0]} end={[2.5, 0.85, 0]} color="#A78BFA" />
      <BridgeSegment start={[2.5, 0.85, 0]} end={[2.5, 0.72, 1.4]} color="#34D399" />
      <BridgeSegment start={[2.5, 0.72, 1.4]} end={[4.4, 0.72, 1.4]} color="#34D399" />

      {/* Center Optimizer to Model Runtime (Right Rear) */}
      <BridgeSegment start={[0, 0.85, 0]} end={[2.2, 0.85, 0]} color="#A78BFA" />
      <BridgeSegment start={[2.2, 0.85, 0]} end={[2.2, 0.92, -2.2]} color="#60A5FA" />
      <BridgeSegment start={[2.2, 0.92, -2.2]} end={[3.8, 0.92, -2.2]} color="#60A5FA" />

      {/* Peripheral Structural Cross Busbars */}
      <BridgeSegment start={[-3.4, 0.75, -1.8]} end={[-3.4, 0.45, 0.5]} glow={false} />
      <BridgeSegment start={[-3.4, 0.45, 0.5]} end={[-3.8, 0.45, 1.8]} glow={false} />
      <BridgeSegment start={[1.2, 0.45, 2.4]} end={[3.0, 0.45, 2.4]} glow={false} />
      <BridgeSegment start={[3.0, 0.45, 2.4]} end={[4.4, 0.72, 1.4]} glow={false} />
      <BridgeSegment start={[4.4, 0.72, 1.4]} end={[4.4, 0.85, -0.8]} glow={false} />
      <BridgeSegment start={[4.4, 0.85, -0.8]} end={[3.8, 0.92, -2.2]} glow={false} />

      {/* Support Pylons */}
      {[
        { pos: [-1.7, 0.42, 0], h: 0.85, color: '#A78BFA' },
        { pos: [-1.7, 0.38, -1.8], h: 0.75, color: '#60A5FA' },
        { pos: [-2.0, 0.22, 1.8], h: 0.45, color: '#CBD5E1' },
        { pos: [1.2, 0.22, 1.5], h: 0.45, color: '#34D399' },
        { pos: [2.5, 0.36, 1.4], h: 0.72, color: '#34D399' },
        { pos: [2.2, 0.46, -2.2], h: 0.92, color: '#60A5FA' },
      ].map((pylon, idx) => (
        <group key={idx} position={[pylon.pos[0], pylon.pos[1], pylon.pos[2]]}>
          <mesh geometry={UNIT_CYL} scale={[0.045, pylon.h, 0.045]}>
            <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh geometry={UNIT_SPHERE} scale={0.055} position={[0, pylon.h / 2 + 0.02, 0]}>
            <meshBasicMaterial color={pylon.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
});