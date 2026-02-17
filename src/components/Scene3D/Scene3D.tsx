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
import CardDeck3D from '../Card/CardDeck3D';
import { CardData } from '@/types/card';

const DECK_POSITION: [number, number, number] = [-1.5, 0.4, -1.0];

const Scene3D: React.FC = () => {
    const [isFolded, setIsFolded] = React.useState(false);
    const [potTotal, setPotTotal] = React.useState(0);
    const [gameStage, setGameStage] = React.useState<'WAITING' | 'DEALING' | 'PLAYING'>('WAITING');
    const [visibleHandCount, setVisibleHandCount] = React.useState(0);
    const [visibleBoardCount, setVisibleBoardCount] = React.useState(0);

    const handleBet = () => {
        setPotTotal(prev => prev + 100);
    };

    const startDealing = async () => {
        if (gameStage !== 'WAITING') return;
        setGameStage('DEALING');

        // Deal 2 hole cards
        for (let i = 1; i <= 2; i++) {
            await new Promise(r => setTimeout(r, 600));
            setVisibleHandCount(i);
        }

        // Delay before flop
        await new Promise(r => setTimeout(r, 800));

        // Deal Community cards (seq)
        for (let i = 1; i <= 5; i++) {
            await new Promise(r => setTimeout(r, 500));
            setVisibleBoardCount(i);
        }

        setGameStage('PLAYING');
    };

    // Stabilize chip data so they don't reset on re-renders
    const chipsData = useMemo(() => {
        return [...Array(20)].map((_, i) => ({
            id: `chip-${i}`,
            position: [
                (Math.random() - 0.5) * 0.8, // Wider spread for larger tray
                0.5 + i * 0.25,
                (Math.random() - 0.5) * 0.8
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
        { id: 'b1', rank: '10', suit: 'D', isFaceDown: true },
        { id: 'b2', rank: 'J', suit: 'D', isFaceDown: true },
        { id: 'b3', rank: 'Q', suit: 'D', isFaceDown: true },
        { id: 'b4', rank: '8', suit: 'S', isFaceDown: true },
        { id: 'b5', rank: '2', suit: 'H', isFaceDown: true },
    ];

    const mockHand: CardData[] = [
        { id: 'h1', rank: 'A', suit: 'S' },
        { id: 'h2', rank: 'K', suit: 'H' },
    ];

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
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
                        <CardDeck3D />

                        <InteractiveHand3D
                            cards={mockHand.slice(0, visibleHandCount)}
                            deckPosition={DECK_POSITION}
                            onFold={() => {
                                console.log("FOLDED!");
                                setIsFolded(true);
                            }}
                        />

                        {/* Chip Tray (Visual Enclosure) - Enlarged for 20 chips */}
                        <group position={[2.2, 0, 3.5]}>
                            {/* Walls of the tray */}
                            <RigidBody type="fixed" colliders="cuboid">
                                {/* Floor of tray */}
                                <mesh position={[0, -0.05, 0]}>
                                    <boxGeometry args={[1.8, 0.1, 1.8]} />
                                    <meshStandardMaterial color="#333" transparent opacity={0.3} />
                                </mesh>
                                {/* Left Wall */}
                                <mesh position={[-0.9, 0.4, 0]}>
                                    <boxGeometry args={[0.05, 0.8, 1.8]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                                {/* Right Wall */}
                                <mesh position={[0.9, 0.4, 0]}>
                                    <boxGeometry args={[0.05, 0.8, 1.8]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                                {/* Back Wall */}
                                <mesh position={[0, 0.4, -0.9]}>
                                    <boxGeometry args={[1.8, 0.8, 0.05]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                                {/* Front Wall */}
                                <mesh position={[0, 0.4, 0.9]}>
                                    <boxGeometry args={[1.8, 0.8, 0.05]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.2} />
                                </mesh>
                            </RigidBody>

                            {/* 10 metallic chips dropped into the tray - Stabilized with useMemo */}
                            {chipsData.map((chip, i) => (
                                <InteractiveChip3D
                                    key={chip.id}
                                    position={chip.position}
                                    rotation={chip.rotation}
                                    onBet={handleBet}
                                />
                            ))}
                        </group>

                        <CommunityBoard3D
                            cards={mockBoard.slice(0, visibleBoardCount)}
                            deckPosition={DECK_POSITION}
                        />

                        {/* Betting Zone (Pot Area) - 3-sided invisible walls to contain chips */}
                        <RigidBody type="fixed" colliders="cuboid">
                            {/* North Wall (Opposite to player) */}
                            <mesh position={[0, 0.2, -1.5]}>
                                <boxGeometry args={[3.0, 0.6, 0.05]} />
                                <meshStandardMaterial transparent opacity={0.0} />
                            </mesh>
                            {/* West Wall */}
                            <mesh position={[-1.5, 0.2, 0]}>
                                <boxGeometry args={[0.05, 0.6, 3.0]} />
                                <meshStandardMaterial transparent opacity={0.0} />
                            </mesh>
                            {/* East Wall */}
                            <mesh position={[1.5, 0.2, 0]}>
                                <boxGeometry args={[0.05, 0.6, 3.0]} />
                                <meshStandardMaterial transparent opacity={0.0} />
                            </mesh>
                            {/* 남쪽은 플레이어 구역이므로 비워둠 (던질 수 있게) */}
                        </RigidBody>
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

            {/* START GAME Button */}
            {gameStage === 'WAITING' && (
                <button
                    onClick={startDealing}
                    style={{
                        position: 'absolute',
                        bottom: '100px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#D4AF37',
                        color: '#000',
                        border: 'none',
                        padding: '15px 60px',
                        borderRadius: '4px',
                        fontSize: '1.5rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
                        zIndex: 1000,
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em'
                    }}
                >
                    Start Game
                </button>
            )}

            {/* POT Counter UI Overlay - Enhanced Visibility */}
            <div style={{
                position: 'absolute',
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.85)',
                padding: '15px 50px',
                borderRadius: '12px',
                border: '3px solid #D4AF37',
                color: '#D4AF37',
                fontSize: '2.5rem',
                fontWeight: '900',
                fontFamily: '"Outfit", "Inter", sans-serif',
                pointerEvents: 'none',
                textShadow: '0 0 15px rgba(212, 175, 55, 0.8)',
                boxShadow: '0 0 30px rgba(0, 0, 0, 0.7), inset 0 0 10px rgba(212, 175, 55, 0.2)',
                zIndex: 1000,
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <span style={{ fontSize: '1.2rem', opacity: 0.7 }}>TOTAL POT</span>
                <span>${potTotal.toLocaleString()}</span>
            </div>
        </div>
    );
};

// Pre-load assets
useGLTF.preload('/models/rounded_cube/scene.gltf');
useGLTF.preload('/models/pokertable_round/scene.gltf');

export default Scene3D;
