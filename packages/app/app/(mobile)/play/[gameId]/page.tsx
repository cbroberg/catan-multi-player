'use client';

import { use, useState, useCallback } from 'react';
import { useGame } from '@/lib/use-game';
import { GameBoardSVG } from '@/components/board/GameBoardSVG';
import type { ResourceType, HexCoord, GameView } from '@catan/shared';

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

type UIMode = null | 'build-settlement' | 'build-road' | 'build-city' | 'move-robber' | 'steal-select' | 'trade-create' | 'resource-pick';

export default function MobilePlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const game = useGame(gameId);
  const [uiMode, setUIMode] = useState<UIMode>(null);
  const [pendingRobberHex, setPendingRobberHex] = useState<HexCoord | null>(null);
  const [tradeOffer, setTradeOffer] = useState<Record<ResourceType, number>>({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });
  const [tradeRequest, setTradeRequest] = useState<Record<ResourceType, number>>({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });
  const [resourcePickCallback, setResourcePickCallback] = useState<((res: ResourceType) => void) | null>(null);

  const { view, connected, lastDice, error } = game;

  if (!connected) return <Screen text="Forbinder..." />;
  if (!view) return <Screen text="Venter på spildata..." />;

  const me = view.players.find((p) => p.id === view.myPlayerId);
  const va = view.validActions;
  const isSetup = view.phase === 'SETUP_ROUND_1' || view.phase === 'SETUP_ROUND_2';
  const isMySetupTurn = view.setupInfo?.currentPlayerId === view.myPlayerId;

  // Auto-modes
  const effectiveMode = va.mustMoveRobber ? 'move-robber' : uiMode;

  // Board interaction
  const onVertexClick = useCallback((vertexId: string) => {
    if (isSetup && isMySetupTurn && va.canBuildSettlement) {
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
    if (isSetup && isMySetupTurn && va.canBuildRoad) {
      game.setupRoad(edgeId);
    } else if (effectiveMode === 'build-road') {
      game.buildRoad(edgeId);
      setUIMode(null);
    }
  }, [isSetup, isMySetupTurn, effectiveMode, va, game]);

  const onHexClick = useCallback((coord: HexCoord) => {
    if (effectiveMode === 'move-robber') {
      // Check who can be stolen from
      const stealTargets = view!.players.filter(
        (p) => p.id !== view!.myPlayerId && p.resourceCount > 0 &&
          p.settlements.concat(p.cities).some((vId) => {
            const vertex = view!.board.vertices.find((v) => v.id === vId);
            return vertex?.adjacentHexCoords.some((h) => h.q === coord.q && h.r === coord.r);
          })
      );

      if (stealTargets.length === 0) {
        game.moveRobber(coord);
        setUIMode(null);
      } else if (stealTargets.length === 1) {
        game.moveRobber(coord, stealTargets[0].id);
        setUIMode(null);
      } else {
        // Multiple targets — show picker
        setPendingRobberHex(coord);
        setUIMode('steal-select');
      }
    }
  }, [effectiveMode, game, view]);

  // Highlights
  const highlightVertices = (isSetup && isMySetupTurn && va.canBuildSettlement) ? va.validSettlementSpots :
    effectiveMode === 'build-settlement' ? va.validSettlementSpots :
    effectiveMode === 'build-city' ? (me?.settlements ?? []) : [];
  const highlightEdges = (isSetup && isMySetupTurn && va.canBuildRoad) ? va.validRoadSpots :
    effectiveMode === 'build-road' ? va.validRoadSpots : [];
  const highlightHexes = effectiveMode === 'move-robber' ? va.validRobberHexes : [];

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col">
      {/* Header */}
      <Header view={view} me={me} />

      {/* Mini board */}
      <div className="h-52 flex-shrink-0 p-1 overflow-hidden">
        <GameBoardSVG view={view} hexSize={20}
          onVertexClick={onVertexClick} onEdgeClick={onEdgeClick} onHexClick={onHexClick}
          highlightVertices={highlightVertices} highlightEdges={highlightEdges} highlightHexes={highlightHexes} />
      </div>

      {/* Error */}
      {error && <div className="mx-3 px-3 py-1.5 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">{error}</div>}

      {/* Dice */}
      {lastDice && (
        <div className="flex items-center justify-center gap-2 py-1">
          <MiniDie value={lastDice.d1} /><MiniDie value={lastDice.d2} />
          <span className="text-sm font-bold text-amber-400 ml-1">= {lastDice.total}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {/* ─── SETUP PHASE ─── */}
        {isSetup && (
          <div className="text-center py-2">
            {isMySetupTurn ? (
              <div className="text-amber-400 font-bold">
                {va.canBuildSettlement ? '🏠 Placér din settlement' : '🛤️ Placér din road'}
                <div className="text-xs text-white/50 mt-1">Runde {view.setupInfo?.round} — Tryk på boardet</div>
              </div>
            ) : (
              <div className="text-white/40">Venter på {view.setupInfo?.currentPlayerName}...</div>
            )}
          </div>
        )}

        {/* ─── MUST DISCARD ─── */}
        {va.mustDiscard && (
          <button onClick={() => game.discardCards(autoDiscard(view.myResources))}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold cursor-pointer">
            🗑️ Kassér {Math.floor(Object.values(view.myResources).reduce((a, b) => a + b, 0) / 2)} kort
          </button>
        )}

        {/* ─── MUST MOVE ROBBER ─── */}
        {va.mustMoveRobber && uiMode !== 'steal-select' && (
          <div className="text-center text-amber-400 font-medium py-1">👤 Vælg hex for røveren</div>
        )}

        {/* ─── STEAL TARGET PICKER ─── */}
        {uiMode === 'steal-select' && pendingRobberHex && (
          <div className="space-y-2">
            <div className="text-center text-sm text-amber-400 font-medium">Stjæl fra hvem?</div>
            {view.players.filter((p) => p.id !== view.myPlayerId && p.resourceCount > 0).map((p) => (
              <button key={p.id} onClick={() => { game.moveRobber(pendingRobberHex, p.id); setUIMode(null); setPendingRobberHex(null); }}
                className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 px-3 cursor-pointer">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLOR_HEX[p.color] }} />
                <span>{p.name}</span>
                <span className="text-white/40 text-xs ml-auto">{p.resourceCount} kort</span>
              </button>
            ))}
          </div>
        )}

        {/* ─── PLAYING: ROLL DICE ─── */}
        {va.canRollDice && (
          <button onClick={game.rollDice}
            className="w-full py-4 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold text-lg cursor-pointer">
            🎲 Kast Terninger
          </button>
        )}

        {/* ─── PLAYING: RESOURCE HAND ─── */}
        {view.phase === 'PLAYING' && (
          <div className="flex justify-center gap-1">
            {RESOURCES.map((r) => (
              <div key={r.type} className="flex flex-col items-center">
                <div className="w-11 h-14 rounded-lg flex flex-col items-center justify-center text-xs"
                  style={{ backgroundColor: r.color + '33', borderColor: r.color, borderWidth: 1 }}>
                  <span className="text-lg">{r.icon}</span>
                  <span className="font-bold">{view.myResources[r.type]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── PLAYING: ACTIONS ─── */}
        {va.canEndTurn && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn label="🏠 Settlement" enabled={va.canBuildSettlement}
                active={uiMode === 'build-settlement'}
                onClick={() => setUIMode(uiMode === 'build-settlement' ? null : 'build-settlement')} />
              <ActionBtn label="🏙️ City" enabled={va.canBuildCity}
                active={uiMode === 'build-city'}
                onClick={() => setUIMode(uiMode === 'build-city' ? null : 'build-city')} />
              <ActionBtn label="🛤️ Road" enabled={va.canBuildRoad}
                active={uiMode === 'build-road'}
                onClick={() => setUIMode(uiMode === 'build-road' ? null : 'build-road')} />
              <ActionBtn label="🃏 Dev Card" enabled={va.canBuyDevCard} onClick={game.buyDevCard} />
            </div>

            {/* Trade row */}
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn label="🤝 Tilbyd handel" enabled={va.canMaritimeTrade}
                onClick={() => setUIMode(uiMode === 'trade-create' ? null : 'trade-create')}
                active={uiMode === 'trade-create'} />
              <ActionBtn label="🚢 Maritime 4:1" enabled={va.canMaritimeTrade}
                onClick={() => quickMaritimeTrade(game, view.myResources)} />
            </div>

            <ActionBtn label="⏭️ Afslut tur" enabled={va.canEndTurn} onClick={game.endTurn} accent />
          </>
        )}

        {/* ─── TRADE CREATE UI ─── */}
        {uiMode === 'trade-create' && (
          <TradeCreatePanel
            myResources={view.myResources}
            offering={tradeOffer}
            requesting={tradeRequest}
            setOffering={setTradeOffer}
            setRequesting={setTradeRequest}
            onPropose={() => {
              const off = filterZero(tradeOffer);
              const req = filterZero(tradeRequest);
              if (Object.keys(off).length > 0 && Object.keys(req).length > 0) {
                game.proposeTrade(off, req);
                setUIMode(null);
              }
            }}
            onCancel={() => setUIMode(null)}
          />
        )}

        {/* ─── ACTIVE TRADE (from another player) ─── */}
        {view.activeTrade && view.activeTrade.fromPlayerId !== view.myPlayerId && view.activeTrade.status === 'open' && (
          <TradeResponsePanel trade={view.activeTrade} myId={view.myPlayerId}
            onAccept={() => game.acceptTrade(view.activeTrade!.id)}
            onReject={() => game.rejectTrade(view.activeTrade!.id)} />
        )}

        {/* ─── MY ACTIVE TRADE (waiting for responses) ─── */}
        {view.activeTrade && view.activeTrade.fromPlayerId === view.myPlayerId && view.activeTrade.status === 'open' && (
          <MyTradePanel trade={view.activeTrade} players={view.players}
            onConfirm={(pid) => game.confirmTrade(view.activeTrade!.id, pid)}
            onCancel={game.cancelTrade} />
        )}

        {/* ─── DEV CARDS ─── */}
        {view.myDevCards.length > 0 && va.canPlayDevCard && (
          <DevCardPanel
            cards={view.myDevCards}
            onPlayKnight={() => setUIMode('move-robber')}
            onPlayMonopoly={(res) => game.playMonopoly(res)}
            onPlayYearOfPlenty={(r1, r2) => game.playYearOfPlenty(r1, r2)}
            onPlayRoadBuilding={() => {
              const spots = va.validRoadSpots;
              if (spots.length >= 2) game.playRoadBuilding(spots[0], spots[1]);
              else if (spots.length === 1) game.playRoadBuilding(spots[0]);
            }}
          />
        )}
      </div>

      {/* ─── GAME OVER ─── */}
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

// ─── Sub Components ──────────────────────────────────────────────────────────

function Screen({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center"><span className="text-white/50">{text}</span></div>;
}

function Header({ view, me }: { view: GameView; me: any }) {
  const currentPlayer = view.players.find((p) => p.id === view.currentPlayerId);
  const isMyTurn = view.currentPlayerId === view.myPlayerId;
  return (
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
  );
}

function MiniDie({ value }: { value: number }) {
  return <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black font-bold text-sm shadow">{value}</div>;
}

function ActionBtn({ label, enabled, active, accent, onClick }: {
  label: string; enabled: boolean; active?: boolean; accent?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={enabled ? onClick : undefined}
      className={`py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active ? 'bg-amber-600 text-white ring-2 ring-amber-400' :
        accent && enabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
        enabled ? 'bg-white/10 hover:bg-white/20 text-white' :
        'bg-white/5 text-white/20 cursor-not-allowed'
      }`}
    >{label}</button>
  );
}

function TradeCreatePanel({ myResources, offering, requesting, setOffering, setRequesting, onPropose, onCancel }: {
  myResources: Record<ResourceType, number>;
  offering: Record<ResourceType, number>;
  requesting: Record<ResourceType, number>;
  setOffering: (v: Record<ResourceType, number>) => void;
  setRequesting: (v: Record<ResourceType, number>) => void;
  onPropose: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-3 space-y-2">
      <div className="text-xs text-white/40 uppercase">Jeg giver:</div>
      <ResourcePicker values={offering} max={myResources} onChange={setOffering} />
      <div className="text-xs text-white/40 uppercase">Jeg vil have:</div>
      <ResourcePicker values={requesting} onChange={setRequesting} />
      <div className="flex gap-2">
        <button onClick={onPropose} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium cursor-pointer">Send tilbud</button>
        <button onClick={onCancel} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm cursor-pointer">Annullér</button>
      </div>
    </div>
  );
}

function ResourcePicker({ values, max, onChange }: {
  values: Record<ResourceType, number>;
  max?: Record<ResourceType, number>;
  onChange: (v: Record<ResourceType, number>) => void;
}) {
  return (
    <div className="flex gap-1 justify-center">
      {RESOURCES.map((r) => (
        <div key={r.type} className="flex flex-col items-center gap-0.5">
          <button onClick={() => onChange({ ...values, [r.type]: Math.min((max?.[r.type] ?? 99), values[r.type] + 1) })}
            className="w-8 h-6 bg-white/10 rounded text-xs cursor-pointer hover:bg-white/20">+</button>
          <div className="text-sm font-bold">{values[r.type]}</div>
          <span className="text-xs">{r.icon}</span>
          <button onClick={() => onChange({ ...values, [r.type]: Math.max(0, values[r.type] - 1) })}
            className="w-8 h-6 bg-white/10 rounded text-xs cursor-pointer hover:bg-white/20">-</button>
        </div>
      ))}
    </div>
  );
}

function TradeResponsePanel({ trade, myId, onAccept, onReject }: {
  trade: GameView['activeTrade']; myId: string;
  onAccept: () => void; onReject: () => void;
}) {
  if (!trade) return null;
  const alreadyResponded = trade.accepted.includes(myId) || trade.rejected.includes(myId);
  return (
    <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 space-y-2">
      <div className="text-sm font-medium text-amber-400">🤝 {trade.fromPlayerName} tilbyder handel</div>
      <div className="text-xs text-white/60">
        Giver: {formatResources(trade.offering)} → Vil have: {formatResources(trade.requesting)}
      </div>
      {!alreadyResponded ? (
        <div className="flex gap-2">
          <button onClick={onAccept} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium cursor-pointer">✓ Acceptér</button>
          <button onClick={onReject} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium cursor-pointer">✗ Afvis</button>
        </div>
      ) : (
        <div className="text-xs text-white/40">Du har svaret.</div>
      )}
    </div>
  );
}

function MyTradePanel({ trade, players, onConfirm, onCancel }: {
  trade: GameView['activeTrade'];
  players: GameView['players'];
  onConfirm: (playerId: string) => void;
  onCancel: () => void;
}) {
  if (!trade) return null;
  return (
    <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 space-y-2">
      <div className="text-sm font-medium text-emerald-400">📨 Dit handelstilbud er aktivt</div>
      <div className="text-xs text-white/60">
        Giver: {formatResources(trade.offering)} → Vil have: {formatResources(trade.requesting)}
      </div>
      {trade.accepted.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-emerald-400">Accepteret af:</div>
          {trade.accepted.map((pid) => {
            const p = players.find((pl) => pl.id === pid);
            return (
              <button key={pid} onClick={() => onConfirm(pid)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm flex items-center gap-2 px-3 cursor-pointer">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HEX[p?.color ?? ''] }} />
                <span>Handel med {p?.name}</span>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={onCancel} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm cursor-pointer">Annullér tilbud</button>
    </div>
  );
}

function DevCardPanel({ cards, onPlayKnight, onPlayMonopoly, onPlayYearOfPlenty, onPlayRoadBuilding }: {
  cards: string[];
  onPlayKnight: () => void;
  onPlayMonopoly: (res: ResourceType) => void;
  onPlayYearOfPlenty: (r1: ResourceType, r2: ResourceType) => void;
  onPlayRoadBuilding: () => void;
}) {
  const counts: Record<string, number> = {};
  for (const c of cards) counts[c] = (counts[c] || 0) + 1;

  return (
    <div>
      <div className="text-xs text-white/40 mb-1">Dev Cards</div>
      <div className="flex gap-1 flex-wrap">
        {counts.knight && (
          <DevBtn icon="⚔️" label={`Knight (${counts.knight})`} onClick={onPlayKnight} />
        )}
        {counts.monopoly && (
          <DevBtn icon="💰" label={`Monopoly (${counts.monopoly})`}
            onClick={() => onPlayMonopoly('ore')} />
        )}
        {counts.year_of_plenty && (
          <DevBtn icon="🎁" label={`Year of Plenty (${counts.year_of_plenty})`}
            onClick={() => onPlayYearOfPlenty('grain', 'ore')} />
        )}
        {counts.road_building && (
          <DevBtn icon="🛤️" label={`Road Building (${counts.road_building})`}
            onClick={onPlayRoadBuilding} />
        )}
        {counts.victory_point && (
          <div className="px-2 py-1 bg-amber-900/50 border border-amber-700 rounded text-xs">
            🏆 VP ({counts.victory_point})
          </div>
        )}
      </div>
    </div>
  );
}

function DevBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-2 py-1 bg-purple-900/50 border border-purple-700 rounded text-xs cursor-pointer hover:bg-purple-800/50">
      {icon} {label}
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatResources(res: Partial<Record<ResourceType, number>> | undefined): string {
  if (!res) return '';
  return Object.entries(res).filter(([_, v]) => v && v > 0).map(([k, v]) => `${v} ${k}`).join(', ');
}

function filterZero(r: Record<ResourceType, number>): Partial<Record<ResourceType, number>> {
  const result: Partial<Record<ResourceType, number>> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v > 0) result[k as ResourceType] = v;
  }
  return result;
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

function quickMaritimeTrade(game: ReturnType<typeof useGame>, resources: Record<ResourceType, number>) {
  const types: ResourceType[] = ['lumber', 'brick', 'wool', 'grain', 'ore'];
  const maxRes = types.reduce((a, b) => resources[a] >= resources[b] ? a : b);
  const minRes = types.reduce((a, b) => resources[a] <= resources[b] ? a : b);
  if (maxRes !== minRes && resources[maxRes] >= 4) game.maritimeTrade(maxRes, minRes);
}
