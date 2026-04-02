import type { HexCoord, TerrainType, HarborType } from '../types/board.js';

// ─── Board Hex Positions ─────────────────────────────────────────────────────

/** The 19 hex positions for a standard Catan board (3-4-5-4-3 flat-top layout) */
export const BOARD_HEXES: HexCoord[] = [
  // Row 0 (3 hexes): r = -2, q = 0..2
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  // Row 1 (4 hexes): r = -1, q = -1..2
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  // Row 2 (5 hexes): r = 0, q = -2..2
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // Row 3 (4 hexes): r = 1, q = -2..1
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  // Row 4 (3 hexes): r = 2, q = -2..0
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
];

/** Set of valid hex coordinate strings for O(1) lookup */
export const BOARD_HEX_SET = new Set(
  BOARD_HEXES.map((h) => `${h.q},${h.r}`)
);

// ─── Terrain Distribution ────────────────────────────────────────────────────

/** Terrain counts for standard base-3-4 board */
export const TERRAIN_COUNTS: Record<TerrainType, number> = {
  forest: 4,
  pasture: 4,
  fields: 4,
  hills: 3,
  mountains: 3,
  desert: 1,
  sea: 0,
  gold_river: 0,
};

/** All 19 terrain tiles (shuffled during generation) */
export const TERRAIN_TILES: TerrainType[] = Object.entries(TERRAIN_COUNTS).flatMap(
  ([terrain, count]) => Array(count).fill(terrain as TerrainType)
);

// ─── Number Tokens ───────────────────────────────────────────────────────────

/** The 18 number tokens (desert gets none) */
export const NUMBER_TOKENS: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

/** Pip count (probability dots) for each number */
export const NUMBER_PIPS: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

// ─── Harbors ─────────────────────────────────────────────────────────────────

/** Standard harbor distribution */
export const HARBOR_TYPES: HarborType[] = [
  '3:1', '3:1', '3:1', '3:1',
  'lumber', 'wool', 'grain', 'brick', 'ore',
];

/**
 * Harbor edge positions — each harbor attaches to a specific edge on the board perimeter.
 * Defined as pairs of hex coordinates that form each harbor edge's adjacent vertices.
 * The direction points outward from the board.
 */
export interface HarborEdgePosition {
  /** The hex coord this harbor edge is on (must be a perimeter hex) */
  hex: HexCoord;
  /** Corner index 0-5 — the edge goes from corner[i] to corner[(i+1)%6] */
  edgeCornerIndex: number;
}

export const HARBOR_EDGE_POSITIONS: HarborEdgePosition[] = [
  // Going clockwise from top-left
  { hex: { q: 0, r: -2 }, edgeCornerIndex: 4 },  // top edge of (0,-2)
  { hex: { q: 2, r: -2 }, edgeCornerIndex: 5 },  // top-right of (2,-2)
  { hex: { q: 2, r: -1 }, edgeCornerIndex: 0 },  // right of (2,-1)
  { hex: { q: 2, r: 0 }, edgeCornerIndex: 0 },   // right of (2,0)
  { hex: { q: 1, r: 1 }, edgeCornerIndex: 1 },   // bottom-right of (1,1)
  { hex: { q: 0, r: 2 }, edgeCornerIndex: 1 },   // bottom of (0,2)
  { hex: { q: -2, r: 2 }, edgeCornerIndex: 2 },  // bottom-left of (-2,2)
  { hex: { q: -2, r: 1 }, edgeCornerIndex: 3 },  // left of (-2,1)
  { hex: { q: -2, r: 0 }, edgeCornerIndex: 3 },  // left of (-2,0)
];

// ─── Hex Neighbors (flat-top) ────────────────────────────────────────────────

/** The 6 neighbor direction offsets for flat-top axial hexagons */
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // E
  { q: 0, r: 1 },   // SE
  { q: -1, r: 1 },  // SW
  { q: -1, r: 0 },  // W
  { q: 0, r: -1 },  // NW
  { q: 1, r: -1 },  // NE
];

/**
 * For flat-top hex (q,r), corner i is shared by 3 hexes.
 * This maps corner index → the two OTHER hex offsets (relative to the hex).
 * The three hexes sharing corner i of (q,r) are:
 *   (q,r), (q+offsets[i][0].q, r+offsets[i][0].r), (q+offsets[i][1].q, r+offsets[i][1].r)
 */
export const CORNER_HEX_OFFSETS: [HexCoord, HexCoord][] = [
  // Corner 0 (0°):   (q,r), (q+1,r-1), (q+1,r)
  [{ q: 1, r: -1 }, { q: 1, r: 0 }],
  // Corner 1 (60°):  (q,r), (q+1,r),   (q,r+1)
  [{ q: 1, r: 0 }, { q: 0, r: 1 }],
  // Corner 2 (120°): (q,r), (q,r+1),   (q-1,r+1)
  [{ q: 0, r: 1 }, { q: -1, r: 1 }],
  // Corner 3 (180°): (q,r), (q-1,r+1), (q-1,r)
  [{ q: -1, r: 1 }, { q: -1, r: 0 }],
  // Corner 4 (240°): (q,r), (q-1,r),   (q,r-1)
  [{ q: -1, r: 0 }, { q: 0, r: -1 }],
  // Corner 5 (300°): (q,r), (q,r-1),   (q+1,r-1)
  [{ q: 0, r: -1 }, { q: 1, r: -1 }],
];

// ─── Building Costs ──────────────────────────────────────────────────────────

export const BUILDING_COSTS = {
  road: { lumber: 1, brick: 1 },
  settlement: { lumber: 1, brick: 1, wool: 1, grain: 1 },
  city: { grain: 2, ore: 3 },
  developmentCard: { wool: 1, grain: 1, ore: 1 },
} as const;

// ─── Piece Limits ────────────────────────────────────────────────────────────

export const PIECE_LIMITS = {
  roads: 15,
  settlements: 5,
  cities: 4,
} as const;
