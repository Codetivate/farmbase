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
  calyxVertexShader,
  calyxFragmentShader,
} from './fruit-shaders';
import type { GrowthState } from './growth-model';

// ═══════════════════════════════════════════════════════════════
// Strawberry Body — Conical shape (inverted cone + sphere blend)
// Reference: Real Tochiotome geometry from strawberry.usd
// ═══════════════════════════════════════════════════════════════
function StrawberryGeometry() {
  const geometry = useMemo(() => {
    // Create a conical strawberry shape using LatheGeometry
    // Real strawberry profile: wide shoulder tapering to a pointed tip
    const points: THREE.Vector2[] = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 = tip (bottom), 1 = shoulder (top)

      // Strawberry radial profile curve
      // Narrow tip → wide belly → slight taper at shoulder
      let radius;
      if (t < 0.15) {
        // Pointed tip
        radius = t * 0.6;
      } else if (t < 0.7) {
        // Belly expansion (widest around 60-70%)
        const bellyT = (t - 0.15) / 0.55;
        radius = 0.09 + bellyT * 0.91 * (1.0 - bellyT * 0.15);
        radius = Math.pow(radius, 0.7); // Rounder profile
      } else {
        // Shoulder taper
        const shoulderT = (t - 0.7) / 0.3;
        const bellyWidth = 0.09 + 0.91 * 0.85;
        radius = Math.pow(bellyWidth, 0.7) * (1.0 - shoulderT * 0.25);
      }

      // Add slight organic irregularity
      const irregularity = 1.0 + Math.sin(t * 7.3) * 0.015 + Math.cos(t * 11.1) * 0.01;
      radius *= irregularity * 0.14; // Scale to reasonable world size

      const y = (t - 0.5) * 0.32; // Center vertically, total height ~0.32

      points.push(new THREE.Vector2(radius, y));
    }

    const lathe = new THREE.LatheGeometry(points, 32);
    lathe.computeVertexNormals();
    return lathe;
  }, []);

  return <primitive object={geometry} attach="geometry" />;
}

function StrawberryBody({
  position,
  scale,
  rotation,
  fruitColor,
  fruitHighlight,
  ripeness,
  growthState,
}: {
  position: [number, number, number];
  scale: number;
  rotation?: [number, number, number];
  fruitColor: [number, number, number];
  fruitHighlight: [number, number, number];
  ripeness: number;
  growthState: GrowthState;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowthScale: { value: 1 },
      uWiltFactor: { value: 0 },
      uFruitColor: { value: new THREE.Vector3(...fruitColor) },
      uFruitHighlight: { value: new THREE.Vector3(...fruitHighlight) },
      uRipeness: { value: ripeness },
    }),
    [fruitColor, fruitHighlight, ripeness]
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
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Strawberry body */}
      <mesh ref={meshRef} rotation={[Math.PI, 0, 0]}>
        <StrawberryGeometry />
        <shaderMaterial
          vertexShader={fruitBodyVertexShader}
          fragmentShader={fruitBodyFragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* Calyx (green sepals on top) */}
      <StrawberryCalyx scale={scale} growthState={growthState} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// Calyx — Green crown of sepals on top of the strawberry
// ═══════════════════════════════════════════════════════════════
function StrawberryCalyx({
  scale,
  growthState,
}: {
  scale: number;
  growthState: GrowthState;
}) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowthScale: { value: 1 },
    }),
    []
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uGrowthScale.value = Math.min(growthState.height / 30, 1.2);
  });

  // 5 sepals radiating from top
  const sepals = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      angle: (i / 5) * Math.PI * 2 + Math.random() * 0.2,
      tilt: -0.3 - Math.random() * 0.15,
      length: 0.06 + Math.random() * 0.02,
      width: 0.035 + Math.random() * 0.01,
    }));
  }, []);

  return (
    <group position={[0, 0.155 * scale, 0]}>
      {/* Central peduncle (tiny stem nub) */}
      <mesh>
        <cylinderGeometry args={[0.008, 0.012, 0.03, 6]} />
        <meshStandardMaterial color="#4a6a28" roughness={0.8} />
      </mesh>

      {/* Sepal leaves */}
      {sepals.map((sepal, i) => (
        <group key={i} rotation={[0, sepal.angle, 0]}>
          <mesh
            position={[sepal.length * 0.5, 0.005, 0]}
            rotation={[0, 0, sepal.tilt]}
          >
            <planeGeometry args={[sepal.length, sepal.width, 4, 4]} />
            <shaderMaterial
              vertexShader={calyxVertexShader}
              fragmentShader={calyxFragmentShader}
              uniforms={uniforms}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// Plant Stem — Runner with realistic strawberry proportions
// ═══════════════════════════════════════════════════════════════
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
      <cylinderGeometry args={[0.025, 0.04, 2.0, 6, 16]} />
      <shaderMaterial
        vertexShader={fruitStemVertexShader}
        fragmentShader={fruitStemFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════
// Trifoliate Leaf — Strawberry-accurate compound leaf
// ═══════════════════════════════════════════════════════════════
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
      {/* Center leaflet (largest) */}
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
      {/* Left leaflet */}
      <mesh
        rotation={[tilt * 0.9, 0.35, -0.1]}
        position={[-width * 0.35, 0, 0.02]}
      >
        <planeGeometry args={[width * 0.7, height * 0.8, 6, 8]} />
        <shaderMaterial
          vertexShader={fruitLeafVertexShader}
          fragmentShader={fruitLeafFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Right leaflet */}
      <mesh
        rotation={[tilt * 0.9, -0.35, 0.1]}
        position={[width * 0.35, 0, 0.02]}
      >
        <planeGeometry args={[width * 0.7, height * 0.8, 6, 8]} />
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

// ═══════════════════════════════════════════════════════════════
// Complete Strawberry Plant — Crown with pendant fruit
// ═══════════════════════════════════════════════════════════════
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

    // Rosette pattern (strawberry grows as a rosette)
    for (let layer = 0; layer < 3; layer++) {
      const count = layer === 0 ? 3 : layer === 1 ? 4 : 3;
      const layerY = 0.15 + layer * 0.40;
      for (let i = 0; i < count; i++) {
        result.push({
          angle: (i / count) * Math.PI * 2 + layer * 0.5 + Math.random() * 0.2,
          tilt: -0.4 - layer * 0.06,
          height: 0.50 + Math.random() * 0.12,
          width: 0.30 + Math.random() * 0.08,
          yOffset: layerY,
          leafIndex: result.length,
        });
      }
    }
    return result;
  }, []);

  // Pendant fruit positions (hanging below foliage like real strawberry)
  const fruits = useMemo(() => {
    return [
      { pos: [0.22, 0.35, 0.15] as [number, number, number], scale: 1.0, rot: [0.1, 0, -0.15] as [number, number, number], ripe: 0.95 },
      { pos: [-0.18, 0.50, -0.12] as [number, number, number], scale: 0.85, rot: [-0.05, 0.3, 0.1] as [number, number, number], ripe: 0.8 },
      { pos: [0.08, 0.70, 0.20] as [number, number, number], scale: 0.7, rot: [0.08, -0.2, 0.05] as [number, number, number], ripe: 0.6 },
      { pos: [-0.25, 0.25, 0.08] as [number, number, number], scale: 0.65, rot: [0, 0.5, -0.1] as [number, number, number], ripe: 0.45 },
      { pos: [0.15, 0.90, -0.18] as [number, number, number], scale: 0.55, rot: [0.15, 0.1, 0.1] as [number, number, number], ripe: 0.3 },
    ];
  }, []);

  // Small white flowers (5-petal)
  const flowers = useMemo(() => {
    if (growthState.height < 12) return [];
    return [
      { pos: [0.30, 0.85, 0.05] as [number, number, number] },
      { pos: [-0.10, 1.05, 0.22] as [number, number, number] },
    ];
  }, [growthState.height]);

  return (
    <group position={offset}>
      <PlantStem growthState={growthState} />
      {leaves.map((leaf, i) => (
        <PlantLeaf key={i} {...leaf} growthState={growthState} />
      ))}
      {fruits.map((f, i) => (
        <StrawberryBody
          key={`fruit-${i}`}
          position={f.pos}
          scale={f.scale}
          rotation={f.rot}
          fruitColor={fruitColor}
          fruitHighlight={fruitHighlight}
          ripeness={f.ripe}
          growthState={growthState}
        />
      ))}
      {/* Tiny white flowers */}
      {flowers.map((fl, i) => (
        <StrawberryFlower key={`fl-${i}`} position={fl.pos} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tiny 5-petal strawberry flower
// ═══════════════════════════════════════════════════════════════
function StrawberryFlower({
  position,
}: {
  position: [number, number, number];
}) {
  const petals = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      angle: (i / 5) * Math.PI * 2,
    }));
  }, []);

  return (
    <group position={position}>
      {/* Yellow center pistil */}
      <mesh>
        <sphereGeometry args={[0.012, 8, 6]} />
        <meshStandardMaterial color="#e8d44d" roughness={0.6} emissive="#e8d44d" emissiveIntensity={0.15} />
      </mesh>
      {/* White petals */}
      {petals.map((p, i) => (
        <group key={i} rotation={[0, p.angle, 0]}>
          <mesh position={[0.02, 0, 0]} rotation={[0, 0, -0.3]}>
            <planeGeometry args={[0.025, 0.018, 2, 2]} />
            <meshStandardMaterial
              color="#f5f0e8"
              roughness={0.4}
              side={THREE.DoubleSide}
              transparent
              opacity={0.92}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// Cluster of 3 plants (like a gutter section)
// ═══════════════════════════════════════════════════════════════
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
        [0.45, 0, 0.18],
        [-0.40, 0, 0.22],
      ] as [number, number, number][],
    []
  );

  return (
    <Float speed={0.5} rotationIntensity={0.02} floatIntensity={0.05}>
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
        {/* Gutter / substrate surface */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.0, 32]} />
          <meshStandardMaterial color="#2a2015" roughness={0.92} metalness={0.0} />
        </mesh>
      </group>
    </Float>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.30} color="#f0e8d0" />
      {/* Main grow light (pink-ish LED) */}
      <directionalLight position={[2, 5, 2]} intensity={0.85} color="#fff2e0" />
      {/* Fill light — cooler */}
      <directionalLight position={[-3, 3, -1]} intensity={0.25} color="#c0d8ff" />
      {/* Warm accent */}
      <pointLight position={[1, 1, 3]} intensity={0.2} color="#f0a060" />
      {/* Subtle LED purple backlight for PFAL feel */}
      <pointLight position={[0, 2, -2]} intensity={0.15} color="#a040e0" />
    </>
  );
}

interface FruitSceneProps {
  growthState: GrowthState;
  cropName?: string;
}

export default function FruitScene({ growthState, cropName }: FruitSceneProps) {
  const isStrawberry =
    cropName?.toLowerCase().includes('strawberry') ||
    cropName?.toLowerCase().includes('สตรอว์เบอร์รี') ||
    cropName?.toLowerCase().includes('tochiotome');

  const isChili = cropName?.toLowerCase().includes('chili');

  // Strawberry-specific colors (Tochiotome — deep vermillion red)
  const fruitColor: [number, number, number] = isStrawberry
    ? [0.78, 0.12, 0.06]
    : isChili
      ? [0.75, 0.15, 0.08]
      : [0.85, 0.22, 0.12];

  const fruitHighlight: [number, number, number] = isStrawberry
    ? [0.95, 0.30, 0.10]
    : isChili
      ? [0.9, 0.25, 0.1]
      : [0.95, 0.35, 0.15];

  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0.5, 3.0], fov: 42 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ background: '#080e18' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <FruitCluster
            growthState={growthState}
            fruitColor={fruitColor}
            fruitHighlight={fruitHighlight}
          />
          <ContactShadows position={[0, -1.05, 0]} opacity={0.4} scale={4} blur={2.5} far={4} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
