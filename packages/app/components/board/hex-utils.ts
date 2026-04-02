import type { HexCoord, Point } from '@catan/shared';

/** Flat-top hex: axial → pixel */
export function hexToPixel(q: number, r: number, size: number): Point {
  return {
    x: size * ((3 / 2) * q),
    y: size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r),
  };
}

/** Flat-top hex corner (0=right, going clockwise) */
export function hexCorner(center: Point, size: number, i: number): Point {
  const angle = (Math.PI / 180) * (60 * i);
  return {
    x: center.x + size * Math.cos(angle),
    y: center.y + size * Math.sin(angle),
  };
}

/** Generate the SVG polygon points string for a flat-top hex */
export function hexPolygonPoints(center: Point, size: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const corner = hexCorner(center, size, i);
    return `${corner.x},${corner.y}`;
  }).join(' ');
}

/** Terrain → fill color */
export const TERRAIN_COLORS: Record<string, string> = {
  forest: '#2d6a30',
  pasture: '#8bc34a',
  fields: '#fdd835',
  hills: '#d4852e',
  mountains: '#78909c',
  desert: '#f5e6c8',
  sea: '#1565c0',
  gold_river: '#ffc107',
};

/** Terrain → label */
export const TERRAIN_LABELS: Record<string, string> = {
  forest: 'Forest',
  pasture: 'Pasture',
  fields: 'Fields',
  hills: 'Hills',
  mountains: 'Mountains',
  desert: 'Desert',
  sea: 'Sea',
  gold_river: 'Gold',
};

/** Number → pip count */
export const NUMBER_PIPS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};
