'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Box } from '@react-three/drei';
import * as THREE from 'three';

interface ParametricHouseProps {
  areaM2: number;
}

function GreenhouseArchitecture({ areaM2 }: ParametricHouseProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Parametric dimensional solving:
  // We want width * depth = areaM2. Setting depth = width * 2 (typical row setup).
  // w * 2w = areaM2 => 2w^2 = areaM2 => w = sqrt(areaM2 / 2)
  const width = Math.max(Math.sqrt(areaM2 / 2), 2);
  const depth = width * 2;
  const height = Math.max(width * 0.4, 3); // minimum 3m high
  
  // Subtle animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Foundation Base */}
      <Box args={[width, 0.2, depth]} position={[0, -0.1, 0]}>
         <meshStandardMaterial color="#334155" roughness={0.8} />
      </Box>
      
      {/* Transparent Outer Shell */}
      <Box args={[width, height, depth]} position={[0, height/2, 0]}>
        <meshPhysicalMaterial 
           color="#bae6fd" 
           transparent={true} 
           opacity={0.15} 
           roughness={0.1}
           transmission={0.9}
           thickness={0.5}
           envMapIntensity={2}
        />
      </Box>

      {/* Frame Wireframe lines */}
      <Box args={[width, height, depth]} position={[0, height/2, 0]}>
        <meshBasicMaterial color="#06b6d4" wireframe={true} transparent opacity={0.3} />
      </Box>

      {/* Internal Grow Rows based on width */}
      {Array.from({ length: Math.floor(width / 1.5) }).map((_, i) => {
        const rowWidth = 0.6;
        const spacing = 1.5;
        // Center the rows inside the greenhouse
        const totalRowsWidth = Math.floor(width / spacing) * spacing;
        const startX = -totalRowsWidth / 2 + spacing / 2;
        const xPos = startX + (i * spacing);
        
        if (xPos > width/2 - 0.5 || xPos < -width/2 + 0.5) return null; // keep safety margin
        
        return (
          <Box key={i} args={[rowWidth, 0.5, depth - 2]} position={[xPos, 0.25, 0]}>
             <meshStandardMaterial color="#10b981" roughness={0.9} />
          </Box>
        );
      })}
    </group>
  );
}

export default function ParametricMeshCanvas({ areaM2 }: ParametricHouseProps) {
  return (
    <Canvas camera={{ position: [20, 15, 25], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      
      <GreenhouseArchitecture areaM2={areaM2} />
      
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        maxPolarAngle={Math.PI / 2 - 0.05} // don't go below ground grid
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
      <Grid infiniteGrid fadeDistance={80} cellColor="#1e293b" sectionColor="#334155" />
      <Environment preset="city" />
    </Canvas>
  );
}
