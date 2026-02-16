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

    const TRAY_CENTER = { x: 2.2, z: 3.5 };
    const TRAY_SIZE = 0.5; // Stay well within the 0.6 walls
    const throwThreshold = 2.4;
    const bettingTarget = new THREE.Vector3(0, 0, 0);
    const physicsWait = useRef(-1);

    useFrame((state) => {
        if (isDragging && rigidBodyRef.current) {
            const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.7);
            raycaster.setFromCamera(mouse, camera);
            const intersectPos = new THREE.Vector3();
            raycaster.ray.intersectPlane(planeY, intersectPos);

            if (intersectPos) {
                // CLAMP Target position to tray boundaries while dragging
                const clampedX = THREE.MathUtils.clamp(intersectPos.x, TRAY_CENTER.x - TRAY_SIZE, TRAY_CENTER.x + TRAY_SIZE);
                const clampedZ = THREE.MathUtils.clamp(intersectPos.z, TRAY_CENTER.z - TRAY_SIZE, TRAY_CENTER.z + TRAY_SIZE);

                const targetPos = new THREE.Vector3(clampedX, 0.7, clampedZ);

                rigidBodyRef.current.setTranslation({
                    x: THREE.MathUtils.lerp(rigidBodyRef.current.translation().x, targetPos.x, 0.4),
                    y: 0.7,
                    z: THREE.MathUtils.lerp(rigidBodyRef.current.translation().z, targetPos.z, 0.4)
                }, true);

                // TRIGGER: If mouse moves forward towards center, past the tray wall
                if (intersectPos.z < throwThreshold) {
                    setIsDragging(false);
                    setIsBet(true);

                    // Exit Box: Move slightly forward and center-ward immediately
                    rigidBodyRef.current.setTranslation({
                        x: THREE.MathUtils.lerp(targetPos.x, 0, 0.2),
                        y: 0.75,
                        z: throwThreshold - 0.2 // Definitively out of the box
                    }, true);

                    rigidBodyRef.current.setBodyType(0, true);
                    rigidBodyRef.current.wakeUp();
                    physicsWait.current = 4; // Shorter wait for better response
                    if (onBet) onBet();
                }
            }
        }

        // Apply betting velocity
        if (isBet && physicsWait.current > 0) {
            physicsWait.current--;
            rigidBodyRef.current?.wakeUp();

            if (physicsWait.current === 0 && !impulseApplied.current && rigidBodyRef.current) {
                const currentPos = rigidBodyRef.current.translation();
                const dir = new THREE.Vector3()
                    .copy(bettingTarget)
                    .sub(new THREE.Vector3(currentPos.x, 0, currentPos.z))
                    .normalize();

                // Controlled speed (1/10th feel)
                const speed = 3.5;

                rigidBodyRef.current.setLinvel({
                    x: dir.x * speed,
                    y: 0.2,        // Small lift to clear surface
                    z: dir.z * speed
                }, true);

                rigidBodyRef.current.setAngvel({
                    x: (Math.random() - 0.5) * 2,
                    y: 5.0, // Consistent spin
                    z: (Math.random() - 0.5) * 2
                }, true);

                impulseApplied.current = true;
            }
        }
    });

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        if (isBet) return;
        setIsDragging(true);
        if (rigidBodyRef.current) {
            rigidBodyRef.current.setBodyType(2, true);
            rigidBodyRef.current.wakeUp();
        }
    };

    const handlePointerUp = () => {
        if (isDragging) {
            setIsDragging(false);
            if (rigidBodyRef.current) {
                rigidBodyRef.current.setBodyType(0, true);
                rigidBodyRef.current.wakeUp();
            }
        }
    };

    return (
        <group onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            <RigidBody
                ref={rigidBodyRef}
                position={position}
                rotation={rotation}
                colliders="cuboid"
                restitution={0.2}
                friction={3.0} // Stable friction
                linearDamping={2.0} // Lowered to ensure chips reach the table center
                angularDamping={1.0}
            >
                <ChipModel />
            </RigidBody>
        </group>
    );
};

// Internal chip mesh component (without its own RigidBody)
const ChipModel: React.FC = () => {
    const texture = useTexture('/textures/chips/block_token_texture.png');
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
