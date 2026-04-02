'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './use-socket';
import type { GameView, ResourceType, HexCoord } from '@catan/shared';

const MAX_VIEW_RETRIES = 10;

export function useGame(gameId: string | null) {
  const { socket, connected, connectionError } = useSocket();
  const [view, setView] = useState<GameView | null>(null);
  const [lastDice, setLastDice] = useState<{ d1: number; d2: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!socket || !connected || !gameId) return;
    retryCountRef.current = 0;
    setLoadFailed(false);

    const onView = (v: GameView) => { setView(v); setError(null); retryCountRef.current = 0; setLoadFailed(false); };
    const onError = (msg: string) => setError(msg);
    const onDice = (d: { d1: number; d2: number; total: number }) => setLastDice(d);

    const onGameStarting = () => {
      retryCountRef.current = 0;
      setLoadFailed(false);
      setTimeout(() => socket.emit('game:request-view', gameId), 500);
    };

    socket.on('game:view', onView);
    socket.on('game:action-error', onError);
    socket.on('game:dice-result', onDice);
    socket.on('game:starting', onGameStarting);

    // Request current view — retry periodically until we get one or hit max
    socket.emit('game:request-view', gameId);
    const retryInterval = setInterval(() => {
      if (!view) {
        retryCountRef.current += 1;
        if (retryCountRef.current >= MAX_VIEW_RETRIES) {
          setLoadFailed(true);
          clearInterval(retryInterval);
          return;
        }
        socket.emit('game:request-view', gameId);
      }
    }, 2000);

    return () => {
      clearInterval(retryInterval);
      socket.off('game:view', onView);
      socket.off('game:action-error', onError);
      socket.off('game:dice-result', onDice);
      socket.off('game:starting', onGameStarting);
    };
  }, [socket, connected, gameId]);

  const emit = useCallback(
    (event: string, ...args: unknown[]) => {
      if (socket && gameId) {
        (socket as any).emit(event, gameId, ...args);
      }
    },
    [socket, gameId]
  );

  return {
    view,
    connected,
    connectionError,
    lastDice,
    error,
    loadFailed,
    setupSettlement: useCallback((vertexId: string) => emit('action:setup-settlement', vertexId), [emit]),
    setupRoad: useCallback((edgeId: string) => emit('action:setup-road', edgeId), [emit]),
    rollDice: useCallback(() => emit('action:roll-dice'), [emit]),
    buildSettlement: useCallback((vertexId: string) => emit('action:build-settlement', vertexId), [emit]),
    buildCity: useCallback((vertexId: string) => emit('action:build-city', vertexId), [emit]),
    buildRoad: useCallback((edgeId: string) => emit('action:build-road', edgeId), [emit]),
    buyDevCard: useCallback(() => emit('action:buy-dev-card'), [emit]),
    playKnight: useCallback((hex: HexCoord, stealFrom?: string) => emit('action:play-knight', hex, stealFrom), [emit]),
    playMonopoly: useCallback((res: ResourceType) => emit('action:play-monopoly', res), [emit]),
    playYearOfPlenty: useCallback((r1: ResourceType, r2: ResourceType) => emit('action:play-year-of-plenty', r1, r2), [emit]),
    playRoadBuilding: useCallback((e1: string, e2?: string) => emit('action:play-road-building', e1, e2), [emit]),
    maritimeTrade: useCallback((give: ResourceType, receive: ResourceType) => emit('action:maritime-trade', give, receive), [emit]),
    moveRobber: useCallback((hex: HexCoord, stealFrom?: string) => emit('action:move-robber', hex, stealFrom), [emit]),
    discardCards: useCallback((cards: Partial<Record<ResourceType, number>>) => emit('action:discard', cards), [emit]),
    endTurn: useCallback(() => emit('action:end-turn'), [emit]),
    proposeTrade: useCallback((offering: Partial<Record<ResourceType, number>>, requesting: Partial<Record<ResourceType, number>>) => emit('action:propose-trade', offering, requesting), [emit]),
    acceptTrade: useCallback((tradeId: string) => emit('action:accept-trade', tradeId), [emit]),
    rejectTrade: useCallback((tradeId: string) => emit('action:reject-trade', tradeId), [emit]),
    cancelTrade: useCallback(() => emit('action:cancel-trade'), [emit]),
    confirmTrade: useCallback((tradeId: string, withPlayerId: string) => emit('action:confirm-trade', tradeId, withPlayerId), [emit]),
  };
}
