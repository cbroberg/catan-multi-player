import type { GameBoard } from './board';

// ─── Game Config ─────────────────────────────────────────────────────────────

export type BoardType = 'random-balanced' | 'curated' | 'beginner';

export interface GameConfig {
  boardType: BoardType;
  boardPresetId?: string;
  variantId: string;
  maxPlayers: 3 | 4 | 5 | 6 | 7 | 8;
  victoryPoints: number;
  turnTimerSeconds: number | null;
  setupTimerSeconds: number | null;
  friendlyRobber: boolean;
  tradeWithInactive: boolean;
}

// ─── Player ──────────────────────────────────────────────────────────────────

export type PlayerColor = 'red' | 'blue' | 'white' | 'orange' | 'green' | 'brown';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  avatar: string;
  victoryPoints: number;
  resources: Record<string, number>;
  knightsPlayed: number;
  longestRoadLength: number;
}

// ─── Game Phases ─────────────────────────────────────────────────────────────

export type GamePhase =
  | 'LOBBY'
  | 'SETUP_ROUND_1'
  | 'SETUP_ROUND_2'
  | 'PLAYING'
  | 'GAME_OVER';

export type TurnPhase =
  | 'PRE_ROLL'
  | 'ROLL_DICE'
  | 'ROBBER_DISCARD'
  | 'ROBBER_MOVE'
  | 'ROBBER_STEAL'
  | 'TRADE_BUILD'
  | 'END_TURN';

// ─── Game State ──────────────────────────────────────────────────────────────

export interface GameState {
  id: string;
  config: GameConfig;
  phase: GamePhase;
  turnPhase: TurnPhase | null;
  board: GameBoard;
  players: Player[];
  currentPlayerIndex: number;
  turnOrder: string[];
  diceRoll: [number, number] | null;
  longestRoadHolder: string | null;
  largestArmyHolder: string | null;
  winner: string | null;
}
