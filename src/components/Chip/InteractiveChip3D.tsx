'use client';

import React, { useState, useRef } from 'react';
import { useFrame, useThree, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface InteractiveChip3DProps {
    position: [number, number, number];
    initialWorldPos?: [number, number, number]; // Absolute tray position
    rotation?: [number, number, number];
    onBet?: () => void;
    resetTrigger?: number; // Refund back to tray
    confirmTrigger?: number; // Lock into pot (no refund)
}

const InteractiveChip3D: React.FC<InteractiveChip3DProps> = ({ position, initialWorldPos, rotation = [0, 0, 0], onBet, resetTrigger, confirmTrigger }) => {
    const { camera, raycaster, mouse } = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [isBet, setIsBet] = useState(false);
    const [isLocked, setIsLocked] = useState(false); // New: locked chips stay in pot on fold
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const impulseApplied = useRef(false);

    const TRAY_CENTER = { x: 2.2, z: 3.5 };
    const TRAY_SIZE = 0.8;
    const throwThreshold = 2.4;
    const bettingTarget = new THREE.Vector3(0, 0, 0);
    const physicsWait = useRef(-1);
    const lastResetTrigger = useRef(resetTrigger);
    const lastConfirmTrigger = useRef(confirmTrigger);

    useFrame((state) => {
        // CONFIRM/LOCK LOGIC (Commit to Pot)
        if (confirmTrigger !== undefined && confirmTrigger !== lastConfirmTrigger.current) {
            lastConfirmTrigger.current = confirmTrigger;
            if (isBet) setIsLocked(true); // Once locked, it won't refund
            return;
        }

        // RESET/REFUND LOGIC (Fold)
        if (resetTrigger !== undefined && resetTrigger !== lastResetTrigger.current) {
            lastResetTrigger.current = resetTrigger;

            // ONLY REFUND IF IT WAS ACTUALLY BET AND NOT LOCKED
            if (isBet && !isLocked) {
                setIsBet(false);
                setIsDragging(false);
                impulseApplied.current = false;
                physicsWait.current = -1;

                if (rigidBodyRef.current) {
                    const targetTeleport = initialWorldPos || position;
                    rigidBodyRef.current.setTranslation({ x: targetTeleport[0], y: targetTeleport[1], z: targetTeleport[2] }, true);
                    rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
                    rigidBodyRef.current.setBodyType(2, true);
                    setTimeout(() => rigidBodyRef.current?.setBodyType(0, true), 50);
                }
            }
            return;
        }

        if (isDragging && rigidBodyRef.current) {
            const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.7);
            raycaster.setFromCamera(mouse, camera);
            const intersectPos = new THREE.Vector3();
            raycaster.ray.intersectPlane(planeY, intersectPos);

            if (intersectPos) {
                const clampedX = THREE.MathUtils.clamp(intersectPos.x, TRAY_CENTER.x - TRAY_SIZE, TRAY_CENTER.x + TRAY_SIZE);
                const clampedZ = THREE.MathUtils.clamp(intersectPos.z, TRAY_CENTER.z - TRAY_SIZE, TRAY_CENTER.z + TRAY_SIZE);

                const targetPos = new THREE.Vector3(clampedX, 1.2, clampedZ);

                rigidBodyRef.current.setTranslation({
                    x: THREE.MathUtils.lerp(rigidBodyRef.current.translation().x, targetPos.x, 0.4),
                    y: 1.2,
                    z: THREE.MathUtils.lerp(rigidBodyRef.current.translation().z, targetPos.z, 0.4)
                }, true);

                if (intersectPos.z < throwThreshold) {
                    setIsDragging(false);
                    setIsBet(true);

                    rigidBodyRef.current.setTranslation({
                        x: THREE.MathUtils.lerp(targetPos.x, 0, 0.2),
                        y: 1.25,
                        z: throwThreshold - 0.2
                    }, true);

                    rigidBodyRef.current.setBodyType(0, true);
                    rigidBodyRef.current.wakeUp();
                    physicsWait.current = 4;
                    if (onBet) onBet();
                }
            }
        }

        if (isBet && physicsWait.current > 0) {
            physicsWait.current--;
            rigidBodyRef.current?.wakeUp();

            if (physicsWait.current === 0 && !impulseApplied.current && rigidBodyRef.current) {
                const currentPos = rigidBodyRef.current.translation();
                const dir = new THREE.Vector3()
                    .copy(bettingTarget)
                    .sub(new THREE.Vector3(currentPos.x, 0, currentPos.z))
                    .normalize();

                const speed = 7.0;

                rigidBodyRef.current.setLinvel({
                    x: dir.x * speed,
                    y: 0.4, // Increased vertical bounce slightly
                    z: dir.z * speed
                }, true);

                rigidBodyRef.current.setAngvel({
                    x: (Math.random() - 0.5) * 4,
                    y: 10.0,
                    z: (Math.random() - 0.5) * 4
                }, true);

                impulseApplied.current = true;
            }
        }
    });

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        if (isBet) return;

        // Capture pointer to ensure onPointerUp fires even if mouse moves off the mesh
        e.target.setPointerCapture(e.pointerId);

        setIsDragging(true);
        if (rigidBodyRef.current) {
            rigidBodyRef.current.setBodyType(2, true);
            rigidBodyRef.current.wakeUp();
        }
    };

    const handlePointerUp = (e: any) => {
        if (isDragging) {
            // Release pointer capture
            e.target.releasePointerCapture(e.pointerId);

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
                friction={3.0}
                linearDamping={2.0}
                angularDamping={1.0}
                sensor={isDragging}
                collisionGroups={isDragging ? 0x00000000 : 0x00020003}
            >
                <ChipModel />
            </RigidBody>
        </group>
    );
};

const ChipModel: React.FC = () => {
    const { scene } = useGLTF('/models/rounded_cube/scene.gltf');

    // Create a premium Gold material
    const goldMaterial = React.useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: '#FFD700',       // Brightened Gold
            metalness: 1.0,         // Pure Metallic
            roughness: 0.45,        // Matte/Satin finish (brushed look)
            envMapIntensity: 2.0,   // Balanced pop
            emissive: '#221100',    // Very subtle glow
            emissiveIntensity: 0.2
        });
    }, []);

    // Apply the material to the model via traversal
    const processedScene = React.useMemo(() => {
        const clone = scene.clone();
        clone.traverse((node: any) => {
            if (node.isMesh) {
                node.material = goldMaterial;
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        return clone;
    }, [scene, goldMaterial]);

    return (
        <primitive
            object={processedScene}
            scale={0.12}
            position={[0, -0.1, 0]}
        />
    );
};

useGLTF.preload('/models/rounded_cube/scene.gltf');
export default InteractiveChip3D;
