import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const usePokerSocket = (onRemoteAction: (action: any) => void) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [yourSeat, setYourSeat] = useState<number | null>(null);
    const [gameState, setGameState] = useState<any>(null);

    useEffect(() => {
        // Connect to the local server
        const socket = io('http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to socket server');
            setIsConnected(true);
            socket.emit('join_game');
        });

        socket.on('init_state', (data: { yourSeat: number }) => {
            setYourSeat(data.yourSeat);
        });

        socket.on('remote_action', (data: any) => {
            onRemoteAction(data);
        });

        socket.on('game_stage_change', (data: { stage: string }) => {
            onRemoteAction({ type: 'stage_change', stage: data.stage });
        });

        socket.on('deal_private', (data: { card: any, seat: number }) => {
            onRemoteAction({ type: 'deal_private', ...data });
        });

        socket.on('deal_notify', (data: { seat: number, cardId: string }) => {
            onRemoteAction({ type: 'deal_notify', ...data });
        });

        socket.on('deal_public', (data: { cards: any[] }) => {
            onRemoteAction({ type: 'deal_public', cards: data.cards });
        });

        socket.on('update_board_count', (data: { visibleBoardCount: number }) => {
            onRemoteAction({ type: 'update_board_count', ...data });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, [onRemoteAction]);

    const sendAction = (action: { type: string, amount?: number, seat: number }) => {
        if (socketRef.current) {
            socketRef.current.emit('player_action', action);
        }
    };

    const startGame = () => {
        if (socketRef.current) {
            socketRef.current.emit('start_game');
        }
    };

    return { isConnected, yourSeat, sendAction, startGame };
};
