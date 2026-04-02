import type { HexCoord, TerrainType } from '@catan/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IslandGenerationConfig {
  /** All hex positions in the frame */
  allPositions: HexCoord[];
  /** Size of the main island (number of land hexes) */
  mainIslandSize: number;
  /** Number of foreign islands to generate */
  foreignIslandCount: number;
  /** Min size of each foreign island */
  foreignIslandMinSize: number;
  /** Max size of each foreign island */
  foreignIslandMaxSize: number;
  /** Max players for this variant (used to validate settlement capacity) */
  maxPlayers?: number;
}

export interface IslandGenerationResult {
  /** Main island hex coords (connected cluster) */
  mainIsland: HexCoord[];
  /** Foreign island hex coord groups */
  foreignIslands: HexCoord[][];
  /** All sea positions */
  seaPositions: HexCoord[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

function parseKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

function hexNeighbors(c: HexCoord): HexCoord[] {
  const { q, r } = c;
  return [
    { q: q + 1, r }, { q: q - 1, r },
    { q, r: r + 1 }, { q, r: r - 1 },
    { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 },
  ];
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Compute the centroid of a set of hex positions */
function centroid(positions: HexCoord[]): { q: number; r: number } {
  const sum = positions.reduce(
    (acc, p) => ({ q: acc.q + p.q, r: acc.r + p.r }),
    { q: 0, r: 0 }
  );
  return { q: sum.q / positions.length, r: sum.r / positions.length };
}

/** Axial distance between two hex coords */
function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = (-a.q - a.r) - (-b.q - b.r);
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

/** Euclidean distance in axial space (for continuous distance bias) */
function euclideanDist(a: { q: number; r: number }, b: { q: number; r: number }): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.sqrt(dq * dq + dr * dr + dq * dr);
}

// ─── Island Generator ───────────────────────────────────────────────────────

/**
 * Grow a connected island from a seed hex using random flood-fill.
 * Returns the grown island hexes.
 *
 * @param seed - Starting hex
 * @param targetSize - Desired number of hexes
 * @param validSet - Set of hex keys that can be used
 * @param centerBias - If provided, prefer growing toward this point (0..1 strength)
 */
function growIsland(
  seed: HexCoord,
  targetSize: number,
  validSet: Set<string>,
  centerBias?: { center: { q: number; r: number }; toward: boolean }
): HexCoord[] {
  const island: HexCoord[] = [seed];
  const islandSet = new Set<string>([hKey(seed)]);
  const frontier: HexCoord[] = [];

  // Add initial neighbors to frontier
  for (const n of hexNeighbors(seed)) {
    const k = hKey(n);
    if (validSet.has(k) && !islandSet.has(k)) {
      frontier.push(n);
    }
  }

  while (island.length < targetSize && frontier.length > 0) {
    // Sort frontier with bias, then pick from top candidates
    if (centerBias) {
      const { center, toward } = centerBias;
      frontier.sort((a, b) => {
        const da = euclideanDist(a, center);
        const db = euclideanDist(b, center);
        // toward=true: prefer closer to center; toward=false: prefer farther
        return toward ? da - db : db - da;
      });
      // Pick from top 40% with some randomness (not strictly sorted)
      const topCount = Math.max(1, Math.ceil(frontier.length * 0.4));
      const pickIdx = Math.floor(Math.random() * topCount);
      const picked = frontier.splice(pickIdx, 1)[0];

      island.push(picked);
      islandSet.add(hKey(picked));

      // Add new neighbors to frontier
      for (const n of hexNeighbors(picked)) {
        const k = hKey(n);
        if (validSet.has(k) && !islandSet.has(k) && !frontier.some(f => hKey(f) === k)) {
          frontier.push(n);
        }
      }
    } else {
      // Pure random selection
      const pickIdx = Math.floor(Math.random() * frontier.length);
      const picked = frontier.splice(pickIdx, 1)[0];

      island.push(picked);
      islandSet.add(hKey(picked));

      for (const n of hexNeighbors(picked)) {
        const k = hKey(n);
        if (validSet.has(k) && !islandSet.has(k) && !frontier.some(f => hKey(f) === k)) {
          frontier.push(n);
        }
      }
    }
  }

  return island;
}

/**
 * Build an exclusion zone: all hexes in the given islands plus their neighbors.
 * Hexes in the exclusion zone cannot be used for new island placement.
 */
function buildExclusionZone(islands: HexCoord[][]): Set<string> {
  const excluded = new Set<string>();
  for (const island of islands) {
    for (const hex of island) {
      excluded.add(hKey(hex));
      for (const n of hexNeighbors(hex)) {
        excluded.add(hKey(n));
      }
    }
  }
  return excluded;
}

/**
 * Count unique vertices on an island and estimate max settlements with distance rule.
 * Each hex has 6 corners. Shared corners between adjacent hexes are counted once.
 * With the distance rule, roughly 40% of vertices can hold settlements.
 */
function estimateSettlementCapacity(island: HexCoord[]): number {
  const islandSet = new Set(island.map(hKey));
  const vertices = new Set<string>();

  for (const hex of island) {
    // Each flat-top hex has 6 corners at angles 0°, 60°, 120°, 180°, 240°, 300°
    // Use the 3-hex canonical vertex ID approach: each vertex is shared by up to 3 hexes
    // For capacity estimation, we count vertices that touch at least one island hex
    const { q, r } = hex;
    // The 6 vertices of a flat-top hex, identified by the 2 neighbor hexes that share it
    const vertexNeighborPairs: [HexCoord, HexCoord][] = [
      [{ q: q + 1, r: r - 1 }, { q: q + 1, r }],     // right-top
      [{ q: q + 1, r }, { q, r: r + 1 }],             // right-bottom
      [{ q, r: r + 1 }, { q: q - 1, r: r + 1 }],     // bottom
      [{ q: q - 1, r: r + 1 }, { q: q - 1, r }],     // left-bottom
      [{ q: q - 1, r }, { q, r: r - 1 }],             // left-top
      [{ q, r: r - 1 }, { q: q + 1, r: r - 1 }],     // top
    ];

    for (const [n1, n2] of vertexNeighborPairs) {
      // Canonical vertex ID: sort the 3 hex keys
      const keys = [hKey(hex), hKey(n1), hKey(n2)].sort();
      vertices.add(keys.join('|'));
    }
  }

  // With distance rule, approximately 40% of vertices can hold settlements
  // This is conservative — actual capacity depends on island shape
  return Math.floor(vertices.size * 0.4);
}

/**
 * Generate a procedural island layout for Seafarers maps.
 *
 * Algorithm:
 * 1. Grow a main island from the center using random BFS with center-bias
 * 2. Validate the main island has enough settlement spots for maxPlayers
 * 3. Mark main island + neighbors as exclusion zone
 * 4. Place foreign islands in remaining space, preferring positions far from center
 * 5. Each foreign island also gets an exclusion zone (1-hex gap between all islands)
 * 6. Remaining hexes become sea
 */
export function generateIslandLayout(config: IslandGenerationConfig): IslandGenerationResult {
  const { allPositions, mainIslandSize, foreignIslandCount, foreignIslandMinSize, foreignIslandMaxSize } = config;

  // Minimum acceptable foreign islands: at least (count - 1), minimum 2
  const minAcceptable = Math.max(2, foreignIslandCount - 1);

  // Required settlement capacity: 2 settlements per player
  const requiredSettlements = config.maxPlayers ? config.maxPlayers * 2 : 0;

  // Retry up to 30 times if not enough foreign islands or insufficient capacity
  let bestResult: IslandGenerationResult | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < 30; attempt++) {
    const result = generateIslandLayoutAttempt(
      allPositions, mainIslandSize, foreignIslandCount,
      foreignIslandMinSize, foreignIslandMaxSize
    );

    // Check settlement capacity on main island
    const capacity = estimateSettlementCapacity(result.mainIsland);
    const hasCapacity = capacity >= requiredSettlements;

    // Score: foreign island count + capacity bonus
    const score = result.foreignIslands.length * 10 + (hasCapacity ? 100 : 0);

    if (result.foreignIslands.length >= foreignIslandCount && hasCapacity) {
      return result; // Perfect result
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }

    if (result.foreignIslands.length >= minAcceptable && hasCapacity) {
      return result; // Good enough
    }
  }

  // Return best attempt even if it didn't meet all criteria
  return bestResult!;
}

/** Single attempt at generating an island layout */
function generateIslandLayoutAttempt(
  allPositions: HexCoord[],
  mainIslandSize: number,
  foreignIslandCount: number,
  foreignIslandMinSize: number,
  foreignIslandMaxSize: number,
): IslandGenerationResult {
  const allKeys = new Set(allPositions.map(hKey));
  const center = centroid(allPositions);

  // Step 1: Find the hex closest to the centroid as the main island seed
  let bestSeed = allPositions[0];
  let bestDist = Infinity;
  for (const pos of allPositions) {
    const d = euclideanDist(pos, center);
    if (d < bestDist) {
      bestDist = d;
      bestSeed = pos;
    }
  }

  // Grow main island with center-bias (prefer growing toward center for compact shape)
  const availableForMain = new Set(allKeys);
  const mainIsland = growIsland(bestSeed, mainIslandSize, availableForMain, {
    center,
    toward: true,
  });

  // Step 2: Build exclusion zone around main island
  const placedIslands: HexCoord[][] = [mainIsland];
  let excluded = buildExclusionZone(placedIslands);

  // Step 3: Place foreign islands
  const foreignIslands: HexCoord[][] = [];

  for (let i = 0; i < foreignIslandCount; i++) {
    // Find available hexes (in the frame, not excluded)
    const available = allPositions.filter(p => !excluded.has(hKey(p)));
    if (available.length === 0) break;

    // Prefer hexes far from the main island centroid (edge bias)
    const mainCentroid = centroid(mainIsland);
    available.sort((a, b) => {
      const da = euclideanDist(a, mainCentroid);
      const db = euclideanDist(b, mainCentroid);
      return db - da; // farther first
    });

    // Pick a seed from the top 40% (with randomness)
    const topCount = Math.max(1, Math.ceil(available.length * 0.4));
    const seedIdx = Math.floor(Math.random() * topCount);
    const seed = available[seedIdx];

    // Random size for this island
    const targetSize = foreignIslandMinSize +
      Math.floor(Math.random() * (foreignIslandMaxSize - foreignIslandMinSize + 1));

    // Available positions for growth: frame hexes not in exclusion zone
    const growthAvailable = new Set(available.map(hKey));
    const island = growIsland(seed, targetSize, growthAvailable);

    if (island.length < foreignIslandMinSize) {
      // Not enough room for a valid island, skip
      continue;
    }

    foreignIslands.push(island);
    placedIslands.push(island);

    // Rebuild exclusion zone with the new island
    excluded = buildExclusionZone(placedIslands);
  }

  // Step 4: Everything not in any island is sea
  const allIslandKeys = new Set<string>();
  for (const island of placedIslands) {
    for (const hex of island) {
      allIslandKeys.add(hKey(hex));
    }
  }
  const seaPositions = allPositions.filter(p => !allIslandKeys.has(hKey(p)));

  return {
    mainIsland,
    foreignIslands,
    seaPositions,
  };
}

// ─── Terrain Distribution ───────────────────────────────────────────────────

/**
 * Compute terrain counts and number tokens for a procedurally generated island layout.
 *
 * The terrain distribution follows standard Catan Seafarers ratios:
 * - forest ~20%, pasture ~18%, fields ~18%, hills ~16%, mountains ~14%
 * - desert ~5-8% of land, gold_river ~5-8% of land
 *
 * Number tokens are generated to match the producing hex count.
 */
export function computeTerrainDistribution(
  landCount: number,
  seaCount: number
): { terrainCounts: Partial<Record<TerrainType, number>>; numberTokens: number[] } {
  // Desert: ~6% of land, min 0, max based on board size
  const desertCount = landCount <= 15 ? 0 : Math.max(1, Math.round(landCount * 0.06));

  // Gold river: ~6% of land, min 1
  const goldCount = Math.max(1, Math.round(landCount * 0.06));

  const producingLand = landCount - desertCount - goldCount;

  // Distribute producing terrains (roughly: 23%, 20%, 20%, 19%, 18%)
  const forestCount = Math.round(producingLand * 0.23);
  const pastureCount = Math.round(producingLand * 0.20);
  const fieldsCount = Math.round(producingLand * 0.20);
  const hillsCount = Math.round(producingLand * 0.19);
  // Mountains gets the remainder to ensure exact total
  const mountainsCount = producingLand - forestCount - pastureCount - fieldsCount - hillsCount;

  const terrainCounts: Partial<Record<TerrainType, number>> = {
    forest: forestCount,
    pasture: pastureCount,
    fields: fieldsCount,
    hills: hillsCount,
    mountains: mountainsCount,
    desert: desertCount,
    gold_river: goldCount,
    sea: seaCount,
  };

  // Verify total
  const totalTerrain = Object.values(terrainCounts).reduce((a, b) => a + (b ?? 0), 0);
  if (totalTerrain !== landCount + seaCount) {
    throw new Error(
      `Terrain count mismatch: ${totalTerrain} !== ${landCount + seaCount} ` +
      `(land=${landCount}, sea=${seaCount})`
    );
  }

  // Generate number tokens for producing hexes
  const producingCount = landCount - desertCount;
  const numberTokens = generateNumberTokens(producingCount);

  return { terrainCounts, numberTokens };
}

/**
 * Generate a balanced set of number tokens for the given count of producing hexes.
 * Uses standard Catan distribution ratios.
 */
function generateNumberTokens(count: number): number[] {
  // Standard Catan number distribution (per 18 tokens):
  // 2x1, 3x2, 4x2, 5x2, 6x2, 8x2, 9x2, 10x2, 11x2, 12x1
  const baseTokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const baseLen = baseTokens.length;

  if (count <= baseLen) {
    // Fewer tokens needed: take a balanced subset
    // Prioritize middle numbers, always include 2 and 12
    const tokens: number[] = [];

    // Start with the full set and trim from the edges inward
    const sorted = [...baseTokens];
    while (sorted.length > count) {
      // Remove a random token, preferring to keep distribution balanced
      // Remove from higher-count numbers first
      const counts: Record<number, number> = {};
      for (const t of sorted) counts[t] = (counts[t] || 0) + 1;
      const maxCount = Math.max(...Object.values(counts));
      const removable = sorted.filter((_, i) => {
        const n = sorted[i];
        return counts[n] === maxCount;
      });
      const removeIdx = sorted.indexOf(removable[Math.floor(Math.random() * removable.length)]);
      sorted.splice(removeIdx, 1);
    }
    return sorted;
  }

  // More tokens needed: repeat base distribution and add extras
  const tokens: number[] = [];
  const fullSets = Math.floor(count / baseLen);
  const remainder = count % baseLen;

  for (let i = 0; i < fullSets; i++) {
    tokens.push(...baseTokens);
  }

  // Fill remainder with balanced extras
  if (remainder > 0) {
    // Distribute extra tokens evenly across the middle range
    const extraPool = [3, 4, 5, 6, 8, 9, 10, 11, 4, 5, 9, 10, 3, 6, 8, 11, 5, 10];
    for (let i = 0; i < remainder; i++) {
      tokens.push(extraPool[i % extraPool.length]);
    }
  }

  return tokens;
}
