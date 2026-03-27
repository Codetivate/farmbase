'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  fruitStemVertexShader,
  fruitStemFragmentShader,
  fruitLeafVertexShader,
  fruitLeafFragmentShader,
  fruitBodyVertexShader,
  fruitBodyFragmentShader,
} from './fruit-shaders';
import type { GrowthState } from './growth-model';

function FruitBody({
  position,
  scale,
  fruitColor,
  fruitHighlight,
  growthState,
}: {
  position: [number, number, number];
  scale: number;
  fruitColor: [number, number, number];
  fruitHighlight: [number, number, number];
  growthState: GrowthState;
}) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowthScale: { value: 1 },
      uWiltFactor: { value: 0 },
      uFruitColor: { value: new THREE.Vector3(...fruitColor) },
      uFruitHighlight: { value: new THREE.Vector3(...fruitHighlight) },
    }),
    [fruitColor, fruitHighlight]
  );

  useFrame((state) => {
    const s = growthState.height / 30;
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uGrowthScale.value = Math.min(s, 1.2);
    uniforms.uWiltFactor.value = growthState.wiltFactor;
  });

  const fruitVisible = growthState.height > 8;

  if (!fruitVisible) return null;

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.15 * scale, 16, 12]} />
      <shaderMaterial
        vertexShader={fruitBodyVertexShader}
        fragmentShader={fruitBodyFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function PlantStem({ growthState }: { growthState: GrowthState }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowthScale: { value: 1 },
      uWiltFactor: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    const scale = growthState.height / 20;
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uGrowthScale.value = scale;
    uniforms.uWiltFactor.value = growthState.wiltFactor;
  });

  return (
    <mesh>
      <cylinderGeometry args={[0.035, 0.05, 2.2, 6, 16]} />
      <shaderMaterial
        vertexShader={fruitStemVertexShader}
        fragmentShader={fruitStemFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function PlantLeaf({
  angle,
  tilt,
  height,
  width,
  yOffset,
  leafIndex,
  growthState,
}: {
  angle: number;
  tilt: number;
  height: number;
  width: number;
  yOffset: number;
  leafIndex: number;
  growthState: GrowthState;
}) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowthScale: { value: 1 },
      uWiltFactor: { value: 0 },
      uLeafIndex: { value: leafIndex },
    }),
    [leafIndex]
  );

  useFrame((state) => {
    const scale = growthState.height / 20;
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uGrowthScale.value = scale;
    uniforms.uWiltFactor.value = growthState.wiltFactor;
  });

  return (
    <group rotation={[0, angle, 0]} position={[0, yOffset, 0]}>
      <mesh rotation={[tilt, 0, 0]}>
        <planeGeometry args={[width, height, 8, 12]} />
        <shaderMaterial
          vertexShader={fruitLeafVertexShader}
          fragmentShader={fruitLeafFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function FruitPlant({
  growthState,
  offset,
  fruitColor,
  fruitHighlight,
}: {
  growthState: GrowthState;
  offset: [number, number, number];
  fruitColor: [number, number, number];
  fruitHighlight: [number, number, number];
}) {
  const leaves = useMemo(() => {
    const result: {
      angle: number;
      tilt: number;
      height: number;
      width: number;
      yOffset: number;
      leafIndex: number;
    }[] = [];

    for (let layer = 0; layer < 3; layer++) {
      const count = layer === 0 ? 3 : layer === 1 ? 4 : 3;
      const layerY = 0.2 + layer * 0.45;
      for (let i = 0; i < count; i++) {
        result.push({
          angle: (i / count) * Math.PI * 2 + layer * 0.5,
          tilt: -0.35 - layer * 0.08,
          height: 0.55 + Math.random() * 0.15,
          width: 0.35 + Math.random() * 0.1,
          yOffset: layerY,
          leafIndex: result.length,
        });
      }
    }
    return result;
  }, []);

  const fruits = useMemo(() => {
    return [
      { pos: [0.18, 0.6, 0.12] as [number, number, number], scale: 1.0 },
      { pos: [-0.15, 0.8, -0.1] as [number, number, number], scale: 0.85 },
      { pos: [0.05, 1.0, 0.15] as [number, number, number], scale: 0.7 },
    ];
  }, []);

  return (
    <group position={offset}>
      <PlantStem growthState={growthState} />
      {leaves.map((leaf, i) => (
        <PlantLeaf key={i} {...leaf} growthState={growthState} />
      ))}
      {fruits.map((f, i) => (
        <FruitBody
          key={i}
          position={f.pos}
          scale={f.scale}
          fruitColor={fruitColor}
          fruitHighlight={fruitHighlight}
          growthState={growthState}
        />
      ))}
    </group>
  );
}

function FruitCluster({
  growthState,
  fruitColor,
  fruitHighlight,
}: {
  growthState: GrowthState;
  fruitColor: [number, number, number];
  fruitHighlight: [number, number, number];
}) {
  const plants = useMemo(
    () =>
      [
        [0, 0, 0],
        [0.4, 0, 0.15],
        [-0.35, 0, 0.2],
      ] as [number, number, number][],
    []
  );

  return (
    <Float speed={0.6} rotationIntensity={0.03} floatIntensity={0.07}>
      <group position={[0, -1, 0]}>
        {plants.map((pos, i) => (
          <FruitPlant
            key={i}
            growthState={growthState}
            offset={pos}
            fruitColor={fruitColor}
            fruitHighlight={fruitHighlight}
          />
        ))}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.0, 32]} />
          <meshStandardMaterial color="#2e2518" roughness={0.95} metalness={0.0} />
        </mesh>
      </group>
    </Float>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#f0e8d0" />
      <directionalLight position={[3, 5, 2]} intensity={0.9} color="#fff5e0" />
      <pointLight position={[-2, 3, -1]} intensity={0.3} color="#e08040" />
      <pointLight position={[1, 1, 3]} intensity={0.2} color="#60a080" />
    </>
  );
}

interface FruitSceneProps {
  growthState: GrowthState;
  cropName?: string;
}

export default function FruitScene({ growthState, cropName }: FruitSceneProps) {
  const isChili = cropName?.toLowerCase().includes('chili');

  const fruitColor: [number, number, number] = isChili
    ? [0.75, 0.15, 0.08]
    : [0.85, 0.22, 0.12];

  const fruitHighlight: [number, number, number] = isChili
    ? [0.9, 0.25, 0.1]
    : [0.95, 0.35, 0.15];

  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0.6, 3.2], fov: 44 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0f1a' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <FruitCluster
            growthState={growthState}
            fruitColor={fruitColor}
            fruitHighlight={fruitHighlight}
          />
          <ContactShadows position={[0, -1.05, 0]} opacity={0.35} scale={4} blur={2} far={4} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
