'use client';

import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';

const Table3D: React.FC = () => {
    // Load the model added by user
    const { scene } = useGLTF('/models/pokertable_round/scene.gltf');

    return (
        <group>
            <RigidBody type="fixed" colliders="trimesh">
                <primitive
                    object={scene}
                    scale={0.45}
                    position={[0, -0.4, 0]}
                />
            </RigidBody>

            {/* Implicit floor for shadows */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.41, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#050505" opacity={0.5} transparent />
            </mesh>
        </group>
    );
};

// Pre-load the asset
useGLTF.preload('/models/pokertable_round/scene.gltf');

export default Table3D;
