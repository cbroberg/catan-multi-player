import { describe, it, expect, beforeEach } from 'vitest';
import { GameManager } from '../game-manager';
import type { GameConfig } from '@catan/shared';

const BASE_CONFIG: GameConfig = {
  boardType: 'random-balanced',
  variantId: 'base-3-4',
  maxPlayers: 4,
  victoryPoints: 10,
  turnTimerSeconds: null,
  setupTimerSeconds: null,
  friendlyRobber: false,
  tradeWithInactive: true,
};

describe('GameManager', () => {
  let gm: GameManager;

  beforeEach(() => {
    gm = new GameManager();
  });

  // ─── Game Creation ──────────────────────────────────────────────────

  describe('createGame', () => {
    it('should create a game with a 5-char code', () => {
      const { gameId, code, lobby } = gm.createGame(BASE_CONFIG);
      expect(gameId).toBeTruthy();
      expect(code).toHaveLength(5);
      expect(lobby.phase).toBe('waiting');
      expect(lobby.players).toHaveLength(0);
    });

    it('should generate a board matching the variant', () => {
      const { lobby } = gm.createGame(BASE_CONFIG);
      expect(lobby.board).not.toBeNull();
      expect(lobby.board!.hexes).toHaveLength(19);
      expect(lobby.board!.variantId).toBe('base-3-4');
    });

    it('should generate unique codes for multiple games', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const { code } = gm.createGame(BASE_CONFIG);
        codes.add(code);
      }
      expect(codes.size).toBe(20);
    });

    it('should support 5-6 player variant', () => {
      const { lobby } = gm.createGame({ ...BASE_CONFIG, variantId: 'base-5-6', maxPlayers: 6 });
      expect(lobby.board!.hexes).toHaveLength(30);
      expect(lobby.maxPlayers).toBe(6);
    });
  });

  // ─── Joining ────────────────────────────────────────────────────────

  describe('joinGame', () => {
    it('should allow a player to join by code', () => {
      const { code } = gm.createGame(BASE_CONFIG);
      const result = gm.joinGame(code, 'Alice', 'red', '⚔️', 'socket-1');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.playerId).toBeTruthy();
      expect(result.lobby.players).toHaveLength(1);
      expect(result.lobby.players[0].name).toBe('Alice');
      expect(result.lobby.players[0].color).toBe('red');
      expect(result.lobby.players[0].isHost).toBe(true);
    });

    it('should make first player the host', () => {
      const { code } = gm.createGame(BASE_CONFIG);
      const r1 = gm.joinGame(code, 'Alice', 'red', '⚔️', 'socket-1');
      const r2 = gm.joinGame(code, 'Bob', 'blue', '🛡️', 'socket-2');

      if ('error' in r1 || 'error' in r2) return;
      expect(r1.lobby.players[0].isHost).toBe(true);
      expect(r2.lobby.players[1].isHost).toBe(false);
    });

    it('should auto-reassign color if taken', () => {
      const { code } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 'socket-1');
      const r2 = gm.joinGame(code, 'Bob', 'red', '🛡️', 'socket-2');

      if ('error' in r2) return;
      expect(r2.lobby.players[1].color).not.toBe('red');
    });

    it('should reject join with invalid code', () => {
      const result = gm.joinGame('ZZZZZ', 'Alice', 'red', '⚔️', 'socket-1');
      expect('error' in result).toBe(true);
    });

    it('should reject join when game is full', () => {
      const config = { ...BASE_CONFIG, maxPlayers: 3 as const };
      const { code } = gm.createGame(config);

      gm.joinGame(code, 'A', 'red', '⚔️', 's1');
      gm.joinGame(code, 'B', 'blue', '🛡️', 's2');
      gm.joinGame(code, 'C', 'white', '🏰', 's3');
      const r4 = gm.joinGame(code, 'D', 'orange', '⛵', 's4');

      expect('error' in r4).toBe(true);
    });

    it('should be case-insensitive for codes', () => {
      const { code } = gm.createGame(BASE_CONFIG);
      const result = gm.joinGame(code.toLowerCase(), 'Alice', 'red', '⚔️', 'socket-1');
      expect('error' in result).toBe(false);
    });
  });

  // ─── Ready & Start ─────────────────────────────────────────────────

  describe('ready and start', () => {
    it('should toggle player ready state', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 'socket-1');

      const lobby = gm.toggleReady(gameId, 'socket-1');
      expect(lobby).not.toBeNull();
      expect(lobby!.players[0].isReady).toBe(true);

      const lobby2 = gm.toggleReady(gameId, 'socket-1');
      expect(lobby2!.players[0].isReady).toBe(false);
    });

    it('should set phase to ready when all players are ready (min 2)', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');
      gm.joinGame(code, 'Bob', 'blue', '🛡️', 's2');

      gm.toggleReady(gameId, 's1');
      const lobby = gm.toggleReady(gameId, 's2');
      expect(lobby!.phase).toBe('ready');
    });

    it('should not allow start with fewer than 2 players', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');

      const result = gm.startGame(gameId, 's1');
      expect('error' in result).toBe(true);
    });

    it('should not allow non-host to start', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');
      gm.joinGame(code, 'Bob', 'blue', '🛡️', 's2');

      const result = gm.startGame(gameId, 's2');
      expect('error' in result).toBe(true);
    });

    it('should return turn order on start', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');
      gm.joinGame(code, 'Bob', 'blue', '🛡️', 's2');
      gm.joinGame(code, 'Charlie', 'white', '🏰', 's3');

      const result = gm.startGame(gameId, 's1');
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.turnOrder).toHaveLength(3);
    });
  });

  // ─── Color Change ──────────────────────────────────────────────────

  describe('changeColor', () => {
    it('should allow changing to an available color', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');

      const lobby = gm.changeColor(gameId, 's1', 'blue');
      expect(lobby).not.toBeNull();
      expect(lobby!.players[0].color).toBe('blue');
    });

    it('should reject changing to a taken color', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');
      gm.joinGame(code, 'Bob', 'blue', '🛡️', 's2');

      const lobby = gm.changeColor(gameId, 's1', 'blue');
      expect(lobby).toBeNull();
    });
  });

  // ─── Board Regeneration ────────────────────────────────────────────

  describe('regenerateBoard', () => {
    it('should generate a new board for the same variant', () => {
      const { gameId, lobby } = gm.createGame(BASE_CONFIG);
      const oldHexes = lobby.board!.hexes.map((h) => h.terrain).join(',');

      // Regenerate a few times — at least one should differ
      let changed = false;
      for (let i = 0; i < 10; i++) {
        const result = gm.regenerateBoard(gameId);
        if (result && result.board.hexes.map((h) => h.terrain).join(',') !== oldHexes) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
    });
  });

  // ─── Player Disconnect ─────────────────────────────────────────────

  describe('removePlayer', () => {
    it('should remove player and promote new host', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');
      gm.joinGame(code, 'Bob', 'blue', '🛡️', 's2');

      const result = gm.removePlayer('s1');
      expect(result).not.toBeNull();
      expect(result!.lobby.players).toHaveLength(1);
      expect(result!.lobby.players[0].name).toBe('Bob');
      expect(result!.lobby.players[0].isHost).toBe(true);
    });

    it('should clean up game when all players leave', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');

      gm.removePlayer('s1');
      expect(gm.getSession(gameId)).toBeUndefined();
    });
  });

  // ─── Available Colors ──────────────────────────────────────────────

  describe('getAvailableColors', () => {
    it('should return all colors for empty game', () => {
      const { gameId } = gm.createGame(BASE_CONFIG);
      const colors = gm.getAvailableColors(gameId);
      expect(colors).toHaveLength(6);
    });

    it('should exclude taken colors', () => {
      const { code, gameId } = gm.createGame(BASE_CONFIG);
      gm.joinGame(code, 'Alice', 'red', '⚔️', 's1');
      gm.joinGame(code, 'Bob', 'blue', '🛡️', 's2');

      const colors = gm.getAvailableColors(gameId);
      expect(colors).not.toContain('red');
      expect(colors).not.toContain('blue');
      expect(colors).toHaveLength(4);
    });
  });
});
