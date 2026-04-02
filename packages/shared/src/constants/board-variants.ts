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
  /** Seafarers island generation params (if set, islands are generated procedurally) */
  islandGeneration?: {
    mainIslandSize: number;
    foreignIslandCount: number;
    foreignIslandMinSize: number;
    foreignIslandMaxSize: number;
    /** Max players — used to validate main island has enough settlement spots */
    maxPlayers?: number;
  };
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
// Inspired by official Catan Seafarers scenarios ("The Four Islands",
// "Heading for New Shores"). Uses large hex frames filled with sea,
// with island clusters placed inside. Sea is the dominant terrain —
// it creates the navigable ocean for ships, pirate, and exploration.
//
// CRITICAL: Every island group is separated from every other island group
// by at least 1 hex of sea. No hex in island A may be adjacent to any hex
// in island B. This is enforced by validateIslandSeparation().

/**
 * Returns the 6 axial neighbors of a hex in flat-top orientation.
 */
function hexNeighbors(q: number, r: number): HexCoord[] {
  return [
    { q: q + 1, r }, { q: q - 1, r },
    { q, r: r + 1 }, { q, r: r - 1 },
    { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 },
  ];
}

/**
 * Validates that no two island groups share adjacent hexes.
 * Each hex in island A must NOT be a neighbor of any hex in island B.
 * Throws if any pair of islands violates separation.
 */
export function validateIslandSeparation(islands: HexCoord[][]): void {
  for (let i = 0; i < islands.length; i++) {
    // Build the "expanded zone" = all hexes in island i + their neighbors
    const zone = new Set<string>();
    for (const h of islands[i]) {
      zone.add(`${h.q},${h.r}`);
      for (const n of hexNeighbors(h.q, h.r)) {
        zone.add(`${n.q},${n.r}`);
      }
    }
    for (let j = i + 1; j < islands.length; j++) {
      for (const h of islands[j]) {
        if (zone.has(`${h.q},${h.r}`)) {
          throw new Error(
            `Island separation violated: island ${i} and island ${j} ` +
            `touch or overlap at (${h.q},${h.r})`
          );
        }
      }
    }
  }
}

/**
 * Seafarers: Heading for New Shores (3-4 players).
 * Frame [4,5,6,7,6,5,4] = 37 hexes.
 * Main island (~12 hexes) in center + 4-5 small foreign islands (2-3 hexes each).
 * Islands are procedurally generated — every game has a unique map.
 */
export const SEAFARERS_3_4: BoardVariantConfig = {
  id: 'seafarers-3-4',
  name: 'Søfarer — Nye Kyster (3-4 spillere)',
  expansion: 'seafarers',
  playerRange: [3, 4],
  // Frame big enough for main island (12 hex) + 4 foreign islands + sea channels
  hexPositions: generateHexPositions([5, 6, 7, 8, 7, 6, 5]),
  // Placeholder values — overridden at generation time by island generator
  terrainCounts: {
    forest: 4, pasture: 4, fields: 4,
    hills: 3, mountains: 2, desert: 0,
    gold_river: 2, sea: 18,
  },
  numberTokens: [
    2, 3, 3, 4, 4, 5, 5, 6, 6,
    8, 8, 9, 9, 10, 10, 11, 11, 12, 5,
  ],
  harborTypes: [
    '3:1', '3:1', '3:1', '3:1',
    'lumber', 'wool', 'grain', 'brick', 'ore', '3:1', '3:1',
  ],
  defaultVictoryPoints: 12,
  specialBuildingPhase: false,
  hasShips: true,
  hasPirate: true,
  islandGeneration: {
    // 4 players × 2 settlements × ~3 hex per spot with distance rule = 12 min
    mainIslandSize: 12,
    foreignIslandCount: 4,
    foreignIslandMinSize: 2,
    foreignIslandMaxSize: 3,
    maxPlayers: 4,
  },
};

/**
 * Seafarers: Heading for New Shores (5-6 players).
 * Frame [5,6,7,8,9,8,7,6,5] = 61 hexes.
 * Main island (~16 hexes) + 5-6 foreign islands (2-4 hexes each).
 * Procedurally generated.
 */
export const SEAFARERS_5_6: BoardVariantConfig = {
  id: 'seafarers-5-6',
  name: 'Søfarer — Nye Kyster (5-6 spillere)',
  expansion: 'seafarers',
  playerRange: [5, 6],
  hexPositions: generateHexPositions([5, 6, 7, 8, 9, 8, 7, 6, 5]),
  // Placeholder values — overridden at generation time
  terrainCounts: {
    forest: 7, pasture: 6, fields: 6,
    hills: 5, mountains: 4, desert: 2,
    gold_river: 3, sea: 28,
  },
  numberTokens: [
    2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6,
    8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12,
    4, 9, 5,
  ],
  harborTypes: [
    '3:1', '3:1', '3:1', '3:1', '3:1', '3:1',
    'lumber', 'wool', 'grain', 'brick', 'ore', '3:1', '3:1',
  ],
  defaultVictoryPoints: 12,
  specialBuildingPhase: true,
  hasShips: true,
  hasPirate: true,
  islandGeneration: {
    mainIslandSize: 16,
    foreignIslandCount: 6,
    foreignIslandMinSize: 2,
    foreignIslandMaxSize: 4,
    maxPlayers: 6,
  },
};

/**
 * Seafarers: Heading for New Shores (7-8 players).
 * Massive frame [7,8,9,10,11,10,9,8,7] = 79 hexes.
 * Main island (~20 hexes) + 6-8 foreign islands (2-4 hexes each).
 * Procedurally generated.
 */
export const SEAFARERS_7_8: BoardVariantConfig = {
  id: 'seafarers-7-8',
  name: 'Søfarer — Nye Kyster (7-8 spillere)',
  expansion: 'seafarers',
  playerRange: [7, 8],
  hexPositions: generateHexPositions([7, 8, 9, 10, 11, 10, 9, 8, 7]),
  // Placeholder values — overridden at generation time
  terrainCounts: {
    forest: 9, pasture: 8, fields: 8,
    hills: 7, mountains: 6, desert: 3,
    gold_river: 4, sea: 34,
  },
  numberTokens: [
    2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6,
    8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11, 12, 12, 12,
    5, 3, 10, 4, 9,
  ],
  harborTypes: [
    '3:1', '3:1', '3:1', '3:1', '3:1', '3:1', '3:1', '3:1',
    'lumber', 'wool', 'grain', 'brick', 'ore', 'lumber', 'wool', '3:1',
  ],
  defaultVictoryPoints: 14,
  specialBuildingPhase: true,
  hasShips: true,
  hasPirate: true,
  islandGeneration: {
    // 8 players × 2 settlements × ~3 hex per spot with distance rule = 24 min
    mainIslandSize: 24,
    foreignIslandCount: 8,
    foreignIslandMinSize: 2,
    foreignIslandMaxSize: 4,
    maxPlayers: 8,
  },
};

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
