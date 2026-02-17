'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Physics, RigidBody } from '@react-three/rapier';
import Card3D from '../Card/Card3D';
import Table3D from '../Table/Table3D';
import CommunityBoard3D from '../Table/CommunityBoard3D';
import PlayerHand3D from '../Card/PlayerHand3D';
import InteractiveHand3D from '../Card/InteractiveHand3D';
import Chip3D from '../Chip/Chip3D';
import InteractiveChip3D from '../Chip/InteractiveChip3D';
import CardDeck3D from '../Card/CardDeck3D';
import { CardData, Rank, Suit } from '@/types/card';

const DECK_POSITION: [number, number, number] = [-1.5, 0.4, -1.0];
const SIMULATED_MAX_BET = 300; // Expected bet to match

// Tray layout positions for chips
const chipPositions = [
    { pos: [-0.4, 0, -0.4] as [number, number, number] },
    { pos: [0.4, 0, -0.4] as [number, number, number] },
    { pos: [-0.4, 0, 0.4] as [number, number, number] },
    { pos: [0.4, 0, 0.4] as [number, number, number] },
    { pos: [0, 0, 0] as [number, number, number] },
];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as Rank[];
const SUITS = ['S', 'H', 'D', 'C'] as Suit[];

const generateDeck = (): CardData[] => {
    const deck: CardData[] = [];
    let id = 0;
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ id: `card-${id++}`, rank, suit, isFaceDown: true });
        }
    }
    return deck;
};

const shuffleDeck = (deck: CardData[]): CardData[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const Scene3D: React.FC = () => {
    const [isFolded, setIsFolded] = React.useState(false);
    const [potTotal, setPotTotal] = React.useState(0);
    const [gameStage, setGameStage] = React.useState<'WAITING' | 'DEALING' | 'PLAYING'>('WAITING');
    const [visibleHandCount, setVisibleHandCount] = React.useState(0);
    const [visibleBoardCount, setVisibleBoardCount] = React.useState(0);

    // Deck & Debug State
    const [deck, setDeck] = React.useState<CardData[]>([]);
    const [dealtCards, setDealtCards] = React.useState<CardData[]>([]);
    const [debugLogs, setDebugLogs] = React.useState<string[]>([]);

    // Betting Flow State
    const [playerRoundBet, setPlayerRoundBet] = React.useState(0);
    const [chipResetTrigger, setChipResetTrigger] = React.useState(0);
    const [chipConfirmTrigger, setChipConfirmTrigger] = React.useState(0);

    // Stable positions for chips to prevent teleporting on re-render
    const stabilizedChips = React.useMemo(() => {
        return chipPositions.map(stack => ({
            ...stack,
            spawnPos: [stack.pos[0], 4 + Math.random() * 2, stack.pos[2]] as [number, number, number]
        }));
    }, []);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleBet = () => {
        const nextBet = playerRoundBet + 100;
        setPotTotal(prev => prev + 100);
        setPlayerRoundBet(nextBet);
        addLog(`Player BET: $100 (Round Total: $${nextBet})`);
    };

    const handleConfirmBet = () => {
        addLog(`Player CONFIRMED: $${playerRoundBet} moved to permanent pot.`);
        setPlayerRoundBet(0); // Reset round tracking but keep in PotTotal
        setChipConfirmTrigger(prev => prev + 1);
    };

    const handleFold = () => {
        addLog(`Player FOLD: Refunding current round bet ($${playerRoundBet}) to tray.`);
        setPotTotal(prev => prev - playerRoundBet);
        setPlayerRoundBet(0);
        setChipResetTrigger(prev => prev + 1); // Only non-locked chips will teleport
        setIsFolded(true);
    };

    const startDealing = async () => {
        if (gameStage !== 'WAITING') return;

        // 1. Prepare Deck
        const newDeck = shuffleDeck(generateDeck());
        setDeck(newDeck);
        setDealtCards([]);
        setDebugLogs([]);
        setIsFolded(false);
        setPlayerRoundBet(0);
        setPotTotal(0);
        addLog("--- GAME START ---");
        addLog(`Shuffled Deck: ${newDeck.map(c => `${c.rank}${c.suit}`).join(', ').substring(0, 50)}...`);

        setGameStage('DEALING');

        // 2. Deal 2 hole cards
        const hand = newDeck.slice(0, 2);
        setDealtCards(prev => [...prev, ...hand]);
        for (let i = 1; i <= 2; i++) {
            await new Promise(r => setTimeout(r, 600));
            setVisibleHandCount(i);
            addLog(`DEAL Hole ${i}: ${hand[i - 1].rank}-${hand[i - 1].suit}`);
        }

        // Delay before flop
        await new Promise(r => setTimeout(r, 800));

        // 3. Deal Community cards (seq)
        const board = newDeck.slice(2, 7);
        setDealtCards(prev => [...prev, ...board]);
        for (let i = 1; i <= 5; i++) {
            await new Promise(r => setTimeout(r, 500));
            setVisibleBoardCount(i);
            const stageName = i <= 3 ? `Flop ${i}` : (i === 4 ? 'Turn' : 'River');
            addLog(`DEAL ${stageName}: ${board[i - 1].rank}-${board[i - 1].suit}`);
        }

        addLog("--- BETTING ROUND START ---");
        setGameStage('PLAYING');
    };

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera
                    makeDefault
                    position={[0, 6, 4]}
                    fov={75}
                />
                <OrbitControls
                    enableRotate={false}
                    enablePan={false}
                    enableZoom={true}
                    minDistance={2}
                    maxDistance={15}
                    target={[0, 0, 0]}
                />

                <color attach="background" args={['#050505']} />

                {/* Moodier, softer ambient light */}
                <ambientLight intensity={0.15} />

                {/* Primary focal light - softer shadows with penumbra */}
                <spotLight
                    position={[0, 10, 0]}
                    angle={0.4}
                    penumbra={0.8} // Softer edges
                    intensity={150} // Slightly dimmed
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-bias={-0.0001}
                />

                {/* Subtle fill light */}
                <pointLight position={[5, 5, 5]} intensity={20} color="#ffaa88" />


                <Suspense fallback={null}>
                    <Physics debug={false}>
                        <Table3D />
                        <CardDeck3D />

                        <InteractiveHand3D
                            cards={dealtCards.slice(0, visibleHandCount)}
                            deckPosition={DECK_POSITION}
                            onFold={handleFold}
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

                            {/* Interactive Chips in the tray area */}
                            {stabilizedChips.map((stack, groupIndex) => (
                                <group key={groupIndex} position={stack.spawnPos}>
                                    {Array.from({ length: 4 }).map((_, i) => {
                                        const relativeY = i * 0.08;
                                        // RELATIVE to [2.2, 0, 3.5] -> must be ABSOLUTE for teleport
                                        const worldX = 2.2 + stack.pos[0];
                                        const worldY = 0.6 + relativeY; // Settled height for refund (no rain)
                                        const worldZ = 3.5 + stack.pos[2];

                                        return (
                                            <InteractiveChip3D
                                                key={`${groupIndex}-${i}`}
                                                position={[0, relativeY, 0]}
                                                initialWorldPos={[worldX, worldY, worldZ]}
                                                onBet={handleBet}
                                                resetTrigger={chipResetTrigger}
                                                confirmTrigger={chipConfirmTrigger}
                                            />
                                        );
                                    })}
                                </group>
                            ))}
                        </group>

                        <CommunityBoard3D
                            cards={dealtCards.slice(2, 2 + visibleBoardCount)}
                            deckPosition={DECK_POSITION}
                        />

                        {/* Betting Zone (Pot Area) - 3-sided invisible walls to contain chips */}
                        <RigidBody type="fixed" colliders="cuboid" collisionGroups={0x00010007}>
                            {/* North Wall (Opposite to player) */}
                            <mesh position={[0, 0.2, -1.5]}>
                                <boxGeometry args={[3.0, 0.6, 0.05]} />
                                <meshStandardMaterial transparent opacity={0} />
                            </mesh>
                            {/* West Wall */}
                            <mesh position={[-1.5, 0.2, 0]}>
                                <boxGeometry args={[0.05, 0.6, 3.0]} />
                                <meshStandardMaterial transparent opacity={0} />
                            </mesh>
                            {/* East Wall */}
                            <mesh position={[1.5, 0.2, 0]}>
                                <boxGeometry args={[0.05, 0.6, 3.0]} />
                                <meshStandardMaterial transparent opacity={0} />
                            </mesh>
                            {/* 남쪽은 플레이어 구역이므로 비워둠 (던질 수 있게) */}
                        </RigidBody>
                    </Physics>
                </Suspense>

                {/* Post-processing setup */}
                <EffectComposer>
                    <Bloom
                        intensity={0.5}
                        luminanceThreshold={0.8}
                        mipmapBlur
                        radius={0.6} // Wider, softer bloom
                    />
                    <Noise opacity={0.015} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            {/* GAME ACTION UI */}
            <div style={{
                position: 'absolute',
                bottom: '100px',
                right: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '20px',
                zIndex: 1000
            }}>
                {gameStage === 'WAITING' ? (
                    <button
                        onClick={startDealing}
                        style={{
                            background: '#D4AF37',
                            color: '#000',
                            border: 'none',
                            padding: '15px 60px',
                            borderRadius: '4px',
                            fontSize: '1.5rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em'
                        }}
                    >
                        Start Game
                    </button>
                ) : gameStage === 'PLAYING' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        {/* Dynamic Betting Button */}
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <button
                                disabled={playerRoundBet < SIMULATED_MAX_BET}
                                onClick={handleConfirmBet}
                                style={{
                                    background: playerRoundBet < SIMULATED_MAX_BET ? '#444' : '#D4AF37',
                                    color: playerRoundBet < SIMULATED_MAX_BET ? '#888' : '#000',
                                    border: 'none',
                                    padding: '15px 80px',
                                    borderRadius: '4px',
                                    fontSize: '1.8rem',
                                    fontWeight: '900',
                                    cursor: playerRoundBet < SIMULATED_MAX_BET ? 'not-allowed' : 'pointer',
                                    boxShadow: playerRoundBet < SIMULATED_MAX_BET ? 'none' : '0 0 20px rgba(212, 175, 55, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {playerRoundBet > SIMULATED_MAX_BET ? 'Raise' : 'Check'}
                            </button>
                        </div>

                        {/* Helper hint for matching bet */}
                        {playerRoundBet < SIMULATED_MAX_BET && (
                            <div style={{ color: '#D4AF37', fontSize: '0.9rem', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>
                                Match ${SIMULATED_MAX_BET - playerRoundBet} to Check
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Debug UI Overlay */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                width: '300px',
                maxHeight: '80vh',
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#00ff00',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                padding: '15px',
                borderRadius: '8px',
                overflowY: 'auto',
                pointerEvents: 'auto',
                zIndex: 2000,
                borderLeft: '4px solid #00ff00',
                boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#fff', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                    DEBUG ENGINE LOGS
                </div>
                {debugLogs.length === 0 && <div style={{ opacity: 0.5 }}>Waiting for game start...</div>}
                {debugLogs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                        {log}
                    </div>
                ))}
            </div>

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
