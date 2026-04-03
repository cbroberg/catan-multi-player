import type { PlayerColor, GameConfig } from './game';
import type { GameBoard, BalanceScore } from './board';
import type { GameActionEvents, GameStateEvents } from './game-view';

// ─── Lobby Types ─────────────────────────────────────────────────────────────

export interface LobbyPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  avatar: string;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
}

export interface LobbyState {
  gameId: string;
  code: string;
  config: GameConfig;
  players: LobbyPlayer[];
  board: GameBoard | null;
  balanceScore: BalanceScore | null;
  phase: 'waiting' | 'ready' | 'starting' | 'started';
  maxPlayers: number;
}

// ─── Socket Events: Client → Server ─────────────────────────────────────────

export interface ClientToServerEvents {
  /** Host creates a new game */
  'game:create': (config: GameConfig, callback: (response: { gameId: string; code: string } | { error: string }) => void) => void;

  /** Player joins a game by code */
  'game:join': (data: { code: string; name: string; color: PlayerColor; avatar: string }, callback: (response: { gameId: string; playerId: string } | { error: string }) => void) => void;

  /** Big screen connects to observe a game */
  'game:observe': (gameId: string, callback: (response: { lobby: LobbyState } | { error: string }) => void) => void;

  /** Player toggles ready state */
  'player:ready': (gameId: string) => void;

  /** Player changes color */
  'player:color': (data: { gameId: string; color: PlayerColor }) => void;

  /** Host starts the game */
  'game:start': (gameId: string, callback: (response: { success: boolean } | { error: string }) => void) => void;

  /** Player leaves */
  'game:leave': (gameId: string) => void;

  /** Host regenerates board */
  'game:regenerate-board': (gameId: string) => void;

  /** Add a bot player */
  'game:add-bot': (gameId: string, callback: (response: { playerId: string } | { error: string }) => void) => void;

  /** Remove all bot players */
  'game:remove-bots': (gameId: string) => void;

  /** Set bot simulation speed */
  'game:set-bot-speed': (gameId: string, speedMultiplier: number) => void;

  // ─── Game Actions (forwarded to GameEngine) ────────────────────────
  'action:setup-settlement': GameActionEvents['action:setup-settlement'];
  'action:setup-road': GameActionEvents['action:setup-road'];
  'action:roll-dice': GameActionEvents['action:roll-dice'];
  'action:build-settlement': GameActionEvents['action:build-settlement'];
  'action:build-city': GameActionEvents['action:build-city'];
  'action:build-road': GameActionEvents['action:build-road'];
  'action:buy-dev-card': GameActionEvents['action:buy-dev-card'];
  'action:play-knight': GameActionEvents['action:play-knight'];
  'action:play-monopoly': GameActionEvents['action:play-monopoly'];
  'action:play-year-of-plenty': GameActionEvents['action:play-year-of-plenty'];
  'action:play-road-building': GameActionEvents['action:play-road-building'];
  'action:maritime-trade': GameActionEvents['action:maritime-trade'];
  'action:move-robber': GameActionEvents['action:move-robber'];
  'action:discard': GameActionEvents['action:discard'];
  'action:end-turn': GameActionEvents['action:end-turn'];
  'action:propose-trade': GameActionEvents['action:propose-trade'];
  'action:accept-trade': GameActionEvents['action:accept-trade'];
  'action:reject-trade': GameActionEvents['action:reject-trade'];
  'action:cancel-trade': GameActionEvents['action:cancel-trade'];
  'action:confirm-trade': GameActionEvents['action:confirm-trade'];

  /** Request current game view */
  'game:request-view': (gameId: string) => void;

  /** Observe a bot player's hand (read-only spectator view) */
  'game:observe-bot': (gameId: string, botPlayerId: string, callback: (response: { success: boolean } | { error: string }) => void) => void;
}

// ─── Socket Events: Server → Client ─────────────────────────────────────────

export interface ServerToClientEvents {
  /** Full lobby state update */
  'lobby:state': (lobby: LobbyState) => void;

  /** A player joined */
  'lobby:player-joined': (player: LobbyPlayer) => void;

  /** A player left */
  'lobby:player-left': (playerId: string) => void;

  /** A player changed ready state */
  'lobby:player-ready': (data: { playerId: string; isReady: boolean }) => void;

  /** A player changed color */
  'lobby:player-color': (data: { playerId: string; color: PlayerColor }) => void;

  /** Game is starting (redirect to game view) */
  'game:starting': (data: { gameId: string; turnOrder: string[] }) => void;

  /** Board was regenerated */
  'lobby:board-updated': (data: { board: GameBoard; score: BalanceScore }) => void;

  /** Error message */
  'error': (message: string) => void;

  // ─── Game State Updates ────────────────────────────────────────────
  'game:view': GameStateEvents['game:view'];
  'game:action-error': GameStateEvents['game:action-error'];
  'game:dice-result': GameStateEvents['game:dice-result'];
  'game:timer-sync': GameStateEvents['game:timer-sync'];
  'game:timer-expired': GameStateEvents['game:timer-expired'];
}
