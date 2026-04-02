import type { GameConfig, GameBoard, ResourceType, HexCoord } from '@catan/shared';
import { generateRandomBalancedBoard, GameEngine } from '@catan/game-engine';
import type { PlayerState, GameLogEntry } from '@catan/game-engine';

const RESOURCES: ResourceType[] = ['lumber', 'wool', 'grain', 'brick', 'ore'];

// ─── Frame: a snapshot of visual state at a point in time ────────────────────

export interface ReplayFrame {
  index: number;
  turn: number;
  logEntry: GameLogEntry;
  /** Buildings on vertices: vertexId → { type, color } */
  buildings: Map<string, { type: 'settlement' | 'city'; color: string }>;
  /** Roads on edges: edgeId → color */
  roads: Map<string, string>;
  /** Robber hex coord */
  robberPosition: HexCoord;
  /** Player scores */
  scores: { name: string; color: string; vp: number; resources: number; knights: number; roads: number; settlements: number; cities: number; devCards: number }[];
  /** Current player name */
  currentPlayer: string;
  /** Winner (if game over) */
  winner: string | null;
}

export interface SimulationResult {
  board: GameBoard;
  frames: ReplayFrame[];
  players: { id: string; name: string; color: string }[];
  totalTurns: number;
  winner: string;
}

// ─── Simple AI (same as E2E test) ────────────────────────────────────────────

class SimpleAI {
  constructor(private engine: GameEngine, private playerId: string) {}
  get player(): PlayerState { return this.engine.getPlayer(this.playerId)!; }

  bestSettlementSpot(isSetup: boolean): string | null {
    const spots = this.engine.getValidSettlementSpots(this.playerId, isSetup);
    if (spots.length === 0) return null;
    return spots.sort((a, b) => this.engine.getVertexPips(b) - this.engine.getVertexPips(a))[0];
  }

  roadAdjacentTo(vertexId: string): string | null {
    const state = this.engine.getState();
    for (const edge of state.board.edges) {
      if (edge.road || edge.edgeType === 'sea') continue;
      if (edge.vertexIds.includes(vertexId)) return edge.id;
    }
    return null;
  }

  bestRoadSpot(): string | null {
    const spots = this.engine.getValidRoadSpots(this.playerId);
    return spots.length > 0 ? spots[Math.floor(Math.random() * spots.length)] : null;
  }

  playTurn() {
    const state = this.engine.getState();
    const player = this.player;

    if (state.turnPhase === 'PRE_ROLL' && player.developmentCards.includes('knight')) {
      const target = this.findRobberTarget();
      if (target) {
        const victims = this.engine.getPlayersOnHex(target, this.playerId);
        this.engine.playKnight(this.playerId, target, victims[0]);
      }
    }

    if (this.engine.getState().turnPhase === 'PRE_ROLL') {
      this.engine.rollDice(this.playerId);
    }

    if (this.engine.getState().turnPhase === 'ROBBER_DISCARD') {
      for (const pid of this.engine.getState().pendingRobberDiscard) {
        this.engine.autoDiscard(pid);
      }
    }

    if (this.engine.getState().turnPhase === 'ROBBER_MOVE') {
      const target = this.findRobberTarget();
      if (target) {
        const victims = this.engine.getPlayersOnHex(target, this.playerId);
        this.engine.moveRobber(this.playerId, target, victims[0]);
      }
    }

    if (this.engine.getState().turnPhase === 'TRADE_BUILD') {
      this.doBuildPhase();
    }

    if (this.engine.getState().phase === 'PLAYING') {
      this.engine.endTurn(this.playerId);
    }
  }

  private doBuildPhase() {
    for (let i = 0; i < 5; i++) {
      if (this.engine.getState().phase !== 'PLAYING' || this.engine.getState().turnPhase !== 'TRADE_BUILD') break;
      const p = this.player;

      if (p.settlements.length > 0 && this.canAfford({ grain: 2, ore: 3 })) {
        if (this.engine.buildCity(this.playerId, p.settlements[0]).ok) continue;
      }
      const spot = this.bestSettlementSpot(false);
      if (spot && this.canAfford({ lumber: 1, brick: 1, wool: 1, grain: 1 })) {
        if (this.engine.buildSettlement(this.playerId, spot).ok) continue;
      }
      if (p.roads.length < 10) {
        const road = this.bestRoadSpot();
        if (road && this.canAfford({ lumber: 1, brick: 1 })) {
          if (this.engine.buildRoad(this.playerId, road).ok) continue;
        }
      }
      if (this.canAfford({ wool: 1, grain: 1, ore: 1 })) {
        if (this.engine.buyDevCard(this.playerId).ok) continue;
      }
      // Maritime trade
      const maxRes = RESOURCES.reduce((a, b) => p.resources[a] >= p.resources[b] ? a : b);
      const minRes = RESOURCES.reduce((a, b) => p.resources[a] <= p.resources[b] ? a : b);
      if (maxRes !== minRes && p.resources[maxRes] >= 4) {
        this.engine.maritimeTrade(this.playerId, maxRes, minRes);
      }
      break;
    }
    // Play other dev cards
    const p = this.player;
    if (p.developmentCards.includes('year_of_plenty') && !p.devCardPlayedThisTurn) {
      const min = RESOURCES.reduce((a, b) => p.resources[a] <= p.resources[b] ? a : b);
      this.engine.playYearOfPlenty(this.playerId, min, min);
    }
    if (p.developmentCards.includes('monopoly') && !p.devCardPlayedThisTurn) {
      const min = RESOURCES.reduce((a, b) => p.resources[a] <= p.resources[b] ? a : b);
      this.engine.playMonopoly(this.playerId, min);
    }
    if (p.developmentCards.includes('road_building') && !p.devCardPlayedThisTurn) {
      const spots = this.engine.getValidRoadSpots(this.playerId);
      if (spots.length >= 2) this.engine.playRoadBuilding(this.playerId, spots[0], spots[1]);
      else if (spots.length === 1) this.engine.playRoadBuilding(this.playerId, spots[0]);
    }
  }

  private findRobberTarget(): HexCoord | null {
    const state = this.engine.getState();
    let best: HexCoord | null = null;
    let bestScore = -1;
    for (const hex of state.board.hexes) {
      if (hex.terrain === 'desert' || hex.terrain === 'sea' || hex.hasRobber || !hex.number) continue;
      const opponents = this.engine.getPlayersOnHex(hex.coord, this.playerId);
      if (opponents.length === 0) continue;
      const score = (6 - Math.abs(7 - hex.number)) + opponents.length;
      if (score > bestScore) { bestScore = score; best = hex.coord; }
    }
    return best;
  }

  private canAfford(cost: Partial<Record<ResourceType, number>>): boolean {
    for (const [r, a] of Object.entries(cost)) {
      if ((this.player.resources[r as ResourceType] ?? 0) < (a ?? 0)) return false;
    }
    return true;
  }
}

// ─── Capture Frame ───────────────────────────────────────────────────────────

function captureFrame(engine: GameEngine, logEntry: GameLogEntry, index: number): ReplayFrame {
  const state = engine.getState();
  const buildings = new Map<string, { type: 'settlement' | 'city'; color: string }>();
  const roads = new Map<string, string>();

  for (const vertex of state.board.vertices) {
    if (vertex.building) {
      const player = state.players.find((p) => p.id === vertex.building!.playerId);
      buildings.set(vertex.id, { type: vertex.building.type, color: player?.color ?? 'gray' });
    }
  }

  for (const edge of state.board.edges) {
    if (edge.road) {
      const player = state.players.find((p) => p.id === edge.road!.playerId);
      roads.set(edge.id, player?.color ?? 'gray');
    }
  }

  return {
    index,
    turn: logEntry.turn,
    logEntry,
    buildings: new Map(buildings),
    roads: new Map(roads),
    robberPosition: { ...state.board.robberPosition },
    scores: state.players.map((p) => ({
      name: p.name,
      color: p.color,
      vp: engine.getVP(p),
      resources: Object.values(p.resources).reduce((a, b) => a + b, 0),
      knights: p.knightsPlayed,
      roads: p.roads.length,
      settlements: p.settlements.length,
      cities: p.cities.length,
      devCards: p.developmentCards.length + p.newCards.length,
    })),
    currentPlayer: state.players[state.currentPlayerIndex]?.name ?? '',
    winner: state.winner ? state.players.find((p) => p.id === state.winner)?.name ?? null : null,
  };
}

// ─── Key events worth showing frames for ─────────────────────────────────────

const KEY_ACTIONS = new Set([
  'setup-settlement', 'setup-road', 'game-start',
  'dice-roll', 'build-settlement', 'build-city', 'build-road',
  'buy-dev-card', 'play-knight', 'play-monopoly', 'play-year-of-plenty', 'play-road-building',
  'maritime-trade', 'move-robber', 'steal', 'discard',
  'longest-road', 'largest-army', 'VICTORY', 'end-turn',
]);

// ─── Run Simulation ──────────────────────────────────────────────────────────

export function runSimulation(variantId: string = 'base-5-6'): SimulationResult {
  const config: GameConfig = {
    boardType: 'random-balanced',
    variantId,
    maxPlayers: 6,
    victoryPoints: 10,
    turnTimerSeconds: null,
    setupTimerSeconds: null,
    friendlyRobber: false,
    tradeWithInactive: true,
  };

  const { board } = generateRandomBalancedBoard(variantId);

  const playerDefs = [
    { id: 'p1', name: 'Alice', color: 'red' },
    { id: 'p2', name: 'Bob', color: 'blue' },
    { id: 'p3', name: 'Charlie', color: 'white' },
    { id: 'p4', name: 'Diana', color: 'orange' },
    { id: 'p5', name: 'Erik', color: 'green' },
    { id: 'p6', name: 'Freja', color: 'brown' },
  ];

  const engine = new GameEngine(config, board, playerDefs);
  const ais = playerDefs.map((p) => new SimpleAI(engine, p.id));
  const frames: ReplayFrame[] = [];
  let lastLogLen = 0;

  const captureNewFrames = () => {
    const log = engine.getLog();
    for (let i = lastLogLen; i < log.length; i++) {
      if (KEY_ACTIONS.has(log[i].action)) {
        frames.push(captureFrame(engine, log[i], frames.length));
      }
    }
    lastLogLen = log.length;
  };

  // Setup rounds
  for (let i = 0; i < 6; i++) {
    const ai = ais[i];
    const spot = ai.bestSettlementSpot(true)!;
    engine.placeInitialSettlement(ai.player.id, spot);
    captureNewFrames();
    engine.placeInitialRoad(ai.player.id, ai.roadAdjacentTo(spot)!);
    captureNewFrames();
  }
  for (let i = 5; i >= 0; i--) {
    const ai = ais[i];
    const spot = ai.bestSettlementSpot(true)!;
    engine.placeInitialSettlement(ai.player.id, spot);
    captureNewFrames();
    engine.placeInitialRoad(ai.player.id, ai.roadAdjacentTo(spot)!);
    captureNewFrames();
  }

  // Main game
  let turns = 0;
  while (engine.getState().phase === 'PLAYING' && turns < 500) {
    const state = engine.getState();
    ais[state.currentPlayerIndex].playTurn();
    captureNewFrames();
    turns++;
  }

  const state = engine.getState();
  const winnerPlayer = state.players.find((p) => p.id === state.winner);

  return {
    board,
    frames,
    players: playerDefs,
    totalTurns: turns,
    winner: winnerPlayer?.name ?? 'Unknown',
  };
}
