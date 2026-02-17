'use client';

import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import * as THREE from 'three';

interface Card3DProps {
    rank?: string; // A, 2, 3, ..., J, Q, K
    suit?: string; // C, H, S, D
    isFaceDown?: boolean;
    isFolded?: boolean; // When true, front face is hidden and whole card is darkened
    position?: [number, number, number];
    initialPosition?: [number, number, number];
    rotation?: [number, number, number];
    animateEnabled?: boolean;
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
    isFolded = false,
    position = [0, 0, 0],
    initialPosition,
    rotation = [0, 0, 0],
    animateEnabled = true,
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
        <motion.group
            position={position}
            rotation={[
                rotation[0] + (isFaceDown ? Math.PI : 0),
                rotation[1],
                rotation[2]
            ]}
            initial={initialPosition ? { x: initialPosition[0], y: initialPosition[1], z: initialPosition[2] } : false}
            animate={animateEnabled ? {
                x: position[0],
                y: position[1],
                z: position[2],
                rotateX: rotation[0] + (isFaceDown ? Math.PI : 0)
            } : false}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[1.0, 1.4, 0.02]} />

                {/* Box Faces: 0:+X, 1:-X, 2:+Y, 3:-Y, 4:+Z(Front), 5:-Z(Back) */}
                <meshBasicMaterial attach="material-0" color={isFolded ? "#111" : "#f0f0f0"} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
                <meshBasicMaterial attach="material-1" color={isFolded ? "#111" : "#f0f0f0"} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
                <meshBasicMaterial attach="material-2" color={isFolded ? "#111" : "#f0f0f0"} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
                <meshBasicMaterial attach="material-3" color={isFolded ? "#111" : "#f0f0f0"} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
                {/* Front face */}
                <meshBasicMaterial
                    attach="material-4"
                    map={isFolded ? null : cardFrontTexture}
                    color={isFolded ? "#000" : "#fff"}
                    toneMapped={false}
                    polygonOffset
                    polygonOffsetFactor={-1}
                />
                {/* Back face */}
                <meshBasicMaterial
                    attach="material-5"
                    map={cardBackTexture}
                    color={isFolded ? "#222" : "#fff"}
                    toneMapped={false}
                    polygonOffset
                    polygonOffsetFactor={-1}
                />
            </mesh>
        </motion.group>
    );
};

// Preload textures
useTexture.preload('/assets/cards/playing_cards.png');
useTexture.preload('/assets/cards/card_backs.png');

export default Card3D;
