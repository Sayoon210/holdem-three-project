'use client';

import React from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

interface CardDeck3DProps {
    position?: [number, number, number];
}

const CardDeck3D: React.FC<CardDeck3DProps> = ({ position = [0, 0, 0] }) => {
    const backTexture = useTexture('/assets/cards/card_backs.png');

    const cardBackTexture = React.useMemo(() => {
        const tex = backTexture.clone();
        tex.needsUpdate = true;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1 / 4, 1);
        tex.offset.set(0, 0);
        return tex;
    }, [backTexture]);

    // Cleanup to prevent VRAM memory leaks
    React.useEffect(() => {
        return () => {
            cardBackTexture.dispose();
        };
    }, [cardBackTexture]);

    // A single thicker block for the "stack" to look solid, plus a top decorated card
    return (
        <group position={[-1.5, 0.1, -1.0]}>
            {/* The stack body */}
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 0.2, 1.4]} />
                {/* Sides: +X, -X */}
                <meshStandardMaterial attach="material-0" color="#f0f0f0" />
                <meshStandardMaterial attach="material-1" color="#f0f0f0" />
                {/* Top: Card Back (+Y) */}
                <meshBasicMaterial attach="material-2" map={cardBackTexture} />
                {/* Bottom: -Y */}
                <meshStandardMaterial attach="material-3" color="#f0f0f0" />
                {/* Sides: +Z, -Z */}
                <meshStandardMaterial attach="material-4" color="#f0f0f0" />
                <meshStandardMaterial attach="material-5" color="#f0f0f0" />
            </mesh>
        </group>
    );
};

export default CardDeck3D;
