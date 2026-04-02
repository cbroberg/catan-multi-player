import type {
  GameConfig,
  PlayerColor,
  LobbyPlayer,
  LobbyState,
  GameBoard,
  BalanceScore,
} from '@catan/shared';
import { generateRandomBalancedBoard, generateBoardFromArrays, BEGINNER_PRESET, GameEngine } from '@catan/game-engine';
import type { GeneratedBoard } from '@catan/game-engine';
import { randomBytes } from 'crypto';

// ─── Game Session ────────────────────────────────────────────────────────────

interface GameSession {
  id: string;
  code: string;
  config: GameConfig;
  players: Map<string, LobbyPlayer>;
  board: GameBoard;
  balanceScore: BalanceScore;
  phase: LobbyState['phase'];
  createdAt: number;
  /** Socket IDs observing this game (big screens) */
  observers: Set<string>;
  /** Game engine (created when game starts) */
  engine: GameEngine | null;
}

// ─── Available Colors ────────────────────────────────────────────────────────

const ALL_COLORS: PlayerColor[] = ['red', 'blue', 'white', 'orange', 'green', 'brown'];

// ─── Game Manager ────────────────────────────────────────────────────────────

export class GameManager {
  private games = new Map<string, GameSession>();
  private codeToGameId = new Map<string, string>();
  private socketToPlayer = new Map<string, { gameId: string; playerId: string }>();

  createGame(config: GameConfig): { gameId: string; code: string; lobby: LobbyState } {
    const gameId = randomBytes(8).toString('hex');
    const code = this.generateUniqueCode();

    // Generate board based on config
    const { board, score } = this.generateBoard(config);

    const session: GameSession = {
      id: gameId,
      code,
      config,
      players: new Map(),
      board,
      balanceScore: score,
      phase: 'waiting',
      createdAt: Date.now(),
      observers: new Set(),
      engine: null,
    };

    this.games.set(gameId, session);
    this.codeToGameId.set(code, gameId);

    return { gameId, code, lobby: this.toLobbyState(session) };
  }

  joinGame(
    code: string,
    name: string,
    color: PlayerColor,
    avatar: string,
    socketId: string
  ): { gameId: string; playerId: string; lobby: LobbyState } | { error: string } {
    const gameId = this.codeToGameId.get(code.toUpperCase());
    if (!gameId) return { error: 'Game not found' };

    const session = this.games.get(gameId);
    if (!session) return { error: 'Game not found' };

    if (session.phase !== 'waiting') return { error: 'Game already started' };

    if (session.players.size >= session.config.maxPlayers) {
      return { error: 'Game is full' };
    }

    // Check color availability
    const takenColors = new Set([...session.players.values()].map((p) => p.color));
    if (takenColors.has(color)) {
      // Auto-assign available color
      const available = ALL_COLORS.filter((c) => !takenColors.has(c));
      if (available.length === 0) return { error: 'No colors available' };
      color = available[0];
    }

    const playerId = randomBytes(6).toString('hex');
    const player: LobbyPlayer = {
      id: playerId,
      name,
      color,
      avatar,
      isReady: false,
      isHost: session.players.size === 0,
    };

    session.players.set(playerId, player);
    this.socketToPlayer.set(socketId, { gameId, playerId });

    return { gameId, playerId, lobby: this.toLobbyState(session) };
  }

  addObserver(gameId: string, socketId: string): LobbyState | null {
    const session = this.games.get(gameId);
    if (!session) return null;
    session.observers.add(socketId);
    return this.toLobbyState(session);
  }

  toggleReady(gameId: string, socketId: string): LobbyState | null {
    const session = this.games.get(gameId);
    const mapping = this.socketToPlayer.get(socketId);
    if (!session || !mapping) return null;

    const player = session.players.get(mapping.playerId);
    if (!player) return null;

    player.isReady = !player.isReady;

    // Check if all players are ready (minimum 2 players)
    const allReady =
      session.players.size >= 2 &&
      [...session.players.values()].every((p) => p.isReady);
    session.phase = allReady ? 'ready' : 'waiting';

    return this.toLobbyState(session);
  }

  changeColor(gameId: string, socketId: string, color: PlayerColor): LobbyState | null {
    const session = this.games.get(gameId);
    const mapping = this.socketToPlayer.get(socketId);
    if (!session || !mapping) return null;

    const player = session.players.get(mapping.playerId);
    if (!player) return null;

    const takenColors = new Set(
      [...session.players.values()].filter((p) => p.id !== player.id).map((p) => p.color)
    );
    if (takenColors.has(color)) return null;

    player.color = color;
    return this.toLobbyState(session);
  }

  startGame(gameId: string, socketId: string): { turnOrder: string[] } | { error: string } {
    const session = this.games.get(gameId);
    if (!session) return { error: 'Game not found' };

    // Allow start from either a host player OR an observer (big screen)
    const mapping = this.socketToPlayer.get(socketId);
    if (mapping) {
      const player = session.players.get(mapping.playerId);
      if (!player?.isHost) return { error: 'Only host can start' };
    } else if (!session.observers.has(socketId)) {
      return { error: 'Not authorized' };
    }

    if (session.players.size < 2) return { error: 'Need at least 2 players' };

    // Determine turn order by dice roll simulation
    const playerIds = [...session.players.keys()];
    const turnOrder = playerIds
      .map((id) => ({ id, roll: Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2 }))
      .sort((a, b) => b.roll - a.roll)
      .map((p) => p.id);

    // Create the GameEngine with turn-ordered players
    const playerDefs = turnOrder.map((pid) => {
      const p = session.players.get(pid)!;
      return { id: pid, name: p.name, color: p.color };
    });

    session.engine = new GameEngine(session.config, session.board, playerDefs);
    session.phase = 'started';
    return { turnOrder };
  }

  getEngine(gameId: string): GameEngine | null {
    return this.games.get(gameId)?.engine ?? null;
  }

  getPlayerIdForSocket(socketId: string): { gameId: string; playerId: string } | null {
    return this.socketToPlayer.get(socketId) ?? null;
  }

  regenerateBoard(gameId: string): { board: GameBoard; score: BalanceScore } | null {
    const session = this.games.get(gameId);
    if (!session) return null;

    const { board, score } = this.generateBoard(session.config);
    session.board = board;
    session.balanceScore = score;
    return { board, score };
  }

  removePlayer(socketId: string): { gameId: string; playerId: string; lobby: LobbyState } | null {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return null;

    const session = this.games.get(mapping.gameId);
    if (!session) return null;

    session.players.delete(mapping.playerId);
    session.observers.delete(socketId);
    this.socketToPlayer.delete(socketId);

    // If host left, promote next player
    if (session.players.size > 0) {
      const hasHost = [...session.players.values()].some((p) => p.isHost);
      if (!hasHost) {
        const firstPlayer = session.players.values().next().value;
        if (firstPlayer) firstPlayer.isHost = true;
      }
    }

    // Clean up empty games
    if (session.players.size === 0 && session.observers.size === 0) {
      this.games.delete(session.id);
      this.codeToGameId.delete(session.code);
    }

    return {
      gameId: mapping.gameId,
      playerId: mapping.playerId,
      lobby: this.toLobbyState(session),
    };
  }

  removeObserver(socketId: string): void {
    for (const session of this.games.values()) {
      session.observers.delete(socketId);
    }
  }

  getGameRoom(gameId: string): string {
    return `game:${gameId}`;
  }

  getSession(gameId: string): GameSession | undefined {
    return this.games.get(gameId);
  }

  getAvailableColors(gameId: string): PlayerColor[] {
    const session = this.games.get(gameId);
    if (!session) return ALL_COLORS;
    const taken = new Set([...session.players.values()].map((p) => p.color));
    return ALL_COLORS.filter((c) => !taken.has(c));
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private generateBoard(config: GameConfig): GeneratedBoard {
    if (config.boardType === 'beginner') {
      return generateBoardFromArrays(
        BEGINNER_PRESET.terrains,
        BEGINNER_PRESET.numbers,
        BEGINNER_PRESET.harbors.map((h) => h.type),
        config.variantId
      );
    }
    return generateRandomBalancedBoard(config.variantId);
  }

  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0/O, 1/I)
    let code: string;
    do {
      code = Array.from({ length: 5 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
    } while (this.codeToGameId.has(code));
    return code;
  }

  private toLobbyState(session: GameSession): LobbyState {
    return {
      gameId: session.id,
      code: session.code,
      config: session.config,
      players: [...session.players.values()],
      board: session.board,
      balanceScore: session.balanceScore,
      phase: session.phase,
      maxPlayers: session.config.maxPlayers,
    };
  }
}
