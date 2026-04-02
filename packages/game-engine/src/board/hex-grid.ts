import type { HexCoord, Point, Vertex, Edge, EdgeType } from '@catan/shared';
import {
  BOARD_HEXES,
  BOARD_HEX_SET,
  HEX_DIRECTIONS,
  CORNER_HEX_OFFSETS,
} from '@catan/shared';

// ─── Coordinate Helpers ──────────────────────────────────────────────────────

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

/** Check if a coord is on the default base-3-4 board */
export function isValidHex(coord: HexCoord): boolean {
  return BOARD_HEX_SET.has(hexKey(coord));
}

/** Create a validator function for a specific set of hex positions */
export function createHexValidator(
  hexPositions: HexCoord[]
): (coord: HexCoord) => boolean {
  const hexSet = new Set(hexPositions.map((h) => hexKey(h)));
  return (coord) => hexSet.has(hexKey(coord));
}

export function getHexNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function getValidHexNeighbors(coord: HexCoord): HexCoord[] {
  return getHexNeighbors(coord).filter(isValidHex);
}

export function areHexNeighbors(a: HexCoord, b: HexCoord): boolean {
  return HEX_DIRECTIONS.some(
    (d) => a.q + d.q === b.q && a.r + d.r === b.r
  );
}

// ─── Pixel Conversion (flat-top) ─────────────────────────────────────────────

export function hexToPixel(q: number, r: number, size: number): Point {
  return {
    x: size * ((3 / 2) * q),
    y: size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r),
  };
}

export function hexCorner(center: Point, size: number, i: number): Point {
  const angle = (Math.PI / 180) * (60 * i);
  return {
    x: center.x + size * Math.cos(angle),
    y: center.y + size * Math.sin(angle),
  };
}

// ─── Vertex ID Generation ────────────────────────────────────────────────────

function sortedHexTriple(
  a: HexCoord,
  b: HexCoord,
  c: HexCoord
): [HexCoord, HexCoord, HexCoord] {
  const arr = [a, b, c];
  arr.sort((x, y) => x.q - y.q || x.r - y.r);
  return arr as [HexCoord, HexCoord, HexCoord];
}

export function vertexId(a: HexCoord, b: HexCoord, c: HexCoord): string {
  const [s1, s2, s3] = sortedHexTriple(a, b, c);
  return `v:${s1.q},${s1.r}:${s2.q},${s2.r}:${s3.q},${s3.r}`;
}

export function cornerHexes(
  coord: HexCoord,
  cornerIndex: number
): [HexCoord, HexCoord, HexCoord] {
  const offsets = CORNER_HEX_OFFSETS[cornerIndex];
  return [
    coord,
    { q: coord.q + offsets[0].q, r: coord.r + offsets[0].r },
    { q: coord.q + offsets[1].q, r: coord.r + offsets[1].r },
  ];
}

export function cornerVertexId(coord: HexCoord, cornerIndex: number): string {
  const [a, b, c] = cornerHexes(coord, cornerIndex);
  return vertexId(a, b, c);
}

// ─── Edge ID Generation ──────────────────────────────────────────────────────

export function edgeId(vertexA: string, vertexB: string): string {
  return vertexA < vertexB ? `e:${vertexA}|${vertexB}` : `e:${vertexB}|${vertexA}`;
}

// ─── Build Vertex & Edge Lists ───────────────────────────────────────────────

export interface BoardTopology {
  vertices: Vertex[];
  edges: Edge[];
  vertexMap: Map<string, Vertex>;
  edgeMap: Map<string, Edge>;
}

/**
 * Compute all vertices and edges from a set of hex positions.
 * Defaults to BOARD_HEXES (standard 3-4 player board) if no positions provided.
 *
 * @param hexPositions - The hex coordinates to build topology from
 * @param seaCoordSet - Set of "q,r" keys for sea hexes (for edge type classification)
 */
export function computeBoardTopology(
  hexPositions?: HexCoord[],
  seaCoordSet?: Set<string>
): BoardTopology {
  const hexes = hexPositions ?? BOARD_HEXES;
  const hexSet = new Set(hexes.map((h) => hexKey(h)));
  const seaSet = seaCoordSet ?? new Set<string>();
  const isValid = (coord: HexCoord) => hexSet.has(hexKey(coord));

  const vertexMap = new Map<string, Vertex>();
  const edgeMap = new Map<string, Edge>();

  for (const hex of hexes) {
    for (let i = 0; i < 6; i++) {
      const [a, b, c] = cornerHexes(hex, i);
      const sorted = sortedHexTriple(a, b, c);
      const vId = vertexId(a, b, c);

      if (!vertexMap.has(vId)) {
        const adjacentOnBoard = [a, b, c].filter(isValid);
        vertexMap.set(vId, {
          id: vId,
          adjacentHexCoords: adjacentOnBoard,
          canonicalHexCoords: sorted,
          building: null,
          harbor: null,
        });
      }

      // Edge from corner i to corner (i+1)%6
      const nextI = (i + 1) % 6;
      const vIdNext = cornerVertexId(hex, nextI);
      const eId = edgeId(vId, vIdNext);

      if (!edgeMap.has(eId)) {
        const [ev1, ev2] = vId < vIdNext ? [vId, vIdNext] : [vIdNext, vId];

        // Classify edge type based on adjacent hexes
        const edgeType = classifyEdgeType(hex, i, hexSet, seaSet);

        edgeMap.set(eId, {
          id: eId,
          vertexIds: [ev1, ev2],
          road: null,
          ship: null,
          edgeType,
        });
      }
    }
  }

  return {
    vertices: Array.from(vertexMap.values()),
    edges: Array.from(edgeMap.values()),
    vertexMap,
    edgeMap,
  };
}

/**
 * Classify an edge as land, sea, or coastal.
 * An edge between corner i and corner (i+1) of a hex is shared with one neighbor.
 * - Both hexes are land → land
 * - Both hexes are sea (or off-board) → sea
 * - One land, one sea/off-board → coastal
 */
function classifyEdgeType(
  hex: HexCoord,
  cornerIndex: number,
  hexSet: Set<string>,
  seaSet: Set<string>
): EdgeType {
  // The neighbor across edge i (from corner i to corner i+1) is HEX_DIRECTIONS[i]
  const neighbor: HexCoord = {
    q: hex.q + HEX_DIRECTIONS[cornerIndex].q,
    r: hex.r + HEX_DIRECTIONS[cornerIndex].r,
  };

  const hexIsSea = seaSet.has(hexKey(hex));
  const neighborOnBoard = hexSet.has(hexKey(neighbor));
  const neighborIsSea = !neighborOnBoard || seaSet.has(hexKey(neighbor));

  if (hexIsSea && neighborIsSea) return 'sea';
  if (!hexIsSea && !neighborIsSea) return 'land';
  return 'coastal';
}

// ─── Vertex Pixel Position ───────────────────────────────────────────────────

export function vertexPixelPosition(vertex: Vertex, hexSize: number): Point {
  const refHex = vertex.canonicalHexCoords[0];
  const center = hexToPixel(refHex.q, refHex.r, hexSize);

  for (let i = 0; i < 6; i++) {
    const vId = cornerVertexId(refHex, i);
    if (vId === vertex.id) {
      return hexCorner(center, hexSize, i);
    }
  }

  // Fallback
  const refOnBoard = vertex.adjacentHexCoords[0];
  if (refOnBoard) {
    const c = hexToPixel(refOnBoard.q, refOnBoard.r, hexSize);
    for (let i = 0; i < 6; i++) {
      if (cornerVertexId(refOnBoard, i) === vertex.id) {
        return hexCorner(c, hexSize, i);
      }
    }
  }

  return { x: 0, y: 0 };
}

// ─── Adjacency Computation ───────────────────────────────────────────────────

/**
 * Compute adjacency lists for a set of hex positions.
 * Returns array where adjacency[i] = indices of hexes neighboring hexPositions[i].
 */
export function computeHexAdjacency(hexPositions: HexCoord[]): number[][] {
  return hexPositions.map((hex, i) =>
    hexPositions.reduce<number[]>((neighbors, other, j) => {
      if (i !== j && areHexNeighbors(hex, other)) neighbors.push(j);
      return neighbors;
    }, [])
  );
}
