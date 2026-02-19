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

// --- Game State ---
let gameState = {
    players: {}, // socket.id -> { seat, id, name }
    seats: [null, null], // Simple 2-seat pool
    deck: [],
    communityCards: [],
    pot: 0,
    stage: 'WAITING',
    visibleBoardCount: 0
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

        // 2. Deal Community Cards
        console.log('\n[DEAL] Dealing Community Cards...');
        const board = [
            gameState.deck.pop(), gameState.deck.pop(), gameState.deck.pop(),
            gameState.deck.pop(),
            gameState.deck.pop()
        ];
        gameState.communityCards = board;
        console.log('[BOARD]', board.map(c => `${c.rank}${c.suit}`).join(', '));

        io.emit('deal_public', { cards: board });

        for (let i = 1; i <= 5; i++) {
            await new Promise(r => setTimeout(r, 800));
            gameState.visibleBoardCount = i;
            console.log(`[BOARD] Revealed card ${i}: ${board[i - 1].rank}${board[i - 1].suit}`);
            io.emit('update_board_count', { visibleBoardCount: i });
        }

        gameState.stage = 'PLAYING';
        io.emit('game_stage_change', { stage: 'PLAYING' });
        console.log('===== STAGE: PLAYING =====\n');
    });

    socket.on('player_action', (data) => {
        console.log(`[ACTION] Seat ${data.seat}: ${data.type}`);
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
