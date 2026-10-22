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
  createRibbonRingMaterial,
  getColorPaletteById,
  getStateVisualModifiers,
} from './SharedModelMaterials';

interface OrbitalEntityProps {
  palette?: ModelColorPalette;
  state?: ModelAnimationState;
  wireframeOnly?: boolean;
}

export const OrbitalEntity: React.FC<OrbitalEntityProps> = ({
  palette = getColorPaletteById('violet-cyan'),
  state = 'idle',
  wireframeOnly = false,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const coreGroupRef = useRef<THREE.Group>(null);
  const innerStarRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const ring3Ref = useRef<THREE.Group>(null);
  const ring4Ref = useRef<THREE.Group>(null);

  const isEvaluating = state === 'evaluating';

  const outerShellMat = useMemo(
    () => createCrystalShellMaterial(palette.primaryShell, 0.28, palette.secondaryShell, 0.3),
    [palette]
  );
  const innerPrimaryPrismMat = useMemo(
    () => createAdditivePrismMaterial(palette.coreGlow, 0.42),
    [palette]
  );
  const innerSecondaryPrismMat = useMemo(
    () => createAdditivePrismMaterial(palette.secondaryGlow, 0.38),
    [palette]
  );
  const evaluatingPrismMat = useMemo(
    () => createAdditivePrismMaterial('#F59E0B', 0.55),
    []
  );
  const wireWhiteMat = useMemo(
    () => createCrispWireframeMaterial(palette.edgeHighlight, 0.75),
    [palette]
  );
  const wireTintMat = useMemo(
    () => createCrispWireframeMaterial(palette.wireframe, 0.55),
    [palette]
  );

  const ring1Mat = useMemo(
    () => createRibbonRingMaterial(palette.ringPrimary, 0.8),
    [palette]
  );
  const ring2Mat = useMemo(
    () => createRibbonRingMaterial(palette.ringSecondary, 0.75),
    [palette]
  );
  const ring3Mat = useMemo(
    () => createRibbonRingMaterial(palette.secondaryShell, 0.65),
    [palette]
  );

  const { coreVertices, internalSpokesGeo } = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1.18, 1);
    const posAttr = ico.attributes.position;
    const uniqueMap = new Map<string, THREE.Vector3>();
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const key = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, v);
    }
    const verts = Array.from(uniqueMap.values());
    const spokePts: THREE.Vector3[] = [];
    const origin = new THREE.Vector3(0, 0, 0);
    verts.forEach((v, idx) => {
      if (idx % 2 === 0) spokePts.push(origin, v);
    });
    return {
      coreVertices: verts,
      internalSpokesGeo: new THREE.BufferGeometry().setFromPoints(spokePts),
    };
  }, []);

  const satellites = useMemo(
    () => [
      { ring: 1, angle: 0.35, radius: 1.72, size: 0.19, type: 'cube' },
      { ring: 1, angle: Math.PI + 0.35, radius: 1.72, size: 0.17, type: 'octa' },
      { ring: 2, angle: 1.1, radius: 1.92, size: 0.2, type: 'octa' },
      { ring: 2, angle: Math.PI + 1.1, radius: 1.92, size: 0.18, type: 'cube' },
      { ring: 3, angle: 2.2, radius: 2.08, size: 0.17, type: 'cube' },
      { ring: 3, angle: Math.PI + 2.2, radius: 2.08, size: 0.16, type: 'octa' },
      { ring: 4, angle: 0.8, radius: 1.54, size: 0.14, type: 'octa' },
      { ring: 4, angle: Math.PI + 0.8, radius: 1.54, size: 0.14, type: 'octa' },
    ],
    []
  );

  const microParticles = useMemo(
    () => [
      [-1.95, 1.05, 0.4],
      [1.85, 0.95, -0.5],
      [-1.65, -0.85, 0.6],
      [1.75, -0.75, 0.5],
      [0.3, 1.85, -0.4],
      [-0.4, -1.55, 0.7],
      [1.25, 1.45, 0.6],
      [-1.35, 1.35, -0.6],
    ],
    []
  );

  useFrame((_, delta) => {
    const { speed, scaleBoost } = getStateVisualModifiers(state);
    const time = performance.now() * 0.001;

    if (rootRef.current) {
      rootRef.current.position.y = 0.22 + Math.sin(time * 1.6) * 0.045;
      rootRef.current.scale.setScalar(scaleBoost);
    }
    if (coreGroupRef.current) {
      coreGroupRef.current.rotation.y += delta * 0.22 * speed;
      coreGroupRef.current.rotation.x = Math.sin(time * 0.7) * 0.08;
    }
    if (innerStarRef.current) {
      innerStarRef.current.rotation.y -= delta * 0.38 * speed;
      innerStarRef.current.rotation.z += delta * 0.2 * speed;
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.28 * speed;
    if (ring2Ref.current) ring2Ref.current.rotation.z -= delta * 0.34 * speed;
    if (ring3Ref.current) ring3Ref.current.rotation.z += delta * 0.22 * speed;
    if (ring4Ref.current) ring4Ref.current.rotation.z -= delta * 0.42 * speed;
  });

  const renderSatellite = (size: number, type: string, key: string) => (
    <group key={key}>
      {!wireframeOnly && (
        <mesh
          geometry={type === 'cube' ? SHARED_GEOMETRIES.box : SHARED_GEOMETRIES.octahedron}
          scale={size}
          rotation={[0.5, 0.5, 0.2]}
        >
          <primitive object={outerShellMat} attach="material" />
          <Edges scale={1.02} color={palette.edgeHighlight} />
        </mesh>
      )}
      <mesh
        geometry={SHARED_GEOMETRIES.octahedron}
        scale={size * 0.52}
        rotation={[0.5, 0.5, 0.2]}
      >
        <meshBasicMaterial
          color={palette.coreGlow}
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh geometry={SHARED_GEOMETRIES.sphereLow} scale={size * 0.22}>
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );

  return (
    <group ref={rootRef} position={[0, 0.22, 0]}>
      <group ref={coreGroupRef}>
        <mesh geometry={SHARED_GEOMETRIES.icosahedron} scale={0.46}>
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.34}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh geometry={SHARED_GEOMETRIES.icosahedronDetail1} scale={0.74}>
          <primitive
            object={isEvaluating ? evaluatingPrismMat : innerPrimaryPrismMat}
            attach="material"
          />
        </mesh>

        <group ref={innerStarRef}>
          <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={0.96}>
            <primitive object={innerSecondaryPrismMat} attach="material" />
            <Edges scale={1.0} color={palette.edgeHighlight} />
          </mesh>
          <mesh
            geometry={SHARED_GEOMETRIES.octahedron}
            scale={0.96}
            rotation={[Math.PI / 4, Math.PI / 4, 0]}
          >
            <primitive object={innerPrimaryPrismMat} attach="material" />
            <Edges scale={1.0} color={palette.wireframe} />
          </mesh>
        </group>

        <lineSegments geometry={internalSpokesGeo}>
          <lineBasicMaterial
            color={palette.wireframe}
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>

        {!wireframeOnly && (
          <mesh geometry={SHARED_GEOMETRIES.icosahedronDetail1} scale={1.18}>
            <primitive object={outerShellMat} attach="material" />
          </mesh>
        )}

        <mesh geometry={SHARED_GEOMETRIES.icosahedronDetail1} scale={1.185}>
          <primitive object={wireWhiteMat} attach="material" />
        </mesh>
        <mesh
          geometry={SHARED_GEOMETRIES.icosahedron}
          scale={1.22}
          rotation={[0.2, 0.4, 0]}
        >
          <primitive object={wireTintMat} attach="material" />
        </mesh>

        {coreVertices.map((v, i) => (
          <mesh
            key={i}
            geometry={SHARED_GEOMETRIES.sphereLow}
            scale={0.026}
            position={[v.x, v.y, v.z]}
          >
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.45}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      {/* Ring 1 */}
      <group ref={ring1Ref} rotation={[0.52, 0.25, 0.68]}>
        <mesh>
          <torusGeometry args={[1.72, 0.022, 16, 96]} />
          <primitive object={ring1Mat} attach="material" />
        </mesh>
        <mesh>
          <torusGeometry args={[1.66, 0.007, 8, 96]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} blending={THREE.AdditiveBlending} />
        </mesh>
        {satellites
          .filter((s) => s.ring === 1)
          .map((s, idx) => (
            <group
              key={`r1-${idx}`}
              position={[Math.cos(s.angle) * s.radius, Math.sin(s.angle) * s.radius, 0]}
            >
              {renderSatellite(s.size, s.type, `sat1-${idx}`)}
            </group>
          ))}
      </group>

      {/* Ring 2 */}
      <group ref={ring2Ref} rotation={[-0.58, 0.35, -0.62]}>
        <mesh>
          <torusGeometry args={[1.92, 0.02, 16, 96]} />
          <primitive object={ring2Mat} attach="material" />
        </mesh>
        <mesh>
          <torusGeometry args={[1.98, 0.007, 8, 96]} />
          <meshBasicMaterial color={palette.wireframe} transparent opacity={0.65} blending={THREE.AdditiveBlending} />
        </mesh>
        {satellites
          .filter((s) => s.ring === 2)
          .map((s, idx) => (
            <group
              key={`r2-${idx}`}
              position={[Math.cos(s.angle) * s.radius, Math.sin(s.angle) * s.radius, 0]}
            >
              {renderSatellite(s.size, s.type, `sat2-${idx}`)}
            </group>
          ))}
      </group>

      {/* Ring 3 */}
      <group ref={ring3Ref} rotation={[1.18, -0.18, 0.15]}>
        <mesh>
          <torusGeometry args={[2.08, 0.016, 16, 96]} />
          <primitive object={ring3Mat} attach="material" />
        </mesh>
        {satellites
          .filter((s) => s.ring === 3)
          .map((s, idx) => (
            <group
              key={`r3-${idx}`}
              position={[Math.cos(s.angle) * s.radius, Math.sin(s.angle) * s.radius, 0]}
            >
              {renderSatellite(s.size, s.type, `sat3-${idx}`)}
            </group>
          ))}
      </group>

      {/* Ring 4 */}
      <group ref={ring4Ref} rotation={[0.15, 1.05, -0.35]}>
        <mesh>
          <torusGeometry args={[1.54, 0.012, 12, 80]} />
          <primitive object={ring2Mat} attach="material" />
        </mesh>
        {satellites
          .filter((s) => s.ring === 4)
          .map((s, idx) => (
            <group
              key={`r4-${idx}`}
              position={[Math.cos(s.angle) * s.radius, Math.sin(s.angle) * s.radius, 0]}
            >
              {renderSatellite(s.size, s.type, `sat4-${idx}`)}
            </group>
          ))}
      </group>

      {microParticles.map(([px, py, pz], idx) => (
        <mesh
          key={idx}
          geometry={SHARED_GEOMETRIES.sphereLow}
          scale={idx % 2 === 0 ? 0.032 : 0.022}
          position={[px, py, pz]}
        >
          <meshBasicMaterial
            color={idx % 2 === 0 ? '#FFFFFF' : palette.coreGlow}
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};