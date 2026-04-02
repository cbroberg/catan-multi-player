import type { Hex, HexCoord, BalanceScore, ResourceType, Vertex } from '@catan/shared';
import { NUMBER_PIPS, TERRAIN_TO_RESOURCE } from '@catan/shared';
import { areHexNeighbors } from './hex-grid';
import type { BoardTopology } from './hex-grid';

/** Terrains exempt from the "no adjacent same terrain" constraint */
const TERRAIN_ADJACENCY_EXEMPT = new Set(['desert', 'sea', 'gold_river']);

// ─── Hard Constraints ────────────────────────────────────────────────────────

export function passesHardConstraints(hexes: Hex[]): boolean {
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      if (!areHexNeighbors(hexes[i].coord, hexes[j].coord)) continue;

      const a = hexes[i];
      const b = hexes[j];

      // No adjacent 6/8
      if (isRedNumber(a.number) && isRedNumber(b.number)) return false;

      // No adjacent identical terrains (excluding desert, sea, gold_river)
      if (
        !TERRAIN_ADJACENCY_EXEMPT.has(a.terrain) &&
        !TERRAIN_ADJACENCY_EXEMPT.has(b.terrain) &&
        a.terrain === b.terrain
      )
        return false;

      // 2 and 12 should not be neighbors
      if (
        (a.number === 2 && b.number === 12) ||
        (a.number === 12 && b.number === 2)
      )
        return false;
    }
  }
  return true;
}

function isRedNumber(n: number | null): boolean {
  return n === 6 || n === 8;
}

// ─── Soft Scoring ────────────────────────────────────────────────────────────

export function computeBalanceScore(
  hexes: Hex[],
  topology: BoardTopology
): BalanceScore {
  // Only score land hexes (not sea)
  const landHexes = hexes.filter((h) => h.terrain !== 'sea');

  const resourceEV = scoreResourceEV(landHexes);
  const intersectionBalance = scoreIntersectionBalance(hexes, topology);
  const geographicSpread = scoreGeographicSpread(landHexes);

  const total = Math.round(
    resourceEV * 0.4 + intersectionBalance * 0.35 + geographicSpread * 0.25
  );

  return { total, resourceEV, intersectionBalance, geographicSpread };
}

/**
 * Resource EV balance: each resource should have roughly equal total pip count.
 * Gold river pips count as 1/5 per resource (player picks any).
 */
function scoreResourceEV(hexes: Hex[]): number {
  const resourcePips: Record<string, number> = {
    lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0,
  };

  for (const hex of hexes) {
    if (!hex.number) continue;
    const pips = NUMBER_PIPS[hex.number] ?? 0;

    if (hex.terrain === 'gold_river') {
      // Gold river distributes pips evenly across all resources
      const share = pips / 5;
      for (const resource of Object.keys(resourcePips)) {
        resourcePips[resource] += share;
      }
    } else {
      const resource = TERRAIN_TO_RESOURCE[hex.terrain];
      if (resource) {
        resourcePips[resource] += pips;
      }
    }
  }

  const values = Object.values(resourcePips);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

  // Scale maxVariance with board size
  const maxVariance = Math.max(16, hexes.length * 0.85);
  return Math.round(Math.max(0, 100 * (1 - variance / maxVariance)));
}

function scoreIntersectionBalance(
  hexes: Hex[],
  topology: BoardTopology
): number {
  const hexMap = new Map<string, Hex>();
  for (const hex of hexes) {
    hexMap.set(`${hex.coord.q},${hex.coord.r}`, hex);
  }

  let maxPips = 0;
  let overPoweredCount = 0;

  for (const vertex of topology.vertices) {
    let totalPips = 0;
    for (const hc of vertex.adjacentHexCoords) {
      const hex = hexMap.get(`${hc.q},${hc.r}`);
      if (hex?.number) {
        totalPips += NUMBER_PIPS[hex.number] ?? 0;
      }
    }
    if (totalPips > maxPips) maxPips = totalPips;
    if (totalPips > 11) overPoweredCount++;
  }

  const maxPenalty = Math.max(0, maxPips - 10) * 8;
  const countPenalty = overPoweredCount * 5;
  return Math.round(Math.max(0, 100 - maxPenalty - countPenalty));
}

function scoreGeographicSpread(hexes: Hex[]): number {
  const highValueHexes = hexes.filter(
    (h) => h.number && [5, 6, 8, 9].includes(h.number)
  );

  if (highValueHexes.length < 2) return 100;

  let totalDist = 0;
  let pairCount = 0;

  for (let i = 0; i < highValueHexes.length; i++) {
    for (let j = i + 1; j < highValueHexes.length; j++) {
      totalDist += hexDistance(
        highValueHexes[i].coord,
        highValueHexes[j].coord
      );
      pairCount++;
    }
  }

  const avgDist = totalDist / pairCount;
  const normalized = Math.min(1, Math.max(0, (avgDist - 1.0) / 1.5));
  return Math.round(normalized * 100);
}

function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(-a.q - a.r - (-b.q - b.r));
  return Math.max(dq, dr, ds);
}
