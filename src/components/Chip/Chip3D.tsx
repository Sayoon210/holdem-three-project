'use client';

import React from 'react';
import { useTexture } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface Chip3DProps {
    value?: number;
    color?: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
}

const Chip3D: React.FC<Chip3DProps> = ({
    value = 1,
    color = 'red',
    position = [0, 0, 0],
    rotation = [0, 0, 0]
}) => {
    // Load the new block token texture
    const texture = useTexture('/textures/chips/block_tocken_texture.png');

    return (
        <RigidBody
            position={position}
            rotation={rotation}
            colliders="cuboid"
            restitution={0.3}
            friction={0.8}
        >
            <mesh castShadow receiveShadow>
                {/* Slightly smaller cube for a more refined feel */}
                <boxGeometry args={[0.22, 0.22, 0.22]} />
                <meshStandardMaterial
                    map={texture}
                    metalness={0.7}
                    roughness={0.2}
                    envMapIntensity={1.2}
                />
            </mesh>
        </RigidBody>
    );
};

// Pre-load the new texture
useTexture.preload('/textures/chips/block_tocken_texture.png');

export default Chip3D;
