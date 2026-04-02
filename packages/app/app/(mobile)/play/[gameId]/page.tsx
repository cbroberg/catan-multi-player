'use client';

import { use, useState, useCallback } from 'react';
import { useGame } from '@/lib/use-game';
import { GameBoardSVG } from '@/components/board/GameBoardSVG';
import type { ResourceType, HexCoord } from '@catan/shared';

const RESOURCES: { type: ResourceType; label: string; icon: string; color: string }[] = [
  { type: 'lumber', label: 'Lumber', icon: '🪵', color: '#2d6a30' },
  { type: 'brick', label: 'Brick', icon: '🧱', color: '#d4852e' },
  { type: 'wool', label: 'Wool', icon: '🐑', color: '#8bc34a' },
  { type: 'grain', label: 'Grain', icon: '🌾', color: '#fdd835' },
  { type: 'ore', label: 'Ore', icon: '⛏️', color: '#78909c' },
];

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#e5e5e5',
  orange: '#f97316', green: '#22c55e', brown: '#92400e',
};

type ActionMode = null | 'build-settlement' | 'build-road' | 'build-city' | 'move-robber';

export default function MobilePlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const game = useGame(gameId);
  const [actionMode, setActionMode] = useState<ActionMode>(null);

  const { view, connected, lastDice, error } = game;

  if (!connected) {
    return <Loading text="Forbinder..." />;
  }

  if (!view) {
    return <Loading text="Venter på spildata..." />;
  }

  const me = view.players.find((p) => p.id === view.myPlayerId);
  const isMyTurn = view.currentPlayerId === view.myPlayerId;
  const va = view.validActions;
  const currentPlayer = view.players.find((p) => p.id === view.currentPlayerId);

  // Board interaction handlers
  const onVertexClick = useCallback((vertexId: string) => {
    if (actionMode === 'build-settlement') {
      game.buildSettlement(vertexId);
      setActionMode(null);
    } else if (actionMode === 'build-city') {
      game.buildCity(vertexId);
      setActionMode(null);
    }
  }, [actionMode, game]);

  const onEdgeClick = useCallback((edgeId: string) => {
    if (actionMode === 'build-road') {
      game.buildRoad(edgeId);
      setActionMode(null);
    }
  }, [actionMode, game]);

  const onHexClick = useCallback((coord: HexCoord) => {
    if (actionMode === 'move-robber' || va.mustMoveRobber) {
      // For now, steal from first available player
      const targets = view!.players.filter((p) => p.id !== view!.myPlayerId);
      game.moveRobber(coord, targets[0]?.id);
      setActionMode(null);
    }
  }, [actionMode, va.mustMoveRobber, game, view]);

  // Auto-enter robber mode
  const effectiveMode = va.mustMoveRobber ? 'move-robber' : actionMode;

  // Highlights based on mode
  const highlightVertices = effectiveMode === 'build-settlement' ? va.validSettlementSpots :
    effectiveMode === 'build-city' ? (me?.settlements ?? []) : [];
  const highlightEdges = effectiveMode === 'build-road' ? va.validRoadSpots : [];
  const highlightHexes = effectiveMode === 'move-robber' ? va.validRobberHexes : [];

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0a1525] border-b border-white/10">
        <div className="flex items-center gap-2">
          {currentPlayer && (
            <>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HEX[currentPlayer.color] }} />
              <span className="text-sm font-medium">{isMyTurn ? 'Din tur' : `${currentPlayer.name}s tur`}</span>
            </>
          )}
        </div>
        <div className="text-xs text-white/40">Tur {view.turnNumber} · {me?.vp ?? 0} VP</div>
      </div>

      {/* Mini board */}
      <div className="h-56 flex-shrink-0 p-1 overflow-hidden">
        <GameBoardSVG
          view={view}
          hexSize={22}
          onVertexClick={onVertexClick}
          onEdgeClick={onEdgeClick}
          onHexClick={onHexClick}
          highlightVertices={highlightVertices}
          highlightEdges={highlightEdges}
          highlightHexes={highlightHexes}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 px-3 py-1.5 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Dice */}
      {lastDice && (
        <div className="flex items-center justify-center gap-2 py-2">
          <MiniDie value={lastDice.d1} />
          <MiniDie value={lastDice.d2} />
          <span className="text-sm font-bold text-amber-400 ml-1">= {lastDice.total}</span>
        </div>
      )}

      {/* Resource hand */}
      <div className="flex justify-center gap-1 px-3 py-2">
        {RESOURCES.map((r) => (
          <div key={r.type} className="flex flex-col items-center gap-0.5">
            <div className="w-11 h-14 rounded-lg flex flex-col items-center justify-center text-xs"
              style={{ backgroundColor: r.color + '33', borderColor: r.color, borderWidth: 1 }}>
              <span className="text-lg">{r.icon}</span>
              <span className="font-bold">{view.myResources[r.type]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex-1 px-3 py-2 space-y-2">
        {/* Must discard */}
        {va.mustDiscard && (
          <button
            onClick={() => game.discardCards(autoDiscard(view.myResources))}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold cursor-pointer"
          >
            🗑️ Kassér halvdelen ({Math.floor(Object.values(view.myResources).reduce((a, b) => a + b, 0) / 2)} kort)
          </button>
        )}

        {/* Roll dice */}
        {va.canRollDice && (
          <button
            onClick={game.rollDice}
            className="w-full py-4 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold text-lg cursor-pointer"
          >
            🎲 Kast Terninger
          </button>
        )}

        {/* Must move robber */}
        {va.mustMoveRobber && (
          <div className="text-center text-sm text-amber-400 font-medium py-2">
            👤 Vælg en hex at flytte røveren til
          </div>
        )}

        {/* Build actions */}
        {va.canEndTurn && (
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn
              label="🏠 Settlement"
              enabled={va.canBuildSettlement}
              active={actionMode === 'build-settlement'}
              onClick={() => setActionMode(actionMode === 'build-settlement' ? null : 'build-settlement')}
            />
            <ActionBtn
              label="🏙️ City"
              enabled={va.canBuildCity}
              active={actionMode === 'build-city'}
              onClick={() => setActionMode(actionMode === 'build-city' ? null : 'build-city')}
            />
            <ActionBtn
              label="🛤️ Road"
              enabled={va.canBuildRoad}
              active={actionMode === 'build-road'}
              onClick={() => setActionMode(actionMode === 'build-road' ? null : 'build-road')}
            />
            <ActionBtn
              label="🃏 Dev Card"
              enabled={va.canBuyDevCard}
              onClick={game.buyDevCard}
            />
            <ActionBtn
              label="🚢 Trade 4:1"
              enabled={va.canMaritimeTrade}
              onClick={() => autoTrade(game, view.myResources)}
            />
            <ActionBtn
              label="⏭️ End Turn"
              enabled={va.canEndTurn}
              onClick={game.endTurn}
              accent
            />
          </div>
        )}

        {/* Dev cards in hand */}
        {view.myDevCards.length > 0 && va.canPlayDevCard && (
          <div>
            <div className="text-xs text-white/40 mb-1">Dev Cards</div>
            <div className="flex gap-1 flex-wrap">
              {view.myDevCards.map((card, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (card === 'knight') {
                      setActionMode('move-robber');
                      // Knight will be played when robber is moved
                    } else if (card === 'monopoly') {
                      game.playMonopoly('ore'); // Simple auto-choice
                    } else if (card === 'year_of_plenty') {
                      game.playYearOfPlenty('grain', 'ore');
                    } else if (card === 'road_building') {
                      // Would need 2-step edge selection; simplified for now
                      const spots = view.validActions.validRoadSpots;
                      if (spots.length >= 2) game.playRoadBuilding(spots[0], spots[1]);
                    }
                  }}
                  className="px-2 py-1 bg-purple-900/50 border border-purple-700 rounded text-xs cursor-pointer hover:bg-purple-800/50"
                >
                  {card === 'knight' ? '⚔️' : card === 'victory_point' ? '🏆' : card === 'monopoly' ? '💰' : card === 'year_of_plenty' ? '🎁' : '🛤️'}
                  {' '}{card.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game over */}
      {view.phase === 'GAME_OVER' && view.winnerName && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0a1525] rounded-2xl p-8 text-center max-w-xs">
            <div className="text-5xl mb-3">👑</div>
            <div className="text-2xl font-bold text-amber-400">{view.winnerName} vinder!</div>
            <div className="text-white/50 mt-2">{view.victoryPoints} VP</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center"><span className="text-white/50">{text}</span></div>;
}

function MiniDie({ value }: { value: number }) {
  return <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black font-bold text-sm shadow">{value}</div>;
}

function ActionBtn({ label, enabled, active, accent, onClick }: {
  label: string; enabled: boolean; active?: boolean; accent?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={enabled ? onClick : undefined}
      className={`py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active ? 'bg-amber-600 text-white ring-2 ring-amber-400' :
        accent && enabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
        enabled ? 'bg-white/10 hover:bg-white/20 text-white' :
        'bg-white/5 text-white/20 cursor-not-allowed'
      }`}
    >
      {label}
    </button>
  );
}

function autoDiscard(resources: Record<ResourceType, number>): Partial<Record<ResourceType, number>> {
  const total = Object.values(resources).reduce((a, b) => a + b, 0);
  const needed = Math.floor(total / 2);
  const result: Partial<Record<ResourceType, number>> = {};
  let remaining = needed;
  const sorted = (Object.entries(resources) as [ResourceType, number][]).sort((a, b) => b[1] - a[1]);
  for (const [res, count] of sorted) {
    if (remaining <= 0) break;
    const discard = Math.min(count, remaining);
    if (discard > 0) { result[res] = discard; remaining -= discard; }
  }
  return result;
}

function autoTrade(game: ReturnType<typeof useGame>, resources: Record<ResourceType, number>) {
  const types: ResourceType[] = ['lumber', 'brick', 'wool', 'grain', 'ore'];
  const maxRes = types.reduce((a, b) => resources[a] >= resources[b] ? a : b);
  const minRes = types.reduce((a, b) => resources[a] <= resources[b] ? a : b);
  if (maxRes !== minRes && resources[maxRes] >= 4) {
    game.maritimeTrade(maxRes, minRes);
  }
}
