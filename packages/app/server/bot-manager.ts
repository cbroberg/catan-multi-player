/**
 * BotManager — Manages bot players within game sessions.
 * Bots are virtual socket-less players that use BotAI to decide actions.
 */

import type { Server } from 'socket.io';
import type { PlayerColor, ClientToServerEvents, ServerToClientEvents } from '@catan/shared';
import { GameEngine, BotAI } from '@catan/game-engine';
import type { GameManager } from './game-manager';
import { buildGameView } from './game-view-builder';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// ─── Bot Config ─────────────────────────────────────────────────────────────

export interface BotConfig {
  name: string;
  color: PlayerColor;
  thinkTimeMs: number;
}

// ─── Bot Names ──────────────────────────────────────────────────────────────

export const BOT_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Erik', 'Freja', 'Gustav', 'Hanna'];

// ─── BotManager ─────────────────────────────────────────────────────────────

export class BotManager {
  /** gameId -> Set of bot player IDs */
  private bots = new Map<string, Set<string>>();
  /** gameId -> speed multiplier (1 = normal, higher = faster) */
  private speedMultipliers = new Map<string, number>();
  /** Track pending timeouts so we can cancel them */
  private pendingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  /** Prevent re-entrant action execution */
  private processing = new Set<string>();

  constructor(
    private io: TypedServer,
    private gm: GameManager,
  ) {}

  /** Register a player ID as a bot for a game */
  registerBot(gameId: string, playerId: string): void {
    if (!this.bots.has(gameId)) {
      this.bots.set(gameId, new Set());
    }
    this.bots.get(gameId)!.add(playerId);
  }

  /** Check if a player is a bot */
  isBotPlayer(gameId: string, playerId: string): boolean {
    return this.bots.get(gameId)?.has(playerId) ?? false;
  }

  /** Get all bot IDs for a game */
  getBotIds(gameId: string): string[] {
    return [...(this.bots.get(gameId) ?? [])];
  }

  /** Remove all bots for a game */
  removeBots(gameId: string): void {
    this.cancelPending(gameId);
    this.bots.delete(gameId);
    this.speedMultipliers.delete(gameId);
  }

  /** Set simulation speed multiplier */
  setSimulationSpeed(gameId: string, speedMultiplier: number): void {
    this.speedMultipliers.set(gameId, Math.max(0.1, speedMultiplier));
  }

  /**
   * Called after every game state change.
   * If the current player (or a discard-pending player) is a bot, schedule its action.
   */
  onGameStateChanged(gameId: string, engine: GameEngine): void {
    const state = engine.getState();
    if (state.phase === 'GAME_OVER') return;

    const botIds = this.bots.get(gameId);
    if (!botIds || botIds.size === 0) return;

    // Handle robber discard — any bot that needs to discard
    if (state.turnPhase === 'ROBBER_DISCARD') {
      for (const pid of state.pendingRobberDiscard) {
        if (botIds.has(pid)) {
          this.scheduleBotAction(gameId, pid, engine);
        }
      }
      return;
    }

    // Setup phase — check if setup player is a bot
    if (state.phase === 'SETUP_ROUND_1' || state.phase === 'SETUP_ROUND_2') {
      const setupPlayer = state.players[state.setupPlayerIndex];
      if (setupPlayer && botIds.has(setupPlayer.id)) {
        this.scheduleBotAction(gameId, setupPlayer.id, engine);
      }
      return;
    }

    // Playing phase — check current player
    if (state.phase === 'PLAYING') {
      const currentPlayer = engine.currentPlayer();
      if (botIds.has(currentPlayer.id)) {
        this.scheduleBotAction(gameId, currentPlayer.id, engine);
      }
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────

  private getThinkTime(gameId: string): number {
    const multiplier = this.speedMultipliers.get(gameId) ?? 1;
    // Base think time: 800ms, scaled by multiplier
    return Math.max(50, Math.round(800 / multiplier));
  }

  private cancelPending(gameId: string): void {
    const timeout = this.pendingTimeouts.get(gameId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingTimeouts.delete(gameId);
    }
  }

  private scheduleBotAction(gameId: string, playerId: string, engine: GameEngine): void {
    const key = `${gameId}:${playerId}`;

    // Avoid scheduling if already processing or already scheduled
    if (this.processing.has(key)) return;

    // Cancel any existing pending timeout for this game
    // (a new state change supersedes the old one)
    this.cancelPending(key);

    const thinkTime = this.getThinkTime(gameId);

    const timeout = setTimeout(() => {
      this.pendingTimeouts.delete(key);
      this.executeBotAction(gameId, playerId);
    }, thinkTime);

    this.pendingTimeouts.set(key, timeout);
  }

  private executeBotAction(gameId: string, playerId: string): void {
    const key = `${gameId}:${playerId}`;
    if (this.processing.has(key)) return;
    this.processing.add(key);

    try {
      const engine = this.gm.getEngine(gameId);
      if (!engine) return;

      const state = engine.getState();
      if (state.phase === 'GAME_OVER') return;

      const ai = new BotAI(engine, playerId);
      const action = ai.getNextAction();
      if (!action) return;

      const result = this.executeAction(gameId, engine, playerId, action);
      if (!result) return;

      // Broadcast updated game view to all real players
      this.broadcastGameView(gameId);

      // Check if the game needs another bot action after this one
      // Use a small delay to prevent stack overflow on rapid sequential actions
      setTimeout(() => {
        this.processing.delete(key);
        const freshEngine = this.gm.getEngine(gameId);
        if (freshEngine) {
          this.onGameStateChanged(gameId, freshEngine);
        }
      }, 10);
    } catch (err) {
      console.error(`[BotManager] Error executing bot action for ${playerId} in ${gameId}:`, err);
      // Fallback: try to end turn
      try {
        const engine = this.gm.getEngine(gameId);
        if (engine) {
          const state = engine.getState();
          if (state.phase === 'PLAYING' && engine.currentPlayer().id === playerId) {
            engine.endTurn(playerId);
            this.broadcastGameView(gameId);
          }
        }
      } catch {
        // Ignore fallback errors
      }
    } finally {
      this.processing.delete(key);
    }
  }

  private executeAction(
    gameId: string,
    engine: GameEngine,
    playerId: string,
    action: { type: string; params: unknown[] },
  ): boolean {
    let ok = false;
    let error: string | undefined;

    const run = (r: { ok: boolean; error?: string }) => {
      ok = r.ok;
      error = r.error;
    };

    switch (action.type) {
      case 'setup-settlement':
        run(engine.placeInitialSettlement(playerId, action.params[0] as string));
        break;
      case 'setup-road':
        run(engine.placeInitialRoad(playerId, action.params[0] as string));
        break;
      case 'roll-dice': {
        const rollResult = engine.rollDice(playerId);
        run(rollResult);
        // Emit dice result to all clients (same as human roll)
        if (rollResult.ok && rollResult.dice) {
          const room = this.gm.getGameRoom(gameId);
          this.io.to(room).emit('game:dice-result', {
            d1: rollResult.dice[0],
            d2: rollResult.dice[1],
            total: rollResult.dice[0] + rollResult.dice[1],
          });
        }
        break;
      }
      case 'auto-discard':
        run(engine.autoDiscard(playerId));
        break;
      case 'move-robber':
        run(engine.moveRobber(
          playerId,
          action.params[0] as { q: number; r: number },
          action.params[1] as string | undefined,
        ));
        break;
      case 'build-settlement':
        run(engine.buildSettlement(playerId, action.params[0] as string));
        break;
      case 'build-city':
        run(engine.buildCity(playerId, action.params[0] as string));
        break;
      case 'build-road':
        run(engine.buildRoad(playerId, action.params[0] as string));
        break;
      case 'buy-dev-card':
        run(engine.buyDevCard(playerId));
        break;
      case 'play-knight':
        run(engine.playKnight(
          playerId,
          action.params[0] as { q: number; r: number },
          action.params[1] as string | undefined,
        ));
        break;
      case 'play-road-building':
        run(engine.playRoadBuilding(
          playerId,
          action.params[0] as string,
          action.params[1] as string | undefined,
        ));
        break;
      case 'play-year-of-plenty':
        run(engine.playYearOfPlenty(
          playerId,
          action.params[0] as string as any,
          action.params[1] as string as any,
        ));
        break;
      case 'play-monopoly':
        run(engine.playMonopoly(playerId, action.params[0] as string as any));
        break;
      case 'maritime-trade':
        run(engine.maritimeTrade(
          playerId,
          action.params[0] as string as any,
          action.params[1] as string as any,
        ));
        break;
      case 'end-turn':
        run(engine.endTurn(playerId));
        break;
      default:
        console.warn(`[BotManager] Unknown action type: ${action.type}`);
        return false;
    }

    if (!ok) {
      console.warn(`[BotManager] Action ${action.type} failed for bot ${playerId}: ${error}`);
      return false;
    }

    console.log(`[BotManager] Bot ${playerId} executed: ${action.type}`);
    return true;
  }

  private broadcastGameView(gameId: string): void {
    const engine = this.gm.getEngine(gameId);
    if (!engine) return;

    const session = this.gm.getSession(gameId);
    const activeTrade = (session as any)?.activeTrade ?? null;
    const timerRemaining = this.gm.getTimerRemaining(gameId);
    const botIds = this.bots.get(gameId) ?? new Set<string>();

    const room = this.gm.getGameRoom(gameId);
    const sockets = this.io.sockets.adapter.rooms.get(room);
    if (!sockets) return;

    for (const socketId of sockets) {
      const s = this.io.sockets.sockets.get(socketId);
      if (!s) continue;
      const mapping = this.gm.getPlayerIdForSocket(socketId);
      const view = buildGameView(engine, gameId, mapping?.playerId ?? null, activeTrade, timerRemaining);

      // Mark bot players in the view
      for (const p of view.players) {
        if (botIds.has(p.id)) {
          p.isBot = true;
        }
      }

      s.emit('game:view', view);
    }
  }
}
