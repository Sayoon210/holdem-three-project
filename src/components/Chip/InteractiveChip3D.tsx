'use client';

import React, { useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import Chip3D from './Chip3D';

interface InteractiveChip3DProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    onBet?: () => void;
}

const InteractiveChip3D: React.FC<InteractiveChip3DProps> = ({ position, rotation = [0, 0, 0], onBet }) => {
    const { camera, raycaster, mouse } = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [isBet, setIsBet] = useState(false);
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const impulseApplied = useRef(false);

    const throwThreshold = 2.0; // Distance from center to trigger betting

    useFrame(() => {
        if (isDragging && rigidBodyRef.current) {
            // Mouse tracking logic (on XZ plane)
            const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
            raycaster.setFromCamera(mouse, camera);
            const intersectPos = new THREE.Vector3();
            raycaster.ray.intersectPlane(planeY, intersectPos);

            if (intersectPos) {
                // Smoothly move the chip toward mouse position while dragging
                const currentPos = rigidBodyRef.current.translation();
                const targetPos = new THREE.Vector3(intersectPos.x, 0.5, intersectPos.z);

                rigidBodyRef.current.setTranslation({
                    x: THREE.MathUtils.lerp(currentPos.x, targetPos.x, 0.2),
                    y: 0.5,
                    z: THREE.MathUtils.lerp(currentPos.z, targetPos.z, 0.2)
                }, true);

                // Check for bet trigger
                const distToCenter = Math.sqrt(targetPos.x ** 2 + targetPos.z ** 2);
                if (distToCenter < throwThreshold) {
                    setIsDragging(false);
                    setIsBet(true);
                    if (onBet) onBet();
                }
            }
        }

        // Apply betting impulse once triggered
        if (isBet && !impulseApplied.current && rigidBodyRef.current) {
            const currentPos = rigidBodyRef.current.translation();
            // Vector pointing toward center
            const dir = new THREE.Vector3(-currentPos.x, 0.1, -currentPos.z).normalize();

            rigidBodyRef.current.applyImpulse({
                x: dir.x * 0.1,
                y: 0.05,
                z: dir.z * 0.1
            }, true);

            rigidBodyRef.current.applyTorqueImpulse({
                x: (Math.random() - 0.5) * 0.005,
                y: (Math.random() - 0.5) * 0.005,
                z: (Math.random() - 0.5) * 0.005
            }, true);

            impulseApplied.current = true;
        }
    });

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        if (isBet) return;
        setIsDragging(true);
        if (rigidBodyRef.current) {
            rigidBodyRef.current.setBodyType(2, true); // KinematicPosition while dragging
        }
    };

    const handlePointerUp = () => {
        if (isDragging) {
            setIsDragging(false);
            if (rigidBodyRef.current) {
                rigidBodyRef.current.setBodyType(0, true); // Dynamic on release
            }
        }
    };

    return (
        <group onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            {/* We pass the physics logic through this wrapper and customize Chip3D as needed */}
            <RigidBody
                ref={rigidBodyRef}
                position={position}
                rotation={rotation}
                colliders="cuboid"
                restitution={0.3}
                friction={0.8}
            >
                <ChipModel />
            </RigidBody>
        </group>
    );
};

// Internal chip mesh component (without its own RigidBody)
const ChipModel: React.FC = () => {
    const texture = useTexture('/textures/chips/block_tocken_texture.png');
    return (
        <mesh castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshStandardMaterial
                map={texture}
                metalness={0.7}
                roughness={0.2}
                envMapIntensity={1.2}
            />
        </mesh>
    );
};

export default InteractiveChip3D;
