import { describe, it, expect } from 'vitest';
import {
  generateRandomBalancedBoard,
  generateBoardFromArrays,
  computeBoardTopology,
  areHexNeighbors,
  hexToPixel,
  hexCorner,
  cornerVertexId,
  passesHardConstraints,
  BEGINNER_PRESET,
  detectPerimeterEdges,
} from '../index';
import {
  BOARD_HEXES,
  TERRAIN_COUNTS,
  NUMBER_TOKENS,
  generateHexPositions,
  getVariant,
  resolveHexPositions,
  expandTerrainCounts,
  BOARD_VARIANTS,
} from '@catan/shared';

// ─── Hex Position Generation ─────────────────────────────────────────────────

describe('generateHexPositions', () => {
  it('should produce 19 hexes for [3,4,5,4,3]', () => {
    const positions = generateHexPositions([3, 4, 5, 4, 3]);
    expect(positions).toHaveLength(19);
  });

  it('should produce 30 hexes for [3,4,5,6,5,4,3]', () => {
    const positions = generateHexPositions([3, 4, 5, 6, 5, 4, 3]);
    expect(positions).toHaveLength(30);
  });

  it('should produce 37 hexes for [4,5,6,7,6,5,4]', () => {
    const positions = generateHexPositions([4, 5, 6, 7, 6, 5, 4]);
    expect(positions).toHaveLength(37);
  });

  it('should produce unique coordinates', () => {
    const positions = generateHexPositions([3, 4, 5, 6, 5, 4, 3]);
    const keys = positions.map((p) => `${p.q},${p.r}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should match BOARD_HEXES for standard layout', () => {
    const generated = generateHexPositions([3, 4, 5, 4, 3]);
    const genKeys = new Set(generated.map((p) => `${p.q},${p.r}`));
    const boardKeys = new Set(BOARD_HEXES.map((p) => `${p.q},${p.r}`));
    expect(genKeys).toEqual(boardKeys);
  });
});

// ─── Variant Registry ────────────────────────────────────────────────────────

describe('Variant Registry', () => {
  it('should have 6 variants', () => {
    expect(Object.keys(BOARD_VARIANTS)).toHaveLength(6);
  });

  it('should resolve base-3-4 to 19 hexes', () => {
    const config = getVariant('base-3-4');
    const positions = resolveHexPositions(config);
    expect(positions).toHaveLength(19);
  });

  it('should resolve base-5-6 to 30 hexes', () => {
    const config = getVariant('base-5-6');
    const positions = resolveHexPositions(config);
    expect(positions).toHaveLength(30);
  });

  it('should resolve base-7-8 to 37 hexes', () => {
    const config = getVariant('base-7-8');
    const positions = resolveHexPositions(config);
    expect(positions).toHaveLength(37);
  });

  it('should throw for unknown variant', () => {
    expect(() => getVariant('invalid')).toThrow();
  });

  it('terrain counts should match hex count for each base variant', () => {
    for (const id of ['base-3-4', 'base-5-6', 'base-7-8']) {
      const config = getVariant(id);
      const hexCount = resolveHexPositions(config).length;
      const tileCount = expandTerrainCounts(config.terrainCounts).length;
      expect(tileCount).toBe(hexCount);
    }
  });

  it('number tokens should match non-desert hex count for each base variant', () => {
    for (const id of ['base-3-4', 'base-5-6', 'base-7-8']) {
      const config = getVariant(id);
      const tiles = expandTerrainCounts(config.terrainCounts);
      const nonDesert = tiles.filter((t) => t !== 'desert' && t !== 'sea').length;
      expect(config.numberTokens.length).toBe(nonDesert);
    }
  });
});

// ─── Hex Grid Topology ───────────────────────────────────────────────────────

describe('Hex Grid Topology', () => {
  it('should have exactly 19 hex positions', () => {
    expect(BOARD_HEXES).toHaveLength(19);
  });

  it('should compute 54 vertices for base-3-4', () => {
    const topology = computeBoardTopology();
    expect(topology.vertices).toHaveLength(54);
  });

  it('should compute 72 edges for base-3-4', () => {
    const topology = computeBoardTopology();
    expect(topology.edges).toHaveLength(72);
  });

  it('should produce deterministic vertex IDs regardless of source hex', () => {
    const fromHex00 = cornerVertexId({ q: 0, r: 0 }, 0);
    const fromHex1m1 = cornerVertexId({ q: 1, r: -1 }, 2);
    const fromHex10 = cornerVertexId({ q: 1, r: 0 }, 4);
    expect(fromHex00).toBe(fromHex1m1);
    expect(fromHex00).toBe(fromHex10);
  });

  it('should correctly identify neighbors', () => {
    expect(areHexNeighbors({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    expect(areHexNeighbors({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(true);
    expect(areHexNeighbors({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(true);
    expect(areHexNeighbors({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
  });

  it('should produce unique vertex and edge IDs', () => {
    const topology = computeBoardTopology();
    const vIds = topology.vertices.map((v) => v.id);
    expect(new Set(vIds).size).toBe(vIds.length);
    const eIds = topology.edges.map((e) => e.id);
    expect(new Set(eIds).size).toBe(eIds.length);
  });

  it('each edge should connect two existing vertices', () => {
    const topology = computeBoardTopology();
    const vertexIds = new Set(topology.vertices.map((v) => v.id));
    for (const edge of topology.edges) {
      expect(vertexIds.has(edge.vertexIds[0])).toBe(true);
      expect(vertexIds.has(edge.vertexIds[1])).toBe(true);
    }
  });

  it('each vertex should have 1-3 adjacent on-board hexes', () => {
    const topology = computeBoardTopology();
    for (const vertex of topology.vertices) {
      expect(vertex.adjacentHexCoords.length).toBeGreaterThanOrEqual(1);
      expect(vertex.adjacentHexCoords.length).toBeLessThanOrEqual(3);
    }
  });
});

// ─── Topology for Larger Boards ──────────────────────────────────────────────

describe('Topology for larger boards', () => {
  it('base-5-6 should have more vertices/edges than base-3-4', () => {
    const config56 = getVariant('base-5-6');
    const positions56 = resolveHexPositions(config56);
    const topo56 = computeBoardTopology(positions56);

    expect(topo56.vertices.length).toBeGreaterThan(54);
    expect(topo56.edges.length).toBeGreaterThan(72);
  });

  it('base-7-8 should have more vertices/edges than base-5-6', () => {
    const config56 = getVariant('base-5-6');
    const config78 = getVariant('base-7-8');
    const topo56 = computeBoardTopology(resolveHexPositions(config56));
    const topo78 = computeBoardTopology(resolveHexPositions(config78));

    expect(topo78.vertices.length).toBeGreaterThan(topo56.vertices.length);
    expect(topo78.edges.length).toBeGreaterThan(topo56.edges.length);
  });

  it('all edges should have an edgeType', () => {
    // Generate a board to get actual sea positions (procedural island generation)
    const { board } = generateRandomBalancedBoard('seafarers-3-4');
    const seaHexes = board.hexes.filter((h) => h.terrain === 'sea');
    const seaSet = new Set(seaHexes.map((h) => `${h.coord.q},${h.coord.r}`));

    const config = getVariant('seafarers-3-4');
    const positions = resolveHexPositions(config);
    const topo = computeBoardTopology(positions, seaSet);

    for (const edge of topo.edges) {
      expect(['land', 'sea', 'coastal']).toContain(edge.edgeType);
    }

    // Seafarers should have all 3 edge types
    const types = new Set(topo.edges.map((e) => e.edgeType));
    expect(types.has('land')).toBe(true);
    expect(types.has('sea')).toBe(true);
    expect(types.has('coastal')).toBe(true);
  });
});

// ─── Hex Pixel Conversion ────────────────────────────────────────────────────

describe('Hex Pixel Conversion', () => {
  it('should place center hex at origin', () => {
    const p = hexToPixel(0, 0, 1);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
  });

  it('should produce correct flat-top hex corners', () => {
    const center = { x: 0, y: 0 };
    const c0 = hexCorner(center, 1, 0);
    expect(c0.x).toBeCloseTo(1);
    expect(c0.y).toBeCloseTo(0);
    const c3 = hexCorner(center, 1, 3);
    expect(c3.x).toBeCloseTo(-1);
    expect(c3.y).toBeCloseTo(0);
  });
});

// ─── Random Balanced Board Generator ─────────────────────────────────────────

describe('Random Balanced Board Generator (base-3-4)', () => {
  it('should generate a board with 19 hexes', () => {
    const { board } = generateRandomBalancedBoard();
    expect(board.hexes).toHaveLength(19);
  });

  it('should have correct terrain counts', () => {
    const { board } = generateRandomBalancedBoard();
    const counts: Record<string, number> = {};
    for (const hex of board.hexes) {
      counts[hex.terrain] = (counts[hex.terrain] || 0) + 1;
    }
    for (const [terrain, expected] of Object.entries(TERRAIN_COUNTS)) {
      if (expected === 0) continue;
      expect(counts[terrain]).toBe(expected);
    }
  });

  it('should have correct number token distribution', () => {
    const { board } = generateRandomBalancedBoard();
    const numbers = board.hexes
      .map((h) => h.number)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    const expected = [...NUMBER_TOKENS].sort((a, b) => a - b);
    expect(numbers).toEqual(expected);
  });

  it('should have desert with no number and robber', () => {
    const { board } = generateRandomBalancedBoard();
    const desert = board.hexes.find((h) => h.terrain === 'desert');
    expect(desert).toBeDefined();
    expect(desert!.number).toBeNull();
    expect(desert!.hasRobber).toBe(true);
  });

  it('should place robber on desert', () => {
    const { board } = generateRandomBalancedBoard();
    const desert = board.hexes.find((h) => h.terrain === 'desert')!;
    expect(board.robberPosition).toEqual(desert.coord);
  });

  it('should have 54 vertices and 72 edges', () => {
    const { board } = generateRandomBalancedBoard();
    expect(board.vertices).toHaveLength(54);
    expect(board.edges).toHaveLength(72);
  });

  it('should have 9 harbors', () => {
    const { board } = generateRandomBalancedBoard();
    expect(board.harbors).toHaveLength(9);
  });

  it('should pass hard constraints', () => {
    for (let i = 0; i < 5; i++) {
      const { board } = generateRandomBalancedBoard();
      expect(passesHardConstraints(board.hexes)).toBe(true);
    }
  });

  it('should produce a balance score between 0 and 100', () => {
    const { score } = generateRandomBalancedBoard();
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('should set variantId on board', () => {
    const { board } = generateRandomBalancedBoard();
    expect(board.variantId).toBe('base-3-4');
  });
});

// ─── Larger Board Variants ───────────────────────────────────────────────────

describe('Base 5-6 Board Generator', () => {
  it('should generate 30 hexes', () => {
    const { board } = generateRandomBalancedBoard('base-5-6');
    expect(board.hexes).toHaveLength(30);
  });

  it('should have correct terrain counts', () => {
    const { board } = generateRandomBalancedBoard('base-5-6');
    const config = getVariant('base-5-6');
    const counts: Record<string, number> = {};
    for (const hex of board.hexes) {
      counts[hex.terrain] = (counts[hex.terrain] || 0) + 1;
    }
    for (const [terrain, expected] of Object.entries(config.terrainCounts)) {
      if (expected && expected > 0) {
        expect(counts[terrain]).toBe(expected);
      }
    }
  });

  it('should have 11 harbors', () => {
    const { board } = generateRandomBalancedBoard('base-5-6');
    expect(board.harbors).toHaveLength(11);
  });

  it('should pass hard constraints', () => {
    const { board } = generateRandomBalancedBoard('base-5-6');
    expect(passesHardConstraints(board.hexes)).toBe(true);
  });

  it('should set variantId', () => {
    const { board } = generateRandomBalancedBoard('base-5-6');
    expect(board.variantId).toBe('base-5-6');
  });
});

describe('Base 7-8 Board Generator', () => {
  it('should generate 37 hexes', () => {
    const { board } = generateRandomBalancedBoard('base-7-8');
    expect(board.hexes).toHaveLength(37);
  });

  it('should have 14 harbors', () => {
    const { board } = generateRandomBalancedBoard('base-7-8');
    expect(board.harbors).toHaveLength(14);
  });

  it('should pass hard constraints', () => {
    const { board } = generateRandomBalancedBoard('base-7-8');
    expect(passesHardConstraints(board.hexes)).toBe(true);
  });
});

describe('Seafarers 3-4 Board Generator', () => {
  it('should generate a board with sea hexes', () => {
    const { board } = generateRandomBalancedBoard('seafarers-3-4');
    const seaCount = board.hexes.filter((h) => h.terrain === 'sea').length;
    expect(seaCount).toBeGreaterThan(0);
  });

  it('should have gold_river hexes', () => {
    const { board } = generateRandomBalancedBoard('seafarers-3-4');
    const goldCount = board.hexes.filter((h) => h.terrain === 'gold_river').length;
    expect(goldCount).toBeGreaterThanOrEqual(1);
  });

  it('should have a pirate position', () => {
    const { board } = generateRandomBalancedBoard('seafarers-3-4');
    expect(board.piratePosition).not.toBeNull();
  });

  it('should have coastal edges', () => {
    const { board } = generateRandomBalancedBoard('seafarers-3-4');
    const coastalEdges = board.edges.filter((e) => e.edgeType === 'coastal');
    expect(coastalEdges.length).toBeGreaterThan(0);
  });
});

// ─── Harbor Detection ────────────────────────────────────────────────────────

describe('Perimeter Edge Detection', () => {
  it('should detect perimeter edges for base-3-4', () => {
    const positions = generateHexPositions([3, 4, 5, 4, 3]);
    const edges = detectPerimeterEdges(positions);
    expect(edges.length).toBeGreaterThanOrEqual(9);
    expect(edges.length).toBeLessThanOrEqual(40);
  });

  it('should detect more perimeter edges for larger boards', () => {
    const small = detectPerimeterEdges(generateHexPositions([3, 4, 5, 4, 3]));
    const large = detectPerimeterEdges(generateHexPositions([3, 4, 5, 6, 5, 4, 3]));
    expect(large.length).toBeGreaterThan(small.length);
  });
});

// ─── Beginner Preset ─────────────────────────────────────────────────────────

describe('Beginner Preset', () => {
  it('should have 19 terrains and variantId base-3-4', () => {
    expect(BEGINNER_PRESET.terrains).toHaveLength(19);
    expect(BEGINNER_PRESET.variantId).toBe('base-3-4');
  });

  it('should have correct terrain counts', () => {
    const counts: Record<string, number> = {};
    for (const t of BEGINNER_PRESET.terrains) {
      counts[t] = (counts[t] || 0) + 1;
    }
    for (const [terrain, expected] of Object.entries(TERRAIN_COUNTS)) {
      if (expected === 0) continue;
      expect(counts[terrain]).toBe(expected);
    }
  });

  it('should have exactly one desert with null number', () => {
    const desertIndices = BEGINNER_PRESET.terrains
      .map((t, i) => (t === 'desert' ? i : -1))
      .filter((i) => i >= 0);
    expect(desertIndices).toHaveLength(1);
    expect(BEGINNER_PRESET.numbers[desertIndices[0]]).toBeNull();
  });

  it('should generate a valid board from preset', () => {
    const { board, score } = generateBoardFromArrays(
      BEGINNER_PRESET.terrains,
      BEGINNER_PRESET.numbers,
      BEGINNER_PRESET.harbors.map((h) => h.type),
      'base-3-4'
    );
    expect(board.hexes).toHaveLength(19);
    expect(board.vertices).toHaveLength(54);
    expect(board.edges).toHaveLength(72);
    expect(score.total).toBeGreaterThan(0);
  });
});
