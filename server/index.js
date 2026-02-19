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
    seats: [null, null], // Simple 2-seat pool for now
    deck: [],
    communityCards: [],
    pot: 0,
    stage: 'WAITING',
    visibleBoardCount: 0,
    activeSeat: 0
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_game', () => {
        // Find first available seat
        let seat = gameState.seats.indexOf(null);
        if (seat === -1) {
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

        socket.broadcast.emit('player_joined', gameState.players[socket.id]);
        console.log(`Socket ${socket.id} assigned to Seat ${seat}`);
    });

    socket.on('start_game', async () => {
        if (gameState.stage !== 'WAITING') return;

        gameState.stage = 'DEALING';
        gameState.deck = shuffleDeck(generateDeck());
        gameState.communityCards = [];
        gameState.visibleBoardCount = 0;
        gameState.pot = 0;

        io.emit('game_stage_change', { stage: 'DEALING' });

        // 1. Deal Private Hole Cards
        // In a real game, each player gets DIFFERENT cards.
        const activeSockets = Object.keys(gameState.players);
        for (const socketId of activeSockets) {
            const playerHoleCards = [gameState.deck.pop(), gameState.deck.pop()];
            gameState.players[socketId].holeCards = playerHoleCards;

            // Send PRIVATE event to this specific player
            io.to(socketId).emit('deal_private', {
                cards: playerHoleCards,
                seat: gameState.players[socketId].seat
            });
        }

        // Wait for hole card animation
        await new Promise(r => setTimeout(r, 1500));

        // 2. Deal Community Cards
        gameState.communityCards = [
            gameState.deck.pop(), gameState.deck.pop(), gameState.deck.pop(), // Flop
            gameState.deck.pop(), // Turn
            gameState.deck.pop()  // River
        ];

        io.emit('deal_public', { cards: gameState.communityCards });

        for (let i = 1; i <= 5; i++) {
            await new Promise(r => setTimeout(r, 1000));
            gameState.visibleBoardCount = i;
            io.emit('update_board_count', { visibleBoardCount: i });
        }

        gameState.stage = 'PLAYING';
        io.emit('game_stage_change', { stage: 'PLAYING' });
    });

    socket.on('player_action', (data) => {
        socket.broadcast.emit('remote_action', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (gameState.players[socket.id]) {
            const seat = gameState.players[socket.id].seat;
            gameState.seats[seat] = null;
            delete gameState.players[socket.id];
        }
    });
});

server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});
