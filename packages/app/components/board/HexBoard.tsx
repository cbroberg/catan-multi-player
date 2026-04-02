'use client';

import type { GameBoard, Harbor } from '@catan/shared';
import { vertexPixelPosition } from '@catan/game-engine';
import { hexToPixel, hexPolygonPoints } from './hex-utils';
import { TerrainHexSVG } from './TerrainHexSVG';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { HarborMarker } from './HarborMarker';

interface HexBoardProps {
  board: GameBoard;
  hexSize?: number;
}

export function HexBoard({ board, hexSize = 50 }: HexBoardProps) {
  // Compute pixel positions for all hexes
  const hexPixels = board.hexes.map((hex) =>
    hexToPixel(hex.coord.q, hex.coord.r, hexSize)
  );

  // Compute viewBox from hex positions
  const padding = hexSize * 1.8;
  const allX = hexPixels.map((p) => p.x);
  const allY = hexPixels.map((p) => p.y);
  const minX = Math.min(...allX) - padding;
  const minY = Math.min(...allY) - padding;
  const maxX = Math.max(...allX) + padding;
  const maxY = Math.max(...allY) + padding;
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  // Compute board centroid for harbor outward-push
  const centroidX = allX.reduce((a, b) => a + b, 0) / allX.length;
  const centroidY = allY.reduce((a, b) => a + b, 0) / allY.length;

  // Build vertex position lookup from board topology
  const vertexPositions = new Map<string, { x: number; y: number }>();
  for (const vertex of board.vertices) {
    const pos = vertexPixelPosition(vertex, hexSize);
    vertexPositions.set(vertex.id, pos);
  }

  // Land hex pixel positions (for harbor push direction)
  const landHexPixels = board.hexes
    .filter((h) => h.terrain !== 'sea')
    .map((h) => hexToPixel(h.coord.q, h.coord.r, hexSize));

  // Compute harbor marker positions from board data
  const harborPositions = computeHarborPositions(
    board.harbors,
    vertexPositions,
    landHexPixels,
    hexSize
  );

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      style={{ aspectRatio: `${maxX - minX} / ${maxY - minY}` }}
    >
      {/* Ocean background */}
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="#0e1a2e" rx={12} />

      {/* Hex tiles */}
      {board.hexes.map((hex, i) => {
        const center = hexPixels[i];
        const isSea = hex.terrain === 'sea';

        return (
          <g key={`hex-${hex.coord.q}-${hex.coord.r}`}>
            {/* Textured terrain SVG */}
            <TerrainHexSVG
              terrain={hex.terrain}
              x={center.x}
              y={center.y}
              size={hexSize}
            />
            {/* Transparent clickable overlay preserving original hex shape */}
            <polygon
              points={hexPolygonPoints(center, hexSize)}
              fill="transparent"
              stroke="none"
              opacity={isSea ? 0.6 : 1}
            />
            {/* Number token */}
            {hex.number !== null && (
              <NumberToken
                cx={center.x}
                cy={center.y}
                number={hex.number}
                radius={hexSize * 0.28}
              />
            )}
            {/* Robber */}
            {hex.hasRobber && (
              <Robber cx={center.x} cy={center.y} size={hexSize * 0.24} />
            )}
            {/* Pirate */}
            {hex.hasPirate && (
              <g>
                <ellipse
                  cx={center.x}
                  cy={center.y + hexSize * 0.04}
                  rx={hexSize * 0.11}
                  ry={hexSize * 0.16}
                  fill="#4a148c"
                  stroke="#7b1fa2"
                  strokeWidth={0.8}
                />
                <circle
                  cx={center.x}
                  cy={center.y - hexSize * 0.13}
                  r={hexSize * 0.07}
                  fill="#4a148c"
                  stroke="#7b1fa2"
                  strokeWidth={0.8}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* Harbors */}
      {harborPositions.map((hp, i) => (
        <HarborMarker key={`harbor-${i}`} cx={hp.x} cy={hp.y} type={hp.type} rotation={hp.rotation} />
      ))}
    </svg>
  );
}

interface HarborPosition {
  x: number;
  y: number;
  type: Harbor['type'];
  /** Rotation in degrees — sign post points toward land */
  rotation: number;
}

/**
 * Compute harbor marker positions from board data.
 * Finds the edge midpoint between the harbor's two vertices, then pushes
 * AWAY from the nearest land hex center — so the marker sits on the sea side.
 */
function computeHarborPositions(
  harbors: Harbor[],
  vertexPositions: Map<string, { x: number; y: number }>,
  landHexPixels: { x: number; y: number }[],
  hexSize: number
): HarborPosition[] {
  return harbors
    .map((harbor) => {
      const posA = vertexPositions.get(harbor.vertexIds[0]);
      const posB = vertexPositions.get(harbor.vertexIds[1]);
      if (!posA || !posB) return null;

      // Edge midpoint
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;

      // Find the nearest land hex center
      let nearestDist = Infinity;
      let nearestX = midX;
      let nearestY = midY;
      for (const hp of landHexPixels) {
        const dx = midX - hp.x;
        const dy = midY - hp.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) {
          nearestDist = d;
          nearestX = hp.x;
          nearestY = hp.y;
        }
      }

      // Push away from nearest land hex (toward sea)
      const dx = midX - nearestX;
      const dy = midY - nearestY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const pushDist = hexSize * 0.75;

      // Rotation: sign post points toward land (opposite of push direction)
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      return {
        x: midX + (dx / dist) * pushDist,
        y: midY + (dy / dist) * pushDist,
        type: harbor.type,
        rotation: angleDeg,
      };
    })
    .filter((h): h is HarborPosition => h !== null);
}
