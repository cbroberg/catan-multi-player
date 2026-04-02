'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket, type TypedSocket } from './socket';
import type { LobbyState } from '@catan/shared';

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}

export function useLobby(gameId: string | null, mode: 'player' | 'observer') {
  const { socket, connected } = useSocket();
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [gameStarted, setGameStarted] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !connected || !gameId) return;

    const onLobbyState = (state: LobbyState) => setLobby(state);
    const onBoardUpdated = (data: { board: any; score: any }) => {
      setLobby((prev) =>
        prev ? { ...prev, board: data.board, balanceScore: data.score } : prev
      );
    };
    const onGameStarting = (data: { gameId: string }) => {
      setGameStarted(data.gameId);
    };

    socket.on('lobby:state', onLobbyState);
    socket.on('lobby:board-updated', onBoardUpdated);
    socket.on('game:starting', onGameStarting);

    // Observe the game if in observer mode (big screen)
    if (mode === 'observer') {
      socket.emit('game:observe', gameId, (response) => {
        if ('lobby' in response) {
          setLobby(response.lobby);
        }
      });
    }

    return () => {
      socket.off('lobby:state', onLobbyState);
      socket.off('lobby:board-updated', onBoardUpdated);
      socket.off('game:starting', onGameStarting);
    };
  }, [socket, connected, gameId, mode]);

  const toggleReady = useCallback(() => {
    if (socket && gameId) socket.emit('player:ready', gameId);
  }, [socket, gameId]);

  const regenerateBoard = useCallback(() => {
    if (socket && gameId) socket.emit('game:regenerate-board', gameId);
  }, [socket, gameId]);

  const startGame = useCallback(
    (callback: (result: { success: boolean } | { error: string }) => void) => {
      if (socket && gameId) socket.emit('game:start', gameId, callback);
    },
    [socket, gameId]
  );

  return { lobby, connected, toggleReady, regenerateBoard, startGame, gameStarted };
}
