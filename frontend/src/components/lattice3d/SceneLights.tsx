import React from 'react';
import { Environment, ContactShadows } from '@react-three/drei';

export const SceneLights: React.FC = React.memo(() => {
  return (
    <>
      {/* Studio environment reflections with low overhead */}
      <Environment preset="city" environmentIntensity={0.5} />

      {/* High-key bright studio ambient light */}
      <ambientLight intensity={1.15} color="#FFFFFF" />

      {/* Main directional light with lightweight 1024 shadow map */}
      <directionalLight
        position={[16, 26, 16]}
        intensity={1.35}
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0003}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* Soft Pastel Fill Lights */}
      <directionalLight position={[-15, 12, 10]} intensity={0.5} color="#93C5FD" />
      <directionalLight position={[6, 14, -16]} intensity={0.6} color="#C4B5FD" />

      {/* Single central point light for the Optimizer core */}
      <pointLight position={[0, 1.8, 0]} intensity={1.8} distance={9} color="#A78BFA" />

      {/* Baked ContactShadows (frames={1} renders ONCE on mount for 0ms runtime lag) */}
      <ContactShadows
        position={[0, -0.44, 0]}
        frames={1}
        resolution={512}
        opacity={0.3}
        scale={24}
        blur={2.0}
        far={5}
        color="#334155"
      />
    </>
  );
});