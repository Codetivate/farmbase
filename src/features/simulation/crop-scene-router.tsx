'use client';

import dynamic from 'next/dynamic';
import type { GrowthState } from './growth-model';
import type { Crop } from '@/types/models';

const EnokiScene = dynamic(() => import('./enoki-scene'), {
  ssr: false,
  loading: () => <SceneLoader />,
});

const NapaScene = dynamic(() => import('./napa-scene'), {
  ssr: false,
  loading: () => <SceneLoader />,
});

const HerbScene = dynamic(() => import('./herb-scene'), {
  ssr: false,
  loading: () => <SceneLoader />,
});

const FruitScene = dynamic(() => import('./fruit-scene'), {
  ssr: false,
  loading: () => <SceneLoader />,
});

function SceneLoader() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center" style={{ background: '#0a0f1a' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-xs text-white/50 font-mono">Loading 3D Engine...</span>
      </div>
    </div>
  );
}

interface CropSceneRouterProps {
  crop: Crop;
  growthState: GrowthState;
}

export default function CropSceneRouter({ crop, growthState }: CropSceneRouterProps) {
  if (crop.category === 'leafy_green') {
    return <NapaScene growthState={growthState} />;
  }

  if (crop.category === 'herb') {
    return <HerbScene growthState={growthState} />;
  }

  if (crop.category === 'fruit' || crop.category === 'vegetable') {
    return <FruitScene growthState={growthState} cropName={crop.name} />;
  }

  return <EnokiScene growthState={growthState} />;
}
