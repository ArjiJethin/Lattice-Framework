import React from 'react';

export const SceneLights: React.FC = () => {
  return (
    <>
      {/* Soft main ambient illumination */}
      <ambientLight intensity={0.9} color="#ffffff" />

      {/* Primary directional architectural light */}
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.4}
        color="#f8faff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Cool blue fill from the front-left */}
      <directionalLight position={[-15, 12, 10]} intensity={0.5} color="#5598F7" />

      {/* Subtle violet rim light from the rear */}
      <directionalLight position={[5, 15, -20]} intensity={0.7} color="#8174F5" />

      {/* Central crystal core warm violet point light */}
      <pointLight position={[0, 2.5, 0]} intensity={2.2} distance={12} color="#8174F5" />
    </>
  );
};
