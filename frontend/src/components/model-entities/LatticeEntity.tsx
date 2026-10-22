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

interface LatticeEntityProps {
  palette?: ModelColorPalette;
  state?: ModelAnimationState;
  wireframeOnly?: boolean;
}

interface LatticeNodeDef {
  pos: [number, number, number];
  size: number;
  tier: 'corner' | 'axial' | 'edge';
}

export const LatticeEntity: React.FC<LatticeEntityProps> = ({
  palette = getColorPaletteById('teal-aqua'),
  state = 'idle',
  wireframeOnly = false,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Group>(null);
  const matrixRef = useRef<THREE.Group>(null);

  const isEvaluating = state === 'evaluating';

  const primaryShellMat = useMemo(
    () => createCrystalShellMaterial(palette.primaryShell, 0.3, palette.secondaryShell, 0.3),
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
    () => createAdditivePrismMaterial('#F59E0B', 0.55),
    []
  );
  const wireWhiteMat = useMemo(
    () => createCrispWireframeMaterial(palette.edgeHighlight, 0.75),
    [palette]
  );

  const { latticeNodes, strutLinesGeo, innerStrutLinesGeo } = useMemo(() => {
    const nodes: LatticeNodeDef[] = [];
    const d = 1.05;
    const f = 1.68;

    for (const x of [-d, d]) {
      for (const y of [-d, d]) {
        for (const z of [-d, d]) {
          nodes.push({ pos: [x, y, z], size: 0.24, tier: 'corner' });
        }
      }
    }

    const axialCoords: Array<[number, number, number]> = [
      [0, f, 0],
      [0, -f, 0],
      [f, 0, 0],
      [-f, 0, 0],
      [0, 0, f],
      [0, 0, -f],
    ];
    axialCoords.forEach((pos) => {
      nodes.push({ pos, size: 0.27, tier: 'axial' });
    });

    const edgeCoords: Array<[number, number, number]> = [
      [-d, -d, 0], [d, -d, 0], [d, d, 0], [-d, d, 0],
      [-d, 0, -d], [d, 0, -d], [d, 0, d], [-d, 0, d],
      [0, -d, -d], [0, d, -d], [0, d, d], [0, -d, d],
    ];
    edgeCoords.forEach((pos) => {
      nodes.push({ pos, size: 0.14, tier: 'edge' });
    });

    const outerPts: THREE.Vector3[] = [];
    const innerPts: THREE.Vector3[] = [];
    const origin = new THREE.Vector3(0, 0, 0);

    nodes.forEach((n) => {
      if (n.tier !== 'edge') {
        innerPts.push(origin, new THREE.Vector3(...n.pos));
      }
    });

    const corners = nodes.filter((n) => n.tier === 'corner');
    for (let i = 0; i < corners.length; i++) {
      for (let j = i + 1; j < corners.length; j++) {
        const vA = new THREE.Vector3(...corners[i].pos);
        const vB = new THREE.Vector3(...corners[j].pos);
        if (Math.abs(vA.distanceTo(vB) - d * 2) < 0.05) {
          outerPts.push(vA, vB);
        }
      }
    }

    axialCoords.forEach(([ax, ay, az]) => {
      const vAxial = new THREE.Vector3(ax, ay, az);
      corners.forEach((c) => {
        const [cx, cy, cz] = c.pos;
        if (
          (ax !== 0 && Math.sign(ax) === Math.sign(cx)) ||
          (ay !== 0 && Math.sign(ay) === Math.sign(cy)) ||
          (az !== 0 && Math.sign(az) === Math.sign(cz))
        ) {
          outerPts.push(vAxial, new THREE.Vector3(cx, cy, cz));
        }
      });
    });

    return {
      latticeNodes: nodes,
      strutLinesGeo: new THREE.BufferGeometry().setFromPoints(outerPts),
      innerStrutLinesGeo: new THREE.BufferGeometry().setFromPoints(innerPts),
    };
  }, []);

  useFrame((_, delta) => {
    const { speed, scaleBoost } = getStateVisualModifiers(state);
    const time = performance.now() * 0.001;

    if (rootRef.current) {
      rootRef.current.position.y = 0.24 + Math.sin(time * 1.5) * 0.045;
      rootRef.current.scale.setScalar(scaleBoost);
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.24 * speed;
      coreRef.current.rotation.x = Math.sin(time * 0.6) * 0.07;
    }
    if (matrixRef.current) {
      matrixRef.current.rotation.y -= delta * 0.14 * speed;
      matrixRef.current.rotation.z = Math.cos(time * 0.5) * 0.04;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0.24, 0]}>
      <group ref={coreRef}>
        <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={0.48}>
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.34}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh geometry={SHARED_GEOMETRIES.octahedron} scale={0.82}>
          <primitive
            object={isEvaluating ? evalPrismMat : accentPrismMat}
            attach="material"
          />
          <Edges scale={1.0} color={palette.edgeHighlight} />
        </mesh>

        {!wireframeOnly && (
          <mesh
            geometry={SHARED_GEOMETRIES.octahedron}
            scale={1.08}
            rotation={[0, Math.PI / 4, 0]}
          >
            <primitive object={primaryShellMat} attach="material" />
            <Edges scale={1.0} color={palette.wireframe} />
          </mesh>
        )}

        <mesh geometry={SHARED_GEOMETRIES.box} scale={0.96}>
          <primitive object={wireWhiteMat} attach="material" />
        </mesh>
      </group>

      <group ref={matrixRef}>
        <lineSegments geometry={strutLinesGeo}>
          <lineBasicMaterial
            color={palette.ringPrimary}
            transparent
            opacity={0.38}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>

        <lineSegments geometry={innerStrutLinesGeo}>
          <lineBasicMaterial
            color={palette.ringSecondary}
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>

        <mesh geometry={SHARED_GEOMETRIES.box} scale={1.36} rotation={[0, Math.PI / 4, 0]}>
          <meshBasicMaterial
            color={palette.coreGlow}
            wireframe
            transparent
            opacity={0.14}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {latticeNodes.map((node, idx) => {
          const isAxial = node.tier === 'axial';
          const isCorner = node.tier === 'corner';

          return (
            <group key={`lat-node-${idx}`} position={node.pos}>
              {!wireframeOnly && (
                <mesh
                  geometry={
                    isCorner ? SHARED_GEOMETRIES.box : SHARED_GEOMETRIES.octahedron
                  }
                  scale={node.size}
                  rotation={isCorner ? [0.4, 0.4, 0] : [0, 0, 0]}
                >
                  <primitive
                    object={
                      isAxial
                        ? primaryShellMat
                        : isCorner
                          ? secondaryShellMat
                          : corePrismMat
                    }
                    attach="material"
                  />
                  <Edges scale={1.02} color={palette.edgeHighlight} />
                </mesh>
              )}

              <mesh
                geometry={SHARED_GEOMETRIES.octahedron}
                scale={node.size * 0.52}
              >
                <primitive
                  object={isAxial ? corePrismMat : accentPrismMat}
                  attach="material"
                />
              </mesh>

              <mesh geometry={SHARED_GEOMETRIES.sphereLow} scale={node.size * 0.22}>
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};