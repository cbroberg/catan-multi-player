'use client';

import type { GameBoard, Harbor } from '@catan/shared';
import { vertexPixelPosition } from '@catan/game-engine';
import { hexToPixel, hexPolygonPoints, TERRAIN_COLORS } from './hex-utils';
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

  // Compute harbor marker positions from board data
  const harborPositions = computeHarborPositions(
    board.harbors,
    vertexPositions,
    centroidX,
    centroidY,
    hexSize
  );

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full max-w-[900px] max-h-[900px]"
      style={{ aspectRatio: `${maxX - minX} / ${maxY - minY}` }}
    >
      {/* Ocean background */}
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="#0d47a1" rx={12} />

      {/* Hex tiles */}
      {board.hexes.map((hex, i) => {
        const center = hexPixels[i];
        const isSea = hex.terrain === 'sea';

        return (
          <g key={`hex-${hex.coord.q}-${hex.coord.r}`}>
            <polygon
              points={hexPolygonPoints(center, hexSize)}
              fill={TERRAIN_COLORS[hex.terrain] ?? '#888'}
              stroke={isSea ? '#1256a0' : '#8b7355'}
              strokeWidth={isSea ? 1 : 2}
              opacity={isSea ? 0.6 : 1}
            />
            {/* Gold river sparkle indicator */}
            {hex.terrain === 'gold_river' && (
              <text
                x={center.x}
                y={center.y - hexSize * 0.35}
                textAnchor="middle"
                fontSize={hexSize * 0.22}
                fill="#fff"
                opacity={0.9}
              >
                ★
              </text>
            )}
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
        <HarborMarker key={`harbor-${i}`} cx={hp.x} cy={hp.y} type={hp.type} />
      ))}
    </svg>
  );
}

interface HarborPosition {
  x: number;
  y: number;
  type: Harbor['type'];
}

/**
 * Compute harbor marker positions from board data.
 * Uses vertex positions to find edge midpoints, then pushes outward from centroid.
 */
function computeHarborPositions(
  harbors: Harbor[],
  vertexPositions: Map<string, { x: number; y: number }>,
  centroidX: number,
  centroidY: number,
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

      // Push outward from centroid
      const dx = midX - centroidX;
      const dy = midY - centroidY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pushDist = hexSize * 0.55;

      return {
        x: midX + (dx / dist) * pushDist,
        y: midY + (dy / dist) * pushDist,
        type: harbor.type,
      };
    })
    .filter((h): h is HarborPosition => h !== null);
}
