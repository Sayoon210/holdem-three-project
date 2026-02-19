'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import Card3D from './Card3D';
import { CardData } from '@/types/card';


const FOLD_IMPULSE_Z = -0.2;
const FOLD_IMPULSE_Y = 0.002;

interface InteractiveHand3DProps {
    cards: CardData[];
    onFold?: () => void;
    deckPosition?: [number, number, number];
}

const InteractiveHand3D: React.FC<InteractiveHand3DProps> = ({ cards, onFold, deckPosition }) => {
    const { camera, raycaster, mouse } = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [dragPos, setDragPos] = useState(new THREE.Vector3(0, 0.7, -0.5));
    const [isFolded, setIsFolded] = useState(false);

    const lastPos = useRef(new THREE.Vector3(0, 0, 0));
    const impulseApplied = useRef(false);
    const groupRef = useRef<THREE.Group>(null);

    // Physics refs for thrown cards
    const thrownCardsRef = useRef<(RapierRigidBody | null)[]>([]);

    // Reuse objects to prevent GC pressure in useFrame
    const tempPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6), []); // Adjusted offset slightly below hand
    const tempIntersect = useMemo(() => new THREE.Vector3(), []);
    const tempTarget = useMemo(() => new THREE.Vector3(), []);

    const defaultPos = new THREE.Vector3(0, 0.7, -0.5);
    const handSpacing = isDragging ? 0.05 : 1.2;

    const throwThreshold = -1.5; // Adjusted z for parent at 3.5

    useFrame((state, delta) => {
        if (isDragging) {
            raycaster.setFromCamera(mouse, camera);
            raycaster.ray.intersectPlane(tempPlane, tempIntersect);

            if (tempIntersect) {
                // IMPORTANT: Convert world intersect point to parent's local space
                // because InteractiveHand3D is now inside a [z = 3.5] PlayerUnit group.
                if (groupRef.current && groupRef.current.parent) {
                    groupRef.current.parent.worldToLocal(tempIntersect);
                }

                tempTarget.set(0, defaultPos.y, tempIntersect.z);
                const nextPos = dragPos.clone().lerp(tempTarget, 0.3);
                setDragPos(nextPos);
                lastPos.current.copy(nextPos);

                // AUTO TRIGGER FOLD 
                if (nextPos.z < throwThreshold) {
                    setIsDragging(false);
                    setIsFolded(true);
                    if (onFold) onFold();
                }
            }
        } else if (!isFolded) {
            setDragPos((prev) => prev.clone().lerp(defaultPos, 0.1));
        }

        // Apply constant impulse when folded
        if (isFolded && !impulseApplied.current) {
            const refs = thrownCardsRef.current;
            if (refs.length === cards.length && refs.every(r => !!r)) {
                refs.forEach((ref) => {
                    ref.applyImpulse({
                        x: (Math.random() - 0.5) * 0.05, // Slightly more scatter
                        y: FOLD_IMPULSE_Y,
                        z: FOLD_IMPULSE_Z
                    }, true);
                    ref.applyTorqueImpulse({
                        x: -0.002,
                        y: (Math.random() - 0.5) * 0.05, // Added Y-axis spin for scattering
                        z: (Math.random() - 0.5) * 0.01
                    }, true);
                });
                impulseApplied.current = true;
            }
        }
    });

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        // Prevent default browser behavior to avoid flickering related to drag-and-drop
        if (e.pointerType === 'mouse') e.target.releasePointerCapture(e.pointerId);
        setIsDragging(true);
        lastPos.current.copy(dragPos);
    };

    const handlePointerUp = (e: any) => {
        setIsDragging(false);
    };

    if (isFolded) {
        return (
            <group>
                {cards.map((card: CardData, index: number) => (
                    <RigidBody
                        key={card.id}
                        ref={(el) => { thrownCardsRef.current[index] = el; }}
                        position={[index * 0.1, dragPos.y + 0.1, dragPos.z]}
                        rotation={[Math.PI / 2, 0, 0]} // Fixed: Flip face-down (Back up)
                        colliders="cuboid"
                        restitution={0.3}
                        friction={4.0} // Increased for a more controlled slide
                        linearDamping={4.0} // Stop faster
                        angularDamping={0.5}
                        collisionGroups={0x00040005}
                    >
                        <Card3D
                            rank={card.rank}
                            suit={card.suit}
                            isFolded={true}
                            animateEnabled={false}
                        />
                    </RigidBody>
                ))}
            </group>
        );
    }

    return (
        <group
            ref={groupRef}
            position={[dragPos.x, dragPos.y, dragPos.z]}
        >

            {cards.map((card: CardData, index: number) => {
                const xOffset = (index - (cards.length - 1) / 2) * handSpacing;

                // Deck is at [-1.5, 0.4, -1.0] World.
                // This group is at [dragPos.x, dragPos.y, dragPos.z] local to PlayerUnit [0, 0, 3.5].
                // World position of this group = [dragPos.x, dragPos.y, 3.5 + dragPos.z]
                // Local offset from this group to deck = world_deck - world_group
                const deckLocalZ = deckPosition ? deckPosition[2] - (3.5 + dragPos.z) : 0;
                const deckLocalX = deckPosition ? deckPosition[0] - dragPos.x : 0;
                const deckLocalY = deckPosition ? deckPosition[1] - dragPos.y : 0;

                return (
                    <Card3D
                        key={card.id}
                        rank={card.rank}
                        suit={card.suit}
                        isFaceDown={isDragging}
                        position={[xOffset, index * 0.01, 0]}
                        initialPosition={[deckLocalX, deckLocalY, deckLocalZ]}
                        rotation={isDragging ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2.8, 0, 0]}
                    />
                );
            })}

            {/* Invisible grab area - Very tight and only listener source */}
            <mesh
                visible={false}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
            >
                <boxGeometry args={[1.5, 0.8, 0.2]} />
            </mesh>
        </group>
    );
};

export default InteractiveHand3D;
