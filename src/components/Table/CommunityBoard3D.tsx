'use client';

import React from 'react';
import Card3D from '../Card/Card3D';
import { CardData } from '@/types/card';

interface CommunityBoard3DProps {
    cards: CardData[];
}

const CommunityBoard3D: React.FC<CommunityBoard3DProps> = ({ cards }) => {
    const slotSpacing = 1.1;
    const boardZ = -3;
    const boardY = 0.2; // Tilted elevation

    return (
        <group>
            {cards.map((card, index) => (
                <Card3D
                    key={card.id || `${card.rank}-${card.suit}-${index}`}
                    rank={card.rank}
                    suit={card.suit}
                    isFaceDown={card.isFaceDown}
                    position={[(index - 2) * slotSpacing, boardY, boardZ]}
                    rotation={[-Math.PI / 2.8, 0, 0]}
                />
            ))}
        </group>
    );
};

export default CommunityBoard3D;
