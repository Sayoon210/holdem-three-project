'use client';

import React from 'react';

const CommunityCardSlots: React.FC = () => {
    // 5 slots for Flop (3), Turn (1), River (1)
    const slotSpacing = 1.1;
    const slots = [-2, -1, 0, 1, 2];

    return (
        <group>
            {slots.map((xOffset, i) => (
                <mesh
                    key={i}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[xOffset * slotSpacing, 0.01, 0]}
                    receiveShadow
                >
                    <planeGeometry args={[1.05, 1.45]} /> {/* Slightly larger than card */}
                    <meshStandardMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.1}
                        roughness={1}
                        metalness={0}
                    />
                </mesh>
            ))}
        </group>
    );
};

export default CommunityCardSlots;
