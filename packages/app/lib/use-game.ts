'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './use-socket';
import type { GameView, ResourceType, HexCoord } from '@catan/shared';

export function useGame(gameId: string | null) {
  const { socket, connected } = useSocket();
  const [view, setView] = useState<GameView | null>(null);
  const [lastDice, setLastDice] = useState<{ d1: number; d2: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !connected || !gameId) return;

    const onView = (v: GameView) => { setView(v); setError(null); };
    const onError = (msg: string) => setError(msg);
    const onDice = (d: { d1: number; d2: number; total: number }) => setLastDice(d);

    socket.on('game:view', onView);
    socket.on('game:action-error', onError);
    socket.on('game:dice-result', onDice);

    // Request current view
    socket.emit('game:request-view', gameId);

    return () => {
      socket.off('game:view', onView);
      socket.off('game:action-error', onError);
      socket.off('game:dice-result', onDice);
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
    lastDice,
    error,
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
  };
}
