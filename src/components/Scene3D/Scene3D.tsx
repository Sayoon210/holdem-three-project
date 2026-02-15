'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import Card3D from '../Card/Card3D';
import Table3D from '../Table/Table3D';
import CommunityBoard3D from '../Table/CommunityBoard3D';
import PlayerHand3D from '../Card/PlayerHand3D';
import InteractiveHand3D from '../Card/InteractiveHand3D';
import { CardData } from '@/types/card';

const Scene3D: React.FC = () => {
    const [isFolded, setIsFolded] = React.useState(false);
    // Mock Data for System Verification
    const mockBoard: CardData[] = [
        { id: 'c1', rank: 'J', suit: 'D' },
        { id: 'c2', rank: '10', suit: 'C' },
        { id: 'c3', rank: '2', suit: 'S' },
        { id: 'c4', rank: 'A', suit: 'H' },
        { id: 'c5', rank: 'Q', suit: 'S' },
    ];

    const mockHand: CardData[] = [
        { id: 'h1', rank: 'A', suit: 'S' },
        { id: 'h2', rank: 'K', suit: 'H' },
    ];

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[0, 6, 4]} fov={75} />
                <OrbitControls
                    enableRotate={false}
                    enablePan={false}
                    enableZoom={true}
                    minDistance={2}
                    maxDistance={15}
                    target={[0, 0, 0]} // Center of the table
                />

                {/* Noir Lighting Setup */}
                <color attach="background" args={['#000']} />
                <ambientLight intensity={0.2} />
                <spotLight
                    position={[0, 15, 0]}
                    angle={0.4}
                    penumbra={1}
                    intensity={1000}
                    castShadow
                    shadow-bias={-0.0001}
                />
                <rectAreaLight
                    width={10}
                    height={10}
                    intensity={2}
                    position={[0, 10, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                />

                <Suspense fallback={null}>
                    <Physics debug={false}>
                        <Table3D />

                        <InteractiveHand3D
                            cards={mockHand}
                            onFold={() => {
                                console.log("FOLDED!");
                                setIsFolded(true);
                            }}
                        />
                        <CommunityBoard3D cards={mockBoard} />
                    </Physics>

                    <ContactShadows
                        opacity={0.7}
                        scale={15}
                        blur={2}
                        far={10}
                        resolution={256}
                        color="#000000"
                    />
                    <Environment preset="night" />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default Scene3D;
