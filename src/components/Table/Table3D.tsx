'use client';

import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import CommunityCardSlots from './CommunityCardSlots';

const Table3D: React.FC = () => {
    // Load the model added by user
    const { scene } = useGLTF('/models/pokertable_round/scene.gltf');

    return (
        <group>
            <RigidBody type="fixed" colliders="trimesh">
                <primitive
                    object={scene}
                    scale={0.12}
                    position={[0, 0, -3]}
                />
            </RigidBody>

            {/* Community Card Slots Area */}
            <group position={[0, 0.01, -3]}>
                <CommunityCardSlots />
            </group>

            {/* Large stable physics floor for cards and chips */}
            <RigidBody type="fixed" colliders="cuboid" friction={3.0}>
                <mesh position={[0, -0.05, 0]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[20, 0.1, 20]} />
                    <meshStandardMaterial
                        transparent
                        opacity={0}
                    />
                </mesh>
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
