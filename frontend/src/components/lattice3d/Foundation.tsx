import React, { useMemo } from 'react';
import { Edges, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 16);
const UNIT_OCTA = new THREE.OctahedronGeometry(1, 0);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_RING = new THREE.RingGeometry(0.5, 1, 24);

/**
 * Chrome & Acrylic Standoff Pillar that holds the raised glass floor
 * above the solid white base slab, with a subtle violet LED ring at the bottom.
 */
const GlassStandoffPillar: React.FC<{
  position: [number, number, number];
  height?: number;
  glow?: boolean;
}> = React.memo(({ position, height = 0.42, glow = true }) => {
  return (
    <group position={position}>
      {/* Outer Translucent Acrylic Sleeve */}
      <mesh geometry={UNIT_CYL} scale={[0.14, height, 0.14]}>
        <meshPhysicalMaterial
          color="#E2EDF8"
          transparent
          opacity={0.45}
          roughness={0.08}
          clearcoat={1}
          depthWrite={false}
        />
      </mesh>

      {/* Inner Machined Chrome Core Rod */}
      <mesh geometry={UNIT_CYL} scale={[0.075, height * 1.02, 0.075]}>
        <meshStandardMaterial color="#64748B" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Top Chrome Fastener Cap (Flush with the raised glass floor) */}
      <mesh
        geometry={UNIT_CYL}
        scale={[0.16, 0.03, 0.16]}
        position={[0, height / 2 + 0.015, 0]}
      >
        <meshStandardMaterial color="#F8FAFC" metalness={0.92} roughness={0.1} />
      </mesh>

      {/* Bottom Base Collar on the Solid Floor */}
      <mesh
        geometry={UNIT_CYL}
        scale={[0.17, 0.04, 0.17]}
        position={[0, -height / 2 + 0.02, 0]}
      >
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Subtle Violet LED Ring at Pillar Base (Matches reference image) */}
      {glow && (
        <mesh
          geometry={UNIT_RING}
          scale={[0.24, 0.24, 1]}
          position={[0, -height / 2 + 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial
            color="#8B5CF6"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
});

interface NodeMountDef {
  position: [number, number, number];
  size: [number, number];
  height: number;
  accentColor: string;
}

// Low-profile metallic pads mounted on top of the raised glass floor for each candidate node
const NODE_MOUNTS: NodeMountDef[] = [
  // Candidate A (Upper-Left)
  { position: [-3.4, 0.22, -1.8], size: [2.1, 2.1], height: 0.28, accentColor: '#3B82F6' },
  // Candidate B (Lower-Left)
  { position: [-3.8, 0.14, 1.8], size: [2.1, 2.1], height: 0.14, accentColor: '#94A3B8' },
  // Candidate C (Lower-Center)
  { position: [1.2, 0.14, 2.4], size: [2.0, 2.0], height: 0.14, accentColor: '#10B981' },
  // Evaluation Engine (Lower-Right)
  { position: [4.4, 0.2, 1.4], size: [2.1, 2.1], height: 0.24, accentColor: '#10B981' },
  // Model Runtime (Upper-Right)
  { position: [3.8, 0.25, -2.2], size: [2.15, 2.15], height: 0.34, accentColor: '#3B82F6' },
];

// Small ambient mini-crystal cubes sitting on the glass floor (from reference image)
const AMBIENT_MINI_CRYSTALS: Array<{
  pos: [number, number, number];
  size: number;
  pedestalH: number;
  color: string;
}> = [
    // Rear-left medium crystal on tall metallic pillar
    { pos: [-1.1, 0.62, -2.7], size: 0.56, pedestalH: 0.48, color: '#8B5CF6' },
    // Mid-left small crystal
    { pos: [-1.7, 0.32, -0.7], size: 0.38, pedestalH: 0.16, color: '#8B5CF6' },
    // Mid-front small crystal
    { pos: [-1.6, 0.26, 1.2], size: 0.3, pedestalH: 0.12, color: '#A78BFA' },
    // Rear-right small crystal
    { pos: [1.5, 0.32, -2.1], size: 0.34, pedestalH: 0.16, color: '#60A5FA' },
    // Mid-right small crystal
    { pos: [2.3, 0.3, -0.4], size: 0.34, pedestalH: 0.14, color: '#818CF8' },
    // Lower-right small crystal
    { pos: [2.8, 0.26, 1.4], size: 0.28, pedestalH: 0.12, color: '#94A3B8' },
  ];

export const Foundation: React.FC = React.memo(() => {
  // Subtle coordinate grid lines etched onto the raised glass floor
  const glassGridGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const halfW = 6.2;
    const halfD = 5.4;
    const step = 1.2;
    for (let x = -halfW; x <= halfW; x += step) {
      pts.push(new THREE.Vector3(x, 0, -halfD), new THREE.Vector3(x, 0, halfD));
    }
    for (let z = -halfD; z <= halfD; z += step) {
      pts.push(new THREE.Vector3(-halfW, 0, z), new THREE.Vector3(halfW, 0, z));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          LAYER 1: SYMMETRICAL SOLID ARCHITECTURAL BASE SLAB (Bottom Floor)
         ===================================================================== */}
      {/* Dark Metallic Shadow Plinth Underneath */}
      <RoundedBox
        args={[14.8, 0.16, 13.4]}
        radius={0.07}
        smoothness={4}
        position={[0, -0.58, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#94A3B8" metalness={0.6} roughness={0.28} />
      </RoundedBox>

      {/* Main Solid Matte Off-White / Light-Silver Architectural Base Slab */}
      <RoundedBox
        args={[14.4, 0.24, 13.0]}
        radius={0.08}
        smoothness={4}
        position={[0, -0.4, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#F1F5F9"
          metalness={0.12}
          roughness={0.2}
        />
        <Edges scale={1.0} threshold={15} color="#FFFFFF" />
      </RoundedBox>

      {/* Recessed Inner Metallic Tray on Top of Solid Base */}
      <mesh
        geometry={UNIT_BOX}
        scale={[12.8, 0.03, 11.4]}
        position={[0, -0.275, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#E2E8F0" metalness={0.3} roughness={0.22} />
        <Edges scale={1.0} threshold={15} color="#CBD5E1" />
      </mesh>

      {/* =====================================================================
          STANDOFF PILLARS (Supporting the Raised Glass Floor Across Air Gap)
         ===================================================================== */}
      {[
        // 4 Outer Corners
        [-6.1, -0.06, -5.3],
        [6.1, -0.06, -5.3],
        [-6.1, -0.06, 5.3],
        [6.1, -0.06, 5.3],
        // Mid-Perimeter Support Pillars
        [0, -0.06, -5.3],
        [0, -0.06, 5.3],
        [-6.1, -0.06, 0],
        [6.1, -0.06, 0],
        // Inner Structural Pillars under heavy nodes
        [-3.4, -0.06, -1.8],
        [-3.8, -0.06, 1.8],
        [1.2, -0.06, 2.4],
        [4.4, -0.06, 1.4],
        [3.8, -0.06, -2.2],
      ].map(([x, y, z], idx) => (
        <GlassStandoffPillar
          key={idx}
          position={[x, y, z]}
          height={0.42}
          glow={idx < 8}
        />
      ))}

      {/* =====================================================================
          LAYER 2: RAISED TRANSPARENT GLASS FLOOR (Floating Above Solid Base)
         ===================================================================== */}
      <group position={[0, 0.15, 0]}>
        {/* Primary Crystal-Clear Raised Glass Deck */}
        <mesh geometry={UNIT_BOX} scale={[13.2, 0.07, 11.8]} receiveShadow>
          <meshPhysicalMaterial
            color="#E2EEF8"
            transparent
            opacity={0.38}
            roughness={0.05}
            metalness={0.08}
            reflectivity={0.95}
            clearcoat={1.0}
            clearcoatRoughness={0.04}
            depthWrite={false}
          />
          {/* Crisp Bright White Glass Slab Edges */}
          <Edges scale={1.0} threshold={15} color="#FFFFFF" />
        </mesh>

        {/* Bottom Bevel Edge Line of the Glass Slab (Shows glass thickness) */}
        <mesh
          geometry={UNIT_BOX}
          scale={[13.18, 0.01, 11.78]}
          position={[0, -0.032, 0]}
        >
          <meshBasicMaterial color="#CBD5E1" transparent opacity={0.45} depthWrite={false} />
          <Edges scale={1.0} threshold={15} color="#E2E8F0" />
        </mesh>

        {/* Subtle Specular Top Surface Reflection Plane */}
        <mesh
          geometry={UNIT_PLANE}
          scale={[13.1, 11.7, 1]}
          position={[0, 0.036, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.14}
            roughness={0.03}
            metalness={0.1}
            clearcoat={1}
            depthWrite={false}
          />
        </mesh>

        {/* Etched Coordinate Grid on the Glass Floor */}
        <lineSegments geometry={glassGridGeo} position={[0, 0.038, 0]}>
          <lineBasicMaterial color="#CBD5E1" transparent opacity={0.4} />
        </lineSegments>
      </group>

      {/* =====================================================================
          LAYER 3: CENTRAL 2-TIER BRUSHED-METAL OPTIMIZER CITADEL
         ===================================================================== */}
      <group position={[0, 0.185, 0]}>
        {/* Tier 1: Wide Lower Brushed-Aluminum Base Block (Rests on glass floor, extends down to solid floor) */}
        <RoundedBox
          args={[3.3, 0.42, 3.3]}
          radius={0.08}
          smoothness={4}
          position={[0, 0.06, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#CBD5E1" metalness={0.68} roughness={0.22} />
          <Edges scale={1.0} threshold={15} color="#FFFFFF" />
        </RoundedBox>

        {/* Dark Chrome Base Gasket Rim on Glass Floor */}
        <mesh geometry={UNIT_BOX} scale={[3.42, 0.04, 3.42]} position={[0, 0.02, 0]}>
          <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.2} />
          <Edges scale={1.0} color="#E2E8F0" />
        </mesh>

        {/* Tier 2: Upper Stepped Brushed-Metal Pedestal Block */}
        <RoundedBox
          args={[2.45, 0.34, 2.45]}
          radius={0.06}
          smoothness={4}
          position={[0, 0.38, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#D8E0EA" metalness={0.65} roughness={0.2} />
          <Edges scale={1.0} threshold={15} color="#FFFFFF" />
        </RoundedBox>

        {/* Glowing Violet Light Collar under Optimizer Crystal */}
        <mesh geometry={UNIT_BOX} scale={[1.95, 0.035, 1.95]} position={[0, 0.56, 0]}>
          <meshBasicMaterial
            color="#A78BFA"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* =====================================================================
          LAYER 4: SLEEK METALLIC NODE MOUNTS ON THE RAISED GLASS FLOOR
         ===================================================================== */}
      {NODE_MOUNTS.map((mount, idx) => {
        const [w, d] = mount.size;
        return (
          <group
            key={idx}
            position={[mount.position[0], 0.185 + mount.height / 2, mount.position[2]]}
          >
            {/* Brushed Aluminum Riser Block */}
            <RoundedBox
              args={[w, mount.height, d]}
              radius={0.04}
              smoothness={4}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color="#CBD5E1" metalness={0.62} roughness={0.22} />
              <Edges scale={1.0} threshold={15} color="#FFFFFF" />
            </RoundedBox>

            {/* Overhanging Frosted Glass Cap Plate */}
            <mesh
              geometry={UNIT_BOX}
              scale={[w * 1.04, 0.04, d * 1.04]}
              position={[0, mount.height / 2 + 0.02, 0]}
            >
              <meshPhysicalMaterial
                color="#F1F5F9"
                transparent
                opacity={0.65}
                roughness={0.08}
                clearcoat={1}
                depthWrite={false}
              />
              <Edges scale={1.0} color="#FFFFFF" />
            </mesh>

            {/* Glowing Under-Rim Accent */}
            <mesh
              geometry={UNIT_BOX}
              scale={[w * 0.92, 0.015, d * 0.92]}
              position={[0, -mount.height / 2 + 0.01, 0]}
            >
              <meshBasicMaterial
                color={mount.accentColor}
                transparent
                opacity={0.75}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        );
      })}

      {/* =====================================================================
          LAYER 5: AMBIENT MINI-CRYSTALS ON METALLIC PEDESTALS
         ===================================================================== */}
      {AMBIENT_MINI_CRYSTALS.map((item, idx) => {
        const baseFloorY = 0.185;
        const pedCenterY = baseFloorY + item.pedestalH / 2;
        const crystalCenterY = baseFloorY + item.pedestalH + item.size / 2 + 0.03;

        return (
          <group key={idx}>
            {/* Brushed Metal Pedestal Column */}
            <mesh
              geometry={UNIT_BOX}
              scale={[item.size * 0.85, item.pedestalH, item.size * 0.85]}
              position={[item.pos[0], pedCenterY, item.pos[2]]}
              castShadow
            >
              <meshStandardMaterial color="#94A3B8" metalness={0.72} roughness={0.22} />
              <Edges scale={1.0} color="#E2E8F0" />
            </mesh>

            {/* Metallic Socket Collar */}
            <mesh
              geometry={UNIT_BOX}
              scale={[item.size * 1.15, 0.04, item.size * 1.15]}
              position={[item.pos[0], baseFloorY + item.pedestalH + 0.01, item.pos[2]]}
            >
              <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.2} />
              <Edges scale={1.0} color="#FFFFFF" />
            </mesh>

            {/* Mini Translucent Crystal Cube */}
            <group position={[item.pos[0], crystalCenterY, item.pos[2]]}>
              <mesh geometry={UNIT_BOX} scale={[item.size, item.size, item.size]}>
                <meshPhysicalMaterial
                  color="#EDE9FE"
                  transparent
                  opacity={0.3}
                  roughness={0.05}
                  clearcoat={1}
                  depthWrite={false}
                />
                <Edges scale={1.0} color="#FFFFFF" />
              </mesh>
              <mesh geometry={UNIT_OCTA} scale={item.size * 0.65}>
                <meshBasicMaterial
                  color={item.color}
                  transparent
                  opacity={0.5}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
                <Edges scale={1.0} color="#FFFFFF" />
              </mesh>
              <mesh geometry={UNIT_OCTA} scale={item.size * 0.25}>
                <meshBasicMaterial
                  color="#FFFFFF"
                  transparent
                  opacity={0.95}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
});