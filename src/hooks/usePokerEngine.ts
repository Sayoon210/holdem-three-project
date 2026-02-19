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
    const [highestBet, setHighestBet] = useState(0);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [isDebug, setIsDebug] = useState(false);

    // --- Local Player State ---
    const [previousConfirmedBet, setPreviousConfirmedBet] = useState(0); // Amount already sent to server this round
    const [playerRoundBet, setPlayerRoundBet] = useState(0); // Total (Confirmed + Unconfirmed in tray)
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
                    // Reset EVERYTHING only at the very start of a new hand
                    setCommunityCards([]);
                    setPlayersHoleCards({});
                    setIsFolded(false);
                    setPotTotal(0);
                    setPlayerRoundBet(0);
                    setPreviousConfirmedBet(0);
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

            case 'highest_bet_update':
                setHighestBet(data.highestBet);
                break;

            case 'new_round':
                addLog(`--- NEW ROUND: ${data.stage} ---`);
                setPlayerRoundBet(0);
                setPreviousConfirmedBet(0);
                // The seat rotation is handled by turn_change usually, 
                // but we can explicitly set it if provided.
                if (data.activeSeat !== undefined) setActivePlayerId(data.activeSeat);
                break;

            case 'hand_ended':
                addLog(`*** HAND ENDED *** Winner: Seat ${data.winner}, Pot: $${data.pot}`);
                setGameStage('WAITING');
                setCommunityCards([]);
                setPlayersHoleCards({});
                setPotTotal(0);
                setPlayerRoundBet(0);
                setPreviousConfirmedBet(0);
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
        const addedAmount = playerRoundBet - previousConfirmedBet;

        let type = 'check';
        if (playerRoundBet > highestBet) {
            type = 'raise';
        } else if (playerRoundBet === highestBet && highestBet > 0) {
            type = 'call';
        } else if (playerRoundBet < highestBet) {
            // Player hasn't matched the bet yet, but we allow partial commitment or "matching"
            // In most poker, you can't just partial call unless all-in, 
            // but for this interaction, if they hit "Confirm" and it's less, we can treat as partial or call.
            // Let's stick to user's "Automatic" logic.
            if (playerRoundBet > previousConfirmedBet) {
                type = 'bet'; // Adding chips
            } else {
                type = 'check';
            }
        }

        addLog(`Confirming ${type.toUpperCase()}: Total $${playerRoundBet}`);
        setChipConfirmTrigger(prev => prev + 1);
        setPreviousConfirmedBet(playerRoundBet);

        if (yourSeat !== null) {
            sendAction({
                type: type,
                seat: yourSeat,
                amount: addedAmount // Send the increment
            });
        }
    }, [addLog, playerRoundBet, previousConfirmedBet, highestBet, sendAction, yourSeat]);

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

    const handleCall = useCallback(() => {
        const callAmount = highestBet - playerRoundBet;
        addLog(`Calling: $${callAmount}`);
        if (yourSeat !== null) {
            sendAction({ type: 'call', seat: yourSeat });
        }
        setPlayerRoundBet(highestBet);
    }, [addLog, highestBet, playerRoundBet, sendAction, yourSeat]);

    const handleCheck = useCallback(() => {
        addLog(`Checking...`);
        if (yourSeat !== null) {
            sendAction({ type: 'check', seat: yourSeat });
        }
    }, [addLog, sendAction, yourSeat]);

    const handleRaise = useCallback((amount: number = 100) => {
        const total = highestBet + amount;
        addLog(`Raising to: $${total}`);
        if (yourSeat !== null) {
            sendAction({ type: 'raise', seat: yourSeat, amount: amount });
        }
        setPlayerRoundBet(total);
    }, [addLog, highestBet, sendAction, yourSeat]);

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
        highestBet,
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
        handleCall,
        handleCheck,
        handleRaise,
        handleConfirmBet,
        handleFold,
        requestStart,
        sendAction
    };
};
