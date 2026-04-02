import type { GamePhase, TurnPhase, PlayerColor } from './game';
import type { HexCoord, ResourceType, GameBoard } from './board';

/** Development card types */
export type DevCardType = 'knight' | 'victory_point' | 'road_building' | 'year_of_plenty' | 'monopoly';

/** Public player info visible to all */
export interface PublicPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  vp: number;
  resourceCount: number;
  devCardCount: number;
  knightsPlayed: number;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  settlements: string[];
  cities: string[];
  roads: string[];
}

/** A building on the board */
export interface BoardBuilding {
  vertexId: string;
  type: 'settlement' | 'city';
  playerId: string;
  color: PlayerColor;
}

/** A road on the board */
export interface BoardRoad {
  edgeId: string;
  playerId: string;
  color: PlayerColor;
}

/** What actions the current player can take right now */
export interface ValidActions {
  canRollDice: boolean;
  canBuildRoad: boolean;
  canBuildSettlement: boolean;
  canBuildCity: boolean;
  canBuyDevCard: boolean;
  canPlayDevCard: boolean;
  canMaritimeTrade: boolean;
  canEndTurn: boolean;
  mustDiscard: boolean;
  mustMoveRobber: boolean;
  /** Valid vertex IDs for settlement placement */
  validSettlementSpots: string[];
  /** Valid edge IDs for road placement */
  validRoadSpots: string[];
  /** Valid hex coords for robber placement */
  validRobberHexes: HexCoord[];
  /** Players on current robber hex that can be stolen from */
  stealTargets: string[];
}

/** Complete game view sent to each client */
export interface GameView {
  gameId: string;
  variantId: string;
  phase: GamePhase;
  turnPhase: TurnPhase | null;
  turnNumber: number;
  currentPlayerId: string;
  diceRoll: [number, number] | null;

  /** The board (hexes, harbors — static after generation) */
  board: GameBoard;

  /** Buildings on the board */
  buildings: BoardBuilding[];
  /** Roads on the board */
  roads: BoardRoad[];
  /** Robber position */
  robberPosition: HexCoord;

  /** All players (public info) */
  players: PublicPlayer[];

  /** Private: this player's hand (only sent to the requesting player) */
  myPlayerId: string;
  myResources: Record<ResourceType, number>;
  myDevCards: DevCardType[];

  /** What the viewing player can do right now */
  validActions: ValidActions;

  /** Recent game log entries */
  recentLog: { player: string; action: string; details: string }[];

  /** Active trade offer (if any) */
  activeTrade: TradeOffer | null;

  /** Setup phase: whose turn and what they need to place */
  setupInfo: {
    currentPlayerId: string;
    currentPlayerName: string;
    needsSettlement: boolean;
    needsRoad: boolean;
    round: 1 | 2;
  } | null;

  /** Winner ID (if game over) */
  winner: string | null;
  winnerName: string | null;

  /** VP target */
  victoryPoints: number;
}

// ─── Trade ───────────────────────────────────────────────────────────────────

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  /** Resources the proposer is offering */
  offering: Partial<Record<ResourceType, number>>;
  /** Resources the proposer wants */
  requesting: Partial<Record<ResourceType, number>>;
  /** Player IDs that have accepted */
  accepted: string[];
  /** Player IDs that have rejected */
  rejected: string[];
  status: 'open' | 'accepted' | 'rejected' | 'cancelled';
}

// ─── Game Action Events (Client → Server) ────────────────────────────────────

export interface GameActionEvents {
  /** Setup phase actions */
  'action:setup-settlement': (gameId: string, vertexId: string) => void;
  'action:setup-road': (gameId: string, edgeId: string) => void;
  /** Main game actions */
  'action:roll-dice': (gameId: string) => void;
  'action:build-settlement': (gameId: string, vertexId: string) => void;
  'action:build-city': (gameId: string, vertexId: string) => void;
  'action:build-road': (gameId: string, edgeId: string) => void;
  'action:buy-dev-card': (gameId: string) => void;
  'action:play-knight': (gameId: string, hexCoord: HexCoord, stealFromId?: string) => void;
  'action:play-monopoly': (gameId: string, resource: ResourceType) => void;
  'action:play-year-of-plenty': (gameId: string, res1: ResourceType, res2: ResourceType) => void;
  'action:play-road-building': (gameId: string, edge1: string, edge2?: string) => void;
  'action:maritime-trade': (gameId: string, give: ResourceType, receive: ResourceType) => void;
  'action:move-robber': (gameId: string, hexCoord: HexCoord, stealFromId?: string) => void;
  'action:discard': (gameId: string, cards: Partial<Record<ResourceType, number>>) => void;
  'action:end-turn': (gameId: string) => void;
  /** Trade actions */
  'action:propose-trade': (gameId: string, offering: Partial<Record<ResourceType, number>>, requesting: Partial<Record<ResourceType, number>>) => void;
  'action:accept-trade': (gameId: string, tradeId: string) => void;
  'action:reject-trade': (gameId: string, tradeId: string) => void;
  'action:cancel-trade': (gameId: string) => void;
  'action:confirm-trade': (gameId: string, tradeId: string, withPlayerId: string) => void;
}

// ─── Game State Events (Server → Client) ──────────────────────────────────────

export interface GameStateEvents {
  'game:view': (view: GameView) => void;
  'game:action-error': (error: string) => void;
  'game:dice-result': (data: { d1: number; d2: number; total: number }) => void;
}
