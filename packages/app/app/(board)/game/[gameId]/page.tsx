'use client';

import { use } from 'react';
import { useGame } from '@/lib/use-game';
import { GameBoardSVG } from '@/components/board/GameBoardSVG';

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#e5e5e5',
  orange: '#f97316', green: '#22c55e', brown: '#92400e',
};

const PHASE_LABELS: Record<string, string> = {
  SETUP_ROUND_1: 'Setup Runde 1',
  SETUP_ROUND_2: 'Setup Runde 2',
  PLAYING: 'Spiller',
  GAME_OVER: 'Spil Slut',
};

const TURN_PHASE_LABELS: Record<string, string> = {
  PRE_ROLL: 'Kast terninger',
  ROLL_DICE: 'Terningkast',
  ROBBER_DISCARD: 'Kassér kort',
  ROBBER_MOVE: 'Flyt røver',
  ROBBER_STEAL: 'Stjæl kort',
  TRADE_BUILD: 'Handel & Byg',
  END_TURN: 'Afslut tur',
};

export default function BigScreenGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { view, connected, lastDice } = useGame(gameId);

  if (!connected) {
    return <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center"><span className="text-white/50">Forbinder...</span></div>;
  }

  if (!view) {
    return <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center"><span className="text-white/50">Venter på spildata...</span></div>;
  }

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
              <div className="text-xl font-bold text-amber-400">{view.winnerName} vinder!</div>
              <div className="text-sm text-white/50">{view.victoryPoints} Victory Points</div>
            </div>
          ) : (
            <>
              <div className="text-xs text-white/40 uppercase tracking-wide">
                Tur {view.turnNumber} · {PHASE_LABELS[view.phase] ?? view.phase}
              </div>
              {view.turnPhase && (
                <div className="text-xs text-white/30 mt-0.5">
                  {TURN_PHASE_LABELS[view.turnPhase] ?? view.turnPhase}
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
          <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Spillere</div>
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
                      {p.settlements.length}s {p.cities.length}c {p.roads.length}r · {p.resourceCount} kort · {p.knightsPlayed}k
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
          <div className="text-xs text-white/40 uppercase tracking-wide mb-1">Game Log</div>
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

function Die({ value }: { value: number }) {
  return (
    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-black font-bold text-xl shadow-lg">
      {value}
    </div>
  );
}
