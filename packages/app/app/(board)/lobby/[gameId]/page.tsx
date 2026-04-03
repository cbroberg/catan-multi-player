'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLobby } from '@/lib/use-socket';
import { HexBoard } from '@/components/board/HexBoard';
import { QRCodeSVG } from '@/components/lobby/QRCode';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { LobbyPlayer } from '@catan/shared';

const COLOR_HEX: Record<string, string> = {
  red: '#AE0100',
  blue: '#071C8F',
  white: '#f5f5f5',
  orange: '#FFC32B',
  green: '#003224',
  brown: '#461E00', purple: '#8b5cf6', cyan: '#06b6d4',
};

export default function BoardLobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const { lobby, connected, connectionError, regenerateBoard, startGame, gameStarted } = useLobby(gameId, 'observer');

  // Redirect to game view when game starts
  useEffect(() => {
    if (gameStarted) router.push(`/game/${gameStarted}`);
  }, [gameStarted, router]);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && lobby) {
      setJoinUrl(`${window.location.origin}/join?code=${lobby.code}`);
    }
  }, [lobby]);

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">
        {connectionError ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-red-400 text-sm">{t('common.connectionFailed')}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm cursor-pointer">{t('common.retry')}</button>
          </div>
        ) : (
          <LoadingSpinner message={t('common.connecting')} />
        )}
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">
        <LoadingSpinner message={t('lobby.loading')} />
      </div>
    );
  }

  const canStart = lobby.players.length >= 2 && lobby.players.every((p) => p.isReady);

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex">
      {/* Left: Board preview — fill available space */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center p-4 overflow-hidden">
        {lobby.board && (
          <div className="w-full h-full max-h-[calc(100vh-80px)] flex items-center justify-center">
            <HexBoard board={lobby.board} hexSize={50} />
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button
            onClick={regenerateBoard}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm cursor-pointer transition-colors"
          >
            {t('lobby.newBoard')}
          </button>
          {lobby.balanceScore && (
            <span className="px-4 py-2 text-sm text-white/50">
              {t('lobby.balance')}: {lobby.balanceScore.total}/100
            </span>
          )}
        </div>
      </div>

      {/* Right: Lobby info — max height = viewport, scroll if needed */}
      <div className="w-96 bg-[#0a1525] border-l border-white/10 flex flex-col max-h-screen overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 pb-2">
        {/* Game code + QR */}
        <div className="text-center mb-6">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-1">{t('lobby.gameCode')}</div>
          <div data-testid="game-code" className="text-5xl font-mono font-bold tracking-[0.3em] text-amber-400">
            {lobby.code}
          </div>
          <div className="mt-4 flex justify-center">
            {joinUrl && <QRCodeSVG url={joinUrl} size={160} />}
          </div>
          <div className="mt-2 text-xs text-white/30">{t('lobby.scanOrVisit')}</div>
        </div>

        {/* Player list */}
        <div className="flex-1">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-3">
            {t('lobby.players')} ({lobby.players.length}/{lobby.maxPlayers})
          </div>
          <div className="space-y-2">
            {lobby.players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
            {/* Empty slots */}
            {Array.from({ length: lobby.maxPlayers - lobby.players.length }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed border-white/10"
              >
                <div className="w-8 h-8 rounded-full bg-white/5" />
                <span className="text-white/20 text-sm">{t('lobby.waitingForPlayer')}</span>
              </div>
            ))}
          </div>
        </div>

        </div>{/* end scrollable */}

        {/* Start button — pinned at bottom, above dock */}
        <div className="p-4 pt-2 pb-8 border-t border-white/10">
          <button
            data-action="start-game"
            onClick={() => startGame((res) => {
              if ('error' in res) console.error(res.error);
            })}
            disabled={!canStart}
            className={`w-full py-3 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
              canStart
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            {canStart ? t('lobby.startGame') : t('lobby.waitingForPlayers', { ready: lobby.players.filter(p => p.isReady).length, total: lobby.players.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player }: { player: LobbyPlayer }) {
  const t = useTranslations('lobby');
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
        style={{ backgroundColor: COLOR_HEX[player.color] ?? '#666' }}
      >
        {player.avatar || player.name[0]}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{player.name}</div>
        <div className="text-xs text-white/40">
          {player.isHost ? t('host') : player.isReady ? t('ready') : t('notReady')}
        </div>
      </div>
      {player.isReady && (
        <div className="text-emerald-400 text-sm">✓</div>
      )}
    </div>
  );
}
