import React from 'react';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface PlatformDef {
  position: [number, number, number];
  size: [number, number, number];
  accentColor?: string;
  isCentral?: boolean;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const UNIT_OCTA = new THREE.OctahedronGeometry(1, 0);

const MODULAR_PLATFORMS: PlatformDef[] = [
  // Central Optimizer stepped metallic pyramid base
  { position: [0, 0.35, 0], size: [3.5, 0.7, 3.5], accentColor: '#A78BFA', isCentral: true },
  // Upper-Left Candidate A platform
  { position: [-3.4, 0.35, -1.8], size: [2.4, 0.7, 2.4], accentColor: '#60A5FA' },
  // Lower-Left Candidate B platform
  { position: [-3.8, 0.2, 1.8], size: [2.4, 0.4, 2.4], accentColor: '#CBD5E1' },
  // Lower-Center Candidate C platform
  { position: [1.2, 0.2, 2.4], size: [2.3, 0.4, 2.3], accentColor: '#34D399' },
  // Lower-Right Evaluation Engine platform
  { position: [4.4, 0.35, 1.4], size: [2.4, 0.7, 2.4], accentColor: '#34D399' },
  // Upper-Right Model Runtime platform
  { position: [3.8, 0.45, -2.2], size: [2.5, 0.9, 2.5], accentColor: '#60A5FA' },
  // Intermediate step platforms
  { position: [-1.7, 0.16, -0.9], size: [1.6, 0.32, 1.6] },
  { position: [2.3, 0.16, -0.7], size: [1.7, 0.32, 1.7] },
  { position: [-1.9, 0.15, 1.5], size: [1.5, 0.3, 1.5] },
  { position: [2.8, 0.16, 1.9], size: [1.4, 0.32, 1.4] },
];

// Secondary ambient mini-crystal cubes from the reference image
const MINI_AMBIENT_CRYSTALS: Array<{
  pos: [number, number, number];
  size: number;
  color: string;
}> = [
    { pos: [-1.7, 0.52, -0.9], size: 0.36, color: '#A78BFA' },
    { pos: [-0.9, 0.65, -2.6], size: 0.46, color: '#A78BFA' },
    { pos: [2.3, 0.52, -0.7], size: 0.38, color: '#93C5FD' },
    { pos: [-2.1, 0.48, 0.6], size: 0.32, color: '#C4B5FD' },
    { pos: [2.9, 0.52, 0.3], size: 0.34, color: '#A5B4FC' },
    { pos: [0.2, 0.42, 3.3], size: 0.3, color: '#CBD5E1' },
  ];

export const Foundation: React.FC = React.memo(() => {
  return (
    <group position={[0, 0, 0]}>
      {/* Lower Brushed-Silver Structural Chassis */}
      <mesh
        geometry={UNIT_BOX}
        scale={[15.2, 0.26, 14.2]}
        position={[0, -0.3, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#DDE4EE" metalness={0.45} roughness={0.3} />
      </mesh>

      {/* Main White/Frosted Architectural Slab */}
      <mesh
        geometry={UNIT_BOX}
        scale={[15.8, 0.16, 14.8]}
        position={[0, -0.09, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#F8FAFC" metalness={0.1} roughness={0.15} />
        <Edges scale={1} threshold={15} color="#FFFFFF" />
      </mesh>

      {/* Upper Translucent Glass Deck Frame */}
      <mesh
        geometry={UNIT_BOX}
        scale={[11.4, 0.06, 10.4]}
        position={[0.2, 0.03, 0.1]}
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#FFFFFF"
          transparent
          opacity={0.65}
          roughness={0.08}
          metalness={0.05}
          clearcoat={1}
        />
        <Edges scale={1} threshold={15} color="#FFFFFF" />
      </mesh>

      {/* Chrome Hardware Standoffs around the perimeter */}
      {[
        [-5.3, 0, -4.8],
        [5.7, 0, -4.8],
        [-5.3, 0, 5.0],
        [5.7, 0, 5.0],
        [0.2, 0, -4.8],
        [0.2, 0, 5.0],
      ].map(([x, , z], i) => (
        <mesh
          key={i}
          geometry={UNIT_CYL}
          scale={[0.12, 0.24, 0.12]}
          position={[x, -0.04, z]}
        >
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Subtle Coordinate Grid */}
      <gridHelper
        args={[14.2, 28, '#CBD5E1', '#E2E8F0']}
        position={[0, 0.065, 0]}
      />

      {/* Raised Modular Platforms */}
      {MODULAR_PLATFORMS.map((plat, idx) => {
        const [w, h, d] = plat.size;
        return (
          <group key={idx} position={plat.position}>
            {/* Lower Brushed Silver Tier */}
            <mesh
              geometry={UNIT_BOX}
              scale={[w, h * 0.72, d]}
              position={[0, -h * 0.14, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={plat.isCentral ? '#CBD5E1' : '#E2E8F0'}
                metalness={0.45}
                roughness={0.25}
              />
            </mesh>

            {/* Upper Glossy Acrylic Plate */}
            <mesh
              geometry={UNIT_BOX}
              scale={[w * 0.96, h * 0.28, d * 0.96]}
              position={[0, h * 0.36, 0]}
              receiveShadow
            >
              <meshStandardMaterial
                color="#F8FAFC"
                roughness={0.12}
                metalness={0.1}
              />
              <Edges scale={1} threshold={15} color="#FFFFFF" />
            </mesh>

            {/* Extra Stepped Plinth for Central Optimizer */}
            {plat.isCentral && (
              <>
                <mesh
                  geometry={UNIT_BOX}
                  scale={[w * 0.76, 0.2, d * 0.76]}
                  position={[0, h / 2 + 0.09, 0]}
                >
                  <meshStandardMaterial color="#CBD5E1" metalness={0.55} roughness={0.22} />
                  <Edges scale={1} threshold={15} color="#FFFFFF" />
                </mesh>
                {/* Soft Lavender Under-Glow Ring */}
                <mesh
                  geometry={UNIT_BOX}
                  scale={[w * 0.8, 0.02, d * 0.8]}
                  position={[0, h / 2 + 0.01, 0]}
                >
                  <meshBasicMaterial
                    color="#A78BFA"
                    transparent
                    opacity={0.85}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              </>
            )}

            {/* Subtle Pastel Rim Line */}
            {plat.accentColor && (
              <mesh
                geometry={UNIT_BOX}
                scale={[w * 0.9, 0.01, d * 0.9]}
                position={[0, h / 2 + 0.008, 0]}
              >
                <meshBasicMaterial color={plat.accentColor} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Secondary Ambient Mini-Crystals */}
      {MINI_AMBIENT_CRYSTALS.map((item, idx) => (
        <group key={idx} position={item.pos}>
          <mesh
            geometry={UNIT_BOX}
            scale={[item.size * 1.15, 0.04, item.size * 1.15]}
            position={[0, -item.size / 2 - 0.02, 0]}
          >
            <meshStandardMaterial color="#94A3B8" metalness={0.6} roughness={0.25} />
          </mesh>
          <mesh geometry={UNIT_BOX} scale={[item.size, item.size, item.size]}>
            <meshPhysicalMaterial
              color={item.color}
              transparent
              opacity={0.28}
              roughness={0.05}
              clearcoat={1}
              depthWrite={false}
            />
            <Edges scale={1} color="#FFFFFF" />
          </mesh>
          <mesh geometry={UNIT_OCTA} scale={item.size * 0.35}>
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
});