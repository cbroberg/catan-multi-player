import type {
  GameConfig,
  GameBoard,
  ResourceType,
  HexCoord,
  Hex,
  Vertex,
  Edge,
} from '@catan/shared';
import { NUMBER_PIPS, TERRAIN_TO_RESOURCE, BUILDING_COSTS, PIECE_LIMITS } from '@catan/shared';
import { hexKey } from '../board/hex-grid';
import type { EngineState, PlayerState, DevCardType, ActionResult, GameLogEntry } from './types';
import { DEV_CARD_DECK } from './types';

const RESOURCES: ResourceType[] = ['lumber', 'wool', 'grain', 'brick', 'ore'];

function emptyResources(): Record<ResourceType, number> {
  return { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 };
}

function totalCards(r: Record<ResourceType, number>): number {
  return Object.values(r).reduce((a, b) => a + b, 0);
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function canAfford(player: PlayerState, cost: Partial<Record<string, number>>): boolean {
  for (const [res, amount] of Object.entries(cost)) {
    if ((player.resources[res as ResourceType] ?? 0) < (amount ?? 0)) return false;
  }
  return true;
}

function deductCost(player: PlayerState, cost: Partial<Record<string, number>>): void {
  for (const [res, amount] of Object.entries(cost)) {
    player.resources[res as ResourceType] -= amount ?? 0;
  }
}

// ─── GameEngine ──────────────────────────────────────────────────────────────

export class GameEngine {
  private state: EngineState;
  private log: GameLogEntry[] = [];
  private hexMap: Map<string, Hex>;
  private vertexMap: Map<string, Vertex>;
  private edgeMap: Map<string, Edge>;

  /** Map vertex ID → adjacent edge IDs */
  private vertexEdges: Map<string, string[]>;
  /** Map vertex ID → adjacent vertex IDs */
  private vertexNeighbors: Map<string, string[]>;

  constructor(config: GameConfig, board: GameBoard, playerNames: { id: string; name: string; color: string }[]) {
    this.hexMap = new Map(board.hexes.map((h) => [hexKey(h.coord), h]));
    this.vertexMap = new Map(board.vertices.map((v) => [v.id, v]));
    this.edgeMap = new Map(board.edges.map((e) => [e.id, e]));

    // Build adjacency
    this.vertexEdges = new Map();
    this.vertexNeighbors = new Map();
    for (const edge of board.edges) {
      for (const vId of edge.vertexIds) {
        if (!this.vertexEdges.has(vId)) this.vertexEdges.set(vId, []);
        this.vertexEdges.get(vId)!.push(edge.id);
      }
      const [v1, v2] = edge.vertexIds;
      if (!this.vertexNeighbors.has(v1)) this.vertexNeighbors.set(v1, []);
      if (!this.vertexNeighbors.has(v2)) this.vertexNeighbors.set(v2, []);
      this.vertexNeighbors.get(v1)!.push(v2);
      this.vertexNeighbors.get(v2)!.push(v1);
    }

    const players: PlayerState[] = playerNames.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color as any,
      resources: emptyResources(),
      developmentCards: [],
      newCards: [],
      knightsPlayed: 0,
      settlements: [],
      cities: [],
      roads: [],
      devCardPlayedThisTurn: false,
    }));

    this.state = {
      config,
      board,
      players,
      currentPlayerIndex: 0,
      phase: 'SETUP_ROUND_1',
      turnPhase: null,
      turnNumber: 0,
      setupRound: 1,
      setupPlayerIndex: 0,
      setupPlacedSettlement: false,
      diceRoll: null,
      devCardDeck: shuffle([...DEV_CARD_DECK]),
      longestRoadHolder: null,
      longestRoadLength: 4,
      largestArmyHolder: null,
      largestArmySize: 2,
      pendingRobberDiscard: [],
      winner: null,
    };
  }

  // ─── Queries ─────────────────────────────────────────────────────────

  getState(): EngineState { return this.state; }
  getLog(): GameLogEntry[] { return this.log; }
  getWinner(): string | null { return this.state.winner; }
  currentPlayer(): PlayerState { return this.state.players[this.state.currentPlayerIndex]; }
  getPlayer(id: string): PlayerState | undefined { return this.state.players.find((p) => p.id === id); }

  private addLog(player: string, action: string, details: Record<string, unknown> = {}) {
    this.log.push({
      turn: this.state.turnNumber,
      phase: `${this.state.phase}${this.state.turnPhase ? ':' + this.state.turnPhase : ''}`,
      player,
      action,
      details,
    });
  }

  // ─── Setup Placement ─────────────────────────────────────────────────

  placeInitialSettlement(playerId: string, vertexId: string): ActionResult {
    if (this.state.phase !== 'SETUP_ROUND_1' && this.state.phase !== 'SETUP_ROUND_2') {
      return { ok: false, error: 'Not in setup phase' };
    }
    const player = this.setupCurrentPlayer();
    if (!player || player.id !== playerId) return { ok: false, error: 'Not your turn' };
    if (this.state.setupPlacedSettlement) return { ok: false, error: 'Already placed settlement' };

    if (!this.isValidSettlementSpot(vertexId, playerId, true)) {
      return { ok: false, error: 'Invalid settlement spot' };
    }

    const vertex = this.vertexMap.get(vertexId)!;
    vertex.building = { type: 'settlement', playerId };
    player.settlements.push(vertexId);
    this.state.setupPlacedSettlement = true;

    // In round 2, give starting resources from adjacent hexes
    if (this.state.setupRound === 2) {
      const gained: Partial<Record<ResourceType, number>> = {};
      for (const hc of vertex.adjacentHexCoords) {
        const hex = this.hexMap.get(hexKey(hc));
        if (hex) {
          const resource = TERRAIN_TO_RESOURCE[hex.terrain];
          if (resource) {
            player.resources[resource]++;
            gained[resource] = (gained[resource] ?? 0) + 1;
          }
        }
      }
      this.addLog(player.name, 'setup-settlement', { vertexId, resources: gained, round: 2 });
    } else {
      this.addLog(player.name, 'setup-settlement', { vertexId, round: 1 });
    }

    return { ok: true };
  }

  placeInitialRoad(playerId: string, edgeId: string): ActionResult {
    if (this.state.phase !== 'SETUP_ROUND_1' && this.state.phase !== 'SETUP_ROUND_2') {
      return { ok: false, error: 'Not in setup phase' };
    }
    const player = this.setupCurrentPlayer();
    if (!player || player.id !== playerId) return { ok: false, error: 'Not your turn' };
    if (!this.state.setupPlacedSettlement) return { ok: false, error: 'Place settlement first' };

    const edge = this.edgeMap.get(edgeId);
    if (!edge || edge.road) return { ok: false, error: 'Invalid edge' };

    // Must be adjacent to the settlement just placed
    const lastSettlement = player.settlements[player.settlements.length - 1];
    if (!edge.vertexIds.includes(lastSettlement)) {
      return { ok: false, error: 'Road must connect to placed settlement' };
    }

    edge.road = { playerId };
    player.roads.push(edgeId);
    this.addLog(player.name, 'setup-road', { edgeId });

    this.advanceSetup();
    return { ok: true };
  }

  private setupCurrentPlayer(): PlayerState | null {
    return this.state.players[this.state.setupPlayerIndex] ?? null;
  }

  private advanceSetup() {
    this.state.setupPlacedSettlement = false;
    const n = this.state.players.length;

    if (this.state.setupRound === 1) {
      this.state.setupPlayerIndex++;
      if (this.state.setupPlayerIndex >= n) {
        this.state.phase = 'SETUP_ROUND_2';
        this.state.setupRound = 2;
        this.state.setupPlayerIndex = n - 1; // reverse order
      }
    } else {
      this.state.setupPlayerIndex--;
      if (this.state.setupPlayerIndex < 0) {
        this.state.phase = 'PLAYING';
        this.state.turnPhase = 'PRE_ROLL';
        this.state.currentPlayerIndex = 0;
        this.state.turnNumber = 1;
        this.addLog('SYSTEM', 'game-start', { turnOrder: this.state.players.map((p) => p.name) });
      }
    }
  }

  // ─── Dice Roll ────────────────────────────────────────────────────────

  rollDice(playerId?: string): ActionResult & { dice?: [number, number] } {
    if (this.state.phase !== 'PLAYING') return { ok: false, error: 'Not playing' };
    if (this.state.turnPhase !== 'PRE_ROLL') return { ok: false, error: 'Not roll phase' };
    if (playerId && this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    this.state.diceRoll = [d1, d2];

    this.addLog(this.currentPlayer().name, 'dice-roll', { d1, d2, total });

    if (total === 7) {
      this.handleSeven();
    } else {
      this.distributeResources(total);
      this.state.turnPhase = 'TRADE_BUILD';
    }

    return { ok: true, dice: [d1, d2] };
  }

  private distributeResources(number: number) {
    const distributed: Record<string, Partial<Record<ResourceType, number>>> = {};

    for (const hex of this.state.board.hexes) {
      if (hex.number !== number || hex.hasRobber) continue;
      const resource = TERRAIN_TO_RESOURCE[hex.terrain];
      if (!resource) continue;

      for (const vertex of this.state.board.vertices) {
        if (!vertex.building) continue;
        const adjacentToHex = vertex.adjacentHexCoords.some(
          (hc) => hc.q === hex.coord.q && hc.r === hex.coord.r
        );
        if (!adjacentToHex) continue;

        const player = this.getPlayer(vertex.building.playerId);
        if (!player) continue;

        const amount = vertex.building.type === 'city' ? 2 : 1;

        // Gold river: player gets any resource (for simulation, give most needed)
        if (hex.terrain === 'gold_river') {
          const needed = this.mostNeededResource(player);
          player.resources[needed] += amount;
          if (!distributed[player.name]) distributed[player.name] = {};
          distributed[player.name][needed] = (distributed[player.name][needed] ?? 0) + amount;
        } else {
          player.resources[resource] += amount;
          if (!distributed[player.name]) distributed[player.name] = {};
          distributed[player.name][resource] = (distributed[player.name][resource] ?? 0) + amount;
        }
      }
    }

    if (Object.keys(distributed).length > 0) {
      this.addLog('SYSTEM', 'resource-distribution', distributed);
    }
  }

  private mostNeededResource(player: PlayerState): ResourceType {
    let minRes: ResourceType = 'lumber';
    let minCount = Infinity;
    for (const r of RESOURCES) {
      if (player.resources[r] < minCount) {
        minCount = player.resources[r];
        minRes = r;
      }
    }
    return minRes;
  }

  // ─── Robber (7 roll) ──────────────────────────────────────────────────

  private handleSeven() {
    // Players with >7 cards must discard half
    this.state.pendingRobberDiscard = [];
    for (const player of this.state.players) {
      if (totalCards(player.resources) > 7) {
        this.state.pendingRobberDiscard.push(player.id);
      }
    }

    if (this.state.pendingRobberDiscard.length > 0) {
      this.state.turnPhase = 'ROBBER_DISCARD';
    } else {
      this.state.turnPhase = 'ROBBER_MOVE';
    }
  }

  discardCards(playerId: string, cards: Partial<Record<ResourceType, number>>): ActionResult {
    if (this.state.turnPhase !== 'ROBBER_DISCARD') return { ok: false, error: 'Not discard phase' };
    if (!this.state.pendingRobberDiscard.includes(playerId)) return { ok: false, error: 'Not pending' };

    const player = this.getPlayer(playerId)!;
    const total = totalCards(player.resources);
    const discardCount = Object.values(cards).reduce((a, b) => a + (b ?? 0), 0);
    const required = Math.floor(total / 2);

    if (discardCount !== required) return { ok: false, error: `Must discard ${required} cards` };

    for (const [res, amount] of Object.entries(cards)) {
      if ((player.resources[res as ResourceType] ?? 0) < (amount ?? 0)) {
        return { ok: false, error: `Not enough ${res}` };
      }
    }

    for (const [res, amount] of Object.entries(cards)) {
      player.resources[res as ResourceType] -= amount ?? 0;
    }

    this.state.pendingRobberDiscard = this.state.pendingRobberDiscard.filter((id) => id !== playerId);
    this.addLog(player.name, 'discard', { cards, count: discardCount });

    if (this.state.pendingRobberDiscard.length === 0) {
      this.state.turnPhase = 'ROBBER_MOVE';
    }
    return { ok: true };
  }

  /** Auto-discard for simulation: discard least useful cards */
  autoDiscard(playerId: string): ActionResult {
    const player = this.getPlayer(playerId)!;
    const total = totalCards(player.resources);
    const required = Math.floor(total / 2);
    const cards: Partial<Record<ResourceType, number>> = {};

    let remaining = required;
    // Discard resources with highest counts first
    const sorted = RESOURCES.map((r) => ({ r, count: player.resources[r] }))
      .sort((a, b) => b.count - a.count);

    for (const { r, count } of sorted) {
      if (remaining <= 0) break;
      const discard = Math.min(count, remaining);
      if (discard > 0) {
        cards[r] = discard;
        remaining -= discard;
      }
    }

    return this.discardCards(playerId, cards);
  }

  moveRobber(playerId: string, hexCoord: HexCoord, stealFromId?: string): ActionResult {
    if (this.state.turnPhase !== 'ROBBER_MOVE') return { ok: false, error: 'Not robber phase' };
    if (this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const hex = this.hexMap.get(hexKey(hexCoord));
    if (!hex || hex.terrain === 'sea') return { ok: false, error: 'Invalid hex' };
    if (hexCoord.q === this.state.board.robberPosition.q && hexCoord.r === this.state.board.robberPosition.r) {
      return { ok: false, error: 'Must move robber to different hex' };
    }

    // Move robber
    const oldHex = this.hexMap.get(hexKey(this.state.board.robberPosition));
    if (oldHex) oldHex.hasRobber = false;
    hex.hasRobber = true;
    this.state.board.robberPosition = hexCoord;

    this.addLog(this.currentPlayer().name, 'move-robber', { to: hexCoord });

    // Steal
    if (stealFromId) {
      const target = this.getPlayer(stealFromId);
      if (target && totalCards(target.resources) > 0) {
        const available = RESOURCES.filter((r) => target.resources[r] > 0);
        if (available.length > 0) {
          const stolen = available[Math.floor(Math.random() * available.length)];
          target.resources[stolen]--;
          this.currentPlayer().resources[stolen]++;
          this.addLog(this.currentPlayer().name, 'steal', { from: target.name, resource: stolen });
        }
      }
    }

    this.state.turnPhase = 'TRADE_BUILD';
    return { ok: true };
  }

  // ─── Building ─────────────────────────────────────────────────────────

  buildRoad(playerId: string, edgeId: string): ActionResult {
    if (this.state.turnPhase !== 'TRADE_BUILD') return { ok: false, error: 'Not build phase' };
    if (this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const player = this.currentPlayer();
    if (player.roads.length >= PIECE_LIMITS.roads) return { ok: false, error: 'No roads left' };
    if (!canAfford(player, BUILDING_COSTS.road)) return { ok: false, error: 'Cannot afford' };

    const edge = this.edgeMap.get(edgeId);
    if (!edge || edge.road) return { ok: false, error: 'Invalid edge' };

    // Must connect to player's network
    if (!this.isConnectedToNetwork(playerId, edge)) return { ok: false, error: 'Not connected' };

    deductCost(player, BUILDING_COSTS.road);
    edge.road = { playerId };
    player.roads.push(edgeId);
    this.addLog(player.name, 'build-road', { edgeId });
    this.checkLongestRoad();
    return { ok: true };
  }

  buildSettlement(playerId: string, vertexId: string): ActionResult {
    if (this.state.turnPhase !== 'TRADE_BUILD') return { ok: false, error: 'Not build phase' };
    if (this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const player = this.currentPlayer();
    if (player.settlements.length >= PIECE_LIMITS.settlements) return { ok: false, error: 'No settlements left' };
    if (!canAfford(player, BUILDING_COSTS.settlement)) return { ok: false, error: 'Cannot afford' };

    if (!this.isValidSettlementSpot(vertexId, playerId, false)) {
      return { ok: false, error: 'Invalid spot' };
    }

    deductCost(player, BUILDING_COSTS.settlement);
    const vertex = this.vertexMap.get(vertexId)!;
    vertex.building = { type: 'settlement', playerId };
    player.settlements.push(vertexId);
    this.addLog(player.name, 'build-settlement', { vertexId });
    this.checkVictory();
    return { ok: true };
  }

  buildCity(playerId: string, vertexId: string): ActionResult {
    if (this.state.turnPhase !== 'TRADE_BUILD') return { ok: false, error: 'Not build phase' };
    if (this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const player = this.currentPlayer();
    if (player.cities.length >= PIECE_LIMITS.cities) return { ok: false, error: 'No cities left' };
    if (!canAfford(player, BUILDING_COSTS.city)) return { ok: false, error: 'Cannot afford' };

    const vertex = this.vertexMap.get(vertexId);
    if (!vertex?.building || vertex.building.type !== 'settlement' || vertex.building.playerId !== playerId) {
      return { ok: false, error: 'No settlement to upgrade' };
    }

    deductCost(player, BUILDING_COSTS.city);
    vertex.building = { type: 'city', playerId };
    player.settlements = player.settlements.filter((v) => v !== vertexId);
    player.cities.push(vertexId);
    this.addLog(player.name, 'build-city', { vertexId });
    this.checkVictory();
    return { ok: true };
  }

  // ─── Development Cards ────────────────────────────────────────────────

  buyDevCard(playerId: string): ActionResult {
    if (this.state.turnPhase !== 'TRADE_BUILD') return { ok: false, error: 'Not build phase' };
    if (this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const player = this.currentPlayer();
    if (!canAfford(player, BUILDING_COSTS.developmentCard)) return { ok: false, error: 'Cannot afford' };
    if (this.state.devCardDeck.length === 0) return { ok: false, error: 'No cards left' };

    deductCost(player, BUILDING_COSTS.developmentCard);
    const card = this.state.devCardDeck.pop()!;
    player.newCards.push(card); // can't play until next turn
    this.addLog(player.name, 'buy-dev-card', { card });

    if (card === 'victory_point') {
      this.checkVictory();
    }
    return { ok: true };
  }

  playKnight(playerId: string, hexCoord: HexCoord, stealFromId?: string): ActionResult {
    if (this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const player = this.currentPlayer();
    if (player.devCardPlayedThisTurn) return { ok: false, error: 'Already played a card' };

    const idx = player.developmentCards.indexOf('knight');
    if (idx === -1) return { ok: false, error: 'No knight card' };

    player.developmentCards.splice(idx, 1);
    player.knightsPlayed++;
    player.devCardPlayedThisTurn = true;

    this.addLog(player.name, 'play-knight', { knightsPlayed: player.knightsPlayed });

    // Move robber
    this.state.turnPhase = 'ROBBER_MOVE';
    const result = this.moveRobber(playerId, hexCoord, stealFromId);
    // moveRobber sets turnPhase to TRADE_BUILD

    this.checkLargestArmy();
    return result;
  }

  playRoadBuilding(playerId: string, edge1: string, edge2?: string): ActionResult {
    const player = this.currentPlayer();
    if (player.id !== playerId) return { ok: false, error: 'Not your turn' };
    if (player.devCardPlayedThisTurn) return { ok: false, error: 'Already played a card' };

    const idx = player.developmentCards.indexOf('road_building');
    if (idx === -1) return { ok: false, error: 'No road building card' };

    player.developmentCards.splice(idx, 1);
    player.devCardPlayedThisTurn = true;
    this.addLog(player.name, 'play-road-building', {});

    // Build up to 2 free roads
    const buildFreeRoad = (edgeId: string): boolean => {
      const edge = this.edgeMap.get(edgeId);
      if (!edge || edge.road) return false;
      if (!this.isConnectedToNetwork(playerId, edge)) return false;
      edge.road = { playerId };
      player.roads.push(edgeId);
      return true;
    };

    buildFreeRoad(edge1);
    if (edge2) buildFreeRoad(edge2);
    this.checkLongestRoad();
    return { ok: true };
  }

  playYearOfPlenty(playerId: string, res1: ResourceType, res2: ResourceType): ActionResult {
    const player = this.currentPlayer();
    if (player.id !== playerId) return { ok: false, error: 'Not your turn' };
    if (player.devCardPlayedThisTurn) return { ok: false, error: 'Already played' };

    const idx = player.developmentCards.indexOf('year_of_plenty');
    if (idx === -1) return { ok: false, error: 'No year of plenty card' };

    player.developmentCards.splice(idx, 1);
    player.devCardPlayedThisTurn = true;
    player.resources[res1]++;
    player.resources[res2]++;
    this.addLog(player.name, 'play-year-of-plenty', { resources: [res1, res2] });
    return { ok: true };
  }

  playMonopoly(playerId: string, resource: ResourceType): ActionResult {
    const player = this.currentPlayer();
    if (player.id !== playerId) return { ok: false, error: 'Not your turn' };
    if (player.devCardPlayedThisTurn) return { ok: false, error: 'Already played' };

    const idx = player.developmentCards.indexOf('monopoly');
    if (idx === -1) return { ok: false, error: 'No monopoly card' };

    player.developmentCards.splice(idx, 1);
    player.devCardPlayedThisTurn = true;

    let stolen = 0;
    for (const other of this.state.players) {
      if (other.id === playerId) continue;
      const amount = other.resources[resource];
      if (amount > 0) {
        other.resources[resource] = 0;
        player.resources[resource] += amount;
        stolen += amount;
      }
    }
    this.addLog(player.name, 'play-monopoly', { resource, stolen });
    return { ok: true };
  }

  // ─── Maritime Trade ───────────────────────────────────────────────────

  maritimeTrade(playerId: string, give: ResourceType, receive: ResourceType): ActionResult {
    if (this.state.turnPhase !== 'TRADE_BUILD') return { ok: false, error: 'Not trade phase' };
    if (this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const player = this.currentPlayer();
    const ratio = this.getTradeRatio(player, give);

    if (player.resources[give] < ratio) return { ok: false, error: `Need ${ratio} ${give}` };

    player.resources[give] -= ratio;
    player.resources[receive]++;
    this.addLog(player.name, 'maritime-trade', { give, receive, ratio });
    return { ok: true };
  }

  private getTradeRatio(player: PlayerState, resource: ResourceType): number {
    // Check for 2:1 harbor
    for (const vId of [...player.settlements, ...player.cities]) {
      const vertex = this.vertexMap.get(vId);
      if (vertex?.harbor === resource) return 2;
    }
    // Check for 3:1 harbor
    for (const vId of [...player.settlements, ...player.cities]) {
      const vertex = this.vertexMap.get(vId);
      if (vertex?.harbor === '3:1') return 3;
    }
    return 4;
  }

  // ─── Player-to-Player Trade ────────────────────────────────────────────

  /**
   * Execute a direct trade between two players.
   * The active player gives `offering` and receives `requesting`.
   */
  playerTrade(
    fromId: string,
    toId: string,
    offering: Partial<Record<ResourceType, number>>,
    requesting: Partial<Record<ResourceType, number>>
  ): ActionResult {
    if (this.state.turnPhase !== 'TRADE_BUILD') return { ok: false, error: 'Not trade phase' };
    if (this.currentPlayer().id !== fromId) return { ok: false, error: 'Not your turn' };

    const from = this.getPlayer(fromId)!;
    const to = this.getPlayer(toId);
    if (!to) return { ok: false, error: 'Player not found' };
    if (from.id === to.id) return { ok: false, error: 'Cannot trade with yourself' };

    // Check both players can afford their side
    for (const [res, amount] of Object.entries(offering)) {
      if ((from.resources[res as ResourceType] ?? 0) < (amount ?? 0))
        return { ok: false, error: `You don't have enough ${res}` };
    }
    for (const [res, amount] of Object.entries(requesting)) {
      if ((to.resources[res as ResourceType] ?? 0) < (amount ?? 0))
        return { ok: false, error: `${to.name} doesn't have enough ${res}` };
    }

    // Execute trade
    for (const [res, amount] of Object.entries(offering)) {
      from.resources[res as ResourceType] -= amount ?? 0;
      to.resources[res as ResourceType] += amount ?? 0;
    }
    for (const [res, amount] of Object.entries(requesting)) {
      to.resources[res as ResourceType] -= amount ?? 0;
      from.resources[res as ResourceType] += amount ?? 0;
    }

    this.addLog(from.name, 'player-trade', {
      with: to.name,
      gave: offering,
      received: requesting,
    });

    return { ok: true };
  }

  // ─── End Turn ─────────────────────────────────────────────────────────

  endTurn(playerId?: string): ActionResult {
    if (this.state.phase !== 'PLAYING') return { ok: false, error: 'Not playing' };
    if (playerId && this.currentPlayer().id !== playerId) return { ok: false, error: 'Not your turn' };

    const player = this.currentPlayer();

    // Move new dev cards to playable
    player.developmentCards.push(...player.newCards);
    player.newCards = [];
    player.devCardPlayedThisTurn = false;

    this.addLog(player.name, 'end-turn', {
      resources: { ...player.resources },
      vp: this.getVP(player),
    });

    // Next player
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    this.state.turnNumber++;
    this.state.turnPhase = 'PRE_ROLL';
    this.state.diceRoll = null;

    return { ok: true };
  }

  // ─── Victory Points ───────────────────────────────────────────────────

  getVP(player: PlayerState): number {
    let vp = player.settlements.length + player.cities.length * 2;
    vp += player.developmentCards.filter((c) => c === 'victory_point').length;
    vp += player.newCards.filter((c) => c === 'victory_point').length;
    if (this.state.longestRoadHolder === player.id) vp += 2;
    if (this.state.largestArmyHolder === player.id) vp += 2;
    return vp;
  }

  private checkVictory() {
    for (const player of this.state.players) {
      if (this.getVP(player) >= this.state.config.victoryPoints) {
        this.state.winner = player.id;
        this.state.phase = 'GAME_OVER';
        this.addLog(player.name, 'VICTORY', {
          vp: this.getVP(player),
          settlements: player.settlements.length,
          cities: player.cities.length,
          longestRoad: this.state.longestRoadHolder === player.id,
          largestArmy: this.state.largestArmyHolder === player.id,
          vpCards: player.developmentCards.filter((c) => c === 'victory_point').length +
            player.newCards.filter((c) => c === 'victory_point').length,
        });
      }
    }
  }

  // ─── Longest Road ─────────────────────────────────────────────────────

  private checkLongestRoad() {
    for (const player of this.state.players) {
      const length = this.computeLongestRoad(player.id);
      if (length > this.state.longestRoadLength) {
        if (this.state.longestRoadHolder !== player.id) {
          this.state.longestRoadHolder = player.id;
          this.state.longestRoadLength = length;
          this.addLog(player.name, 'longest-road', { length });
          this.checkVictory();
        }
      }
    }
  }

  computeLongestRoad(playerId: string): number {
    const playerEdges = new Set<string>();
    for (const edge of this.state.board.edges) {
      if (edge.road?.playerId === playerId) playerEdges.add(edge.id);
    }

    if (playerEdges.size === 0) return 0;

    // DFS from each edge endpoint
    let maxLength = 0;
    const visited = new Set<string>();

    const dfs = (vertexId: string, length: number) => {
      if (length > maxLength) maxLength = length;

      // Check if vertex is blocked by opponent building
      const vertex = this.vertexMap.get(vertexId);
      if (vertex?.building && vertex.building.playerId !== playerId && length > 0) return;

      const edges = this.vertexEdges.get(vertexId) ?? [];
      for (const edgeId of edges) {
        if (!playerEdges.has(edgeId) || visited.has(edgeId)) continue;
        visited.add(edgeId);
        const edge = this.edgeMap.get(edgeId)!;
        const nextVertex = edge.vertexIds[0] === vertexId ? edge.vertexIds[1] : edge.vertexIds[0];
        dfs(nextVertex, length + 1);
        visited.delete(edgeId);
      }
    };

    // Start DFS from each vertex that has a player road
    const startVertices = new Set<string>();
    for (const edgeId of playerEdges) {
      const edge = this.edgeMap.get(edgeId)!;
      startVertices.add(edge.vertexIds[0]);
      startVertices.add(edge.vertexIds[1]);
    }

    for (const v of startVertices) {
      visited.clear();
      dfs(v, 0);
    }

    return maxLength;
  }

  // ─── Largest Army ─────────────────────────────────────────────────────

  private checkLargestArmy() {
    for (const player of this.state.players) {
      if (player.knightsPlayed > this.state.largestArmySize) {
        if (this.state.largestArmyHolder !== player.id) {
          this.state.largestArmyHolder = player.id;
          this.state.largestArmySize = player.knightsPlayed;
          this.addLog(player.name, 'largest-army', { knights: player.knightsPlayed });
          this.checkVictory();
        }
      }
    }
  }

  // ─── Validation Helpers ───────────────────────────────────────────────

  private isValidSettlementSpot(vertexId: string, playerId: string, isSetup: boolean): boolean {
    const vertex = this.vertexMap.get(vertexId);
    if (!vertex || vertex.building) return false;

    // Distance rule: no building on adjacent vertices
    const neighbors = this.vertexNeighbors.get(vertexId) ?? [];
    for (const nId of neighbors) {
      const neighbor = this.vertexMap.get(nId);
      if (neighbor?.building) return false;
    }

    // During gameplay, must be connected to player's road network
    if (!isSetup) {
      const edges = this.vertexEdges.get(vertexId) ?? [];
      const connected = edges.some((eId) => {
        const edge = this.edgeMap.get(eId);
        return edge?.road?.playerId === playerId;
      });
      if (!connected) return false;
    }

    return true;
  }

  private isConnectedToNetwork(playerId: string, edge: Edge): boolean {
    for (const vId of edge.vertexIds) {
      // Connected to own building
      const vertex = this.vertexMap.get(vId);
      if (vertex?.building?.playerId === playerId) return true;

      // Connected to own road
      const adjEdges = this.vertexEdges.get(vId) ?? [];
      for (const adjEdgeId of adjEdges) {
        const adjEdge = this.edgeMap.get(adjEdgeId);
        if (adjEdge?.road?.playerId === playerId) return true;
      }
    }
    return false;
  }

  // ─── Utility for AI ───────────────────────────────────────────────────

  /** Get all valid settlement spots for a player */
  getValidSettlementSpots(playerId: string, isSetup: boolean): string[] {
    return this.state.board.vertices
      .filter((v) => this.isValidSettlementSpot(v.id, playerId, isSetup))
      .map((v) => v.id);
  }

  /** Get all valid road spots for a player */
  getValidRoadSpots(playerId: string): string[] {
    return this.state.board.edges
      .filter((e) => {
        if (e.road || e.edgeType === 'sea') return false;
        return this.isConnectedToNetwork(playerId, e);
      })
      .map((e) => e.id);
  }

  /** Get vertex pip value (sum of adjacent hex pips) */
  getVertexPips(vertexId: string): number {
    const vertex = this.vertexMap.get(vertexId);
    if (!vertex) return 0;
    let pips = 0;
    for (const hc of vertex.adjacentHexCoords) {
      const hex = this.hexMap.get(hexKey(hc));
      if (hex?.number) pips += NUMBER_PIPS[hex.number] ?? 0;
    }
    return pips;
  }

  /** Get players adjacent to a hex (for robber stealing) */
  getPlayersOnHex(hexCoord: HexCoord, excludePlayerId: string): string[] {
    const players = new Set<string>();
    for (const vertex of this.state.board.vertices) {
      if (!vertex.building || vertex.building.playerId === excludePlayerId) continue;
      const adjacent = vertex.adjacentHexCoords.some(
        (hc) => hc.q === hexCoord.q && hc.r === hexCoord.r
      );
      if (adjacent) players.add(vertex.building.playerId);
    }
    return [...players];
  }
}
