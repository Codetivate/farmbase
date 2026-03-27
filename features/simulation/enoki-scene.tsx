'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  enokiVertexShader,
  enokiFragmentShader,
  capVertexShader,
  capFragmentShader,
} from './enoki-shaders';
import type { GrowthState } from './growth-model';

interface EnokiStalkProps {
  position: [number, number, number];
  height: number;
  radius: number;
  growthState: GrowthState;
}

function EnokiStalk({ position, height, radius, growthState }: EnokiStalkProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const capRef = useRef<THREE.Mesh>(null);

  const stalkUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWiltFactor: { value: 0 },
      uGrowthScale: { value: 1 },
      uHealthColor: { value: new THREE.Vector3(0.85, 0.92, 0.78) },
    }),
    []
  );

  const capUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWiltFactor: { value: 0 },
      uGrowthScale: { value: 1 },
      uHealthColor: { value: new THREE.Vector3(0.9, 0.88, 0.75) },
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scale = growthState.height / 14;

    stalkUniforms.uTime.value = t;
    stalkUniforms.uWiltFactor.value = growthState.wiltFactor;
    stalkUniforms.uGrowthScale.value = scale;
    stalkUniforms.uHealthColor.value.set(...growthState.healthColor);

    capUniforms.uTime.value = t;
    capUniforms.uWiltFactor.value = growthState.wiltFactor;
    capUniforms.uGrowthScale.value = scale;
    capUniforms.uHealthColor.value.set(
      growthState.healthColor[0] * 1.05,
      growthState.healthColor[1] * 0.95,
      growthState.healthColor[2] * 0.85
    );
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[radius * 0.6, radius, height, 8, 16]} />
        <shaderMaterial
          vertexShader={enokiVertexShader}
          fragmentShader={enokiFragmentShader}
          uniforms={stalkUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={capRef} position={[0, height * 0.5 + 0.08, 0]}>
        <sphereGeometry args={[radius * 2.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <shaderMaterial
          vertexShader={capVertexShader}
          fragmentShader={capFragmentShader}
          uniforms={capUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

interface EnokiClusterProps {
  growthState: GrowthState;
}

function EnokiCluster({ growthState }: EnokiClusterProps) {
  const stalks = useMemo(() => {
    const positions: { pos: [number, number, number]; h: number; r: number }[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 0.15 + Math.random() * 0.55;
      positions.push({
        pos: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
        h: 1.2 + Math.random() * 0.8,
        r: 0.03 + Math.random() * 0.02,
      });
    }
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.12;
      positions.push({
        pos: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
        h: 1.5 + Math.random() * 0.5,
        r: 0.025 + Math.random() * 0.015,
      });
    }
    return positions;
  }, []);

  return (
    <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.1}>
      <group position={[0, -1, 0]}>
        {stalks.map((s, i) => (
          <EnokiStalk
            key={i}
            position={s.pos}
            height={s.h}
            radius={s.r}
            growthState={growthState}
          />
        ))}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.9, 32]} />
          <meshStandardMaterial
            color="#2a1f14"
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>
      </group>
    </Float>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#a0d0e0" />
      <directionalLight position={[3, 5, 2]} intensity={0.8} color="#fff5e6" />
      <pointLight position={[-2, 3, -1]} intensity={0.4} color="#06d6a0" />
      <pointLight position={[1, 1, 3]} intensity={0.2} color="#00b4d8" />
    </>
  );
}

interface EnokiSceneProps {
  growthState: GrowthState;
}

export default function EnokiScene({ growthState }: EnokiSceneProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0.5, 3.5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0f1a' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <EnokiCluster growthState={growthState} />
          <ContactShadows
            position={[0, -1.05, 0]}
            opacity={0.4}
            scale={4}
            blur={2}
            far={4}
          />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
