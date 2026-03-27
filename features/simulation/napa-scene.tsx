'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  napaLeafVertexShader,
  napaLeafFragmentShader,
  napaCoreVertexShader,
  napaCoreFragmentShader,
} from './napa-shaders';
import type { GrowthState } from './growth-model';

interface LeafProps {
  angle: number;
  tilt: number;
  height: number;
  width: number;
  isInner: boolean;
  growthState: GrowthState;
}

function CabbageLeaf({ angle, tilt, height, width, isInner, growthState }: LeafProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowthScale: { value: 1 },
      uWiltFactor: { value: 0 },
      uWrapTightness: { value: 0.8 },
      uBaseColor: { value: new THREE.Vector3(0.9, 0.93, 0.82) },
      uTipColor: { value: new THREE.Vector3(0.45, 0.7, 0.35) },
      uIsInner: { value: isInner ? 1.0 : 0.0 },
    }),
    [isInner]
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scale = growthState.height / 40;

    uniforms.uTime.value = t;
    uniforms.uGrowthScale.value = scale;
    uniforms.uWiltFactor.value = growthState.wiltFactor;
    uniforms.uWrapTightness.value = isInner ? 0.9 : 0.5 + scale * 0.3;

    if (isInner) {
      uniforms.uBaseColor.value.set(0.92, 0.94, 0.85);
      uniforms.uTipColor.value.set(0.65, 0.8, 0.5);
    } else {
      uniforms.uBaseColor.value.set(0.85, 0.9, 0.78);
      uniforms.uTipColor.value.set(0.35, 0.65, 0.3);
    }
  });

  return (
    <group rotation={[0, angle, 0]}>
      <mesh ref={meshRef} rotation={[tilt, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[width, height, 12, 24]} />
        <shaderMaterial
          vertexShader={napaLeafVertexShader}
          fragmentShader={napaLeafFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CabbageCore({ growthState }: { growthState: GrowthState }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowthScale: { value: 1 },
      uWiltFactor: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    const scale = growthState.height / 40;
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uGrowthScale.value = scale;
    uniforms.uWiltFactor.value = growthState.wiltFactor;
  });

  return (
    <mesh>
      <sphereGeometry args={[0.35, 16, 16]} />
      <shaderMaterial
        vertexShader={napaCoreVertexShader}
        fragmentShader={napaCoreFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function NapaCabbageHead({ growthState }: { growthState: GrowthState }) {
  const leaves = useMemo(() => {
    const result: {
      angle: number;
      tilt: number;
      height: number;
      width: number;
      isInner: boolean;
    }[] = [];

    for (let i = 0; i < 5; i++) {
      result.push({
        angle: (i / 5) * Math.PI * 2 + 0.2,
        tilt: -0.15,
        height: 2.0,
        width: 0.7,
        isInner: true,
      });
    }

    for (let i = 0; i < 7; i++) {
      result.push({
        angle: (i / 7) * Math.PI * 2,
        tilt: -0.35 - Math.random() * 0.15,
        height: 1.6 + Math.random() * 0.3,
        width: 0.9 + Math.random() * 0.2,
        isInner: false,
      });
    }

    return result;
  }, []);

  return (
    <Float speed={0.6} rotationIntensity={0.03} floatIntensity={0.08}>
      <group position={[0, -0.8, 0]}>
        <CabbageCore growthState={growthState} />
        {leaves.map((leaf, i) => (
          <CabbageLeaf key={i} {...leaf} growthState={growthState} />
        ))}
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.0, 32]} />
          <meshStandardMaterial color="#3d3528" roughness={0.95} metalness={0.0} />
        </mesh>
      </group>
    </Float>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#e0f0d0" />
      <directionalLight position={[3, 5, 2]} intensity={0.9} color="#fff8e8" />
      <pointLight position={[-2, 2, -1]} intensity={0.3} color="#80c060" />
      <pointLight position={[1, 1, 3]} intensity={0.15} color="#60b0a0" />
    </>
  );
}

interface NapaSceneProps {
  growthState: GrowthState;
}

export default function NapaScene({ growthState }: NapaSceneProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0.8, 3.2], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0f1a' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <NapaCabbageHead growthState={growthState} />
          <ContactShadows position={[0, -1.2, 0]} opacity={0.35} scale={4} blur={2} far={4} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
