export type Suit = 'C' | 'H' | 'S' | 'D'; // Clubs, Hearts, Spades, Diamonds
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface CardData {
    id: string;
    rank: Rank;
    suit: Suit;
    isFaceDown?: boolean;
}
