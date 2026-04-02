import type { HexCoord, TerrainType, HarborType } from '../types/board';
import type { HarborEdgePosition } from './board';

// ─── Expansion Type ──────────────────────────────────────────────────────────

export type ExpansionType = 'base' | 'seafarers';

// ─── Board Variant Config ────────────────────────────────────────────────────

export interface BoardVariantConfig {
  id: string;
  name: string;
  expansion: ExpansionType;
  playerRange: [number, number];

  /** Row widths for symmetric diamond grids (e.g. [3,4,5,4,3]) */
  rowWidths?: number[];
  /** Explicit hex positions for irregular layouts (Seafarers) */
  hexPositions?: HexCoord[];

  /** Terrain distribution — how many of each terrain to place */
  terrainCounts: Partial<Record<TerrainType, number>>;
  /** Number tokens to distribute on producing hexes */
  numberTokens: number[];
  /** Harbor type distribution */
  harborTypes: HarborType[];
  /** Explicit harbor edge positions (if omitted, auto-detected from perimeter) */
  harborEdgeOverrides?: HarborEdgePosition[];

  /** Default victory points to win */
  defaultVictoryPoints: number;
  /** 5-6+ players: allow building between turns */
  specialBuildingPhase: boolean;

  // ─── Seafarers-specific ────────────────────────────────────────────────────
  /** Which hex positions are sea (subset of all positions) */
  seaPositions?: HexCoord[];
  /** Whether ships can be built */
  hasShips?: boolean;
  /** Whether the pirate exists */
  hasPirate?: boolean;
  /** Groups of hex coords forming foreign islands (for VP bonus) */
  foreignIslands?: HexCoord[][];
}

// ─── Hex Position Generator ──────────────────────────────────────────────────

/**
 * Generate hex positions from row widths for a symmetric diamond grid.
 * Uses flat-top axial coordinates.
 *
 * Example: [3,4,5,4,3] → 19 HexCoords matching standard Catan board.
 */
export function generateHexPositions(rowWidths: number[]): HexCoord[] {
  const n = rowWidths.length;
  const centerIndex = Math.floor((n - 1) / 2);
  const maxWidth = Math.max(...rowWidths);
  const halfW = Math.floor((maxWidth - 1) / 2);
  const positions: HexCoord[] = [];

  for (let i = 0; i < n; i++) {
    const r = i - centerIndex;
    const qStart = -halfW - Math.min(0, r);
    for (let j = 0; j < rowWidths[i]; j++) {
      positions.push({ q: qStart + j, r });
    }
  }
  return positions;
}

/**
 * Resolve hex positions from a variant config.
 * Uses explicit hexPositions if provided, otherwise generates from rowWidths.
 */
export function resolveHexPositions(config: BoardVariantConfig): HexCoord[] {
  if (config.hexPositions) return config.hexPositions;
  if (config.rowWidths) return generateHexPositions(config.rowWidths);
  throw new Error(`Variant ${config.id} must have rowWidths or hexPositions`);
}

/**
 * Expand terrain counts to a flat tile array for shuffling.
 */
export function expandTerrainCounts(
  counts: Partial<Record<TerrainType, number>>
): TerrainType[] {
  return Object.entries(counts).flatMap(([terrain, count]) =>
    Array(count ?? 0).fill(terrain as TerrainType)
  );
}

// ─── Base Game Variants ──────────────────────────────────────────────────────

export const BASE_3_4: BoardVariantConfig = {
  id: 'base-3-4',
  name: 'Standard (3-4 spillere)',
  expansion: 'base',
  playerRange: [3, 4],
  rowWidths: [3, 4, 5, 4, 3],
  terrainCounts: {
    forest: 4, pasture: 4, fields: 4,
    hills: 3, mountains: 3, desert: 1,
  },
  numberTokens: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  harborTypes: ['3:1', '3:1', '3:1', '3:1', 'lumber', 'wool', 'grain', 'brick', 'ore'],
  defaultVictoryPoints: 10,
  specialBuildingPhase: false,
};

export const BASE_5_6: BoardVariantConfig = {
  id: 'base-5-6',
  name: 'Udvidelse (5-6 spillere)',
  expansion: 'base',
  playerRange: [5, 6],
  rowWidths: [3, 4, 5, 6, 5, 4, 3],
  terrainCounts: {
    forest: 6, pasture: 6, fields: 6,
    hills: 5, mountains: 5, desert: 2,
  },
  // 28 tokens for 28 non-desert hexes (30 total - 2 desert)
  numberTokens: [
    2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6,
    8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12,
  ],
  harborTypes: [
    '3:1', '3:1', '3:1', '3:1', '3:1', '3:1',
    'lumber', 'wool', 'grain', 'brick', 'ore',
  ],
  defaultVictoryPoints: 10,
  specialBuildingPhase: true,
};

export const BASE_7_8: BoardVariantConfig = {
  id: 'base-7-8',
  name: 'Stor udvidelse (7-8 spillere)',
  expansion: 'base',
  playerRange: [7, 8],
  rowWidths: [4, 5, 6, 7, 6, 5, 4],
  terrainCounts: {
    forest: 7, pasture: 7, fields: 7,
    hills: 6, mountains: 6, desert: 4,
  },
  // 33 tokens for 33 non-desert hexes (37 total - 4 desert)
  numberTokens: [
    2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6,
    8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 12, 12,
  ],
  harborTypes: [
    '3:1', '3:1', '3:1', '3:1', '3:1', '3:1', '3:1',
    'lumber', 'wool', 'grain', 'brick', 'ore', 'lumber', 'wool',
  ],
  defaultVictoryPoints: 10,
  specialBuildingPhase: true,
};

// ─── Seafarers Variants ──────────────────────────────────────────────────────

/**
 * Seafarers: Heading for New Shores (3-4 players).
 * Main island + 3 small foreign islands separated by sea.
 * Uses a [5,6,7,6,5] grid = 29 hexes total.
 */
function buildSeafarers34(): BoardVariantConfig {
  const allPositions = generateHexPositions([5, 6, 7, 6, 5]);

  // Define land clusters (main island center + 3 small islands in corners)
  const mainIsland = new Set([
    // Central cluster of 11 hexes (roughly 2-3-3-2-1)
    '0,-2', '1,-2',
    '-1,-1', '0,-1', '1,-1',
    '-1,0', '0,0', '1,0',
    '-1,1', '0,1',
    '0,2',
  ]);

  const island1Coords: HexCoord[] = [
    { q: 3, r: -2 }, { q: 3, r: -1 }, { q: 2, r: -1 },
  ];
  const island2Coords: HexCoord[] = [
    { q: -3, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 },
  ];
  const island3Coords: HexCoord[] = [
    { q: 2, r: 1 }, { q: 1, r: 2 }, { q: 2, r: 0 },
  ];

  const landSet = new Set([
    ...mainIsland,
    ...island1Coords.map((c) => `${c.q},${c.r}`),
    ...island2Coords.map((c) => `${c.q},${c.r}`),
    ...island3Coords.map((c) => `${c.q},${c.r}`),
  ]);

  const seaPositions = allPositions.filter(
    (p) => !landSet.has(`${p.q},${p.r}`)
  );

  // 20 land hexes: 11 main + 9 islands
  // Terrain: 11 main + 9 small = 20 land hexes
  // Of those: 1 desert, 2 gold_river, 17 regular land
  const landCount = landSet.size; // 20

  return {
    id: 'seafarers-3-4',
    name: 'Søfarer (3-4 spillere)',
    expansion: 'seafarers',
    playerRange: [3, 4],
    hexPositions: allPositions,
    seaPositions,
    terrainCounts: {
      forest: 4, pasture: 4, fields: 4,
      hills: 3, mountains: 3, desert: 1,
      gold_river: 1,
      sea: seaPositions.length,
    },
    // 18 tokens for 18 producing hexes (20 land - 1 desert - 1 gold_river gets a token too = 19 tokens)
    // Actually gold_river DOES produce (player choice) so it gets a token
    // 20 land - 1 desert = 19 producing hexes
    numberTokens: [
      2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12, 4,
    ],
    harborTypes: [
      '3:1', '3:1', '3:1', '3:1', '3:1',
      'lumber', 'wool', 'grain', 'brick', 'ore', '3:1',
    ],
    defaultVictoryPoints: 12,
    specialBuildingPhase: false,
    hasShips: true,
    hasPirate: true,
    foreignIslands: [island1Coords, island2Coords, island3Coords],
  };
}

export const SEAFARERS_3_4: BoardVariantConfig = buildSeafarers34();

/**
 * Seafarers: Heading for New Shores (5-6 players).
 * Larger frame with main island + 4 foreign islands.
 * Uses a [5,6,7,8,7,6,5] grid = 44 hexes total.
 */
function buildSeafarers56(): BoardVariantConfig {
  const allPositions = generateHexPositions([5, 6, 7, 8, 7, 6, 5]);

  const mainIsland = new Set([
    '0,-3', '1,-3',
    '-1,-2', '0,-2', '1,-2', '2,-2',
    '-1,-1', '0,-1', '1,-1', '2,-1',
    '-1,0', '0,0', '1,0',
    '0,1', '-1,1',
  ]);

  const island1: HexCoord[] = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -2 }];
  const island2: HexCoord[] = [{ q: -3, r: 0 }, { q: -4, r: 1 }, { q: -3, r: 1 }];
  const island3: HexCoord[] = [{ q: 3, r: 0 }, { q: 3, r: 1 }, { q: 2, r: 1 }];
  const island4: HexCoord[] = [{ q: -3, r: 2 }, { q: -4, r: 3 }, { q: -3, r: 3 }];

  const landSet = new Set([
    ...mainIsland,
    ...[island1, island2, island3, island4].flat().map((c) => `${c.q},${c.r}`),
  ]);

  const seaPositions = allPositions.filter((p) => !landSet.has(`${p.q},${p.r}`));
  const landCount = landSet.size; // 27 land hexes

  return {
    id: 'seafarers-5-6',
    name: 'Søfarer (5-6 spillere)',
    expansion: 'seafarers',
    playerRange: [5, 6],
    hexPositions: allPositions,
    seaPositions,
    terrainCounts: {
      forest: 6, pasture: 5, fields: 5,
      hills: 4, mountains: 4, desert: 1,
      gold_river: 2,
      sea: seaPositions.length,
    },
    // 26 producing hexes (27 land - 1 desert)
    numberTokens: [
      2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6,
      8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12,
    ],
    harborTypes: [
      '3:1', '3:1', '3:1', '3:1', '3:1', '3:1',
      'lumber', 'wool', 'grain', 'brick', 'ore', '3:1', '3:1',
    ],
    defaultVictoryPoints: 12,
    specialBuildingPhase: true,
    hasShips: true,
    hasPirate: true,
    foreignIslands: [island1, island2, island3, island4],
  };
}

export const SEAFARERS_5_6: BoardVariantConfig = buildSeafarers56();

/**
 * Seafarers: Heading for New Shores (7-8 players).
 * Large frame with main island + 5 foreign islands.
 * Uses a [6,7,8,9,8,7,6] grid = 51 hexes total.
 */
function buildSeafarers78(): BoardVariantConfig {
  const allPositions = generateHexPositions([6, 7, 8, 9, 8, 7, 6]);

  const mainIsland = new Set([
    '0,-3', '1,-3', '2,-3',
    '-1,-2', '0,-2', '1,-2', '2,-2', '3,-2',
    '-1,-1', '0,-1', '1,-1', '2,-1',
    '-1,0', '0,0', '1,0', '2,0',
    '0,1', '-1,1', '1,1',
  ]);

  const island1: HexCoord[] = [{ q: 5, r: -3 }, { q: 5, r: -2 }, { q: 4, r: -2 }];
  const island2: HexCoord[] = [{ q: -4, r: 0 }, { q: -4, r: 1 }, { q: -3, r: 1 }];
  const island3: HexCoord[] = [{ q: 4, r: 0 }, { q: 4, r: 1 }, { q: 3, r: 1 }];
  const island4: HexCoord[] = [{ q: -4, r: 2 }, { q: -5, r: 3 }, { q: -4, r: 3 }];
  const island5: HexCoord[] = [{ q: 2, r: 2 }, { q: 1, r: 3 }, { q: 2, r: 1 }];

  const landSet = new Set([
    ...mainIsland,
    ...[island1, island2, island3, island4, island5].flat().map((c) => `${c.q},${c.r}`),
  ]);

  const seaPositions = allPositions.filter((p) => !landSet.has(`${p.q},${p.r}`));

  return {
    id: 'seafarers-7-8',
    name: 'Søfarer (7-8 spillere)',
    expansion: 'seafarers',
    playerRange: [7, 8],
    hexPositions: allPositions,
    seaPositions,
    terrainCounts: {
      forest: 7, pasture: 7, fields: 7,
      hills: 5, mountains: 5, desert: 2,
      gold_river: 1,
      sea: seaPositions.length,
    },
    // 32 producing hexes (34 land - 2 desert)
    numberTokens: [
      2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6,
      8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 12, 12, 12,
    ],
    harborTypes: [
      '3:1', '3:1', '3:1', '3:1', '3:1', '3:1', '3:1',
      'lumber', 'wool', 'grain', 'brick', 'ore', 'lumber', 'wool', '3:1',
    ],
    defaultVictoryPoints: 14,
    specialBuildingPhase: true,
    hasShips: true,
    hasPirate: true,
    foreignIslands: [island1, island2, island3, island4, island5],
  };
}

export const SEAFARERS_7_8: BoardVariantConfig = buildSeafarers78();

// ─── Variant Registry ────────────────────────────────────────────────────────

export const BOARD_VARIANTS: Record<string, BoardVariantConfig> = {
  'base-3-4': BASE_3_4,
  'base-5-6': BASE_5_6,
  'base-7-8': BASE_7_8,
  'seafarers-3-4': SEAFARERS_3_4,
  'seafarers-5-6': SEAFARERS_5_6,
  'seafarers-7-8': SEAFARERS_7_8,
};

export function getVariant(id: string): BoardVariantConfig {
  const v = BOARD_VARIANTS[id];
  if (!v) throw new Error(`Unknown board variant: ${id}`);
  return v;
}
