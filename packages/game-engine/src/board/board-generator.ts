import type { Hex, HexCoord, GameBoard, Harbor, BalanceScore, TerrainType } from '@catan/shared';
import {
  BOARD_HEXES,
  TERRAIN_TILES,
  NUMBER_TOKENS,
  HARBOR_TYPES,
  HARBOR_EDGE_POSITIONS,
  getVariant,
  resolveHexPositions,
  expandTerrainCounts,
} from '@catan/shared';
import type { BoardVariantConfig } from '@catan/shared';
import { computeBoardTopology, cornerVertexId, edgeId, areHexNeighbors, hexKey, computeHexAdjacency } from './hex-grid';
import { passesHardConstraints, computeBalanceScore } from './balance-scoring';
import { detectPerimeterEdges, distributeHarbors } from './harbor-detection';
import { generateIslandLayout, computeTerrainDistribution } from './island-generator';
import { validateIslandSeparation } from '@catan/shared';
import type { BoardTopology } from './hex-grid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Board Assembly ──────────────────────────────────────────────────────────

function assembleHexes(
  hexPositions: HexCoord[],
  terrains: readonly string[],
  numbers: readonly (number | null)[]
): Hex[] {
  return hexPositions.map((coord, i) => ({
    coord,
    terrain: terrains[i] as TerrainType,
    number: numbers[i],
    hasRobber: terrains[i] === 'desert',
    hasPirate: false,
  }));
}

// ─── Terrain Placement (backtracking) ────────────────────────────────────────

/**
 * Place terrains using randomized backtracking.
 * Guarantees no adjacent hexes share terrain (except desert, sea, gold_river).
 *
 * If seaIndices is provided, those hex positions are PRE-FILLED with 'sea'
 * and excluded from backtracking. This ensures sea tiles stay on designated
 * sea positions in Seafarers layouts, preserving island separation.
 */
function placeTerrains(
  hexCount: number,
  terrainTiles: TerrainType[],
  adjacency: number[][],
  seaIndices?: Set<number>
): string[] | null {
  const available: Record<string, number> = {};
  for (const t of terrainTiles) {
    available[t] = (available[t] || 0) + 1;
  }

  const result: string[] = new Array(hexCount);

  // Pre-fill sea positions — these are locked and not part of backtracking
  if (seaIndices && seaIndices.size > 0) {
    for (const idx of seaIndices) {
      result[idx] = 'sea';
    }
    available['sea'] = (available['sea'] || 0) - seaIndices.size;
    if (available['sea'] <= 0) delete available['sea'];
  }

  const terrainTypes = Object.keys(available);

  // Build backtracking order: only non-sea hexes
  const landIndices = Array.from({ length: hexCount }, (_, i) => i)
    .filter((i) => !seaIndices || !seaIndices.has(i));
  const landCount = landIndices.length;

  // Most-constrained-first: place hexes with most neighbors first (center hexes).
  landIndices.sort((a, b) => adjacency[b].length - adjacency[a].length);
  // Shuffle within groups of equal constraint count for variety
  let groupStart = 0;
  while (groupStart < landIndices.length) {
    let groupEnd = groupStart;
    while (groupEnd < landIndices.length &&
      adjacency[landIndices[groupEnd]].length === adjacency[landIndices[groupStart]].length) {
      groupEnd++;
    }
    const group = landIndices.slice(groupStart, groupEnd);
    const shuffled = shuffle(group);
    for (let k = 0; k < shuffled.length; k++) {
      landIndices[groupStart + k] = shuffled[k];
    }
    groupStart = groupEnd;
  }

  // Terrains exempt from adjacency constraint
  const exemptTerrains = new Set(['desert', 'sea', 'gold_river']);

  let nodesVisited = 0;
  const maxNodes = hexCount * 5000; // Safety limit to avoid infinite search

  function canPlace(hexIdx: number, terrain: string): boolean {
    if (exemptTerrains.has(terrain)) return true;
    for (const neighborIdx of adjacency[hexIdx]) {
      if (result[neighborIdx] === terrain) return false;
    }
    return true;
  }

  function backtrack(step: number): boolean {
    if (step === landCount) return true;
    if (++nodesVisited > maxNodes) return false;

    const hexIdx = landIndices[step];
    const shuffledTypes = shuffle(terrainTypes.filter((t) => available[t] > 0));

    for (const terrain of shuffledTypes) {
      if (!canPlace(hexIdx, terrain)) continue;

      result[hexIdx] = terrain;
      available[terrain]--;

      if (backtrack(step + 1)) return true;

      available[terrain]++;
      result[hexIdx] = undefined as any;
    }
    return false;
  }

  return backtrack(0) ? result : null;
}

// ─── Number Placement (swap-based) ───────────────────────────────────────────

/** Terrains that don't get number tokens */
const NON_PRODUCING_TERRAINS = new Set(['desert', 'sea']);

/**
 * Assign numbers to producing hexes, then fix violations by swapping.
 */
function assignNumbers(
  terrains: readonly string[],
  numberTokens: number[],
  adjacency: number[][]
): (number | null)[] {
  const numbers: (number | null)[] = terrains.map((t) =>
    NON_PRODUCING_TERRAINS.has(t) ? null : 0
  );
  const producingIndices = numbers.reduce<number[]>((acc, n, i) => {
    if (n !== null) acc.push(i);
    return acc;
  }, []);

  const shuffledTokens = shuffle([...numberTokens]);
  for (let i = 0; i < producingIndices.length; i++) {
    numbers[producingIndices[i]] = shuffledTokens[i] ?? null;
  }

  // Fix violations by swapping (up to 200 iterations)
  for (let iter = 0; iter < 200; iter++) {
    const violation = findNumberViolation(numbers, adjacency);
    if (!violation) break;

    const [violIdx] = violation;
    const swapCandidates = producingIndices.filter(
      (j) => j !== violIdx && !adjacency[violIdx].includes(j)
    );
    if (swapCandidates.length === 0) continue;

    const swapIdx = swapCandidates[Math.floor(Math.random() * swapCandidates.length)];
    [numbers[violIdx], numbers[swapIdx]] = [numbers[swapIdx], numbers[violIdx]];
  }

  return numbers;
}

function findNumberViolation(
  numbers: readonly (number | null)[],
  adjacency: number[][]
): [number, number] | null {
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] === null) continue;
    for (const j of adjacency[i]) {
      if (j <= i || numbers[j] === null) continue;
      const a = numbers[i]!;
      const b = numbers[j]!;
      if ((a === 6 || a === 8) && (b === 6 || b === 8)) return [i, j];
      if ((a === 2 && b === 12) || (a === 12 && b === 2)) return [i, j];
    }
  }
  return null;
}

function passesNumberConstraint(
  numbers: readonly (number | null)[],
  adjacency: number[][]
): boolean {
  return findNumberViolation(numbers, adjacency) === null;
}

// ─── Harbor Building ─────────────────────────────────────────────────────────

function buildHarbors(
  config: BoardVariantConfig,
  hexPositions: HexCoord[],
  topology: BoardTopology
): Harbor[] {
  // Use explicit overrides if provided
  if (config.harborEdgeOverrides && config.harborEdgeOverrides.length > 0) {
    const shuffledTypes = shuffle([...config.harborTypes]);
    return config.harborEdgeOverrides.map((pos, i) => {
      const cornerA = pos.edgeCornerIndex;
      const cornerB = (pos.edgeCornerIndex + 1) % 6;
      const vIdA = cornerVertexId(pos.hex, cornerA);
      const vIdB = cornerVertexId(pos.hex, cornerB);
      const eId = edgeId(vIdA, vIdB);
      const harborType = shuffledTypes[i];

      const vertexA = topology.vertexMap.get(vIdA);
      const vertexB = topology.vertexMap.get(vIdB);
      if (vertexA) vertexA.harbor = harborType;
      if (vertexB) vertexB.harbor = harborType;

      return {
        type: harborType,
        edgeId: eId,
        vertexIds: [vIdA, vIdB] as [string, string],
      };
    });
  }

  // Auto-detect perimeter edges and distribute harbors
  const seaSet = config.seaPositions
    ? new Set(config.seaPositions.map((s) => hexKey(s)))
    : undefined;

  return distributeHarbors(
    hexPositions,
    config.harborTypes,
    topology,
    seaSet
  );
}

// ─── Random Balanced Generator ───────────────────────────────────────────────

export interface GeneratedBoard {
  board: GameBoard;
  score: BalanceScore;
}

/** Scale candidate count inversely with board size — larger boards are slower to generate */
function maxCandidates(hexCount: number): number {
  if (hexCount <= 19) return 600;
  if (hexCount <= 30) return 100;
  return 50;
}

/**
 * Generate a random balanced Catan board for the given variant.
 * Defaults to 'base-3-4' (standard 19-hex board).
 */
export function generateRandomBalancedBoard(
  variantId: string = 'base-3-4'
): GeneratedBoard {
  const config = getVariant(variantId);
  const hexPositions = resolveHexPositions(config);
  const adjacency = computeHexAdjacency(hexPositions);

  // ─── Procedural island generation (Seafarers) ─────────────────────────────
  let effectiveConfig = config;
  let foreignIslands: HexCoord[][] | undefined;

  if (config.islandGeneration) {
    const islandResult = generateIslandLayout({
      allPositions: hexPositions,
      ...config.islandGeneration,
    });

    // Validate island separation (main island + foreign islands)
    const allIslands = [islandResult.mainIsland, ...islandResult.foreignIslands];
    validateIslandSeparation(allIslands);

    foreignIslands = islandResult.foreignIslands;

    // Compute terrain distribution based on actual land/sea counts
    const landCount = islandResult.mainIsland.length +
      islandResult.foreignIslands.reduce((sum, island) => sum + island.length, 0);
    const seaCount = islandResult.seaPositions.length;
    const { terrainCounts, numberTokens } = computeTerrainDistribution(landCount, seaCount);

    // Build effective config with procedural values
    effectiveConfig = {
      ...config,
      seaPositions: islandResult.seaPositions,
      terrainCounts,
      numberTokens,
      foreignIslands: islandResult.foreignIslands,
    };
  }

  const terrainTiles = expandTerrainCounts(effectiveConfig.terrainCounts);
  const seaSet = effectiveConfig.seaPositions
    ? new Set(effectiveConfig.seaPositions.map((s) => hexKey(s)))
    : undefined;
  const topology = computeBoardTopology(hexPositions, seaSet);
  const candidates = maxCandidates(hexPositions.length);

  // Build sea index set: map sea positions to their indices in hexPositions
  let seaIndices: Set<number> | undefined;
  if (effectiveConfig.seaPositions && effectiveConfig.seaPositions.length > 0) {
    const posToIndex = new Map<string, number>();
    hexPositions.forEach((p, i) => posToIndex.set(hexKey(p), i));
    seaIndices = new Set<number>();
    for (const sp of effectiveConfig.seaPositions) {
      const idx = posToIndex.get(hexKey(sp));
      if (idx !== undefined) seaIndices.add(idx);
    }
  }

  let bestHexes: Hex[] | null = null;
  let bestScore: BalanceScore = { total: -1, resourceEV: 0, intersectionBalance: 0, geographicSpread: 0 };

  for (let attempt = 0; attempt < candidates; attempt++) {
    const terrains = placeTerrains(hexPositions.length, terrainTiles, adjacency, seaIndices);
    if (!terrains) continue;

    const numbers = assignNumbers(terrains, effectiveConfig.numberTokens, adjacency);
    if (!passesNumberConstraint(numbers, adjacency)) continue;

    const hexes = assembleHexes(hexPositions, terrains, numbers);
    const score = computeBalanceScore(hexes, topology);
    if (score.total > bestScore.total) {
      bestScore = score;
      bestHexes = hexes;
    }
  }

  // Safety net
  if (!bestHexes) {
    const terrains = placeTerrains(hexPositions.length, terrainTiles, adjacency, seaIndices)
      ?? terrainTiles.map(String);
    const numbers = assignNumbers(terrains, effectiveConfig.numberTokens, adjacency);
    bestHexes = assembleHexes(hexPositions, terrains, numbers);
    bestScore = computeBalanceScore(bestHexes, topology);
  }

  // Build harbors on fresh topology (harbor building modifies vertices)
  const freshTopology = computeBoardTopology(hexPositions, seaSet);
  const harbors = buildHarbors(effectiveConfig, hexPositions, freshTopology);

  // Find robber/pirate positions
  const desertHex = bestHexes.find((h) => h.terrain === 'desert');
  const robberPosition = desertHex?.coord ?? { q: 0, r: 0 };

  let piratePosition: HexCoord | null = null;
  if (effectiveConfig.hasPirate) {
    const seaHex = bestHexes.find((h) => h.terrain === 'sea');
    if (seaHex) {
      piratePosition = seaHex.coord;
      seaHex.hasPirate = true;
    }
  }

  return {
    board: {
      hexes: bestHexes,
      vertices: freshTopology.vertices,
      edges: freshTopology.edges,
      harbors,
      robberPosition,
      piratePosition,
      variantId,
      foreignIslands: foreignIslands ?? effectiveConfig.foreignIslands,
    },
    score: bestScore,
  };
}

// ─── From Preset/Arrays ──────────────────────────────────────────────────────

export function generateBoardFromArrays(
  terrains: readonly string[],
  numbers: readonly (number | null)[],
  harborTypes?: readonly string[],
  variantId: string = 'base-3-4'
): GeneratedBoard {
  const config = getVariant(variantId);
  const hexPositions = resolveHexPositions(config);
  const seaSet = config.seaPositions
    ? new Set(config.seaPositions.map((s) => hexKey(s)))
    : undefined;

  const topology = computeBoardTopology(hexPositions, seaSet);
  const hexes = assembleHexes(hexPositions, terrains, numbers);
  const score = computeBalanceScore(hexes, topology);

  const freshTopology = computeBoardTopology(hexPositions, seaSet);

  let harbors: Harbor[];
  if (harborTypes && harborTypes.length > 0 && config.harborEdgeOverrides) {
    harbors = config.harborEdgeOverrides.map((pos, i) => {
      const cornerA = pos.edgeCornerIndex;
      const cornerB = (pos.edgeCornerIndex + 1) % 6;
      const vIdA = cornerVertexId(pos.hex, cornerA);
      const vIdB = cornerVertexId(pos.hex, cornerB);
      const eId = edgeId(vIdA, vIdB);
      const hType = (harborTypes[i] ?? '3:1') as Harbor['type'];

      const vertexA = freshTopology.vertexMap.get(vIdA);
      const vertexB = freshTopology.vertexMap.get(vIdB);
      if (vertexA) vertexA.harbor = hType;
      if (vertexB) vertexB.harbor = hType;

      return { type: hType, edgeId: eId, vertexIds: [vIdA, vIdB] as [string, string] };
    });
  } else {
    harbors = buildHarbors(config, hexPositions, freshTopology);
  }

  const desertHex = hexes.find((h) => h.terrain === 'desert');
  const robberPosition = desertHex?.coord ?? { q: 0, r: 0 };

  return {
    board: {
      hexes,
      vertices: freshTopology.vertices,
      edges: freshTopology.edges,
      harbors,
      robberPosition,
      piratePosition: null,
      variantId,
    },
    score,
  };
}
