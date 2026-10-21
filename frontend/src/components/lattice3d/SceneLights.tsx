import React from 'react';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';

export const SceneLights: React.FC = React.memo(() => {
  return (
    <>
      {/* Custom Studio Softbox Environment so the glass slabs and crystals catch crisp diagonal specular reflections */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 4, -0.3, 0]}>
          {/* Main Overhead Studio Softbox */}
          <Lightformer
            intensity={2.8}
            rotation-x={Math.PI / 2}
            position={[0, 8, -2]}
            scale={[16, 16, 1]}
            color="#FFFFFF"
          />
          {/* Left Cool Ice-Blue Rim Softbox */}
          <Lightformer
            intensity={1.8}
            rotation-y={Math.PI / 2}
            position={[-10, 3, 0]}
            scale={[14, 6, 1]}
            color="#E0F2FE"
          />
          {/* Right Soft Lavender Rim Softbox */}
          <Lightformer
            intensity={1.6}
            rotation-y={-Math.PI / 2}
            position={[10, 4, 0]}
            scale={[14, 6, 1]}
            color="#F3E8FF"
          />
          {/* Front Specular Highlight Strip */}
          <Lightformer
            intensity={1.5}
            position={[0, 4, 10]}
            scale={[12, 3, 1]}
            color="#FFFFFF"
          />
        </group>
      </Environment>

      {/* High-Key Architectural Studio Ambient Illumination */}
      <ambientLight intensity={1.05} color="#F8FAFC" />

      {/* Primary High-Angle Key Light */}
      <directionalLight
        position={[14, 24, 16]}
        intensity={1.45}
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0003}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
      />

      {/* Cool Ice-Blue & Violet Rim Lights */}
      <directionalLight position={[-16, 10, 10]} intensity={0.6} color="#93C5FD" />
      <directionalLight position={[6, 12, -16]} intensity={0.7} color="#C4B5FD" />

      {/* Central Optimizer Radiant Core Point Light */}
      <pointLight position={[0, 1.8, 0]} intensity={2.2} distance={10} color="#8B5CF6" />

      {/* Single-Frame Baked Ground Shadows (0ms runtime overhead) */}
      <ContactShadows
        position={[0, -0.44, 0]}
        frames={1}
        resolution={512}
        opacity={0.35}
        scale={24}
        blur={1.8}
        far={5}
        color="#1E293B"
      />
    </>
  );
});