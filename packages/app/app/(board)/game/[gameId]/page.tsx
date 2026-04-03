'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { useGame } from '@/lib/use-game';
import { useTimer } from '@/lib/use-timer';
import { GameBoardSVG } from '@/components/board/GameBoardSVG';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#e5e5e5',
  orange: '#f97316', green: '#22c55e', brown: '#92400e', purple: '#8b5cf6', cyan: '#06b6d4',
};

export default function BigScreenGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { view, connected, connectionError, lastDice, loadFailed } = useGame(gameId);
  const t = useTranslations();

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

  if (loadFailed) {
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-400 text-sm">{t('game.loadingFailed')}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm cursor-pointer">{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">
        <LoadingSpinner message={t('common.waitingForGameData')} />
      </div>
    );
  }

  const timer = useTimer(view?.turnTimeRemaining ?? null, view?.currentPlayerId ?? null);
  const currentPlayer = view.players.find((p) => p.id === view.currentPlayerId);

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex">
      {/* Board */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-2 overflow-hidden">
        <GameBoardSVG view={view} hexSize={46} />
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-[#0a1525] border-l border-white/10 flex flex-col">
        {/* Turn info */}
        <div className="p-4 border-b border-white/10 text-center">
          {view.phase === 'GAME_OVER' && view.winnerName ? (
            <div>
              <div className="text-3xl mb-1">👑</div>
              <div className="text-xl font-bold text-amber-400">{t('game.gameOver.winner', { name: view.winnerName })}</div>
              <div className="text-sm text-white/50">{view.victoryPoints} {t('game.gameOver.victoryPoints')}</div>
            </div>
          ) : (
            <>
              <div className="text-xs text-white/40 uppercase tracking-wide">
                {t('game.turn')} {view.turnNumber} · {t(`game.phase.${view.phase}`)}
              </div>
              {view.turnPhase && (
                <div className="text-xs text-white/30 mt-0.5">
                  {t(`game.turnPhase.${view.turnPhase}`)}
                </div>
              )}
              {currentPlayer && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLOR_HEX[currentPlayer.color] }} />
                  <span className="text-lg font-bold">{currentPlayer.name}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Timer */}
        {view.phase !== 'GAME_OVER' && timer.remainingSeconds != null && (
          <div className="px-4 py-3 border-b border-white/10">
            <TurnTimer seconds={timer.remainingSeconds} isLow={timer.isLow} isCritical={timer.isCritical} />
          </div>
        )}

        {/* Dice */}
        {lastDice && (
          <div className="flex items-center justify-center gap-3 py-3 border-b border-white/10">
            <Die value={lastDice.d1} />
            <Die value={lastDice.d2} />
            <span className="text-xl font-bold text-amber-400 ml-2">= {lastDice.total}</span>
          </div>
        )}

        {/* Scoreboard */}
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-2">{t('common.players')}</div>
          <div className="space-y-1.5">
            {view.players.map((p) => {
              const isCurrent = p.id === view.currentPlayerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    isCurrent ? 'bg-white/10 ring-1 ring-amber-500/50' : 'bg-white/5'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLOR_HEX[p.color] }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {p.name}
                      {p.hasLongestRoad && <span className="text-amber-400 text-xs ml-1">🛤️</span>}
                      {p.hasLargestArmy && <span className="text-amber-400 text-xs ml-1">⚔️</span>}
                    </div>
                    <div className="text-xs text-white/30">
                      {p.settlements.length}s {p.cities.length}c {p.roads.length}r · {p.resourceCount} {t('common.cards')} · {p.knightsPlayed}k
                    </div>
                  </div>
                  <div className="text-xl font-bold" style={{ color: COLOR_HEX[p.color] }}>
                    {p.vp}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Log */}
        <div className="h-48 border-t border-white/10 overflow-y-auto p-3">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-1">{t('game.gameLog')}</div>
          <div className="space-y-0.5">
            {view.recentLog.map((entry, i) => (
              <div key={i} className="text-xs text-white/50">
                <span className="text-white/70">{entry.player}</span> {entry.details}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TurnTimer({ seconds, isLow, isCritical }: { seconds: number; isLow: boolean; isCritical: boolean }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const maxSeconds = 120;
  const progress = Math.min(seconds / maxSeconds, 1);
  const strokeDashoffset = circumference * (1 - progress);

  const color = isCritical ? '#ef4444' : isLow ? '#eab308' : '#22c55e';

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-[68px] h-[68px]">
        <svg width="68" height="68" className="transform -rotate-90">
          <circle cx="34" cy="34" r={radius} fill="none" stroke="white" strokeOpacity={0.1} strokeWidth={4} />
          <circle
            cx="34" cy="34" r={radius} fill="none"
            stroke={color} strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums ${isCritical ? 'animate-pulse' : ''}`}
          style={{ color }}
        >
          {seconds}
        </div>
      </div>
    </div>
  );
}

function Die({ value }: { value: number }) {
  return (
    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-black font-bold text-xl shadow-lg">
      {value}
    </div>
  );
}
