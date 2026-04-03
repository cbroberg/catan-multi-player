/**
 * BotAI — Pure TypeScript AI player for Catan.
 * No React, no Node.js APIs, no DOM. Runs on the server.
 */

import type { ResourceType, HexCoord } from '@catan/shared';
import { TERRAIN_TO_RESOURCE, NUMBER_PIPS, BUILDING_COSTS } from '@catan/shared';
import type { GameEngine } from '../engine/game-engine';
import type { PlayerState, DevCardType } from '../engine/types';

// ─── Bot Action ─────────────────────────────────────────────────────────────

export interface BotAction {
  type: string;
  params: unknown[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RESOURCES: ResourceType[] = ['lumber', 'wool', 'grain', 'brick', 'ore'];

function totalCards(r: Record<ResourceType, number>): number {
  return Object.values(r).reduce((a, b) => a + b, 0);
}

function canAfford(player: PlayerState, cost: Partial<Record<string, number>>): boolean {
  for (const [res, amount] of Object.entries(cost)) {
    if ((player.resources[res as ResourceType] ?? 0) < (amount ?? 0)) return false;
  }
  return true;
}

// ─── BotAI Class ────────────────────────────────────────────────────────────

export class BotAI {
  constructor(
    private engine: GameEngine,
    private playerId: string,
  ) {}

  /** Determine the next action the bot should take. Returns null if no action needed. */
  getNextAction(): BotAction | null {
    const state = this.engine.getState();

    // Game over — nothing to do
    if (state.phase === 'GAME_OVER') return null;

    // Setup phases
    if (state.phase === 'SETUP_ROUND_1' || state.phase === 'SETUP_ROUND_2') {
      return this.getSetupAction();
    }

    // Playing phase
    if (state.phase === 'PLAYING') {
      return this.getPlayingAction();
    }

    return null;
  }

  // ─── Setup Phase ──────────────────────────────────────────────────────

  private getSetupAction(): BotAction | null {
    const state = this.engine.getState();
    const setupPlayer = state.players[state.setupPlayerIndex];
    if (!setupPlayer || setupPlayer.id !== this.playerId) return null;

    if (!state.setupPlacedSettlement) {
      return this.pickSetupSettlement();
    } else {
      return this.pickSetupRoad();
    }
  }

  private pickSetupSettlement(): BotAction | null {
    const spots = this.engine.getValidSettlementSpots(this.playerId, true);
    if (spots.length === 0) return null;

    // Score each spot: pip value + resource diversity bonus
    const scored = spots.map((vertexId) => {
      const pipValue = this.engine.getVertexPips(vertexId);
      const diversity = this.getVertexResourceDiversity(vertexId);
      // Prefer 3 different resource types (bonus 3), 2 different (bonus 1)
      const diversityBonus = diversity >= 3 ? 3 : diversity >= 2 ? 1 : 0;
      return { vertexId, score: pipValue + diversityBonus };
    });

    scored.sort((a, b) => b.score - a.score);
    return { type: 'setup-settlement', params: [scored[0].vertexId] };
  }

  private pickSetupRoad(): BotAction | null {
    const state = this.engine.getState();
    const player = this.engine.getPlayer(this.playerId);
    if (!player) return null;

    const lastSettlement = player.settlements[player.settlements.length - 1];

    // Get valid road edges (adjacent to last settlement, no existing road)
    const validEdges = state.board.edges.filter(
      (e) => !e.road && e.vertexIds.includes(lastSettlement) && e.edgeType !== 'sea',
    );

    if (validEdges.length === 0) return null;

    // Pick the edge that leads toward the best future settlement spot
    const bestEdge = this.pickBestSetupRoadEdge(validEdges, lastSettlement);
    return { type: 'setup-road', params: [bestEdge] };
  }

  private pickBestSetupRoadEdge(
    edges: { id: string; vertexIds: string[] }[],
    fromVertex: string,
  ): string {
    let bestEdgeId = edges[0].id;
    let bestScore = -1;

    for (const edge of edges) {
      const otherVertex = edge.vertexIds[0] === fromVertex ? edge.vertexIds[1] : edge.vertexIds[0];
      // Score: pip value of the vertex at the other end of the road
      const pips = this.engine.getVertexPips(otherVertex);
      if (pips > bestScore) {
        bestScore = pips;
        bestEdgeId = edge.id;
      }
    }

    return bestEdgeId;
  }

  // ─── Playing Phase ────────────────────────────────────────────────────

  private getPlayingAction(): BotAction | null {
    const state = this.engine.getState();

    // Handle discard (can be any player, not just current)
    if (state.turnPhase === 'ROBBER_DISCARD') {
      if (state.pendingRobberDiscard.includes(this.playerId)) {
        return { type: 'auto-discard', params: [] };
      }
      return null; // Waiting for others to discard
    }

    // All other actions require it to be our turn
    const currentPlayer = this.engine.currentPlayer();
    if (currentPlayer.id !== this.playerId) return null;

    switch (state.turnPhase) {
      case 'PRE_ROLL':
        return this.getPreRollAction();
      case 'ROBBER_MOVE':
        return this.getRobberMoveAction();
      case 'TRADE_BUILD':
        return this.getTradeBuildAction();
      default:
        return null;
    }
  }

  // ─── PRE_ROLL ─────────────────────────────────────────────────────────

  private getPreRollAction(): BotAction | null {
    const player = this.engine.getPlayer(this.playerId);
    if (!player) return null;

    // Play knight before rolling if robber is on one of our hexes
    if (
      player.developmentCards.includes('knight') &&
      !player.devCardPlayedThisTurn &&
      this.isRobberOnMyHex()
    ) {
      const knightAction = this.getKnightAction();
      if (knightAction) return knightAction;
    }

    return { type: 'roll-dice', params: [] };
  }

  private isRobberOnMyHex(): boolean {
    const state = this.engine.getState();
    const player = this.engine.getPlayer(this.playerId);
    if (!player) return false;

    const robber = state.board.robberPosition;
    // Check if any of our settlements/cities are adjacent to the robber hex
    for (const vId of [...player.settlements, ...player.cities]) {
      const vertex = state.board.vertices.find((v) => v.id === vId);
      if (!vertex) continue;
      if (vertex.adjacentHexCoords.some((hc) => hc.q === robber.q && hc.r === robber.r)) {
        return true;
      }
    }
    return false;
  }

  // ─── ROBBER_MOVE ──────────────────────────────────────────────────────

  private getRobberMoveAction(): BotAction | null {
    const state = this.engine.getState();

    // Find best hex to place robber: hurt leading opponent most
    const validHexes = state.board.hexes.filter(
      (h) =>
        h.terrain !== 'sea' &&
        !(h.coord.q === state.board.robberPosition.q && h.coord.r === state.board.robberPosition.r),
    );

    if (validHexes.length === 0) return null;

    let bestHex: HexCoord = validHexes[0].coord;
    let bestScore = -Infinity;
    let bestStealTarget: string | undefined;

    // Rank opponents by VP
    const opponents = state.players.filter((p) => p.id !== this.playerId);
    const opponentVP = new Map(opponents.map((p) => [p.id, this.engine.getVP(p)]));

    for (const hex of validHexes) {
      // Skip desert (no production value)
      if (hex.terrain === 'desert') continue;

      const pips = hex.number ? (NUMBER_PIPS[hex.number] ?? 0) : 0;
      const playersOnHex = this.engine.getPlayersOnHex(hex.coord, this.playerId);

      if (playersOnHex.length === 0) continue;

      // Score: pips * max opponent VP on this hex
      let maxOpponentVP = 0;
      let stealTarget: string | undefined;
      for (const pid of playersOnHex) {
        const vp = opponentVP.get(pid) ?? 0;
        if (vp > maxOpponentVP) {
          maxOpponentVP = vp;
          stealTarget = pid;
        }
      }

      const score = pips * (maxOpponentVP + 1);
      if (score > bestScore) {
        bestScore = score;
        bestHex = hex.coord;
        bestStealTarget = stealTarget;
      }
    }

    // Fallback: if no good hex found (all desert), pick first valid non-self hex
    if (bestScore === -Infinity) {
      const fallback = validHexes.find((h) => h.terrain !== 'desert') ?? validHexes[0];
      bestHex = fallback.coord;
      const targets = this.engine.getPlayersOnHex(bestHex, this.playerId);
      bestStealTarget = targets[0];
    }

    return { type: 'move-robber', params: [bestHex, bestStealTarget] };
  }

  // ─── TRADE_BUILD ──────────────────────────────────────────────────────

  private getTradeBuildAction(): BotAction | null {
    const player = this.engine.getPlayer(this.playerId);
    if (!player) return { type: 'end-turn', params: [] };

    // 1. Build city if possible (best ROI)
    const cityAction = this.tryBuildCity(player);
    if (cityAction) return cityAction;

    // 2. Build settlement if possible
    const settlementAction = this.tryBuildSettlement(player);
    if (settlementAction) return settlementAction;

    // 3. Build road if it leads to a good settlement spot
    const roadAction = this.tryBuildRoad(player);
    if (roadAction) return roadAction;

    // 4. Buy dev card if affordable and nothing else to build
    const devCardAction = this.tryBuyDevCard(player);
    if (devCardAction) return devCardAction;

    // 5. Play dev cards if beneficial
    const playDevAction = this.tryPlayDevCard(player);
    if (playDevAction) return playDevAction;

    // 6. Maritime trade if it enables a build this turn
    const tradeAction = this.tryMaritimeTrade(player);
    if (tradeAction) return tradeAction;

    // 7. End turn
    return { type: 'end-turn', params: [] };
  }

  private tryBuildCity(player: PlayerState): BotAction | null {
    if (!canAfford(player, BUILDING_COSTS.city)) return null;
    if (player.cities.length >= 4) return null;
    if (player.settlements.length === 0) return null;

    // Pick the settlement with highest pip value to upgrade
    let bestVertex = player.settlements[0];
    let bestPips = -1;

    for (const vId of player.settlements) {
      const pips = this.engine.getVertexPips(vId);
      if (pips > bestPips) {
        bestPips = pips;
        bestVertex = vId;
      }
    }

    return { type: 'build-city', params: [bestVertex] };
  }

  private tryBuildSettlement(player: PlayerState): BotAction | null {
    if (!canAfford(player, BUILDING_COSTS.settlement)) return null;
    if (player.settlements.length >= 5) return null;

    const spots = this.engine.getValidSettlementSpots(this.playerId, false);
    if (spots.length === 0) return null;

    // Pick spot with highest pip value
    const scored = spots.map((v) => ({
      vertexId: v,
      score: this.engine.getVertexPips(v) + this.getVertexResourceDiversity(v),
    }));
    scored.sort((a, b) => b.score - a.score);

    return { type: 'build-settlement', params: [scored[0].vertexId] };
  }

  private tryBuildRoad(player: PlayerState): BotAction | null {
    if (!canAfford(player, BUILDING_COSTS.road)) return null;
    if (player.roads.length >= 15) return null;

    // Only build road if there's a good settlement spot to reach
    const validRoads = this.engine.getValidRoadSpots(this.playerId);
    if (validRoads.length === 0) return null;

    // Check if there are settlement spots reachable by building roads
    const settlementSpots = this.engine.getValidSettlementSpots(this.playerId, false);
    if (settlementSpots.length > 0) return null; // Already have spots, no road needed

    // Pick road that leads toward best future vertex
    const state = this.engine.getState();
    let bestEdge = validRoads[0];
    let bestScore = -1;

    for (const edgeId of validRoads) {
      const edge = state.board.edges.find((e) => e.id === edgeId);
      if (!edge) continue;

      // Check both endpoints — prefer road toward high-pip unoccupied vertices
      for (const vId of edge.vertexIds) {
        const vertex = state.board.vertices.find((v) => v.id === vId);
        if (!vertex || vertex.building) continue;
        const pips = this.engine.getVertexPips(vId);
        if (pips > bestScore) {
          bestScore = pips;
          bestEdge = edgeId;
        }
      }
    }

    return { type: 'build-road', params: [bestEdge] };
  }

  private tryBuyDevCard(player: PlayerState): BotAction | null {
    const state = this.engine.getState();
    if (!canAfford(player, BUILDING_COSTS.developmentCard)) return null;
    if (state.devCardDeck.length === 0) return null;
    return { type: 'buy-dev-card', params: [] };
  }

  private tryPlayDevCard(player: PlayerState): BotAction | null {
    if (player.devCardPlayedThisTurn) return null;
    if (player.developmentCards.length === 0) return null;

    // Play road building if we have roads to build and no settlement spots
    if (player.developmentCards.includes('road_building')) {
      const validRoads = this.engine.getValidRoadSpots(this.playerId);
      if (validRoads.length >= 1) {
        const edge1 = validRoads[0];
        const edge2 = validRoads.length >= 2 ? validRoads[1] : undefined;
        return { type: 'play-road-building', params: [edge1, edge2] };
      }
    }

    // Play year of plenty to get resources for next build
    if (player.developmentCards.includes('year_of_plenty')) {
      const needed = this.getMostNeededResources(player, 2);
      return { type: 'play-year-of-plenty', params: [needed[0], needed[1]] };
    }

    // Play monopoly — pick resource opponents have most of
    if (player.developmentCards.includes('monopoly')) {
      const bestResource = this.getBestMonopolyResource();
      return { type: 'play-monopoly', params: [bestResource] };
    }

    return null;
  }

  private tryMaritimeTrade(player: PlayerState): BotAction | null {
    // Check what we're closest to affording
    const needed = this.getResourceNeededForNextBuild(player);
    if (!needed) return null;

    // Try to trade surplus resources for what we need
    for (const res of RESOURCES) {
      if (res === needed) continue;
      const ratio = this.getTradeRatio(player, res);
      if (player.resources[res] >= ratio) {
        return { type: 'maritime-trade', params: [res, needed] };
      }
    }

    return null;
  }

  // ─── Knight Action ────────────────────────────────────────────────────

  private getKnightAction(): BotAction | null {
    const state = this.engine.getState();
    const validHexes = state.board.hexes.filter(
      (h) =>
        h.terrain !== 'sea' &&
        !(h.coord.q === state.board.robberPosition.q && h.coord.r === state.board.robberPosition.r),
    );

    if (validHexes.length === 0) return null;

    // Find best hex (same logic as robber move)
    let bestHex: HexCoord = validHexes[0].coord;
    let bestScore = -Infinity;
    let bestStealTarget: string | undefined;

    const opponents = state.players.filter((p) => p.id !== this.playerId);
    const opponentVP = new Map(opponents.map((p) => [p.id, this.engine.getVP(p)]));

    for (const hex of validHexes) {
      if (hex.terrain === 'desert') continue;
      const pips = hex.number ? (NUMBER_PIPS[hex.number] ?? 0) : 0;
      const playersOnHex = this.engine.getPlayersOnHex(hex.coord, this.playerId);
      if (playersOnHex.length === 0) continue;

      let maxVP = 0;
      let target: string | undefined;
      for (const pid of playersOnHex) {
        const vp = opponentVP.get(pid) ?? 0;
        if (vp > maxVP) {
          maxVP = vp;
          target = pid;
        }
      }

      const score = pips * (maxVP + 1);
      if (score > bestScore) {
        bestScore = score;
        bestHex = hex.coord;
        bestStealTarget = target;
      }
    }

    if (bestScore === -Infinity) {
      const fallback = validHexes.find((h) => h.terrain !== 'desert') ?? validHexes[0];
      bestHex = fallback.coord;
      const targets = this.engine.getPlayersOnHex(bestHex, this.playerId);
      bestStealTarget = targets[0];
    }

    return { type: 'play-knight', params: [bestHex, bestStealTarget] };
  }

  // ─── Utility ──────────────────────────────────────────────────────────

  private getVertexResourceDiversity(vertexId: string): number {
    const state = this.engine.getState();
    const vertex = state.board.vertices.find((v) => v.id === vertexId);
    if (!vertex) return 0;

    const resources = new Set<ResourceType>();
    for (const hc of vertex.adjacentHexCoords) {
      const hex = state.board.hexes.find((h) => h.coord.q === hc.q && h.coord.r === hc.r);
      if (hex) {
        const res = TERRAIN_TO_RESOURCE[hex.terrain];
        if (res) resources.add(res);
      }
    }
    return resources.size;
  }

  private getMostNeededResources(player: PlayerState, count: number): ResourceType[] {
    // Sort resources by how much we need them (least held first)
    const sorted = [...RESOURCES].sort((a, b) => player.resources[a] - player.resources[b]);
    return sorted.slice(0, count);
  }

  private getBestMonopolyResource(): ResourceType {
    const state = this.engine.getState();
    let bestResource: ResourceType = 'lumber';
    let bestTotal = -1;

    for (const res of RESOURCES) {
      let total = 0;
      for (const p of state.players) {
        if (p.id === this.playerId) continue;
        total += p.resources[res];
      }
      if (total > bestTotal) {
        bestTotal = total;
        bestResource = res;
      }
    }
    return bestResource;
  }

  private getResourceNeededForNextBuild(player: PlayerState): ResourceType | null {
    // Check what we're closest to building (city > settlement > road > dev card)
    const builds: { cost: Partial<Record<string, number>>; label: string }[] = [
      { cost: BUILDING_COSTS.city, label: 'city' },
      { cost: BUILDING_COSTS.settlement, label: 'settlement' },
      { cost: BUILDING_COSTS.road, label: 'road' },
      { cost: BUILDING_COSTS.developmentCard, label: 'devcard' },
    ];

    for (const build of builds) {
      let missing: ResourceType | null = null;
      let missingCount = 0;

      for (const [res, amount] of Object.entries(build.cost)) {
        const deficit = (amount ?? 0) - (player.resources[res as ResourceType] ?? 0);
        if (deficit > 0) {
          missingCount += deficit;
          if (!missing) missing = res as ResourceType;
        }
      }

      // If we're only missing 1 resource of 1 type, trade for it
      if (missingCount === 1 && missing) return missing;
    }

    return null;
  }

  private getTradeRatio(player: PlayerState, resource: ResourceType): number {
    const state = this.engine.getState();
    // Check 2:1 harbor
    for (const vId of [...player.settlements, ...player.cities]) {
      const vertex = state.board.vertices.find((v) => v.id === vId);
      if (vertex?.harbor === resource) return 2;
    }
    // Check 3:1 harbor
    for (const vId of [...player.settlements, ...player.cities]) {
      const vertex = state.board.vertices.find((v) => v.id === vId);
      if (vertex?.harbor === '3:1') return 3;
    }
    return 4;
  }
}
