'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import Card3D from './Card3D';
import { CardData } from '@/types/card';


const THROW_POWER = 1.0; // Multiplier for easy tuning

interface InteractiveHand3DProps {
    cards: CardData[];
    onFold?: () => void;
}

const InteractiveHand3D: React.FC<InteractiveHand3DProps> = ({ cards, onFold }) => {
    const { camera, raycaster, mouse } = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [dragPos, setDragPos] = useState(new THREE.Vector3(0, 0.2, 3.0));
    const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));
    const [isFolded, setIsFolded] = useState(false);

    const lastPos = useRef(new THREE.Vector3(0, 0, 0));
    const impulseApplied = useRef(false);
    const groupRef = useRef<THREE.Group>(null);

    // Physics refs for thrown cards
    const thrownCardsRef = useRef<(RapierRigidBody | null)[]>([]);

    const defaultPos = new THREE.Vector3(0, 0.2, 3.0);
    const handSpacing = isDragging ? 0.05 : 1.2; // Stack cards when dragging

    const throwThreshold = 2.6; // Trigger after dragging forward 0.4 units (3.0 -> 2.6)

    useFrame((state, delta) => {
        if (isDragging) {
            const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragPos.y);
            raycaster.setFromCamera(mouse, camera);
            const intersectPos = new THREE.Vector3();
            raycaster.ray.intersectPlane(planeY, intersectPos);

            if (intersectPos) {
                const targetPos = new THREE.Vector3(0, defaultPos.y, intersectPos.z);
                const nextPos = dragPos.clone().lerp(targetPos, 0.3);
                setDragPos(nextPos);

                setVelocity(nextPos.clone().sub(lastPos.current).divideScalar(delta));
                lastPos.current.copy(nextPos);

                // AUTO TRIGGER FOLD when dragged forward
                if (nextPos.z < throwThreshold) {
                    setIsDragging(false);
                    setIsFolded(true);
                    if (onFold) onFold();
                }
            }
        } else if (!isFolded) {
            setDragPos((prev) => prev.clone().lerp(defaultPos, 0.1));
        }

        // Apply impulse once RigidBodies are mounted
        if (isFolded && !impulseApplied.current) {
            const refs = thrownCardsRef.current;
            if (refs.length === cards.length && refs.every(r => !!r)) {
                refs.forEach((ref) => {
                    ref.applyImpulse({
                        x: (Math.random() - 0.5) * 0.02 * THROW_POWER,
                        y: 0.005 * THROW_POWER,
                        z: -1.0 * THROW_POWER // Minimal push scaled by THROW_POWER
                    }, true);
                    ref.applyTorqueImpulse({
                        x: -0.002 * THROW_POWER,
                        y: (Math.random() - 0.5) * 0.005 * THROW_POWER,
                        z: (Math.random() - 0.5) * 0.002 * THROW_POWER
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
                        angularDamping={1.0}
                    >
                        <Card3D rank={card.rank} suit={card.suit} />
                    </RigidBody>
                ))}
            </group>
        );
    }

    return (
        <group
            ref={groupRef}
            position={[dragPos.x, dragPos.y, dragPos.z]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
        >

            {cards.map((card: CardData, index: number) => {
                const xOffset = (index - (cards.length - 1) / 2) * handSpacing;
                return (
                    <Card3D
                        key={card.id}
                        rank={card.rank}
                        suit={card.suit}
                        isFaceDown={isDragging} // USER: 뒷면이 보여야해
                        position={[xOffset, 0, 0]}
                        rotation={isDragging ? [Math.PI / 2, 0, 0] : [-Math.PI / 2.8, 0, 0]}
                    />
                );
            })}

            {/* Invisible grab area */}
            <mesh visible={false}>
                <boxGeometry args={[3, 1.5, 0.1]} />
            </mesh>
        </group>
    );
};

export default InteractiveHand3D;
