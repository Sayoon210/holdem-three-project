'use client';

import React, { useRef, useState } from 'react';
import { RigidBody } from '@react-three/rapier';
import InteractiveHand3D from '../Card/InteractiveHand3D';
import InteractiveChip3D from '../Chip/InteractiveChip3D';
import * as THREE from 'three';

interface PlayerSeat3DProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    cards: any[];
    isTurn: boolean;
    onBet: () => void;
    onFold: () => void;
    resetTrigger: number;
    confirmTrigger: number;
    isDebug: boolean;
    deckPosition: [number, number, number];
    remoteBetTrigger?: number;
    enabled?: boolean;
}

const CHIP_POSITIONS = [
    { pos: [-0.3, 0, -0.45] as [number, number, number] },
    { pos: [0.3, 0, -0.45] as [number, number, number] },
    { pos: [-0.3, 0, 0.45] as [number, number, number] },
    { pos: [0.3, 0, 0.45] as [number, number, number] },
    { pos: [0, 0, 0] as [number, number, number] },
];

const PlayerSeat3D: React.FC<PlayerSeat3DProps> = ({
    position,
    rotation = [0, 0, 0],
    cards,
    isTurn,
    onBet,
    onFold,
    resetTrigger,
    confirmTrigger,
    isDebug,
    deckPosition,
    remoteBetTrigger,
    enabled = true
}) => {
    const chipData = React.useMemo(() => {
        return CHIP_POSITIONS.flatMap((stack, groupIndex) => {
            return Array.from({ length: 4 }).map((_, i) => {
                const neatLocalX = stack.pos[0];
                const neatLocalY = i * 0.08;
                const neatLocalZ = stack.pos[2];
                const spawnY = neatLocalY + 1.2;

                return {
                    id: `${groupIndex}-${i}`,
                    spawnPos: [neatLocalX, spawnY, neatLocalZ] as [number, number, number],
                    trayPos: [neatLocalX, neatLocalY, neatLocalZ] as [number, number, number]
                };
            });
        });
    }, []);

    const trayGroupRef = useRef<THREE.Group>(null);
    const seatGroupRef = useRef<THREE.Group>(null);

    const localThreshold = -1.55; // Always "Front Wall" relative to tray group

    // Logic to pick which chip to throw for remote bet
    const lastRemoteTrigger = useRef(remoteBetTrigger);
    const [targetChipIndex, setTargetChipIndex] = useState(-1);

    React.useEffect(() => {
        if (remoteBetTrigger !== undefined && remoteBetTrigger !== lastRemoteTrigger.current) {
            lastRemoteTrigger.current = remoteBetTrigger;
            // Pick a chip that isn't bet yet (simplified: pick next in sequence)
            setTargetChipIndex((prev: number) => (prev + 1) % chipData.length);
        }
    }, [remoteBetTrigger, chipData.length]);

    return (
        <group position={position} rotation={rotation} ref={seatGroupRef}>
            {/* Hand Area */}
            <InteractiveHand3D
                cards={cards}
                deckPosition={deckPosition}
                onFold={onFold}
                enabled={enabled}
                rotation={rotation}
            />

            {/* Chip Tray Interaction Area */}
            <group position={[2.2, 0, 0]} ref={trayGroupRef}>
                {chipData.map((data, idx) => {
                    return (
                        <InteractiveChip3D
                            key={data.id}
                            index={idx}
                            position={data.spawnPos}
                            trayPos={data.trayPos}
                            onBet={onBet}
                            resetTrigger={resetTrigger}
                            confirmTrigger={confirmTrigger}
                            throwThreshold={localThreshold}
                            enabled={enabled}
                            remoteBetTrigger={targetChipIndex === idx ? remoteBetTrigger : undefined}
                        />
                    );
                })}
            </group>

            {/* TRAY BOX BOUNDARY (Debug Visual) */}
            <group position={[2.2, 0, 0]}>
                <RigidBody type="fixed" colliders="cuboid" collisionGroups={0x00010007}>
                    <mesh position={[0, -0.02, -0.45]}>
                        <boxGeometry args={[1.3, 0.05, 2.2]} />
                        <meshStandardMaterial color={isDebug ? "red" : "black"} transparent opacity={isDebug ? 0.3 : 0.0} />
                    </mesh>
                    <mesh position={[-0.65, 0.2, -0.45]}>
                        <boxGeometry args={[0.05, 0.4, 2.2]} />
                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                    </mesh>
                    <mesh position={[0.65, 0.2, -0.45]}>
                        <boxGeometry args={[0.05, 0.4, 2.2]} />
                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                    </mesh>
                    <mesh position={[0, 0.2, 0.65]}>
                        <boxGeometry args={[1.25, 0.4, 0.05]} />
                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                    </mesh>
                    <mesh position={[0, 0.2, -1.55]}>
                        <boxGeometry args={[1.25, 0.4, 0.05]} />
                        <meshStandardMaterial color={isDebug ? "red" : "white"} transparent opacity={isDebug ? 0.3 : 0.0} />
                    </mesh>
                </RigidBody>
            </group>
        </group>
    );
};

export default PlayerSeat3D;
