import type {
  GameConfig,
  GameBoard,
  GamePhase,
  TurnPhase,
  PlayerColor,
  ResourceType,
  HexCoord,
} from '@catan/shared';

// ─── Development Cards ───────────────────────────────────────────────────────

export type DevCardType = 'knight' | 'victory_point' | 'road_building' | 'year_of_plenty' | 'monopoly';

export const DEV_CARD_DECK: DevCardType[] = [
  ...Array(14).fill('knight' as DevCardType),
  ...Array(5).fill('victory_point' as DevCardType),
  ...Array(2).fill('road_building' as DevCardType),
  ...Array(2).fill('year_of_plenty' as DevCardType),
  ...Array(2).fill('monopoly' as DevCardType),
];

// ─── Player State ────────────────────────────────────────────────────────────

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColor;
  resources: Record<ResourceType, number>;
  developmentCards: DevCardType[];
  newCards: DevCardType[]; // bought this turn, can't play yet
  knightsPlayed: number;
  settlements: string[];
  cities: string[];
  roads: string[];
  devCardPlayedThisTurn: boolean;
}

// ─── Game Engine State ───────────────────────────────────────────────────────

export interface EngineState {
  config: GameConfig;
  board: GameBoard;
  players: PlayerState[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turnPhase: TurnPhase | null;
  turnNumber: number;
  setupRound: 1 | 2;
  setupPlayerIndex: number;
  setupPlacedSettlement: boolean;
  diceRoll: [number, number] | null;
  devCardDeck: DevCardType[];
  longestRoadHolder: string | null;
  longestRoadLength: number;
  largestArmyHolder: string | null;
  largestArmySize: number;
  pendingRobberDiscard: string[]; // player IDs that need to discard
  winner: string | null;
}

// ─── Action Result ───────────────────────────────────────────────────────────

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// ─── Game Log ────────────────────────────────────────────────────────────────

export interface GameLogEntry {
  turn: number;
  phase: string;
  player: string;
  action: string;
  details: Record<string, unknown>;
}
