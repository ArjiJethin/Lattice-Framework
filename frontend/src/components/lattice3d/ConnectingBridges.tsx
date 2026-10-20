import React from 'react';
import * as THREE from 'three';

interface BridgeSegmentProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  glow?: boolean;
}

const BridgeSegment: React.FC<BridgeSegmentProps> = ({
  start,
  end,
  color = '#8174F5',
  glow = true,
}) => {
  const vStart = new THREE.Vector3(...start);
  const vEnd = new THREE.Vector3(...end);
  const distance = vStart.distanceTo(vEnd);
  const position = vStart.clone().add(vEnd).multiplyScalar(0.5);

  const orientation = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  orientation.lookAt(vStart, vEnd, up);

  return (
    <group position={position}>
      {/* Outer translucent glass guide rail */}
      <mesh
        quaternion={new THREE.Quaternion().setFromRotationMatrix(orientation)}
      >
        <boxGeometry args={[0.08, 0.04, distance]} />
        <meshPhysicalMaterial
          color="#E2E8F0"
          transmission={0.5}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Core glowing data bus line */}
      {glow && (
        <mesh
          quaternion={new THREE.Quaternion().setFromRotationMatrix(orientation)}
        >
          <boxGeometry args={[0.03, 0.015, distance]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            roughness={0.2}
          />
        </mesh>
      )}
    </group>
  );
};

export const ConnectingBridges: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* Primary conduits radiating from Central Optimizer */}
      {/* Center to Candidate A (Upper Left) */}
      <BridgeSegment start={[0, 0.95, 0]} end={[-1.7, 0.95, 0]} color="#8174F5" />
      <BridgeSegment start={[-1.7, 0.95, 0]} end={[-1.7, 0.8, -1.8]} color="#8174F5" />
      <BridgeSegment start={[-1.7, 0.8, -1.8]} end={[-3.4, 0.8, -1.8]} color="#5598F7" />

      {/* Center to Candidate B (Lower Left) */}
      <BridgeSegment start={[0, 0.95, 0]} end={[-2.0, 0.95, 0]} color="#8174F5" />
      <BridgeSegment start={[-2.0, 0.95, 0]} end={[-2.0, 0.45, 1.8]} color="#8174F5" />
      <BridgeSegment start={[-2.0, 0.45, 1.8]} end={[-3.8, 0.45, 1.8]} color="#3B82F6" />

      {/* Center to Candidate C (Lower Center) */}
      <BridgeSegment start={[0, 0.95, 0]} end={[0, 0.5, 1.5]} color="#8174F5" />
      <BridgeSegment start={[0, 0.5, 1.5]} end={[1.2, 0.5, 1.5]} color="#10B981" />
      <BridgeSegment start={[1.2, 0.5, 1.5]} end={[1.2, 0.5, 2.4]} color="#10B981" />

      {/* Center to Evaluation Engine (Right Front) */}
      <BridgeSegment start={[0, 0.95, 0]} end={[2.5, 0.95, 0]} color="#8174F5" />
      <BridgeSegment start={[2.5, 0.95, 0]} end={[2.5, 0.75, 1.4]} color="#8174F5" />
      <BridgeSegment start={[2.5, 0.75, 1.4]} end={[4.4, 0.75, 1.4]} color="#8174F5" />

      {/* Center to Model Runtime (Right Rear) */}
      <BridgeSegment start={[0, 0.95, 0]} end={[2.2, 0.95, 0]} color="#8174F5" />
      <BridgeSegment start={[2.2, 0.95, 0]} end={[2.2, 0.95, -2.2]} color="#8174F5" />
      <BridgeSegment start={[2.2, 0.95, -2.2]} end={[3.8, 0.95, -2.2]} color="#5598F7" />

      {/* Peripheral structural cross connections */}
      <BridgeSegment start={[-3.4, 0.8, -1.8]} end={[-3.4, 0.45, 0.5]} color="#D1D5DB" glow={false} />
      <BridgeSegment start={[-3.4, 0.45, 0.5]} end={[-3.8, 0.45, 1.8]} color="#D1D5DB" glow={false} />
      <BridgeSegment start={[1.2, 0.5, 2.4]} end={[3.0, 0.5, 2.4]} color="#D1D5DB" glow={false} />
      <BridgeSegment start={[3.0, 0.5, 2.4]} end={[4.4, 0.75, 1.4]} color="#D1D5DB" glow={false} />
      <BridgeSegment start={[4.4, 0.75, 1.4]} end={[4.4, 0.85, -0.8]} color="#D1D5DB" glow={false} />
      <BridgeSegment start={[4.4, 0.85, -0.8]} end={[3.8, 0.95, -2.2]} color="#D1D5DB" glow={false} />

      {/* Vertical architectural support pylons and junctions */}
      {[
        [-1.7, 0.4, 0],
        [-2.0, 0.25, 0.9],
        [2.5, 0.4, 0.7],
        [2.2, 0.45, -1.1],
        [-3.4, 0.4, 0],
        [3.0, 0.25, 2.0],
      ].map(([x, y, z], idx) => (
        <group key={idx} position={[x, y, z]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, y * 2, 8]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, y, 0]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial
              color="#8174F5"
              emissive="#8174F5"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
