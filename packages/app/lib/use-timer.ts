'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocket } from './use-socket';

interface TimerState {
  /** Seconds remaining (rounded down), null if no timer */
  remainingSeconds: number | null;
  /** Less than 30 seconds */
  isLow: boolean;
  /** Less than 10 seconds */
  isCritical: boolean;
  /** The player ID whose turn it is */
  playerId: string | null;
}

/**
 * Client-side timer hook.
 * Syncs with server `game:timer-sync` events and uses a local
 * 1-second interval for smooth countdown between syncs.
 */
export function useTimer(initialRemainingMs: number | null, currentPlayerId: string | null): TimerState {
  const { socket } = useSocket();
  const [remainingMs, setRemainingMs] = useState<number | null>(initialRemainingMs);
  const [playerId, setPlayerId] = useState<string | null>(currentPlayerId);
  const lastSyncRef = useRef<number>(Date.now());

  // Update from GameView whenever it changes
  useEffect(() => {
    if (initialRemainingMs != null) {
      setRemainingMs(initialRemainingMs);
      lastSyncRef.current = Date.now();
    }
  }, [initialRemainingMs]);

  useEffect(() => {
    setPlayerId(currentPlayerId);
  }, [currentPlayerId]);

  // Listen for server timer-sync events
  useEffect(() => {
    if (!socket) return;

    const onTimerSync = (data: { remainingMs: number; playerId: string }) => {
      setRemainingMs(data.remainingMs);
      setPlayerId(data.playerId);
      lastSyncRef.current = Date.now();
    };

    const onTimerExpired = (_data: { playerId: string }) => {
      setRemainingMs(0);
    };

    socket.on('game:timer-sync', onTimerSync);
    socket.on('game:timer-expired', onTimerExpired);

    return () => {
      socket.off('game:timer-sync', onTimerSync);
      socket.off('game:timer-expired', onTimerExpired);
    };
  }, [socket]);

  // Local 1-second countdown between server syncs
  useEffect(() => {
    if (remainingMs == null || remainingMs <= 0) return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev == null) return null;
        const elapsed = Date.now() - lastSyncRef.current;
        const computed = prev - 1000;
        return Math.max(0, computed);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingMs != null && remainingMs > 0]);

  const remainingSeconds = remainingMs != null ? Math.ceil(remainingMs / 1000) : null;

  return {
    remainingSeconds,
    isLow: remainingSeconds != null && remainingSeconds <= 30,
    isCritical: remainingSeconds != null && remainingSeconds <= 10,
    playerId,
  };
}
