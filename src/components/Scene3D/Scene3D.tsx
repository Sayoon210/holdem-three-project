'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Physics, RigidBody } from '@react-three/rapier';
import Table3D from '../Table/Table3D';
import CommunityBoard3D from '../Table/CommunityBoard3D';
import InteractiveHand3D from '../Card/InteractiveHand3D';
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
    const [isDebug, setIsDebug] = React.useState(false); // New Debug State

    // Stable positions for chips
    // 1. spawnPos: High Y (Vertical Drop) but neat X/Z
    // 2. resetWorldPos: Neat stack for Physics reset
    const chipData = React.useMemo(() => {
        return chipPositions.flatMap((stack, groupIndex) => {
            return Array.from({ length: 4 }).map((_, i) => {
                // Neat Stack Position (Local to PlayerUnit)
                const neatLocalX = stack.pos[0];
                const neatLocalY = i * 0.08;
                const neatLocalZ = stack.pos[2];

                // Vertical Drop Spawn: Same X/Z, but Moderate Y (simulating hand drop)
                const spawnY = neatLocalY + 1.5; // Drop from 1.5 units above

                // World Position for Reset (PlayerUnit is at [0, 0, 3.5] parent, 2.2 offset x)
                // PlayerUnit Group: [0, 0, 3.5]
                // Tray Area Group: [2.2, 0, 0] inside PlayerUnit
                // Total World X = 0 + 2.2 + neatLocalX
                // Total World Y = 0 + 0 + neatLocalY
                // Total World Z = 3.5 + 0 + neatLocalZ
                const worldX = 2.2 + neatLocalX;
                const worldY = 0.6 + neatLocalY; // +0.6 base height
                const worldZ = 3.5 + neatLocalZ;

                return {
                    id: `${groupIndex}-${i}`,
                    spawnPos: [neatLocalX, spawnY, neatLocalZ] as [number, number, number],
                    resetWorldPos: [worldX, worldY, worldZ] as [number, number, number]
                };
            });
        });
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
            <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [0, 9, 6], fov: 75 }}
            >
                <OrbitControls
                    enableRotate={false}
                    enablePan={false}
                    enableZoom={true}
                    minDistance={2}
                    maxDistance={30}
                    target={[0, 0, -3]}
                />

                <color attach="background" args={['#050505']} />
                <ambientLight intensity={0.15} />
                <pointLight position={[5, 5, 5]} intensity={20} color="#ffaa88" />

                <Suspense fallback={null}>
                    <Environment preset="night" />
                    <ContactShadows opacity={0.4} scale={15} blur={2.4} far={4.5} resolution={1024} color="#000000" />

                    <Physics debug={isDebug}>
                        {/* TABLE UNIT [z = -3] */}
                        <group position={[0, 0, -3]}>
                            <spotLight
                                position={[0, 10, 0]}
                                angle={0.4}
                                penumbra={0.8}
                                intensity={500}
                                castShadow
                                shadow-mapSize={[1024, 1024]}
                                shadow-bias={-0.001}
                            />
                            <Table3D />
                            <CardDeck3D position={[-1.5, 0.4, 2.0]} />
                            <CommunityBoard3D
                                cards={dealtCards.slice(2, 2 + visibleBoardCount)}
                                deckPosition={DECK_POSITION}
                            />
                        </group>

                        {/* PLAYER UNIT [z = 3.5] */}
                        <group position={[0, 0, 3.5]}>
                            <InteractiveHand3D
                                cards={dealtCards.slice(0, visibleHandCount)}
                                deckPosition={DECK_POSITION}
                                onFold={handleFold}
                            />
                            {/* Player Chip Tray Interaction Area */}
                            <group position={[2.2, 0, 0]}>
                                {chipData.map((data, idx) => (
                                    <InteractiveChip3D
                                        key={data.id}
                                        index={idx} // Pass index for staggered drop
                                        position={data.spawnPos} // Start high
                                        initialWorldPos={data.resetWorldPos} // Reset to neat stack
                                        onBet={handleBet}
                                        resetTrigger={chipResetTrigger}
                                        confirmTrigger={chipConfirmTrigger}
                                    />
                                ))}
                            </group>

                            {/* TRAY BOX BOUNDARY (Debug Visual) */}
                            <group position={[2.2, 0, 0]}>
                                <RigidBody type="fixed" colliders="cuboid" collisionGroups={0x00010007}>
                                    {/* Bottom Floor */}
                                    <mesh position={[0, -0.02, 0]}>
                                        <boxGeometry args={[1.3, 0.05, 1.3]} />
                                        <meshStandardMaterial color={isDebug ? "red" : "black"} transparent opacity={isDebug ? 0.3 : 0.0} />
                                    </mesh>
                                    {/* Walls */}
                                    <mesh position={[-0.65, 0.2, 0]}>
                                        <boxGeometry args={[0.05, 0.4, 1.3]} />
                                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                                    </mesh>
                                    <mesh position={[0.65, 0.2, 0]}>
                                        <boxGeometry args={[0.05, 0.4, 1.3]} />
                                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                                    </mesh>
                                    <mesh position={[0, 0.2, 0.65]}>
                                        <boxGeometry args={[1.25, 0.4, 0.05]} />
                                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                                    </mesh>
                                    <mesh position={[0, 0.2, -0.65]}>
                                        <boxGeometry args={[1.25, 0.4, 0.05]} />
                                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                                    </mesh>
                                </RigidBody>
                            </group>
                        </group>

                        {/* Pot Area Betting Zone */}
                        <RigidBody type="fixed" colliders="cuboid" collisionGroups={0x00010007}>
                            <mesh position={[0, 0.2, -1.5]}>
                                <boxGeometry args={[3.0, 0.6, 0.05]} />
                                <meshStandardMaterial
                                    color={isDebug ? "red" : "white"}
                                    transparent
                                    opacity={isDebug ? 0.3 : 0}
                                />
                            </mesh>
                            <mesh position={[-1.5, 0.2, 0]}>
                                <boxGeometry args={[0.05, 0.6, 3.0]} />
                                <meshStandardMaterial
                                    color={isDebug ? "red" : "white"}
                                    transparent
                                    opacity={isDebug ? 0.3 : 0}
                                />
                            </mesh>
                            <mesh position={[1.5, 0.2, 0]}>
                                <boxGeometry args={[0.05, 0.6, 3.0]} />
                                <meshStandardMaterial
                                    color={isDebug ? "red" : "white"}
                                    transparent
                                    opacity={isDebug ? 0.3 : 0}
                                />
                            </mesh>
                        </RigidBody>

                        {/* Global Physics Floor */}
                        <RigidBody type="fixed" colliders="cuboid" friction={2.0} restitution={0.2} position={[0, -0.01, 0]} collisionGroups={0x00010007}>
                            <mesh visible={isDebug}>
                                <boxGeometry args={[20, 0.05, 20]} />
                                <meshStandardMaterial color="red" transparent opacity={0.3} />
                            </mesh>
                        </RigidBody>
                    </Physics>
                </Suspense>

                {/* Post-processing setup */}
                <EffectComposer>
                    <Bloom intensity={0.5} luminanceThreshold={0.8} mipmapBlur radius={0.6} />
                    <Noise opacity={0.015} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            {/* GAME LOGS & DEBUG */}
            <div style={{
                position: 'absolute',
                top: '40px',
                left: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 1000,
            }}>
                <button
                    onClick={() => setIsDebug(!isDebug)}
                    style={{
                        background: isDebug ? '#ff4444' : 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: '1px solid #666',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                        fontSize: '0.8rem'
                    }}
                >
                    {isDebug ? 'DEBUG: ON' : 'DEBUG: OFF'}
                </button>

                <div style={{
                    width: '320px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    padding: '15px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    zIndex: 1000,
                    scrollbarWidth: 'none'
                }}>
                    {debugLogs.length === 0 ? (
                        <div style={{ color: '#666', fontStyle: 'italic' }}>Waiting for action...</div>
                    ) : (
                        debugLogs.map((log, i) => (
                            <div key={i} style={{
                                borderLeft: '2px solid #D4AF37',
                                paddingLeft: '10px',
                                opacity: 0.7 + (i / debugLogs.length) * 0.3
                            }}>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* UI LAYER */}
            <div style={{
                position: 'absolute',
                bottom: '40px',
                right: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '12px',
                zIndex: 1000
            }}>
                {(gameStage !== 'WAITING' && (potTotal > 0 || playerRoundBet > 0)) && (
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.85)',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: '2px solid #D4AF37',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '4px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <span style={{ color: '#888', fontSize: '0.75rem', fontWeight: 'bold' }}>TOTAL POT</span>
                            <span style={{ color: '#D4AF37', fontSize: '1.8rem', fontWeight: '900' }}>${potTotal.toLocaleString()}</span>
                        </div>
                        {playerRoundBet > 0 && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', borderTop: '1px solid #333', paddingTop: '4px', width: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ color: '#666', fontSize: '0.65rem', fontWeight: 'bold' }}>CURRENT BET</span>
                                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '800' }}>${playerRoundBet.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )}

                {gameStage === 'WAITING' ? (
                    <button
                        onClick={startDealing}
                        style={{
                            background: '#D4AF37',
                            color: '#000',
                            border: 'none',
                            padding: '12px 35px',
                            borderRadius: '4px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            letterSpacing: '0.15em',
                            boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
                            transition: 'all 0.2s ease',
                            textTransform: 'uppercase'
                        }}
                    >
                        START DEALING
                    </button>
                ) : gameStage === 'PLAYING' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleConfirmBet}
                                disabled={playerRoundBet < SIMULATED_MAX_BET}
                                style={{
                                    background: playerRoundBet < SIMULATED_MAX_BET ? '#222' : '#D4AF37',
                                    color: playerRoundBet < SIMULATED_MAX_BET ? '#444' : '#000',
                                    border: playerRoundBet < SIMULATED_MAX_BET ? '1px solid #333' : 'none',
                                    padding: '12px 40px',
                                    borderRadius: '4px',
                                    fontSize: '1.1rem',
                                    fontWeight: '900',
                                    cursor: playerRoundBet < SIMULATED_MAX_BET ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}
                            >
                                {playerRoundBet >= SIMULATED_MAX_BET ? 'RAISE / CALL' : 'CHECK'}
                            </button>
                        </div>
                        {playerRoundBet < SIMULATED_MAX_BET && (
                            <div style={{ color: '#D4AF37', fontSize: '0.8rem', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>
                                NEED ${SIMULATED_MAX_BET - playerRoundBet} MORE TO CALL
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Pre-load assets
useGLTF.preload('/models/rounded_cube/scene.gltf');
useGLTF.preload('/models/pokertable_round/scene.gltf');

export default Scene3D;
