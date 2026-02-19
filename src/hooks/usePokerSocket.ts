import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const usePokerSocket = (onRemoteAction: (action: any) => void) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [yourSeat, setYourSeat] = useState<number | null>(null);
    const [gameState, setGameState] = useState<any>(null);

    const actionRef = useRef(onRemoteAction);
    actionRef.current = onRemoteAction;

    useEffect(() => {
        const socket = io('http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[SOCKET] Connected');
            setIsConnected(true);
            socket.emit('join_game');
        });

        socket.on('init_state', (data: { yourSeat: number }) => {
            console.log('[SOCKET] Your Seat Assigned:', data.yourSeat);
            setYourSeat(data.yourSeat);
        });

        socket.on('remote_action', (data: any) => {
            actionRef.current?.(data);
        });

        socket.on('game_stage_change', (data: { stage: string }) => {
            actionRef.current?.({ type: 'stage_change', stage: data.stage });
        });

        socket.on('deal_private', (data: { card: any, seat: number }) => {
            actionRef.current?.({ type: 'deal_private', ...data });
        });

        socket.on('deal_notify', (data: { seat: number, cardId: string }) => {
            actionRef.current?.({ type: 'deal_notify', ...data });
        });

        socket.on('deal_public', (data: { cards: any[] }) => {
            actionRef.current?.({ type: 'deal_public', cards: data.cards });
        });

        socket.on('update_board_count', (data: { visibleBoardCount: number }) => {
            actionRef.current?.({ type: 'update_board_count', ...data });
        });

        socket.on('pot_update', (data: { pot: number }) => {
            actionRef.current?.({ type: 'pot_update', ...data });
        });

        socket.on('highest_bet_update', (data: { highestBet: number }) => {
            actionRef.current?.({ type: 'highest_bet_update', ...data });
        });

        socket.on('new_round', (data: { stage: string, activeSeat: number }) => {
            actionRef.current?.({ type: 'new_round', ...data });
        });

        socket.on('hand_ended', (data: { winner: number, pot: number }) => {
            actionRef.current?.({ type: 'hand_ended', ...data });
        });

        socket.on('turn_change', (data: { seat: number }) => {
            actionRef.current?.({ type: 'turn_change', ...data });
        });

        socket.on('disconnect', () => {
            console.log('[SOCKET] Disconnected');
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, []); // Only once on mount

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
