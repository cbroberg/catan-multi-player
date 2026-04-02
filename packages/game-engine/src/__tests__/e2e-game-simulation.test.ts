import { describe, it, expect } from 'vitest';
import { GameEngine, generateRandomBalancedBoard } from '../index';
import type { PlayerState, GameLogEntry } from '../index';
import type { GameConfig, ResourceType, HexCoord } from '@catan/shared';

const RESOURCES: ResourceType[] = ['lumber', 'wool', 'grain', 'brick', 'ore'];

/**
 * Simple AI that makes reasonable decisions.
 * Strategy: build settlements on high-pip spots, upgrade to cities, buy dev cards.
 */
class SimpleAI {
  constructor(
    private engine: GameEngine,
    private playerId: string
  ) {}

  get player(): PlayerState {
    return this.engine.getPlayer(this.playerId)!;
  }

  /** Pick the best available settlement spot (highest pip value) */
  bestSettlementSpot(isSetup: boolean): string | null {
    const spots = this.engine.getValidSettlementSpots(this.playerId, isSetup);
    if (spots.length === 0) return null;
    return spots.sort((a, b) => this.engine.getVertexPips(b) - this.engine.getVertexPips(a))[0];
  }

  /** Pick a road spot — prefer toward high-value vertices */
  bestRoadSpot(): string | null {
    const spots = this.engine.getValidRoadSpots(this.playerId);
    if (spots.length === 0) return null;
    return spots[Math.floor(Math.random() * spots.length)];
  }

  /** Pick a road adjacent to a specific vertex */
  roadAdjacentTo(vertexId: string): string | null {
    const state = this.engine.getState();
    for (const edge of state.board.edges) {
      if (edge.road || edge.edgeType === 'sea') continue;
      if (edge.vertexIds.includes(vertexId)) return edge.id;
    }
    return null;
  }

  /** Play a turn using simple heuristics */
  playTurn() {
    const state = this.engine.getState();
    const player = this.player;

    // Pre-roll: play knight if we have one and there's a good target
    if (state.turnPhase === 'PRE_ROLL' && player.developmentCards.includes('knight')) {
      const robberTarget = this.findRobberTarget();
      if (robberTarget) {
        const victims = this.engine.getPlayersOnHex(robberTarget, this.playerId);
        this.engine.playKnight(this.playerId, robberTarget, victims[0]);
        // turnPhase is now TRADE_BUILD after knight
      }
    }

    // Roll dice if still in PRE_ROLL
    if (this.engine.getState().turnPhase === 'PRE_ROLL') {
      this.engine.rollDice(this.playerId);
    }

    // Handle robber discard
    if (this.engine.getState().turnPhase === 'ROBBER_DISCARD') {
      for (const pid of this.engine.getState().pendingRobberDiscard) {
        this.engine.autoDiscard(pid);
      }
    }

    // Handle robber move
    if (this.engine.getState().turnPhase === 'ROBBER_MOVE') {
      const target = this.findRobberTarget();
      if (target) {
        const victims = this.engine.getPlayersOnHex(target, this.playerId);
        this.engine.moveRobber(this.playerId, target, victims[0]);
      }
    }

    // TRADE_BUILD phase
    if (this.engine.getState().turnPhase === 'TRADE_BUILD') {
      this.doBuildPhase();
    }

    // End turn
    if (this.engine.getState().phase === 'PLAYING') {
      this.engine.endTurn(this.playerId);
    }
  }

  private doBuildPhase() {
    // Try multiple actions per turn
    for (let action = 0; action < 5; action++) {
      if (this.engine.getState().phase !== 'PLAYING') break;
      if (this.engine.getState().turnPhase !== 'TRADE_BUILD') break;

      const player = this.player;

      // 1. Try to build city (best ROI)
      if (player.settlements.length > 0 && this.canAfford({ grain: 2, ore: 3 })) {
        const result = this.engine.buildCity(this.playerId, player.settlements[0]);
        if (result.ok) continue;
      }

      // 2. Try to build settlement
      const spot = this.bestSettlementSpot(false);
      if (spot && this.canAfford({ lumber: 1, brick: 1, wool: 1, grain: 1 })) {
        const result = this.engine.buildSettlement(this.playerId, spot);
        if (result.ok) continue;
      }

      // 3. Try to build road (toward good spots)
      if (player.roads.length < 10) {
        const roadSpot = this.bestRoadSpot();
        if (roadSpot && this.canAfford({ lumber: 1, brick: 1 })) {
          const result = this.engine.buildRoad(this.playerId, roadSpot);
          if (result.ok) continue;
        }
      }

      // 4. Try to buy dev card
      if (this.canAfford({ wool: 1, grain: 1, ore: 1 })) {
        const result = this.engine.buyDevCard(this.playerId);
        if (result.ok) continue;
      }

      // 5. Try maritime trade to get what we need
      this.tryMaritimeTrade();
      break; // No more useful actions
    }

    // Play other dev cards
    this.tryPlayDevCards();
  }

  private tryMaritimeTrade() {
    const player = this.player;

    // Find resource we have most of
    const maxRes = RESOURCES.reduce((a, b) =>
      player.resources[a] >= player.resources[b] ? a : b
    );
    // Find resource we need most
    const minRes = RESOURCES.reduce((a, b) =>
      player.resources[a] <= player.resources[b] ? a : b
    );

    if (maxRes === minRes) return;
    if (player.resources[maxRes] >= 4) {
      this.engine.maritimeTrade(this.playerId, maxRes, minRes);
    }
  }

  private tryPlayDevCards() {
    const player = this.player;

    // Play year of plenty
    if (player.developmentCards.includes('year_of_plenty') && !player.devCardPlayedThisTurn) {
      const minRes = RESOURCES.reduce((a, b) =>
        player.resources[a] <= player.resources[b] ? a : b
      );
      this.engine.playYearOfPlenty(this.playerId, minRes, minRes);
    }

    // Play monopoly (steal resource we have least of)
    if (player.developmentCards.includes('monopoly') && !player.devCardPlayedThisTurn) {
      const minRes = RESOURCES.reduce((a, b) =>
        player.resources[a] <= player.resources[b] ? a : b
      );
      this.engine.playMonopoly(this.playerId, minRes);
    }

    // Play road building
    if (player.developmentCards.includes('road_building') && !player.devCardPlayedThisTurn) {
      const spots = this.engine.getValidRoadSpots(this.playerId);
      if (spots.length >= 2) {
        this.engine.playRoadBuilding(this.playerId, spots[0], spots[1]);
      } else if (spots.length === 1) {
        this.engine.playRoadBuilding(this.playerId, spots[0]);
      }
    }
  }

  private findRobberTarget(): HexCoord | null {
    const state = this.engine.getState();
    // Find hex with opponent buildings and good number
    let bestHex: HexCoord | null = null;
    let bestScore = -1;

    for (const hex of state.board.hexes) {
      if (hex.terrain === 'desert' || hex.terrain === 'sea' || hex.hasRobber) continue;
      if (!hex.number) continue;

      const opponents = this.engine.getPlayersOnHex(hex.coord, this.playerId);
      if (opponents.length === 0) continue;

      const score = (hex.number ? (6 - Math.abs(7 - hex.number)) : 0) + opponents.length;
      if (score > bestScore) {
        bestScore = score;
        bestHex = hex.coord;
      }
    }
    return bestHex;
  }

  private canAfford(cost: Partial<Record<ResourceType, number>>): boolean {
    const player = this.player;
    for (const [res, amount] of Object.entries(cost)) {
      if ((player.resources[res as ResourceType] ?? 0) < (amount ?? 0)) return false;
    }
    return true;
  }
}

// ─── E2E Test ────────────────────────────────────────────────────────────────

describe('E2E: Complete 6-Player Catan Game Simulation', () => {
  it('should play a complete game with 6 players and produce a winner', () => {
    // Setup: 5-6 player base variant
    const config: GameConfig = {
      boardType: 'random-balanced',
      variantId: 'base-5-6',
      maxPlayers: 6,
      victoryPoints: 10,
      turnTimerSeconds: null,
      setupTimerSeconds: null,
      friendlyRobber: false,
      tradeWithInactive: true,
    };

    const { board } = generateRandomBalancedBoard('base-5-6');

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

    // ─── Setup Round 1 (forward order) ─────────────────────────────────
    for (let i = 0; i < 6; i++) {
      const ai = ais[i];
      const spot = ai.bestSettlementSpot(true);
      expect(spot).not.toBeNull();
      const r1 = engine.placeInitialSettlement(ai.player.id, spot!);
      expect(r1.ok).toBe(true);

      const road = ai.roadAdjacentTo(spot!);
      expect(road).not.toBeNull();
      const r2 = engine.placeInitialRoad(ai.player.id, road!);
      expect(r2.ok).toBe(true);
    }

    expect(engine.getState().phase).toBe('SETUP_ROUND_2');

    // ─── Setup Round 2 (reverse order) ─────────────────────────────────
    for (let i = 5; i >= 0; i--) {
      const ai = ais[i];
      const spot = ai.bestSettlementSpot(true);
      expect(spot).not.toBeNull();
      const r1 = engine.placeInitialSettlement(ai.player.id, spot!);
      expect(r1.ok).toBe(true);

      const road = ai.roadAdjacentTo(spot!);
      expect(road).not.toBeNull();
      const r2 = engine.placeInitialRoad(ai.player.id, road!);
      expect(r2.ok).toBe(true);
    }

    expect(engine.getState().phase).toBe('PLAYING');

    // ─── Main Game Loop ────────────────────────────────────────────────
    const MAX_TURNS = 500;
    let turns = 0;

    while (engine.getState().phase === 'PLAYING' && turns < MAX_TURNS) {
      const state = engine.getState();
      const ai = ais[state.currentPlayerIndex];
      ai.playTurn();
      turns++;
    }

    // ─── Results ───────────────────────────────────────────────────────
    const log = engine.getLog();
    const state = engine.getState();

    // Print game summary
    console.log('\n' + '═'.repeat(70));
    console.log('  CATAN GAME SIMULATION — 6 PLAYERS');
    console.log('═'.repeat(70));
    console.log(`  Turns played: ${turns}`);
    console.log(`  Winner: ${state.winner ? engine.getPlayer(state.winner)!.name : 'NONE (max turns reached)'}`);
    console.log('');

    // Player scoreboard
    console.log('  SCOREBOARD:');
    console.log('  ' + '-'.repeat(66));
    console.log('  Player       VP  Settle  Cities  Roads  Knights  DevCards  Resources');
    console.log('  ' + '-'.repeat(66));

    for (const player of state.players) {
      const vp = engine.getVP(player);
      const res = Object.values(player.resources).reduce((a, b) => a + b, 0);
      const badges = [];
      if (state.longestRoadHolder === player.id) badges.push('🛤️ Longest Road');
      if (state.largestArmyHolder === player.id) badges.push('⚔️ Largest Army');
      if (state.winner === player.id) badges.push('👑 WINNER');

      console.log(
        `  ${(player.name + (badges.length ? ' ' + badges.join(' ') : '')).padEnd(14)} ` +
        `${String(vp).padStart(2)}  ` +
        `${String(player.settlements.length).padStart(6)}  ` +
        `${String(player.cities.length).padStart(6)}  ` +
        `${String(player.roads.length).padStart(5)}  ` +
        `${String(player.knightsPlayed).padStart(7)}  ` +
        `${String(player.developmentCards.length).padStart(8)}  ` +
        `${String(res).padStart(9)}`
      );
    }
    console.log('  ' + '-'.repeat(66));

    // Key events log
    const keyEvents = log.filter((e) =>
      ['dice-roll', 'build-settlement', 'build-city', 'build-road', 'buy-dev-card',
       'play-knight', 'play-monopoly', 'play-year-of-plenty', 'play-road-building',
       'maritime-trade', 'move-robber', 'steal', 'longest-road', 'largest-army',
       'VICTORY', 'discard'].includes(e.action)
    );

    console.log(`\n  GAME LOG (${keyEvents.length} key events):`);
    console.log('  ' + '-'.repeat(66));

    for (const entry of keyEvents) {
      const details = formatDetails(entry);
      console.log(`  T${String(entry.turn).padStart(3)} | ${entry.player.padEnd(8)} | ${entry.action.padEnd(20)} | ${details}`);
    }
    console.log('  ' + '-'.repeat(66));

    // Stats
    const diceRolls = log.filter((e) => e.action === 'dice-roll');
    const diceCounts: Record<number, number> = {};
    for (const roll of diceRolls) {
      const total = (roll.details.total as number);
      diceCounts[total] = (diceCounts[total] || 0) + 1;
    }

    console.log('\n  DICE DISTRIBUTION:');
    for (let n = 2; n <= 12; n++) {
      const count = diceCounts[n] || 0;
      const bar = '█'.repeat(Math.round(count / 2));
      console.log(`  ${String(n).padStart(3)}: ${String(count).padStart(3)} ${bar}`);
    }

    console.log('\n  TRADE SUMMARY:');
    const trades = log.filter((e) => e.action === 'maritime-trade');
    console.log(`  Maritime trades: ${trades.length}`);
    const robberies = log.filter((e) => e.action === 'steal');
    console.log(`  Robberies: ${robberies.length}`);
    const discards = log.filter((e) => e.action === 'discard');
    console.log(`  Forced discards (7 roll): ${discards.length}`);
    const devCards = log.filter((e) => e.action === 'buy-dev-card');
    console.log(`  Dev cards bought: ${devCards.length}`);
    console.log('═'.repeat(70));

    // Assertions
    expect(state.winner).not.toBeNull();
    expect(turns).toBeLessThan(MAX_TURNS);
    expect(engine.getVP(engine.getPlayer(state.winner!)!)).toBeGreaterThanOrEqual(10);

    // Every player should have 2 initial settlements
    for (const player of state.players) {
      expect(player.settlements.length + player.cities.length).toBeGreaterThanOrEqual(2);
    }
  }, 30000); // 30 second timeout
});

function formatDetails(entry: GameLogEntry): string {
  switch (entry.action) {
    case 'dice-roll': return `${entry.details.d1}+${entry.details.d2}=${entry.details.total}`;
    case 'build-settlement': return `vertex`;
    case 'build-city': return `upgrade`;
    case 'build-road': return `edge`;
    case 'buy-dev-card': return `${entry.details.card}`;
    case 'play-knight': return `knights: ${entry.details.knightsPlayed}`;
    case 'play-monopoly': return `${entry.details.resource} (stole ${entry.details.stolen})`;
    case 'play-year-of-plenty': return `${(entry.details.resources as string[]).join(', ')}`;
    case 'maritime-trade': return `${entry.details.ratio}:1 ${entry.details.give}→${entry.details.receive}`;
    case 'move-robber': return `to (${(entry.details.to as any).q},${(entry.details.to as any).r})`;
    case 'steal': return `${entry.details.resource} from ${entry.details.from}`;
    case 'longest-road': return `length: ${entry.details.length}`;
    case 'largest-army': return `knights: ${entry.details.knights}`;
    case 'discard': return `${entry.details.count} cards`;
    case 'VICTORY': return `${entry.details.vp} VP! S:${entry.details.settlements} C:${entry.details.cities} LR:${entry.details.longestRoad} LA:${entry.details.largestArmy} VP-cards:${entry.details.vpCards}`;
    default: return JSON.stringify(entry.details);
  }
}
