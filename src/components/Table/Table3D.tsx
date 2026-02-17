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

            {/* 
                Large stable physics floor for cards and chips.
                Covers the entire table surface to avoid any mesh 'bumps' or gaps.
            */}
            <RigidBody type="fixed" colliders="cuboid" friction={2.0} restitution={0.2}>
                <mesh position={[0, 0.005, 0]} visible={false}>
                    <cylinderGeometry args={[5.2, 5.2, 0.01, 64]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.05}
                    />
                </mesh>
            </RigidBody>
        </group>
    );
};

// Pre-load the asset
useGLTF.preload('/models/pokertable_round/scene.gltf');

export default Table3D;
