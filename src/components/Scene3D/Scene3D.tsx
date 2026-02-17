'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import Card3D from '../Card/Card3D';
import Table3D from '../Table/Table3D';
import CommunityBoard3D from '../Table/CommunityBoard3D';
import PlayerHand3D from '../Card/PlayerHand3D';
import InteractiveHand3D from '../Card/InteractiveHand3D';
import Chip3D from '../Chip/Chip3D';
import InteractiveChip3D from '../Chip/InteractiveChip3D';
import { CardData } from '@/types/card';

const Scene3D: React.FC = () => {
    const [isFolded, setIsFolded] = React.useState(false);

    // Stabilize chip data so they don't reset on re-renders
    const chipsData = useMemo(() => {
        return [...Array(10)].map((_, i) => ({
            id: `chip-${i}`,
            position: [
                (Math.random() - 0.5) * 0.4,
                0.5 + i * 0.25,
                (Math.random() - 0.5) * 0.4
            ] as [number, number, number],
            rotation: [
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            ] as [number, number, number]
        }));
    }, []);
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

                {/* Noir Lighting Setup - Brightened for visibility */}
                <color attach="background" args={['#000']} />
                <ambientLight intensity={0.6} />
                <spotLight
                    position={[0, 15, 0]}
                    angle={0.6}
                    penumbra={1}
                    intensity={2500}
                    castShadow
                    shadow-bias={-0.0001}
                />

                {/* Dedicated light for player's hand area to remove the dark spot */}
                <pointLight position={[0, 4, 4]} intensity={50} distance={10} />

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

                        {/* Chip Tray (Visual Enclosure) to keep chips organized - Moved closer to user */}
                        <group position={[2.2, 0, 3.5]}>
                            {/* Walls of the tray */}
                            <RigidBody type="fixed" colliders="cuboid">
                                {/* Floor of tray (slightly above table) */}
                                <mesh position={[0, -0.05, 0]}>
                                    <boxGeometry args={[1.2, 0.1, 1.2]} />
                                    <meshStandardMaterial color="#333" transparent opacity={0.3} />
                                </mesh>
                                {/* Left Wall */}
                                <mesh position={[-0.6, 0.4, 0]}>
                                    <boxGeometry args={[0.05, 0.8, 1.2]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                                {/* Right Wall */}
                                <mesh position={[0.6, 0.4, 0]}>
                                    <boxGeometry args={[0.05, 0.8, 1.2]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                                {/* Back Wall (Near table center) */}
                                <mesh position={[0, 0.4, -0.6]}>
                                    <boxGeometry args={[1.2, 0.8, 0.05]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                                {/* Front Wall (Closer to user) */}
                                <mesh position={[0, 0.4, 0.6]}>
                                    <boxGeometry args={[1.2, 0.8, 0.05]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                            </RigidBody>

                            {/* 10 metallic chips dropped into the tray - Stabilized with useMemo */}
                            {chipsData.map((chip, i) => (
                                <InteractiveChip3D
                                    key={chip.id}
                                    position={chip.position}
                                    rotation={chip.rotation}
                                    onBet={() => console.log(`Bet placed with chip ${i}`)}
                                />
                            ))}
                        </group>

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

// Pre-load assets
useGLTF.preload('/models/rounded_cube/scene.gltf');
useGLTF.preload('/models/pokertable_round/scene.gltf');

export default Scene3D;
