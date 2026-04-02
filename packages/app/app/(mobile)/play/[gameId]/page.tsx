'use client';

import { use, useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useGame } from '@/lib/use-game';
import { useTimer } from '@/lib/use-timer';
import { useLobby } from '@/lib/use-socket';
import { GameBoardSVG } from '@/components/board/GameBoardSVG';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ResourceType, HexCoord, GameView } from '@catan/shared';

const RESOURCES: { type: ResourceType; icon: string; color: string }[] = [
  { type: 'lumber', icon: '🪵', color: '#2d6a30' },
  { type: 'brick', icon: '🧱', color: '#d4852e' },
  { type: 'wool', icon: '🐑', color: '#8bc34a' },
  { type: 'grain', icon: '🌾', color: '#fdd835' },
  { type: 'ore', icon: '⛏️', color: '#78909c' },
];

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#e5e5e5',
  orange: '#f97316', green: '#22c55e', brown: '#92400e',
};

type UIMode = null | 'build-settlement' | 'build-road' | 'build-city' | 'move-robber' | 'steal-select' | 'trade-create';

export default function MobilePlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const t = useTranslations();
  const game = useGame(gameId);
  const lobbyHook = useLobby(gameId, 'player');
  const [uiMode, setUIMode] = useState<UIMode>(null);
  const [pendingRobberHex, setPendingRobberHex] = useState<HexCoord | null>(null);
  const [tradeOffer, setTradeOffer] = useState<Record<ResourceType, number>>({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });
  const [tradeRequest, setTradeRequest] = useState<Record<ResourceType, number>>({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });

  const { view, connected, connectionError, lastDice, error, loadFailed } = game;
  const timer = useTimer(view?.turnTimeRemaining ?? null, view?.currentPlayerId ?? null);

  // Vibrate at 10 seconds if it's your turn
  useEffect(() => {
    if (timer.isCritical && timer.remainingSeconds === 10 && view?.currentPlayerId === view?.myPlayerId) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [timer.isCritical, timer.remainingSeconds, view?.currentPlayerId, view?.myPlayerId]);

  // Derived state — safe even when view is null
  const me = view?.players.find((p) => p.id === view.myPlayerId) ?? null;
  const va = view?.validActions ?? null;
  const isSetup = view?.phase === 'SETUP_ROUND_1' || view?.phase === 'SETUP_ROUND_2';
  const isMySetupTurn = view?.setupInfo?.currentPlayerId === view?.myPlayerId;
  const effectiveMode = va?.mustMoveRobber ? 'move-robber' : uiMode;

  // ALL useCallback hooks declared unconditionally (React hooks rule)
  const onVertexClick = useCallback((vertexId: string) => {
    if (isSetup && isMySetupTurn && va?.canBuildSettlement) {
      game.setupSettlement(vertexId);
    } else if (effectiveMode === 'build-settlement') {
      game.buildSettlement(vertexId);
      setUIMode(null);
    } else if (effectiveMode === 'build-city') {
      game.buildCity(vertexId);
      setUIMode(null);
    }
  }, [isSetup, isMySetupTurn, effectiveMode, va, game]);

  const onEdgeClick = useCallback((edgeId: string) => {
    if (isSetup && isMySetupTurn && va?.canBuildRoad) {
      game.setupRoad(edgeId);
    } else if (effectiveMode === 'build-road') {
      game.buildRoad(edgeId);
      setUIMode(null);
    }
  }, [isSetup, isMySetupTurn, effectiveMode, va, game]);

  const onHexClick = useCallback((coord: HexCoord) => {
    if (effectiveMode !== 'move-robber' || !view) return;
    const stealTargets = view.players.filter(
      (p) => p.id !== view.myPlayerId && p.resourceCount > 0 &&
        p.settlements.concat(p.cities).some((vId) => {
          const vertex = view.board.vertices.find((v) => v.id === vId);
          return vertex?.adjacentHexCoords.some((h) => h.q === coord.q && h.r === coord.r);
        })
    );
    if (stealTargets.length <= 1) {
      game.moveRobber(coord, stealTargets[0]?.id);
      setUIMode(null);
    } else {
      setPendingRobberHex(coord);
      setUIMode('steal-select');
    }
  }, [effectiveMode, game, view]);

  // Highlights — computed from current state
  const highlightVertices = useMemo(() => {
    if (!va) return [];
    if (isSetup && isMySetupTurn && va.canBuildSettlement) return va.validSettlementSpots;
    if (effectiveMode === 'build-settlement') return va.validSettlementSpots;
    if (effectiveMode === 'build-city') return me?.settlements ?? [];
    return [];
  }, [va, isSetup, isMySetupTurn, effectiveMode, me]);

  const highlightEdges = useMemo(() => {
    if (!va) return [];
    if (isSetup && isMySetupTurn && va.canBuildRoad) return va.validRoadSpots;
    if (effectiveMode === 'build-road') return va.validRoadSpots;
    return [];
  }, [va, isSetup, isMySetupTurn, effectiveMode]);

  const highlightHexes = useMemo(() => {
    if (!va) return [];
    if (effectiveMode === 'move-robber') return va.validRobberHexes;
    return [];
  }, [va, effectiveMode]);

  // ═══ RENDER ═══════════════════════════════════════════════════════════

  if (!connected) {
    return (
      <Screen>
        {connectionError ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-red-400 text-sm">{t('common.connectionFailed')}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm cursor-pointer">{t('common.retry')}</button>
          </div>
        ) : (
          <LoadingSpinner message={t('common.connecting')} />
        )}
      </Screen>
    );
  }

  // Pre-game lobby waiting room
  if (!view && lobbyHook.lobby && !lobbyHook.gameStarted) {
    const playerId = typeof window !== 'undefined' ? sessionStorage.getItem('playerId') : null;
    const lobbyMe = lobbyHook.lobby.players.find((p) => p.id === playerId);
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-3xl">{lobbyMe?.avatar ?? '🎮'}</div>
        <h1 className="text-xl font-bold">{lobbyMe?.name ?? t('game.player')}</h1>
        <div className="text-white/50 text-sm">
          {t('lobby.game')}: <span className="font-mono text-amber-400">{lobbyHook.lobby.code}</span>
          <span className="ml-2">{lobbyHook.lobby.players.length}/{lobbyHook.lobby.maxPlayers} {t('lobby.playersCount')}</span>
        </div>
        <div className="space-y-1 text-sm">
          {lobbyHook.lobby.players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 justify-center">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HEX[p.color] }} />
              <span className={p.id === playerId ? 'font-bold' : ''}>{p.name}</span>
              {p.isReady && <span className="text-emerald-400">✓</span>}
            </div>
          ))}
        </div>
        <button data-action="ready" onClick={lobbyHook.toggleReady}
          className={`px-8 py-3 rounded-xl font-bold text-lg cursor-pointer ${lobbyMe?.isReady ? 'bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}>
          {lobbyMe?.isReady ? `✓ ${t('game.readyButton.ready')}` : t('game.readyButton.notReady')}
        </button>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-400 text-sm">{t('game.loadingFailed')}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm cursor-pointer">{t('common.retry')}</button>
        </div>
      </Screen>
    );
  }

  if (!view || !va) return <Screen><LoadingSpinner message={t('common.gameStarting')} /></Screen>;

  const currentPlayer = view.players.find((p) => p.id === view.currentPlayerId);
  const isMyTurn = view.currentPlayerId === view.myPlayerId;

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0a1525] border-b border-white/10">
        <div className="flex items-center gap-2">
          {currentPlayer && (
            <>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HEX[currentPlayer.color] }} />
              <span className="text-sm font-medium">{isMyTurn ? t('game.yourTurn') : t('game.playerTurn', { name: currentPlayer.name })}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {view.phase !== 'GAME_OVER' && timer.remainingSeconds != null && (
            <MobileTimer seconds={timer.remainingSeconds} isLow={timer.isLow} isCritical={timer.isCritical} />
          )}
          <div className="text-xs text-white/40">{t('game.turn')} {view.turnNumber} · {me?.vp ?? 0} VP</div>
        </div>
      </div>

      {/* Mini board */}
      <div className="h-52 flex-shrink-0 p-1 overflow-hidden">
        <GameBoardSVG view={view} hexSize={20}
          onVertexClick={onVertexClick} onEdgeClick={onEdgeClick} onHexClick={onHexClick}
          highlightVertices={highlightVertices} highlightEdges={highlightEdges} highlightHexes={highlightHexes} />
      </div>

      {error && <div className="mx-3 px-3 py-1.5 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">{error}</div>}

      {lastDice && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Die value={lastDice.d1} /><Die value={lastDice.d2} />
          <span className="text-sm font-bold text-amber-400 ml-1">= {lastDice.total}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {/* Setup */}
        {isSetup && (
          <div className="text-center py-2" data-phase="setup">
            {isMySetupTurn ? (
              <div className="text-amber-400 font-bold">
                {va.canBuildSettlement ? `🏠 ${t('game.setup.placeSettlement')}` : `🛤️ ${t('game.setup.placeRoad')}`}
                <div className="text-xs text-white/50 mt-1">{t('game.setup.round', { round: view.setupInfo?.round ?? 1 })}</div>
              </div>
            ) : (
              <div className="text-white/40">{t('game.setup.waitingFor', { name: view.setupInfo?.currentPlayerName ?? '' })}</div>
            )}
          </div>
        )}

        {/* Discard */}
        {va.mustDiscard && (
          <button data-action="discard" onClick={() => game.discardCards(autoDiscard(view.myResources))}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold cursor-pointer">
            🗑️ {t('game.discard.discardCards', { count: Math.floor(Object.values(view.myResources).reduce((a, b) => a + b, 0) / 2) })}
          </button>
        )}

        {/* Robber */}
        {va.mustMoveRobber && uiMode !== 'steal-select' && (
          <div className="text-center text-amber-400 font-medium py-1">👤 {t('game.robber.chooseHex')}</div>
        )}

        {/* Steal picker */}
        {uiMode === 'steal-select' && pendingRobberHex && (
          <div className="space-y-2">
            <div className="text-center text-sm text-amber-400">{t('game.robber.stealFrom')}</div>
            {view.players.filter((p) => p.id !== view.myPlayerId && p.resourceCount > 0).map((p) => (
              <button key={p.id} data-action="steal" data-player-id={p.id}
                onClick={() => { game.moveRobber(pendingRobberHex, p.id); setUIMode(null); setPendingRobberHex(null); }}
                className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 px-3 cursor-pointer">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLOR_HEX[p.color] }} />
                <span>{p.name}</span><span className="text-white/40 text-xs ml-auto">{p.resourceCount} {t('common.cards')}</span>
              </button>
            ))}
          </div>
        )}

        {/* Roll dice */}
        {va.canRollDice && (
          <button data-action="roll-dice" onClick={game.rollDice}
            className="w-full py-4 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold text-lg cursor-pointer">
            🎲 {t('game.actions.rollDice')}
          </button>
        )}

        {/* Resources */}
        {view.phase === 'PLAYING' && !isSetup && (
          <div className="flex justify-center gap-1">
            {RESOURCES.map((r) => (
              <div key={r.type} className="w-11 h-14 rounded-lg flex flex-col items-center justify-center text-xs"
                style={{ backgroundColor: r.color + '33', borderColor: r.color, borderWidth: 1 }}>
                <span className="text-lg">{r.icon}</span>
                <span className="font-bold">{view.myResources[r.type]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {va.canEndTurn && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Btn action="build-settlement" label={`🏠 ${t('game.actions.buildSettlement')}`} enabled={va.canBuildSettlement}
                active={uiMode === 'build-settlement'}
                onClick={() => setUIMode(uiMode === 'build-settlement' ? null : 'build-settlement')} />
              <Btn action="build-city" label={`🏙️ ${t('game.actions.buildCity')}`} enabled={va.canBuildCity}
                active={uiMode === 'build-city'}
                onClick={() => setUIMode(uiMode === 'build-city' ? null : 'build-city')} />
              <Btn action="build-road" label={`🛤️ ${t('game.actions.buildRoad')}`} enabled={va.canBuildRoad}
                active={uiMode === 'build-road'}
                onClick={() => setUIMode(uiMode === 'build-road' ? null : 'build-road')} />
              <Btn action="buy-dev-card" label={`🃏 ${t('game.actions.buyDevCard')}`} enabled={va.canBuyDevCard} onClick={game.buyDevCard} />
              <Btn action="maritime-trade" label={`🚢 ${t('game.actions.maritimeTrade')}`} enabled={va.canMaritimeTrade}
                onClick={() => quickTrade(game, view.myResources)} />
              <Btn action="end-turn" label={`⏭️ ${t('game.actions.endTurn')}`} enabled={va.canEndTurn} onClick={game.endTurn} accent />
            </div>
          </>
        )}
      </div>

      {/* Game over */}
      {view.phase === 'GAME_OVER' && view.winnerName && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0a1525] rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">👑</div>
            <div className="text-2xl font-bold text-amber-400">{t('game.gameOver.winner', { name: view.winnerName })}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">{children}</div>;
}

function Die({ value }: { value: number }) {
  return <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black font-bold text-sm shadow">{value}</div>;
}

function Btn({ action, label, enabled, active, accent, onClick }: {
  action?: string; label: string; enabled: boolean; active?: boolean; accent?: boolean; onClick?: () => void;
}) {
  return (
    <button data-action={action} onClick={enabled ? onClick : undefined}
      className={`py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
        active ? 'bg-amber-600 text-white ring-2 ring-amber-400' :
        accent && enabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
        enabled ? 'bg-white/10 hover:bg-white/20 text-white' :
        'bg-white/5 text-white/20 cursor-not-allowed'
      }`}>{label}</button>
  );
}

function autoDiscard(resources: Record<ResourceType, number>): Partial<Record<ResourceType, number>> {
  const total = Object.values(resources).reduce((a, b) => a + b, 0);
  const needed = Math.floor(total / 2);
  const result: Partial<Record<ResourceType, number>> = {};
  let rem = needed;
  for (const [res, count] of (Object.entries(resources) as [ResourceType, number][]).sort((a, b) => b[1] - a[1])) {
    if (rem <= 0) break;
    const d = Math.min(count, rem);
    if (d > 0) { result[res] = d; rem -= d; }
  }
  return result;
}

function MobileTimer({ seconds, isLow, isCritical }: { seconds: number; isLow: boolean; isCritical: boolean }) {
  const color = isCritical ? '#ef4444' : isLow ? '#eab308' : '#22c55e';
  return (
    <span
      className={`text-sm font-bold tabular-nums ${isCritical ? 'animate-pulse' : ''}`}
      style={{ color }}
    >
      {seconds}s
    </span>
  );
}

function quickTrade(game: ReturnType<typeof useGame>, resources: Record<ResourceType, number>) {
  const types: ResourceType[] = ['lumber', 'brick', 'wool', 'grain', 'ore'];
  const max = types.reduce((a, b) => resources[a] >= resources[b] ? a : b);
  const min = types.reduce((a, b) => resources[a] <= resources[b] ? a : b);
  if (max !== min && resources[max] >= 4) game.maritimeTrade(max, min);
}
