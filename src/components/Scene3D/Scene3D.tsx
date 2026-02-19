'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Physics, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import Table3D from '../Table/Table3D';
import CommunityBoard3D from '../Table/CommunityBoard3D';
import InteractiveHand3D from '../Card/InteractiveHand3D';
import InteractiveChip3D from '../Chip/InteractiveChip3D';
import CardDeck3D from '../Card/CardDeck3D';
import PlayerSeat3D from '../Player/PlayerSeat3D';
import { usePokerEngine } from '../../hooks/usePokerEngine';

const DECK_POSITION: [number, number, number] = [-1.5, 0.4, -1.0];
const SIMULATED_MAX_BET = 300;

const Scene3D: React.FC = () => {
    const {
        isConnected,
        yourSeat,
        gameStage,
        communityCards,
        playersHoleCards,
        potTotal,
        activePlayerId,
        playerRoundBet,
        isFolded,
        debugLogs,
        isDebug,
        chipResetTrigger,
        chipConfirmTrigger,
        remoteBetTriggers,
        setIsDebug,
        handleBet,
        handleCall,
        handleCheck,
        handleRaise,
        handleConfirmBet,
        handleFold,
        requestStart,
        sendAction,
        highestBet
    } = usePokerEngine();

    const tableRef = React.useRef<THREE.Group>(null);

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
                    makeDefault
                />

                {/* DYNAMIC CAMERA CONTROLLER */}
                <CameraController yourSeat={yourSeat} activePlayerId={activePlayerId} tableRef={tableRef} />

                <color attach="background" args={['#050505']} />
                <ambientLight intensity={0.15} />
                <pointLight position={[5, 5, 5]} intensity={20} color="#ffaa88" />

                <Suspense fallback={null}>
                    <Environment preset="night" />
                    <ContactShadows opacity={0.4} scale={15} blur={2.4} far={4.5} resolution={1024} color="#000000" />

                    <Physics debug={isDebug}>
                        <EffectComposer disableNormalPass>
                            <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.9} height={300} intensity={0.5} />
                        </EffectComposer>
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
                            <Table3D ref={tableRef} />
                            <CardDeck3D position={[-1.5, 0.4, 1.0]} />
                            <CommunityBoard3D
                                cards={communityCards}
                                deckPosition={DECK_POSITION}
                            />
                        </group>

                        {/* SEAT 0: South [z = 3.5] */}
                        <PlayerSeat3D
                            position={[0, 0, 3.5]}
                            rotation={[0, 0, 0]}
                            cards={playersHoleCards[0] || []}
                            isTurn={activePlayerId === 0}
                            isLocal={yourSeat === 0}
                            onBet={handleBet}
                            onFold={handleFold}
                            resetTrigger={chipResetTrigger}
                            confirmTrigger={chipConfirmTrigger}
                            remoteBetTrigger={remoteBetTriggers[0]}
                            isDebug={isDebug}
                            deckPosition={DECK_POSITION}
                            enabled={yourSeat === 0 && activePlayerId === 0}
                        />

                        {/* SEAT 1: North [z = -9.5] */}
                        <PlayerSeat3D
                            position={[0, 0, -9.5]}
                            rotation={[0, Math.PI, 0]}
                            cards={playersHoleCards[1] || []}
                            isTurn={activePlayerId === 1}
                            isLocal={yourSeat === 1}
                            onBet={handleBet}
                            onFold={handleFold}
                            resetTrigger={chipResetTrigger}
                            confirmTrigger={chipConfirmTrigger}
                            remoteBetTrigger={remoteBetTriggers[1]}
                            isDebug={isDebug}
                            deckPosition={DECK_POSITION}
                            enabled={yourSeat === 1 && activePlayerId === 1}
                        />

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
                        debugLogs.map((log: string, i: number) => (
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#D4AF37', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {yourSeat === null ? 'CONNECTING...' : `YOUR SEAT: ${yourSeat === 0 ? 'SOUTH' : 'NORTH'}`}
                        </div>
                        {yourSeat === 0 && (
                            <button
                                onClick={requestStart}
                                style={{
                                    background: '#D4AF37',
                                    color: '#000',
                                    border: 'none',
                                    padding: '8px 25px',
                                    borderRadius: '4px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    letterSpacing: '0.15em',
                                    boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'uppercase'
                                }}
                            >
                                START DEALING
                            </button>
                        )}
                        {yourSeat !== 0 && (
                            <div style={{ color: '#666', fontSize: '0.8rem' }}>Waiting for Seat 0 to start...</div>
                        )}
                    </div>
                ) : gameStage === 'PLAYING' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                        <div style={{ color: '#D4AF37', fontSize: '1rem', fontWeight: 'bold' }}>
                            {activePlayerId === yourSeat ? 'YOUR TURN' : `WAITING FOR PLAYER ${activePlayerId + 1}`}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {activePlayerId === yourSeat && (
                                <button
                                    onClick={handleConfirmBet}
                                    disabled={playerRoundBet < highestBet}
                                    style={{
                                        background: isFolded ? '#111' : (playerRoundBet < highestBet ? '#222' : (playerRoundBet > highestBet ? '#D4AF37' : '#444')),
                                        color: playerRoundBet < highestBet ? '#555' : '#fff',
                                        border: playerRoundBet < highestBet ? '1px solid #333' : 'none',
                                        padding: '10px 30px',
                                        borderRadius: '4px',
                                        fontSize: '0.9rem',
                                        fontWeight: '900',
                                        cursor: playerRoundBet < highestBet ? 'not-allowed' : 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        boxShadow: playerRoundBet > highestBet ? '0 0 15px rgba(212, 175, 55, 0.3)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {playerRoundBet > highestBet
                                        ? `RAISE TO $${playerRoundBet}`
                                        : (highestBet > 0
                                            ? (playerRoundBet === highestBet ? 'CALL' : `NEED $${highestBet - playerRoundBet} TO CALL`)
                                            : (playerRoundBet > 0 ? `BET $${playerRoundBet}` : 'CHECK')
                                        )
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Camera Transition Helper
const CameraController: React.FC<{
    yourSeat: number | null;
    activePlayerId: number;
    tableRef: React.RefObject<THREE.Group | null>
}> = ({ yourSeat, activePlayerId, tableRef }) => {
    const { camera } = useThree();

    useFrame((state, delta) => {
        // Target camera positions
        const seat0Pos = new THREE.Vector3(0, 9, 6);
        const seat1Pos = new THREE.Vector3(0, 9, -12);

        // ALWAYS stay at YOUR seat if assigned, otherwise follow turn or default to seat 0
        const seatIndex = yourSeat !== null ? yourSeat : activePlayerId;
        const targetPos = seatIndex === 0 ? seat0Pos : seat1Pos;
        camera.position.lerp(targetPos, 0.05);

        if (tableRef.current) {
            const tableWorldPos = new THREE.Vector3();
            tableRef.current.getWorldPosition(tableWorldPos);
            camera.lookAt(tableWorldPos);
        } else {
            camera.lookAt(0, 0, -3); // Fallback
        }
    });

    return null;
};

// Pre-load assets
useGLTF.preload('/models/rounded_cube/scene.gltf');
useGLTF.preload('/models/pokertable_round/scene.gltf');

export default Scene3D;
