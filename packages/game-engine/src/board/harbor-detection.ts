import type { HexCoord, Harbor, HarborType } from '@catan/shared';
import { HEX_DIRECTIONS } from '@catan/shared';
import { hexKey, cornerVertexId, edgeId, hexToPixel } from './hex-grid';
import type { BoardTopology } from './hex-grid';

interface PerimeterEdge {
  hex: HexCoord;
  edgeCornerIndex: number;
  angle: number;
}

/**
 * Detect perimeter edges of a board — edges that face outward (off-board or sea).
 * Returns edges sorted clockwise by angle from board centroid.
 *
 * For base game: perimeter = edges where the neighbor hex is off-board.
 * For Seafarers: perimeter = edges of land hexes where the neighbor is sea or off-board (coastline).
 */
export function detectPerimeterEdges(
  hexPositions: HexCoord[],
  seaCoordSet?: Set<string>
): PerimeterEdge[] {
  const hexSet = new Set(hexPositions.map((h) => hexKey(h)));
  const seaSet = seaCoordSet ?? new Set<string>();

  // Compute board centroid for angle sorting
  const cx = hexPositions.reduce((sum, h) => sum + h.q, 0) / hexPositions.length;
  const cr = hexPositions.reduce((sum, h) => sum + h.r, 0) / hexPositions.length;
  const centroid = hexToPixel(cx, cr, 1);

  const perimeterEdges: PerimeterEdge[] = [];

  for (const hex of hexPositions) {
    // Skip sea hexes — we want land edges facing outward
    if (seaSet.has(hexKey(hex))) continue;

    for (let dir = 0; dir < 6; dir++) {
      const neighbor: HexCoord = {
        q: hex.q + HEX_DIRECTIONS[dir].q,
        r: hex.r + HEX_DIRECTIONS[dir].r,
      };

      const neighborKey = hexKey(neighbor);
      const isPerimeter =
        !hexSet.has(neighborKey) || seaSet.has(neighborKey);

      if (!isPerimeter) continue;

      // Compute angle of edge midpoint from centroid
      const hexPixel = hexToPixel(hex.q, hex.r, 1);
      const neighborPixel = hexToPixel(neighbor.q, neighbor.r, 1);
      const midX = (hexPixel.x + neighborPixel.x) / 2;
      const midY = (hexPixel.y + neighborPixel.y) / 2;
      const angle = Math.atan2(midY - centroid.y, midX - centroid.x);

      perimeterEdges.push({
        hex,
        edgeCornerIndex: dir,
        angle,
      });
    }
  }

  // Sort clockwise (atan2 returns -π to π, clockwise from positive x)
  perimeterEdges.sort((a, b) => a.angle - b.angle);

  return perimeterEdges;
}

/**
 * Distribute harbors evenly around the board perimeter.
 * Detects perimeter edges, picks evenly-spaced positions, assigns harbor types.
 */
export function distributeHarbors(
  hexPositions: HexCoord[],
  harborTypes: HarborType[],
  topology: BoardTopology,
  seaCoordSet?: Set<string>
): Harbor[] {
  const perimeterEdges = detectPerimeterEdges(hexPositions, seaCoordSet);

  if (perimeterEdges.length === 0 || harborTypes.length === 0) return [];

  const shuffledTypes = shuffle([...harborTypes]);
  const step = perimeterEdges.length / shuffledTypes.length;

  const harbors: Harbor[] = [];

  for (let i = 0; i < shuffledTypes.length; i++) {
    const edgeIdx = Math.floor(i * step) % perimeterEdges.length;
    const pe = perimeterEdges[edgeIdx];

    const cornerA = pe.edgeCornerIndex;
    const cornerB = (pe.edgeCornerIndex + 1) % 6;
    const vIdA = cornerVertexId(pe.hex, cornerA);
    const vIdB = cornerVertexId(pe.hex, cornerB);
    const eId = edgeId(vIdA, vIdB);

    const harborType = shuffledTypes[i];
    const vertexA = topology.vertexMap.get(vIdA);
    const vertexB = topology.vertexMap.get(vIdB);
    if (vertexA) vertexA.harbor = harborType;
    if (vertexB) vertexB.harbor = harborType;

    harbors.push({
      type: harborType,
      edgeId: eId,
      vertexIds: [vIdA, vIdB],
    });
  }

  return harbors;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
