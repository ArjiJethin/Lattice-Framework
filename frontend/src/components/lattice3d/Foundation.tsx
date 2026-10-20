import React from 'react';

interface PlatformDef {
  position: [number, number, number];
  size: [number, number, number];
  accentColor?: string;
}

const MODULAR_PLATFORMS: PlatformDef[] = [
  // Central Optimizer high platform
  { position: [0, 0.45, 0], size: [3.4, 0.9, 3.4], accentColor: '#8174F5' },
  // Upper-Left Candidate A platform
  { position: [-3.4, 0.35, -1.8], size: [2.5, 0.7, 2.5], accentColor: '#5598F7' },
  // Lower-Left Candidate B platform
  { position: [-3.8, 0.2, 1.8], size: [2.5, 0.4, 2.5], accentColor: '#3B82F6' },
  // Lower-Center Candidate C platform
  { position: [1.2, 0.2, 2.4], size: [2.3, 0.4, 2.3], accentColor: '#10B981' },
  // Lower-Right Evaluation Engine platform
  { position: [4.4, 0.35, 1.4], size: [2.4, 0.7, 2.4], accentColor: '#8174F5' },
  // Upper-Right Model Runtime platform
  { position: [3.8, 0.45, -2.2], size: [2.6, 0.9, 2.6], accentColor: '#5598F7' },
  // Intermediate step platforms for structural continuity
  { position: [-1.6, 0.15, -0.8], size: [1.5, 0.3, 1.5] },
  { position: [2.4, 0.15, -0.6], size: [1.6, 0.3, 1.6] },
  { position: [-1.8, 0.15, 1.6], size: [1.4, 0.3, 1.4] },
];

export const Foundation: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* Base Foundation Slab */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[16, 0.3, 15]} />
        <meshPhysicalMaterial
          color="#EEF2F6"
          roughness={0.2}
          metalness={0.05}
          transmission={0.4}
          thickness={0.8}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Outer beveled trim ring */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[15.6, 0.05, 14.6]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Subtle coordinate grid lines overlay */}
      <gridHelper
        args={[14, 28, '#D8E0EC', '#E5ECF6']}
        position={[0, 0.01, 0]}
      />

      {/* Raised Modular Platforms */}
      {MODULAR_PLATFORMS.map((plat, idx) => {
        const [w, h, d] = plat.size;
        return (
          <group key={idx} position={plat.position}>
            {/* Platform body */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshPhysicalMaterial
                color="#FFFFFF"
                roughness={0.15}
                metalness={0.08}
                transmission={0.35}
                thickness={0.5}
                transparent
                opacity={0.94}
                reflectivity={0.6}
              />
            </mesh>

            {/* Platform top surface rim */}
            <mesh position={[0, h / 2 + 0.005, 0]}>
              <boxGeometry args={[w - 0.05, 0.01, d - 0.05]} />
              <meshStandardMaterial
                color="#F8FAFC"
                roughness={0.1}
                metalness={0.05}
              />
            </mesh>

            {/* Glowing corner trim accent on designated platforms */}
            {plat.accentColor && (
              <mesh position={[0, h / 2 + 0.012, 0]}>
                <boxGeometry args={[w - 0.15, 0.006, d - 0.15]} />
                <meshStandardMaterial
                  color={plat.accentColor}
                  emissive={plat.accentColor}
                  emissiveIntensity={0.25}
                  roughness={0.2}
                />
              </mesh>
            )}

            {/* Subtle base shadow/chamfer ring */}
            <mesh position={[0, -h / 2 + 0.02, 0]}>
              <boxGeometry args={[w + 0.08, 0.04, d + 0.08]} />
              <meshStandardMaterial color="#DDE4EE" roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
