import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { ModelAnimationState, ModelColorPalette } from '../../types/modelLibrary';
import {
  SHARED_GEOMETRIES,
  createCrystalShellMaterial,
  createAdditivePrismMaterial,
  createCrispWireframeMaterial,
  getColorPaletteById,
  getStateVisualModifiers,
} from './SharedModelMaterials';

interface FractalEntityProps {
  palette?: ModelColorPalette;
  state?: ModelAnimationState;
  wireframeOnly?: boolean;
}

export const FractalEntity: React.FC<FractalEntityProps> = ({
  palette = getColorPaletteById('violet-cyan'),
  state = 'idle',
  wireframeOnly = false,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const primaryStarRef = useRef<THREE.Group>(null);
  const secondaryStarRef = useRef<THREE.Group>(null);
  const shardCloudRef = useRef<THREE.Group>(null);

  const isEvaluating = state === 'evaluating';

  const primaryShellMat = useMemo(
    () => createCrystalShellMaterial(palette.primaryShell, 0.3, palette.secondaryShell, 0.32),
    [palette]
  );
  const secondaryShellMat = useMemo(
    () => createCrystalShellMaterial(palette.secondaryShell, 0.28, palette.primaryShell, 0.3),
    [palette]
  );
  const corePrismMat = useMemo(
    () => createAdditivePrismMaterial(palette.coreGlow, 0.45),
    [palette]
  );
  const accentPrismMat = useMemo(
    () => createAdditivePrismMaterial(palette.secondaryGlow, 0.42),
    [palette]
  );
  const evalPrismMat = useMemo(
    () => createAdditivePrismMaterial('#EC4899', 0.58),
    []
  );
  const wireWhiteMat = useMemo(
    () => createCrispWireframeMaterial(palette.edgeHighlight, 0.72),
    [palette]
  );

  const { primarySpires, diagonalSpires, filamentLinesGeo } = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const cardinalDirs = [
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];

    const pSpires = cardinalDirs.map((dir) => ({
      pos: dir.clone().multiplyScalar(0.85),
      quat: new THREE.Quaternion().setFromUnitVectors(up, dir),
      scale: [0.62, 1.32, 0.62] as [number, number, number],
    }));

    const diagDirs = [
      new THREE.Vector3(1, 1, 0.4).normalize(),
      new THREE.Vector3(-1, 1, 0.4).normalize(),
      new THREE.Vector3(1, -1, 0.4).normalize(),
      new THREE.Vector3(-1, -1, 0.4).normalize(),
      new THREE.Vector3(0.5, 1, -0.9).normalize(),
      new THREE.Vector3(-0.5, 1, -0.9).normalize(),
      new THREE.Vector3(0.5, -1, -0.9).normalize(),
      new THREE.Vector3(-0.5, -1, -0.9).normalize(),
      new THREE.Vector3(1, 0.3, 1).normalize(),
      new THREE.Vector3(-1, 0.3, 1).normalize(),
      new THREE.Vector3(1, -0.3, -1).normalize(),
      new THREE.Vector3(-1, -0.3, -1).normalize(),
    ];

    const dSpires = diagDirs.map((dir, idx) => ({
      pos: dir.clone().multiplyScalar(idx % 2 === 0 ? 0.92 : 0.78),
      quat: new THREE.Quaternion().setFromUnitVectors(up, dir),
      scale: (idx % 2 === 0 ? [0.44, 1.15, 0.44] : [0.36, 0.95, 0.36]) as [
        number,
        number,
        number,
      ],
    }));

    const linePts: THREE.Vector3[] = [];
    const origin = new THREE.Vector3(0, 0, 0);
    diagDirs.forEach((dir) => {
      linePts.push(origin, dir.clone().multiplyScalar(1.75));
    });

    return {
      primarySpires: pSpires,
      diagonalSpires: dSpires,
      filamentLinesGeo: new THREE.BufferGeometry().setFromPoints(linePts),
    };
  }, []);

  const shardCloud = useMemo(
    () => [
      { pos: [-1.75, 0.45, 0.55], rot: [0.4, 0.6, 0.2], scale: [0.22, 0.32, 0.22], alt: true },
      { pos: [1.72, 0.68, 0.42], rot: [-0.5, 0.4, 0.8], scale: [0.2, 0.3, 0.2], alt: true },
      { pos: [-1.35, 1.25, -0.35], rot: [0.3, -0.6, 0.5], scale: [0.16, 0.26, 0.16], alt: false },
      { pos: [1.35, 1.32, -0.4], rot: [-0.3, 0.7, -0.4], scale: [0.18, 0.28, 0.18], alt: false },
      { pos: [-1.58, -0.58, 0.48], rot: [0.6, 0.2, -0.5], scale: [0.18, 0.26, 0.18], alt: true },
      { pos: [1.62, -0.52, 0.52], rot: [-0.4, -0.5, 0.3], scale: [0.19, 0.28, 0.19], alt: false },
      { pos: [0.45, 1.72, 0.3], rot: [0.2, 0.8, 0.4], scale: [0.15, 0.25, 0.15], alt: true },
      { pos: [-0.52, 1.65, 0.35], rot: [-0.4, 0.3, 0.7], scale: [0.14, 0.24, 0.14], alt: false },
      { pos: [0.68, -1.35, 0.65], rot: [0.5, -0.4, 0.2], scale: [0.16, 0.24, 0.16], alt: true },
      { pos: [-0.75, -1.28, 0.62], rot: [-0.6, 0.5, -0.3], scale: [0.15, 0.22, 0.15], alt: false },
      { pos: [-2.05, 0.05, -0.2], rot: [0.2, 0.9, 0.4], scale: [0.13, 0.2, 0.13], alt: true },
      { pos: [2.05, 0.12, -0.25], rot: [-0.3, 0.6, -0.5], scale: [0.14, 0.22, 0.14], alt: true },
      { pos: [-1.15, -0.95, -0.85], rot: [0.7, 0.1, 0.4], scale: [0.15, 0.22, 0.15], alt: false },
      { pos: [1.18, -0.88, -0.82], rot: [-0.5, 0.3, 0.6], scale: [0.15, 0.22, 0.15], alt: true },
    ],
    []
  );

  useFrame((_, delta) => {
    const { speed, scaleBoost } = getStateVisualModifiers(state);
    const time = performance.now() * 0.001;

    if (rootRef.current) {
      rootRef.current.position.y = 0.24 + Math.sin(time * 1.5) * 0.05;
      rootRef.current.scale.setScalar(scaleBoost);
    }
    if (primaryStarRef.current) {
      primaryStarRef.current.rotation.y += delta * 0.2 * speed;
      primaryStarRef.current.rotation.z = Math.sin(time * 0.6) * 0.07;
    }
    if (secondaryStarRef.current) {
      secondaryStarRef.current.rotation.y -= delta * 0.15 * speed;
      secondaryStarRef.current.rotation.x = Math.cos(time * 0.65) * 0.08;
    }
    if (shardCloudRef.current) {
      shardCloudRef.current.rotation.y += delta * 0.26 * speed;
      const breathe = 1 + Math.sin(time * 2.2) * 0.035;
      shardCloudRef.current.scale.setScalar(breathe);
    }
  });

  return (
    <group ref={rootRef} position={[0, 0.24, 0]}>
      <group ref={primaryStarRef}>
        <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={0.58}>
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.34}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {!wireframeOnly && (
          <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={1.08}>
            <primitive
              object={isEvaluating ? evalPrismMat : corePrismMat}
              attach="material"
            />
            <Edges scale={1.0} color={palette.edgeHighlight} />
          </mesh>
        )}

        {primarySpires.map((s, idx) => (
          <group key={`p-spire-${idx}`} position={s.pos} quaternion={s.quat}>
            {!wireframeOnly && (
              <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={s.scale}>
                <primitive object={primaryShellMat} attach="material" />
                <Edges scale={1.0} color={palette.edgeHighlight} />
              </mesh>
            )}
            <mesh
              geometry={SHARED_GEOMETRIES.octahedron}
              scale={[s.scale[0] * 0.55, s.scale[1] * 0.85, s.scale[2] * 0.55]}
            >
              <primitive
                object={isEvaluating ? evalPrismMat : corePrismMat}
                attach="material"
              />
            </mesh>
            <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={s.scale}>
              <primitive object={wireWhiteMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={secondaryStarRef}>
        <lineSegments geometry={filamentLinesGeo}>
          <lineBasicMaterial
            color={palette.coreGlow}
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>

        {diagonalSpires.map((s, idx) => (
          <group key={`d-spire-${idx}`} position={s.pos} quaternion={s.quat}>
            {!wireframeOnly && (
              <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={s.scale}>
                <primitive
                  object={idx % 2 === 0 ? secondaryShellMat : primaryShellMat}
                  attach="material"
                />
                <Edges scale={1.0} color={palette.wireframe} />
              </mesh>
            )}
            <mesh
              geometry={SHARED_GEOMETRIES.octahedron}
              scale={[s.scale[0] * 0.5, s.scale[1] * 0.8, s.scale[2] * 0.5]}
            >
              <primitive
                object={idx % 2 === 0 ? accentPrismMat : corePrismMat}
                attach="material"
              />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={shardCloudRef}>
        {shardCloud.map((frag, idx) => (
          <group
            key={`shard-${idx}`}
            position={frag.pos as [number, number, number]}
            rotation={frag.rot as [number, number, number]}
          >
            {!wireframeOnly && (
              <mesh
                geometry={SHARED_GEOMETRIES.octahedron}
                scale={frag.scale as [number, number, number]}
              >
                <primitive
                  object={frag.alt ? corePrismMat : secondaryShellMat}
                  attach="material"
                />
                <Edges scale={1.02} color={palette.edgeHighlight} />
              </mesh>
            )}
            <mesh
              geometry={SHARED_GEOMETRIES.octahedron}
              scale={[
                frag.scale[0] * 0.45,
                frag.scale[1] * 0.45,
                frag.scale[2] * 0.45,
              ]}
            >
              <meshBasicMaterial
                color="#FFFFFF"
                transparent
                opacity={0.32}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};