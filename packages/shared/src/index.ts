// Types
export type {
  HexCoord,
  Point,
  TerrainType,
  ResourceType,
  HarborType,
  Harbor,
  EdgeType,
  Hex,
  Vertex,
  Edge,
  GameBoard,
  BoardDifficulty,
  BoardPreset,
  HarborPlacement,
  BalanceScore,
} from './types/board';

export { TERRAIN_TO_RESOURCE } from './types/board';

export type {
  BoardType,
  GameConfig,
  PlayerColor,
  Player,
  GamePhase,
  TurnPhase,
  GameState,
} from './types/game';

// Constants (base-3-4 defaults — kept for backward compatibility)
export {
  BOARD_HEXES,
  BOARD_HEX_SET,
  TERRAIN_COUNTS,
  TERRAIN_TILES,
  NUMBER_TOKENS,
  NUMBER_PIPS,
  HARBOR_TYPES,
  HARBOR_EDGE_POSITIONS,
  HEX_DIRECTIONS,
  CORNER_HEX_OFFSETS,
  BUILDING_COSTS,
  PIECE_LIMITS,
} from './constants/board';

export type { HarborEdgePosition } from './constants/board';

// Game view types
export type {
  DevCardType,
  PublicPlayer,
  BoardBuilding,
  BoardRoad,
  ValidActions,
  GameView,
  TradeOffer,
  GameActionEvents,
  GameStateEvents,
} from './types/game-view';

// Lobby types
export type {
  LobbyPlayer,
  LobbyState,
  ClientToServerEvents,
  ServerToClientEvents,
} from './types/lobby';

// Board variants
export type { BoardVariantConfig, ExpansionType } from './constants/board-variants';

export {
  generateHexPositions,
  resolveHexPositions,
  expandTerrainCounts,
  BASE_3_4,
  BASE_5_6,
  BASE_7_8,
  SEAFARERS_3_4,
  SEAFARERS_5_6,
  SEAFARERS_7_8,
  BOARD_VARIANTS,
  getVariant,
} from './constants/board-variants';
