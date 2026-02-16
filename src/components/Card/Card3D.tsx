'use client';

import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface Card3DProps {
    rank?: string; // A, 2, 3, ..., J, Q, K
    suit?: string; // C, H, S, D
    isFaceDown?: boolean;
    position?: [number, number, number];
    rotation?: [number, number, number];
}

const rankMap: Record<string, number> = {
    'A': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9, 'J': 10, 'Q': 11, 'K': 12
};

const suitMap: Record<string, number> = {
    'C': 0, 'H': 1, 'S': 2, 'D': 3
};

const Card3D: React.FC<Card3DProps> = ({
    rank = 'A',
    suit = 'S',
    isFaceDown = false,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
}) => {
    // Load front and back textures
    const frontTexture = useTexture('/assets/cards/playing_cards.png');
    const backTexture = useTexture('/assets/cards/card_backs.png');

    // Clone textures to apply unique offsets per card instance
    const cardFrontTexture = useMemo(() => {
        const tex = frontTexture.clone();
        tex.needsUpdate = true;
        tex.anisotropy = 16;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1 / 13, 1 / 4);

        const col = rankMap[rank] ?? 0;
        const row = suitMap[suit] ?? 0;

        // UV (0,0) is bottom-left. 
        // row 0 is TOP in the spritesheet.
        tex.offset.set(col / 13, (3 - row) / 4);
        return tex;
    }, [frontTexture, rank, suit]);

    const cardBackTexture = useMemo(() => {
        const tex = backTexture.clone();
        tex.needsUpdate = true;
        tex.anisotropy = 16;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        // Assuming 4 backs horizontally as per user feedback
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1 / 4, 1);
        tex.offset.set(0, 0); // Leftmost back
        return tex;
    }, [backTexture]);

    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[1.0, 1.4, 0.03]} />

                {/* Box Faces: 0:+X, 1:-X, 2:+Y, 3:-Y, 4:+Z(Front), 5:-Z(Back) */}
                <meshBasicMaterial attach="material-0" color="#ddd" toneMapped={false} />
                <meshBasicMaterial attach="material-1" color="#ddd" toneMapped={false} />
                <meshBasicMaterial attach="material-2" color="#ddd" toneMapped={false} />
                <meshBasicMaterial attach="material-3" color="#ddd" toneMapped={false} />
                <meshBasicMaterial attach="material-4" map={cardFrontTexture} toneMapped={false} />
                <meshBasicMaterial attach="material-5" map={cardBackTexture} toneMapped={false} />
            </mesh>
        </group>
    );
};

// Preload textures
useTexture.preload('/assets/cards/playing_cards.png');
useTexture.preload('/assets/cards/card_backs.png');

export default Card3D;
