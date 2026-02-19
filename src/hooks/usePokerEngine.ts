'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePokerSocket } from './usePokerSocket';
import { CardData } from '@/types/card';

export type GameStage = 'WAITING' | 'DEALING' | 'PLAYING';

export const usePokerEngine = () => {
    // --- Core State ---
    const [gameStage, setGameStage] = useState<GameStage>('WAITING');
    const [communityCards, setCommunityCards] = useState<CardData[]>([]);
    const [playersHoleCards, setPlayersHoleCards] = useState<Record<number, CardData[]>>({});
    const [potTotal, setPotTotal] = useState(0);
    const [activePlayerId, setActivePlayerId] = useState(0);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [isDebug, setIsDebug] = useState(false);

    // --- Local Player State ---
    const [playerRoundBet, setPlayerRoundBet] = useState(0);
    const [isFolded, setIsFolded] = useState(false);

    // --- Animation Triggers ---
    const [chipResetTrigger, setChipResetTrigger] = useState(0);
    const [chipConfirmTrigger, setChipConfirmTrigger] = useState(0);
    const [remoteBetTriggers, setRemoteBetTriggers] = useState([0, 0]);

    const addLog = useCallback((msg: string) => {
        setDebugLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

    // --- Socket Event Handler ---
    const handleRemoteAction = useCallback((data: any) => {
        switch (data.type) {
            case 'bet':
                setRemoteBetTriggers(prev => {
                    const next = [...prev];
                    next[data.seat] += 1;
                    return next;
                });
                addLog(`Remote player (Seat ${data.seat}) bet!`);
                break;

            case 'fold':
                addLog(`Remote player (Seat ${data.seat}) folded.`);
                break;

            case 'stage_change':
                setGameStage(data.stage);
                addLog(`Game Stage: ${data.stage}`);
                if (data.stage === 'DEALING') {
                    setCommunityCards([]);
                    setPlayersHoleCards({});
                    setIsFolded(false);
                    setPotTotal(0);
                    setPlayerRoundBet(0);
                }
                break;

            case 'deal_private':
                setPlayersHoleCards(prev => {
                    const current = prev[data.seat] || [];
                    const exists = current.findIndex(c => c.id === data.card.id);
                    if (exists !== -1) {
                        const next = [...current];
                        next[exists] = data.card;
                        return { ...prev, [data.seat]: next };
                    }
                    return { ...prev, [data.seat]: [...current, data.card] };
                });
                addLog(`Received PRIVATE card for Seat ${data.seat}`);
                break;

            case 'deal_notify':
                setPlayersHoleCards(prev => {
                    const current = prev[data.seat] || [];
                    if (current.some(c => c.id === data.cardId)) return prev;

                    const dummy: CardData = {
                        id: data.cardId,
                        rank: '?' as any,
                        suit: '?' as any,
                        isFaceDown: true
                    };
                    return { ...prev, [data.seat]: [...current, dummy] };
                });
                addLog(`Seat ${data.seat} received a card (hidden).`);
                break;

            case 'deal_public':
                setCommunityCards(data.cards);
                break;

            case 'pot_update':
                setPotTotal(data.pot);
                addLog(`Pot updated: $${data.pot}`);
                break;

            case 'update_board_count':
                // Handled via state or count if needed, but cards are already in communityCards
                break;

            case 'turn_change':
                setActivePlayerId(data.seat);
                addLog(`Turn changed: Seat ${data.seat}`);
                break;
        }
    }, [addLog]);

    const { isConnected, yourSeat, sendAction, startGame } = usePokerSocket(handleRemoteAction);

    useEffect(() => {
        if (yourSeat !== null) {
            addLog(`Seat Assigned: ${yourSeat === 0 ? 'SOUTH (0)' : 'NORTH (1)'}`);
        }
    }, [yourSeat, addLog]);

    // --- Actions ---
    const handleBet = useCallback(() => {
        setPotTotal(prev => prev + 100);
        setPlayerRoundBet(prev => prev + 100);
        addLog(`Local BET: 100`);
    }, [addLog]);

    const handleConfirmBet = useCallback(() => {
        addLog(`Confirming bet: $${playerRoundBet}`);
        setPlayerRoundBet(0);
        setChipConfirmTrigger(prev => prev + 1);
        if (yourSeat !== null) {
            sendAction({ type: 'bet', seat: yourSeat });
        }
    }, [addLog, playerRoundBet, sendAction, yourSeat]);

    const handleFold = useCallback(() => {
        addLog(`Folding...`);
        setPotTotal(prev => prev - playerRoundBet);
        setPlayerRoundBet(0);
        setChipResetTrigger(prev => prev + 1);
        setIsFolded(true);
        if (yourSeat !== null) {
            sendAction({ type: 'fold', seat: yourSeat });
        }
    }, [addLog, playerRoundBet, sendAction, yourSeat]);

    const requestStart = useCallback(() => {
        if (gameStage !== 'WAITING') return;
        startGame();
        addLog("Requesting Game Start...");
    }, [gameStage, startGame, addLog]);

    return {
        // State
        isConnected,
        yourSeat,
        gameStage,
        communityCards,
        playersHoleCards,
        potTotal,
        activePlayerId,
        playerRoundBet,
        isFolded,
        debugLogs,
        isDebug,

        // Triggers
        chipResetTrigger,
        chipConfirmTrigger,
        remoteBetTriggers,

        // Actions
        setIsDebug,
        handleBet,
        handleConfirmBet,
        handleFold,
        requestStart,
        sendAction
    };
};
