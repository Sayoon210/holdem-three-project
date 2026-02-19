const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('Poker Socket Server is running.');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// --- Poker Logic Helpers ---
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['S', 'H', 'D', 'C'];

const generateDeck = () => {
    const deck = [];
    let id = 0;
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ id: `card-${id++}`, rank, suit, isFaceDown: true });
        }
    }
    return deck;
};

const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const moveToNextPlayer = () => {
    let nextSeat = (gameState.activeSeat + 1) % gameState.seats.length;
    // Iterate at most seats.length times to find a player
    for (let i = 0; i < gameState.seats.length; i++) {
        if (gameState.seats[nextSeat]) {
            gameState.activeSeat = nextSeat;
            return true;
        }
        nextSeat = (nextSeat + 1) % gameState.seats.length;
    }
    return false;
};

// --- Game State ---
let gameState = {
    players: {}, // socket.id -> { seat, id, name }
    seats: [null, null], // Simple 2-seat pool
    deck: [],
    communityCards: [],
    pot: 0,
    stage: 'WAITING',
    visibleBoardCount: 0,
    activeSeat: 0,
    highestBet: 0,
    roundBets: {}, // socket.id -> current round bet
    roundActionCount: 0
};

io.on('connection', (socket) => {
    console.log('[CONN] User joined:', socket.id);

    socket.on('join_game', () => {
        let seat = gameState.seats.indexOf(null);
        if (seat === -1) {
            console.log('[JOIN] Room Full, rejecting:', socket.id);
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        gameState.seats[seat] = socket.id;
        gameState.players[socket.id] = {
            id: socket.id,
            seat: seat,
            name: `Player ${seat + 1}`
        };

        socket.emit('init_state', {
            yourSeat: seat,
            players: gameState.players,
            stage: gameState.stage,
            communityCards: gameState.communityCards,
            visibleBoardCount: gameState.visibleBoardCount
        });

        io.emit('player_joined', gameState.players[socket.id]);
        console.log(`[JOIN] Socket ${socket.id} -> Seat ${seat}. Current pool: ${JSON.stringify(gameState.seats)}`);
    });

    socket.on('start_game', async () => {
        if (gameState.stage !== 'WAITING') return;

        console.log('\n===== GAME START =====');
        gameState.stage = 'DEALING';
        const rawDeck = generateDeck();
        gameState.deck = shuffleDeck(rawDeck);

        console.log('[DECK] Shuffled 52 cards.');
        console.log('[DEBUG] Top 10 cards in deck:', gameState.deck.slice(-10).reverse().map(c => `${c.rank}${c.suit}`).join(', '));

        gameState.communityCards = [];
        gameState.visibleBoardCount = 0;

        io.emit('game_stage_change', { stage: 'DEALING' });

        // 1. Deal Hole Cards ONE BY ONE
        for (let round = 0; round < 2; round++) {
            for (let seatIdx = 0; seatIdx < gameState.seats.length; seatIdx++) {
                const targetSocketId = gameState.seats[seatIdx];
                if (!targetSocketId) {
                    console.log(`[DEAL] Seat ${seatIdx} is empty, skipping.`);
                    continue;
                }

                const card = gameState.deck.pop();
                console.log(`[DEAL] Card ${card.rank}${card.suit} (ID: ${card.id}) -> Seat ${seatIdx} (Round ${round + 1})`);

                // 1A. Send REAL info to the owner
                io.to(targetSocketId).emit('deal_private', {
                    card,
                    seat: seatIdx
                });

                // 1B. Notify EVERYONE (including the owner, client will deduplicate) 
                // about the card placement so they render a card object.
                io.emit('deal_notify', {
                    seat: seatIdx,
                    cardId: card.id
                });

                await new Promise(r => setTimeout(r, 500));
            }
        }

        // 2. Deal Community Cards (ALL FACE DOWN)
        console.log('\n[DEAL] Dealing 5 Community Cards (Hidden)...');
        const board = [];
        for (let i = 0; i < 5; i++) {
            const card = gameState.deck.pop();
            card.isFaceDown = true;
            board.push(card);
        }
        gameState.communityCards = board;
        io.emit('deal_public', { cards: gameState.communityCards });

        gameState.stage = 'PLAYING';
        gameState.activeSeat = 0; // SB starts Pre-flop
        gameState.highestBet = 0;
        gameState.roundBets = {};
        gameState.roundActionCount = 0;

        io.emit('game_stage_change', { stage: 'PLAYING' });
        io.emit('new_round', { stage: 'PRE_FLOP', activeSeat: 0 });
        io.emit('turn_change', { seat: gameState.activeSeat });
        io.emit('highest_bet_update', { highestBet: 0 });
        console.log('===== STAGE: PLAYING (Turn: 0) =====\n');
    });

    socket.on('player_action', (data) => {
        // data: { type: 'bet' | 'fold' | 'check' | 'call' | 'raise', seat: number, amount?: number }
        const player = gameState.players[socket.id];
        if (!player || player.seat !== gameState.activeSeat) return;

        console.log(`[ACTION] Seat ${data.seat}: ${data.type} (${data.amount || 0})`);

        if (data.type === 'fold') {
            const winnerSeat = (player.seat + 1) % 2;
            io.emit('hand_ended', { winner: winnerSeat, pot: gameState.pot });

            // Reset to waiting
            gameState.stage = 'WAITING';
            gameState.pot = 0;
            gameState.communityCards = [];
            io.emit('game_stage_change', { stage: 'WAITING' });
            return;
        }

        let amount = data.amount || 0;
        if (data.type === 'raise' || data.type === 'bet' || data.type === 'call') {
            const currentTotal = (gameState.roundBets[socket.id] || 0) + amount;
            gameState.roundBets[socket.id] = currentTotal;
            gameState.pot += amount;

            if (currentTotal > gameState.highestBet) {
                gameState.highestBet = currentTotal;
                // Raise reopens the action count for others
                gameState.roundActionCount = 0;
                console.log(`[RAISE] Highest bet is now ${gameState.highestBet}. Round reopened.`);
            }
        }

        io.emit('pot_update', { pot: gameState.pot });
        io.emit('highest_bet_update', { highestBet: gameState.highestBet });

        // Update action count
        gameState.roundActionCount++;

        // Check for round completion
        const activeSids = gameState.seats.filter(id => id !== null);
        const allBalanced = activeSids.every(sid => (gameState.roundBets[sid] || 0) === gameState.highestBet);
        const everyoneActed = gameState.roundActionCount >= activeSids.length;

        if (everyoneActed && allBalanced) {
            console.log('\n[ROUND] Round complete! Transitioning...');

            // Reveal Flop (if hidden)
            if (gameState.communityCards[0].isFaceDown) {
                for (let i = 0; i < 3; i++) {
                    gameState.communityCards[i].isFaceDown = false;
                }
                io.emit('deal_public', { cards: gameState.communityCards });

                // Reset for next betting round
                gameState.roundActionCount = 0;
                gameState.highestBet = 0;
                gameState.roundBets = {};

                // Heads-up: Post-flop, Seat 1 (BB) starts
                gameState.activeSeat = 1;

                io.emit('highest_bet_update', { highestBet: 0 });
                io.emit('new_round', { stage: 'FLOP', activeSeat: 1 });
                io.emit('turn_change', { seat: gameState.activeSeat });
                console.log('[ROUND] Flop Revealed. Seat 1 to act.');
                return;
            }
        }

        // Standard Turn Rotation
        if (moveToNextPlayer()) {
            io.emit('turn_change', { seat: gameState.activeSeat });
            console.log(`[TURN] Moved to Seat ${gameState.activeSeat}`);
        }

        socket.broadcast.emit('remote_action', data);
    });

    socket.on('disconnect', () => {
        const player = gameState.players[socket.id];
        if (player) {
            console.log(`[DISC] Socket ${socket.id} left Seat ${player.seat}`);
            gameState.seats[player.seat] = null;
            delete gameState.players[socket.id];
            io.emit('player_left', { seat: player.seat });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});
