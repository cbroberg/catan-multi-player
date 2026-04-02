// Board generation
export {
  generateRandomBalancedBoard,
  generateBoardFromArrays,
} from './board/board-generator';
export type { GeneratedBoard } from './board/board-generator';

// Board topology
export {
  hexKey,
  isValidHex,
  createHexValidator,
  getHexNeighbors,
  getValidHexNeighbors,
  areHexNeighbors,
  hexToPixel,
  hexCorner,
  vertexId,
  cornerVertexId,
  cornerHexes,
  edgeId,
  computeBoardTopology,
  vertexPixelPosition,
  computeHexAdjacency,
} from './board/hex-grid';
export type { BoardTopology } from './board/hex-grid';

// Balance scoring
export {
  passesHardConstraints,
  computeBalanceScore,
} from './board/balance-scoring';

// Harbor detection
export {
  detectPerimeterEdges,
  distributeHarbors,
} from './board/harbor-detection';

// Island generation (Seafarers)
export {
  generateIslandLayout,
  computeTerrainDistribution,
} from './board/island-generator';
export type {
  IslandGenerationConfig,
  IslandGenerationResult,
} from './board/island-generator';

// Game engine
export { GameEngine } from './engine/game-engine';
export type { EngineState, PlayerState, DevCardType, ActionResult, GameLogEntry } from './engine/types';
export { DEV_CARD_DECK } from './engine/types';

// Presets
export {
  BEGINNER_PRESET,
  BOARD_PRESETS,
  getPresetById,
} from './board/presets';
