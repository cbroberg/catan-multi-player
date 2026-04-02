// ─── Coordinate System ───────────────────────────────────────────────────────

/** Axial hex coordinate (flat-top orientation) */
export interface HexCoord {
  q: number;
  r: number;
}

/** 2D pixel position */
export interface Point {
  x: number;
  y: number;
}

// ─── Terrain & Resources ─────────────────────────────────────────────────────

export type TerrainType =
  | 'forest'
  | 'pasture'
  | 'fields'
  | 'hills'
  | 'mountains'
  | 'desert'
  | 'sea'
  | 'gold_river';

export type ResourceType = 'lumber' | 'wool' | 'grain' | 'brick' | 'ore';

/** Maps terrain → resource (desert/sea produce nothing, gold_river is player choice at runtime) */
export const TERRAIN_TO_RESOURCE: Record<TerrainType, ResourceType | null> = {
  forest: 'lumber',
  pasture: 'wool',
  fields: 'grain',
  hills: 'brick',
  mountains: 'ore',
  desert: null,
  sea: null,
  gold_river: null,
};

// ─── Harbors ─────────────────────────────────────────────────────────────────

export type HarborType = '3:1' | 'lumber' | 'wool' | 'grain' | 'brick' | 'ore';

export interface Harbor {
  type: HarborType;
  /** The edge this harbor is attached to */
  edgeId: string;
  /** The two vertices that can use this harbor */
  vertexIds: [string, string];
}

// ─── Board Elements ──────────────────────────────────────────────────────────

export type EdgeType = 'land' | 'sea' | 'coastal';

export interface Hex {
  coord: HexCoord;
  terrain: TerrainType;
  /** null for desert and sea */
  number: number | null;
  hasRobber: boolean;
  hasPirate: boolean;
}

export interface Vertex {
  id: string;
  /** Hex coords adjacent to this vertex (1-3, fewer on board edges) */
  adjacentHexCoords: HexCoord[];
  /** Hex coords of all 3 theoretical hexes (including off-board) — used for ID generation */
  canonicalHexCoords: [HexCoord, HexCoord, HexCoord];
  building: null | { type: 'settlement' | 'city'; playerId: string };
  harbor: HarborType | null;
}

export interface Edge {
  id: string;
  /** The two vertex IDs this edge connects */
  vertexIds: [string, string];
  road: null | { playerId: string };
  ship: null | { playerId: string };
  edgeType: EdgeType;
}

// ─── Complete Board ──────────────────────────────────────────────────────────

export interface GameBoard {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  harbors: Harbor[];
  robberPosition: HexCoord;
  piratePosition: HexCoord | null;
  variantId: string;
  /** Foreign island groups for Seafarers VP bonus (procedurally generated) */
  foreignIslands?: HexCoord[][];
}

// ─── Board Presets ───────────────────────────────────────────────────────────

export type BoardDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface BoardPreset {
  id: string;
  name: string;
  description: string;
  difficulty: BoardDifficulty;
  variantId: string;
  /** Terrain entries ordered by hex position index */
  terrains: TerrainType[];
  /** Number entries ordered by hex position index (null for desert/sea) */
  numbers: (number | null)[];
  /** Harbor placements */
  harbors: HarborPlacement[];
  balanceScore: number;
}

export interface HarborPlacement {
  type: HarborType;
  /** Index into harbor edge positions */
  edgeIndex: number;
}

// ─── Balance Score ───────────────────────────────────────────────────────────

export interface BalanceScore {
  /** Overall 0-100 */
  total: number;
  /** Resource EV balance (higher = more balanced) */
  resourceEV: number;
  /** Intersection pip balance (higher = no overpowered intersections) */
  intersectionBalance: number;
  /** Geographic spread of high-value hexes */
  geographicSpread: number;
}
