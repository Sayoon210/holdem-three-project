'use client';

import React from 'react';
import Card3D from '../Card/Card3D';
import { CardData } from '@/types/card';

interface CommunityBoard3DProps {
    cards: CardData[];
    deckPosition?: [number, number, number];
}

const CommunityBoard3D: React.FC<CommunityBoard3DProps> = ({ cards, deckPosition }) => {
    const slotSpacing = 1.4; // Increased spacing for larger cards
    const boardZ = 0;
    const boardY = 0.3; // Tilted elevation - Further increased to be safe

    // Board is anchored to Parent [z = -3]. 
    // Deck is at [-1.5, 0.4, -1.0] World.
    // Local start position = world_deck - world_board
    const localStartPos: [number, number, number] = deckPosition
        ? [deckPosition[0], deckPosition[1] - boardY, deckPosition[2] - (-3)]
        : [0, 1, 0];
    return (
        <group>
            {cards.map((card, index) => (
                <Card3D
                    key={card.id || `${card.rank}-${card.suit}-${index}`}
                    rank={card.rank}
                    suit={card.suit}
                    isFaceDown={card.isFaceDown}
                    position={[(index - 2) * slotSpacing, boardY, boardZ]}
                    initialPosition={localStartPos}
                    rotation={[-Math.PI / 2, 0, 0]}
                    scale={1.25}
                />
            ))}
        </group>
    );
};

export default CommunityBoard3D;
