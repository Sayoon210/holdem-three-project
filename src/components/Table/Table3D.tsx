import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import CommunityCardSlots from './CommunityCardSlots';

const Table3D: React.FC = () => {
    // Load the model added by user
    const { scene } = useGLTF('/models/pokertable_round/scene.gltf');

    // Apply matte material properties to the table model
    React.useMemo(() => {
        scene.traverse((node: any) => {
            if (node.isMesh) {
                // Keep the original material but adjust properties
                if (node.material) {
                    node.material.roughness = 0.75; // Slightly lower to keep some depth
                    node.material.metalness = 0.05; // Tiny bit of metalness for realistic material response
                    node.material.flatShading = false; // Ensure smooth shading
                }
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
    }, [scene]);

    return (
        <group>
            <RigidBody type="fixed" colliders="trimesh" collisionGroups={0x00010007}>
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
                Physics-only collider (no visual mesh) to avoid Z-fighting or shadow artifacts.
            */}
            <RigidBody type="fixed" colliders="cuboid" friction={2.0} restitution={0.2} position={[0, -0.01, 0]} collisionGroups={0x00010007}>
                {/* 
                    Collider-only mesh: visible={false} and no material properties 
                    ensures it only exists in the physics world.
                */}
                <mesh visible={false}>
                    <cylinderGeometry args={[5.2, 5.2, 0.01, 32]} />
                </mesh>
            </RigidBody>
        </group>
    );
};

// Pre-load the asset
useGLTF.preload('/models/pokertable_round/scene.gltf');

export default Table3D;
