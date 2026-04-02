import type { GameView, ValidActions, PublicPlayer, BoardBuilding, BoardRoad, ResourceType, HexCoord, TradeOffer } from '@catan/shared';
import { TERRAIN_TO_RESOURCE } from '@catan/shared';
import { GameEngine } from '@catan/game-engine';
import type { PlayerState } from '@catan/game-engine';

/**
 * Build a GameView for a specific player (includes their private hand).
 * For observers (big screen), pass null as playerId to get no private data.
 * Pass activeTrade from the session if there's an ongoing trade offer.
 */
export function buildGameView(
  engine: GameEngine,
  gameId: string,
  playerId: string | null,
  activeTrade?: TradeOffer | null,
  turnTimeRemaining?: number | null
): GameView {
  const state = engine.getState();
  const currentPlayer = engine.currentPlayer();

  // Public players
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    vp: engine.getVP(p),
    resourceCount: Object.values(p.resources).reduce((a, b) => a + b, 0),
    devCardCount: p.developmentCards.length + p.newCards.length,
    knightsPlayed: p.knightsPlayed,
    hasLongestRoad: state.longestRoadHolder === p.id,
    hasLargestArmy: state.largestArmyHolder === p.id,
    settlements: p.settlements,
    cities: p.cities,
    roads: p.roads,
  }));

  // Buildings and roads
  const buildings: BoardBuilding[] = [];
  const roads: BoardRoad[] = [];

  for (const vertex of state.board.vertices) {
    if (vertex.building) {
      const p = state.players.find((pl) => pl.id === vertex.building!.playerId);
      buildings.push({
        vertexId: vertex.id,
        type: vertex.building.type,
        playerId: vertex.building.playerId,
        color: p?.color ?? 'white',
      });
    }
  }

  for (const edge of state.board.edges) {
    if (edge.road) {
      const p = state.players.find((pl) => pl.id === edge.road!.playerId);
      roads.push({
        edgeId: edge.id,
        playerId: edge.road.playerId,
        color: p?.color ?? 'white',
      });
    }
  }

  // Valid actions for the viewing player
  const me = playerId ? engine.getPlayer(playerId) : null;
  const isMyTurn = me?.id === currentPlayer.id;
  const validActions = buildValidActions(engine, me, isMyTurn, state);

  // Private hand
  const myResources = me?.resources ?? { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 };
  const myDevCards = me ? [...me.developmentCards, ...me.newCards] : [];

  // Recent log (last 20 entries)
  const log = engine.getLog();
  const recentLog = log.slice(-20).map((e) => ({
    player: e.player,
    action: e.action,
    details: formatLogDetails(e),
  }));

  const winner = state.winner;
  const winnerPlayer = winner ? state.players.find((p) => p.id === winner) : null;

  return {
    gameId,
    variantId: state.board.variantId,
    phase: state.phase,
    turnPhase: state.turnPhase,
    turnNumber: state.turnNumber,
    currentPlayerId: currentPlayer.id,
    diceRoll: state.diceRoll,
    board: state.board,
    buildings,
    roads,
    robberPosition: state.board.robberPosition,
    players,
    myPlayerId: playerId ?? '',
    myResources: myResources as Record<ResourceType, number>,
    myDevCards: myDevCards as any[],
    validActions,
    recentLog,
    activeTrade: activeTrade ?? null,
    setupInfo: buildSetupInfo(state),
    turnTimeRemaining: turnTimeRemaining ?? null,
    winner,
    winnerName: winnerPlayer?.name ?? null,
    victoryPoints: state.config.victoryPoints,
  };
}

function buildSetupInfo(state: ReturnType<GameEngine['getState']>): GameView['setupInfo'] {
  if (state.phase !== 'SETUP_ROUND_1' && state.phase !== 'SETUP_ROUND_2') return null;
  const player = state.players[state.setupPlayerIndex];
  if (!player) return null;
  return {
    currentPlayerId: player.id,
    currentPlayerName: player.name,
    needsSettlement: !state.setupPlacedSettlement,
    needsRoad: state.setupPlacedSettlement,
    round: state.setupRound,
  };
}

function buildValidActions(
  engine: GameEngine,
  me: PlayerState | null | undefined,
  isMyTurn: boolean,
  state: ReturnType<GameEngine['getState']>
): ValidActions {
  const empty: ValidActions = {
    canRollDice: false, canBuildRoad: false, canBuildSettlement: false,
    canBuildCity: false, canBuyDevCard: false, canPlayDevCard: false,
    canMaritimeTrade: false, canEndTurn: false,
    mustDiscard: false, mustMoveRobber: false,
    validSettlementSpots: [], validRoadSpots: [],
    validRobberHexes: [], stealTargets: [],
  };

  if (!me) return empty;

  // Setup phase — show valid placement spots for the current setup player
  if (state.phase === 'SETUP_ROUND_1' || state.phase === 'SETUP_ROUND_2') {
    const isSetupTurn = state.players[state.setupPlayerIndex]?.id === me.id;
    if (!isSetupTurn) return empty;

    if (!state.setupPlacedSettlement) {
      return { ...empty, canBuildSettlement: true, validSettlementSpots: engine.getValidSettlementSpots(me.id, true) };
    } else {
      // Need to place road adjacent to last settlement
      const lastSettlement = me.settlements[me.settlements.length - 1];
      const validRoads = state.board.edges
        .filter((e) => !e.road && e.vertexIds.includes(lastSettlement) && e.edgeType !== 'sea')
        .map((e) => e.id);
      return { ...empty, canBuildRoad: true, validRoadSpots: validRoads };
    }
  }

  if (state.phase !== 'PLAYING') return empty;

  // Must discard (anyone, not just current player)
  if (state.turnPhase === 'ROBBER_DISCARD' && state.pendingRobberDiscard.includes(me.id)) {
    return { ...empty, mustDiscard: true };
  }

  if (!isMyTurn) return empty;

  if (state.turnPhase === 'PRE_ROLL') {
    return {
      ...empty,
      canRollDice: true,
      canPlayDevCard: me.developmentCards.includes('knight') && !me.devCardPlayedThisTurn,
    };
  }

  if (state.turnPhase === 'ROBBER_MOVE') {
    const validHexes = state.board.hexes
      .filter((h) => h.terrain !== 'sea' && h.terrain !== 'desert' &&
        !(h.coord.q === state.board.robberPosition.q && h.coord.r === state.board.robberPosition.r))
      .map((h) => h.coord);
    // Also allow desert if robber isn't there
    const desertHex = state.board.hexes.find((h) => h.terrain === 'desert' && !h.hasRobber);
    if (desertHex) validHexes.push(desertHex.coord);

    return { ...empty, mustMoveRobber: true, validRobberHexes: validHexes, stealTargets: [] };
  }

  if (state.turnPhase === 'TRADE_BUILD') {
    const canAfford = (cost: Record<string, number>) =>
      Object.entries(cost).every(([r, a]) => (me.resources[r as ResourceType] ?? 0) >= a);

    return {
      ...empty,
      canBuildRoad: canAfford({ lumber: 1, brick: 1 }) && me.roads.length < 15,
      canBuildSettlement: canAfford({ lumber: 1, brick: 1, wool: 1, grain: 1 }) && me.settlements.length < 5,
      canBuildCity: canAfford({ grain: 2, ore: 3 }) && me.settlements.length > 0 && me.cities.length < 4,
      canBuyDevCard: canAfford({ wool: 1, grain: 1, ore: 1 }) && state.devCardDeck.length > 0,
      canPlayDevCard: me.developmentCards.length > 0 && !me.devCardPlayedThisTurn,
      canMaritimeTrade: Object.values(me.resources).some((v) => v >= 2),
      canEndTurn: true,
      validSettlementSpots: engine.getValidSettlementSpots(me.id, false),
      validRoadSpots: engine.getValidRoadSpots(me.id),
    };
  }

  return empty;
}

function formatLogDetails(entry: { action: string; details: Record<string, unknown> }): string {
  switch (entry.action) {
    case 'dice-roll': return `${entry.details.d1}+${entry.details.d2}=${entry.details.total}`;
    case 'build-settlement': return 'built settlement';
    case 'build-city': return 'upgraded to city';
    case 'build-road': return 'built road';
    case 'buy-dev-card': return `bought dev card`;
    case 'play-knight': return `played knight`;
    case 'maritime-trade': return `${entry.details.ratio}:1 ${entry.details.give}→${entry.details.receive}`;
    case 'move-robber': return 'moved robber';
    case 'steal': return `stole from ${entry.details.from}`;
    case 'discard': return `discarded ${entry.details.count} cards`;
    case 'longest-road': return `longest road (${entry.details.length})`;
    case 'largest-army': return `largest army (${entry.details.knights})`;
    case 'VICTORY': return `WON with ${entry.details.vp} VP!`;
    case 'end-turn': return 'ended turn';
    default: return entry.action;
  }
}
