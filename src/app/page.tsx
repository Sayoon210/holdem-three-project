'use client';

import dynamic from 'next/dynamic';

// Scene3D uses WebGL and needs to be client-side only
const Scene3D = dynamic(() => import('@/components/Scene3D/Scene3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black text-white">
      Initializing 3D Environment...
    </div>
  )
});

export default function Home() {
  return (
    <main className="w-full h-full">
      <Scene3D />

      {/* 2D HUD Layer */}
      <div className="fixed top-0 left-0 w-full p-8 pointer-events-none">
        <h1 className="text-2xl font-black tracking-tighter text-white opacity-20">
          HOLDEM NOIR 3D
        </h1>
      </div>
    </main>
  );
}
