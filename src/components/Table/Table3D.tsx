import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import CommunityCardSlots from './CommunityCardSlots';

const Table3D = React.forwardRef<THREE.Group>((props, ref) => {
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
        <group ref={ref}>
            <RigidBody type="fixed" colliders="trimesh" collisionGroups={0x00010007}>
                <primitive
                    object={scene}
                    scale={0.12}
                    position={[0, 0, 0]}
                />
            </RigidBody>

            {/* Community Card Slots Area */}
            <group position={[0, 0.01, 0]}>
                <CommunityCardSlots />
            </group>
        </group>
    );
});

Table3D.displayName = 'Table3D';

// Pre-load the asset
useGLTF.preload('/models/pokertable_round/scene.gltf');

Table3D.displayName = 'Table3D';
export default Table3D;
