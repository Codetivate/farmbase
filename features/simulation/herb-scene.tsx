'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  herbStemVertexShader,
  herbStemFragmentShader,
  herbLeafVertexShader,
  herbLeafFragmentShader,
} from './herb-shaders';
import type { GrowthState } from './growth-model';

interface HerbLeafProps {
  angle: number;
  tilt: number;
  height: number;
  width: number;
  yOffset: number;
  leafIndex: number;
  growthState: GrowthState;
}

function HerbLeaf({ angle, tilt, height, width, yOffset, leafIndex, growthState }: HerbLeafProps) {
  const meshRef = useRef<THREE.Mesh>(null);

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
      <mesh ref={meshRef} rotation={[tilt, 0, 0]}>
        <planeGeometry args={[width, height, 8, 16]} />
        <shaderMaterial
          vertexShader={herbLeafVertexShader}
          fragmentShader={herbLeafFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function HerbStem({ growthState }: { growthState: GrowthState }) {
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
      <cylinderGeometry args={[0.04, 0.06, 1.8, 6, 12]} />
      <shaderMaterial
        vertexShader={herbStemVertexShader}
        fragmentShader={herbStemFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function HerbPlant({ growthState, offset }: { growthState: GrowthState; offset: [number, number, number] }) {
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
      const leafCount = layer === 0 ? 4 : layer === 1 ? 5 : 3;
      const layerY = 0.3 + layer * 0.4;
      for (let i = 0; i < leafCount; i++) {
        const angleOffset = layer * 0.4;
        result.push({
          angle: (i / leafCount) * Math.PI * 2 + angleOffset,
          tilt: -0.3 - layer * 0.1 + Math.random() * 0.1,
          height: 0.5 + Math.random() * 0.2 - layer * 0.05,
          width: 0.28 + Math.random() * 0.08,
          yOffset: layerY,
          leafIndex: result.length,
        });
      }
    }
    return result;
  }, []);

  return (
    <group position={offset}>
      <HerbStem growthState={growthState} />
      {leaves.map((leaf, i) => (
        <HerbLeaf key={i} {...leaf} growthState={growthState} />
      ))}
    </group>
  );
}

function HerbCluster({ growthState }: { growthState: GrowthState }) {
  const plants = useMemo(() => {
    const positions: [number, number, number][] = [
      [0, 0, 0],
      [0.35, 0, 0.2],
      [-0.3, 0, 0.25],
      [0.15, 0, -0.3],
      [-0.2, 0, -0.2],
    ];
    return positions;
  }, []);

  return (
    <Float speed={0.7} rotationIntensity={0.04} floatIntensity={0.08}>
      <group position={[0, -0.9, 0]}>
        {plants.map((pos, i) => (
          <HerbPlant key={i} growthState={growthState} offset={pos} />
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
      <ambientLight intensity={0.35} color="#d0e8c0" />
      <directionalLight position={[3, 5, 2]} intensity={0.85} color="#fff8e0" />
      <pointLight position={[-2, 3, -1]} intensity={0.3} color="#60b060" />
      <pointLight position={[1, 1, 3]} intensity={0.2} color="#40a080" />
    </>
  );
}

interface HerbSceneProps {
  growthState: GrowthState;
}

export default function HerbScene({ growthState }: HerbSceneProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0.8, 3.0], fov: 44 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0f1a' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <HerbCluster growthState={growthState} />
          <ContactShadows position={[0, -0.95, 0]} opacity={0.35} scale={4} blur={2} far={4} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
