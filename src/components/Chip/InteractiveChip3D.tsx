'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useFrame, useThree, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useEffect } from 'react';

interface InteractiveChip3DProps {
    position: [number, number, number];
    trayPos?: [number, number, number]; // Local tray position relative to parent seat
    rotation?: [number, number, number];
    onBet?: () => void;
    resetTrigger?: number; // Refund back to tray
    confirmTrigger?: number; // Lock into pot (no refund)
    index?: number; // For staggered animation
    throwThreshold?: number; // Local Z-coordinate for betting detection
    enabled?: boolean; // Turn-based control
    remoteBetTrigger?: number; // Trigger programmatic bet
}

const InteractiveChip3D: React.FC<InteractiveChip3DProps> = ({
    position,
    trayPos,
    rotation = [0, 0, 0],
    onBet,
    resetTrigger,
    confirmTrigger,
    index = 0,
    throwThreshold: propThreshold,
    enabled = true,
    remoteBetTrigger
}) => {
    const { camera, raycaster, mouse } = useThree();
    const [isDragging, setIsDragging] = useState(false);
    const [isBet, setIsBet] = useState(false);
    const [isLocked, setIsLocked] = useState(false); // New: locked chips stay in pot on fold
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const outerGroupRef = useRef<THREE.Group>(null);
    const impulseApplied = useRef(false);

    // Dynamically calculate world reset position from parent seat's transform
    const getResetPosition = () => {
        if (trayPos && outerGroupRef.current) {
            // Tray is 2.2 units from seat center in PlayerSeat3D.tsx
            // data.trayPos is relative to that tray center.
            // So we target [trayPos[0], trayPos[1] + 0.6, trayPos[2]] in local space of parent
            tempVec.set(trayPos[0], 0.6 + (index * 0.08), trayPos[2]);
            outerGroupRef.current.localToWorld(tempVec);
            return tempVec.clone();
        }
        return new THREE.Vector3(...position);
    };

    // Drag limits in world space - calculated on-the-fly during interaction
    const dragLimits = useRef({ centerX: 0, centerZ: 0 });

    const updateDragLimits = () => {
        const resetPos = getResetPosition();
        dragLimits.current = { centerX: resetPos.x, centerZ: resetPos.z };
    };

    const TRAY_SIZE = 3.0; // Increased boundary for smoother drag in larger tray
    const localThrowThreshold = propThreshold !== undefined ? propThreshold : -1.1;
    const bettingTarget = new THREE.Vector3(0, 0, 0);
    const physicsWait = useRef(-1);
    const lastResetTrigger = useRef(resetTrigger);
    const lastConfirmTrigger = useRef(confirmTrigger);
    const lastRemoteBetTrigger = useRef(remoteBetTrigger);

    // Reuse objects to prevent GC pressure in useFrame
    const tempPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.7), []);
    const tempIntersect = useMemo(() => new THREE.Vector3(), []);
    const tempTarget = useMemo(() => new THREE.Vector3(), []);
    const tempVec = useMemo(() => new THREE.Vector3(), []);

    // Initial Drop Force (Slam Effect)
    useEffect(() => {
        // Staggered drop delay based on index
        const delay = index * 50 + 100; // 50ms per chip + base delay

        const timer = setTimeout(() => {
            if (rigidBodyRef.current) {
                rigidBodyRef.current.wakeUp();
                // Just wake up, let gravity do the work
            }
        }, delay);
        return () => clearTimeout(timer);
    }, [index]);

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
                    const target = getResetPosition();
                    rigidBodyRef.current.setTranslation({ x: target.x, y: target.y, z: target.z }, true);
                    rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
                    rigidBodyRef.current.setBodyType(2, true);
                    setTimeout(() => rigidBodyRef.current?.setBodyType(0, true), 50);
                }
            }
            return;
        }

        // REMOTE ACTION LOGIC (Simulation)
        if (remoteBetTrigger !== undefined && remoteBetTrigger !== lastRemoteBetTrigger.current) {
            lastRemoteBetTrigger.current = remoteBetTrigger;
            if (!isBet && !isDragging) {
                // Programmatically trigger bet
                setIsBet(true);
                physicsWait.current = 4;
            }
            return;
        }

        if (isDragging && rigidBodyRef.current) {
            raycaster.setFromCamera(mouse, camera);
            raycaster.ray.intersectPlane(tempPlane, tempIntersect);

            if (tempIntersect) {
                const clampedX = THREE.MathUtils.clamp(tempIntersect.x, dragLimits.current.centerX - TRAY_SIZE, dragLimits.current.centerX + TRAY_SIZE);
                const clampedZ = THREE.MathUtils.clamp(tempIntersect.z, dragLimits.current.centerZ - TRAY_SIZE, dragLimits.current.centerZ + TRAY_SIZE);

                tempTarget.set(clampedX, 1.2, clampedZ);

                rigidBodyRef.current.setTranslation({
                    x: THREE.MathUtils.lerp(rigidBodyRef.current.translation().x, tempTarget.x, 0.4),
                    y: 1.2,
                    z: THREE.MathUtils.lerp(rigidBodyRef.current.translation().z, tempTarget.z, 0.4)
                }, true);

                // BETA TRIGGER: Determine if crossing the local threshold
                // We use local space so "forward" is ALWAYS negative Z.
                const localPos = tempVec.copy(tempIntersect);
                if (outerGroupRef.current) {
                    outerGroupRef.current.worldToLocal(localPos);
                }

                if (localPos.z < localThrowThreshold) {
                    setIsDragging(false);
                    setIsBet(true);

                    // Physical Toss Position (World)
                    // We target further forward in local space then convert back to world
                    const localTossTarget = new THREE.Vector3(0, 1.25, localThrowThreshold - 0.2);
                    const worldTossTarget = localTossTarget.clone();
                    if (outerGroupRef.current) {
                        outerGroupRef.current.localToWorld(worldTossTarget);
                    }

                    rigidBodyRef.current.setTranslation({
                        x: worldTossTarget.x,
                        y: worldTossTarget.y,
                        z: worldTossTarget.z
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
                const dir = tempVec
                    .copy(bettingTarget)
                    .sub(tempTarget.set(currentPos.x, 0, currentPos.z))
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
        if (!enabled || isBet) return;
        e.stopPropagation();

        // Release pointer capture
        e.target.setPointerCapture(e.pointerId);

        // Update limits based on current seat world transform
        updateDragLimits();

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
        <group ref={outerGroupRef} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
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

    // Cleanup to prevent VRAM memory leaks
    React.useEffect(() => {
        return () => {
            goldMaterial.dispose();
            processedScene.traverse((node: any) => {
                if (node.isMesh) {
                    node.geometry.dispose();
                    if (Array.isArray(node.material)) {
                        node.material.forEach((m: any) => m.dispose());
                    } else if (node.material) {
                        node.material.dispose();
                    }
                }
            });
        };
    }, [goldMaterial, processedScene]);

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
