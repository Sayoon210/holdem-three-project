/**
 * Poker Hand Evaluator for Texas Hold'em
 * Evaluates 7 cards (2 hole + 5 community) and returns the best 5-card hand rank.
 */

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const HAND_RANKS = {
    ROYAL_FLUSH: 10,
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    PAIR: 2,
    HIGH_CARD: 1
};

/**
 * Evaluates a 7-card hand.
 * @param {Array} cards - Array of {rank, suit} objects
 */
function evaluateHand(cards) {
    // Sort all cards by value descending
    const sorted = cards.map(c => ({
        rank: c.rank,
        suit: c.suit,
        value: RANK_VALUES[c.rank]
    })).sort((a, b) => b.value - a.value);

    // Grouping for logic
    const rankCounts = {};
    const suitCounts = {};
    sorted.forEach(c => {
        rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    });

    const isFlush = Object.values(suitCounts).some(count => count >= 5);
    const flushSuit = isFlush ? Object.keys(suitCounts).find(suit => suitCounts[suit] >= 5) : null;

    // Check Straight
    const uniqueValues = [...new Set(sorted.map(c => c.value))];
    let straightValue = -1;
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
            straightValue = uniqueValues[i];
            break;
        }
    }
    // Ace-low straight check (A, 5, 4, 3, 2)
    if (straightValue === -1 && uniqueValues.includes(14) &&
        uniqueValues.includes(5) && uniqueValues.includes(4) &&
        uniqueValues.includes(3) && uniqueValues.includes(2)) {
        straightValue = 5;
    }

    // Hand Pattern Logic
    const pairs = Object.entries(rankCounts).filter(([r, count]) => count === 2).map(([r]) => RANK_VALUES[r]).sort((a, b) => b - a);
    const trips = Object.entries(rankCounts).filter(([r, count]) => count === 3).map(([r]) => RANK_VALUES[r]).sort((a, b) => b - a);
    const quads = Object.entries(rankCounts).filter(([r, count]) => count === 4).map(([r]) => RANK_VALUES[r]).sort((a, b) => b - a);

    // 1. Straight Flush / Royal Flush
    if (isFlush && straightValue !== -1) {
        const flushCards = sorted.filter(c => c.suit === flushSuit);
        const fUniqueValues = [...new Set(flushCards.map(c => c.value))];
        let sfValue = -1;
        for (let i = 0; i <= fUniqueValues.length - 5; i++) {
            if (fUniqueValues[i] - fUniqueValues[i + 4] === 4) {
                sfValue = fUniqueValues[i];
                break;
            }
        }
        if (sfValue === 14) return { rank: HAND_RANKS.ROYAL_FLUSH, score: 99999, name: "Royal Flush" };
        if (sfValue !== -1) return { rank: HAND_RANKS.STRAIGHT_FLUSH, score: 90000 + sfValue, name: "Straight Flush" };
    }

    // 2. Four of a Kind
    if (quads.length > 0) {
        const kicker = sorted.find(c => RANK_VALUES[c.rank] !== quads[0]).value;
        return { rank: HAND_RANKS.FOUR_OF_A_KIND, score: 80000 + quads[0] * 100 + kicker, name: `Four of a Kind (${Object.keys(RANK_VALUES).find(k => RANK_VALUES[k] === quads[0])}s)` };
    }

    // 3. Full House
    if (trips.length > 0 && (trips.length > 1 || pairs.length > 0)) {
        const secondRank = trips.length > 1 ? trips[1] : pairs[0];
        return { rank: HAND_RANKS.FULL_HOUSE, score: 70000 + trips[0] * 100 + secondRank, name: "Full House" };
    }

    // 4. Flush
    if (isFlush) {
        const fCards = sorted.filter(c => c.suit === flushSuit).slice(0, 5);
        const score = fCards.reduce((acc, c, i) => acc + c.value * Math.pow(15, 4 - i), 0);
        return { rank: HAND_RANKS.FLUSH, score: 60000 + (score / 10000), name: "Flush" };
    }

    // 5. Straight
    if (straightValue !== -1) {
        return { rank: HAND_RANKS.STRAIGHT, score: 50000 + straightValue, name: "Straight" };
    }

    // 6. Three of a Kind
    if (trips.length > 0) {
        const kickers = sorted.filter(c => RANK_VALUES[c.rank] !== trips[0]).slice(0, 2);
        const score = kickers.reduce((acc, c, i) => acc + c.value * Math.pow(15, 1 - i), 0);
        return { rank: HAND_RANKS.THREE_OF_A_KIND, score: 40000 + trips[0] * 100 + score, name: `Three of a Kind (${Object.keys(RANK_VALUES).find(k => RANK_VALUES[k] === trips[0])}s)` };
    }

    // 7. Two Pair
    if (pairs.length >= 2) {
        const kicker = sorted.find(c => RANK_VALUES[c.rank] !== pairs[0] && RANK_VALUES[c.rank] !== pairs[1]).value;
        return { rank: HAND_RANKS.TWO_PAIR, score: 30000 + pairs[0] * 100 + pairs[1] * 10 + kicker, name: "Two Pair" };
    }

    // 8. One Pair
    if (pairs.length === 1) {
        const kickers = sorted.filter(c => RANK_VALUES[c.rank] !== pairs[0]).slice(0, 3);
        const score = kickers.reduce((acc, c, i) => acc + c.value * Math.pow(15, 2 - i), 0);
        return { rank: HAND_RANKS.PAIR, score: 20000 + pairs[0] * 100 + (score / 10), name: "One Pair" };
    }

    // 9. High Card
    const top5 = sorted.slice(0, 5);
    const score = top5.reduce((acc, c, i) => acc + c.value * Math.pow(15, 4 - i), 0);
    return { rank: HAND_RANKS.HIGH_CARD, score: 10000 + (score / 10000), name: "High Card" };
}

module.exports = { evaluateHand };
