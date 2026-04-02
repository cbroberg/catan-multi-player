import { describe, it, expect } from 'vitest';
import { generateRandomBalancedBoard } from '../index';
import type { Hex, HexCoord } from '@catan/shared';

function countIslands(hexes: Hex[]): number {
  const landHexes = hexes.filter(h => h.terrain !== 'sea');
  const visited = new Set<string>();
  let islands = 0;
  for (const hex of landHexes) {
    const key = `${hex.coord.q},${hex.coord.r}`;
    if (visited.has(key)) continue;
    islands++;
    const queue: HexCoord[] = [hex.coord];
    visited.add(key);
    while (queue.length > 0) {
      const { q, r } = queue.shift()!;
      for (const n of [{q:q+1,r},{q:q-1,r},{q,r:r+1},{q,r:r-1},{q:q+1,r:r-1},{q:q-1,r:r+1}]) {
        const nk = `${n.q},${n.r}`;
        if (visited.has(nk)) continue;
        if (landHexes.find(h => h.coord.q === n.q && h.coord.r === n.r)) {
          visited.add(nk);
          queue.push(n);
        }
      }
    }
  }
  return islands;
}

describe('Seafarers island separation', () => {
  for (const variant of ['seafarers-3-4', 'seafarers-5-6', 'seafarers-7-8']) {
    it(`${variant}: generates 3+ distinct islands consistently`, () => {
      const results: number[] = [];
      for (let i = 0; i < 20; i++) {
        const { board } = generateRandomBalancedBoard(variant);
        const islands = countIslands(board.hexes);
        results.push(islands);
      }
      const avg = results.reduce((a,b)=>a+b,0) / results.length;
      const min = Math.min(...results);
      console.log(`${variant}: avg=${avg.toFixed(1)}, min=${min}, max=${Math.max(...results)}, all=[${results.join(',')}]`);

      // Every board must have at least 3 islands
      expect(min).toBeGreaterThanOrEqual(3);
      // Average should be at least 4
      expect(avg).toBeGreaterThanOrEqual(4);
    });
  }
});
