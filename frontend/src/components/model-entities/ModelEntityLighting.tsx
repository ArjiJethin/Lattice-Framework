import React from 'react';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';

interface ModelEntityLightingProps {
  primaryColor?: string;
  glowColor?: string;
}

export const ModelEntityLighting: React.FC<ModelEntityLightingProps> = React.memo(({
  primaryColor = '#8174F5',
  glowColor = '#38BDF8',
}) => {
  return (
    <>
      {/* Custom Studio Softbox Environment for Crisp Crystal Facet Reflections */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 4, -0.25, 0]}>
          <Lightformer
            intensity={2.8}
            rotation-x={Math.PI / 2}
            position={[0, 8, -2]}
            scale={[14, 14, 1]}
            color="#FFFFFF"
          />
          <Lightformer
            intensity={2.0}
            rotation-y={Math.PI / 2}
            position={[-9, 3, 2]}
            scale={[12, 6, 1]}
            color="#E0F2FE"
          />
          <Lightformer
            intensity={1.8}
            rotation-y={-Math.PI / 2}
            position={[9, 4, 2]}
            scale={[12, 6, 1]}
            color="#F3E8FF"
          />
          <Lightformer
            intensity={1.6}
            position={[0, 3, 9]}
            scale={[10, 3, 1]}
            color="#FFFFFF"
          />
        </group>
      </Environment>

      {/* High-Key Bright Studio Ambient Illumination */}
      <ambientLight intensity={1.05} color="#F8FAFC" />

      {/* Main Studio Key Light */}
      <directionalLight
        position={[6, 10, 8]}
        intensity={1.45}
        color="#FFFFFF"
      />

      {/* Left Violet/Indigo Rim Fill */}
      <directionalLight
        position={[-7, 5, -4]}
        intensity={0.7}
        color={primaryColor}
      />

      {/* Right Cyan/Aqua Crystalline Rim Light */}
      <directionalLight
        position={[6, -3, 6]}
        intensity={0.45}
        color={glowColor}
      />

      {/* Central Core Point Light (Reduced by 65% from 2.0 to 0.7) */}
      <pointLight
        position={[0, 0.3, 0]}
        intensity={0.7}
        distance={7}
        color={primaryColor}
      />

      {/* Baked Contact Shadow under the Pedestal (frames={1} = 0ms runtime cost) */}
      <ContactShadows
        position={[0, -1.72, 0]}
        frames={1}
        resolution={512}
        opacity={0.32}
        scale={10}
        blur={2.0}
        far={4}
        color="#334155"
      />
    </>
  );
});