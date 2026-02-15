'use client';

import React from 'react';
import Card3D from '../Card/Card3D';
import { CardData } from '@/types/card';

interface PlayerHand3DProps {
    cards: CardData[];
    position?: [number, number, number];
    rotation?: [number, number, number];
}

const PlayerHand3D: React.FC<PlayerHand3DProps> = ({
    cards,
    position = [0, 0.2, 3.0],
    rotation = [-Math.PI / 2.8, 0, 0]
}) => {
    const handSpacing = 1.2;

    return (
        <group position={position} rotation={rotation}>
            {cards.map((card, index) => {
                // Individual offsets for hand layout
                const xOffset = (index - (cards.length - 1) / 2) * handSpacing;
                const zOffset = index * 0.05; // Slight stack effect

                return (
                    <Card3D
                        key={card.id || `${card.rank}-${card.suit}-${index}`}
                        rank={card.rank}
                        suit={card.suit}
                        isFaceDown={card.isFaceDown}
                        position={[xOffset, 0, zOffset]}
                        rotation={[0, 0, 0]} // Relative to group
                    />
                );
            })}
        </group>
    );
};

export default PlayerHand3D;
