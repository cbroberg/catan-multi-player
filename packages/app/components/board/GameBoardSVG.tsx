'use client';

import { useRef, useEffect, useState } from 'react';
import type { GameView, HexCoord, PlayerColor } from '@catan/shared';
import { vertexPixelPosition } from '@catan/game-engine';
import { hexToPixel, hexPolygonPoints } from './hex-utils';
import { TerrainHexSVG } from './TerrainHexSVG';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { HarborMarker } from './HarborMarker';
import { SettlementPiece, CityPiece, RoadPiece, ShipPiece } from './PlayerPieces';

const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#AE0100', blue: '#071C8F', white: '#e5e5e5',
  orange: '#FF940F', green: '#003224', brown: '#461E00', purple: '#8b5cf6', cyan: '#06b6d4',
};

interface GameBoardSVGProps {
  view: GameView;
  hexSize?: number;
  onVertexClick?: (vertexId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onHexClick?: (coord: HexCoord) => void;
  highlightVertices?: string[];
  highlightEdges?: string[];
  highlightHexes?: HexCoord[];
}

export function GameBoardSVG({
  view, hexSize = 46,
  onVertexClick, onEdgeClick, onHexClick,
  highlightVertices = [], highlightEdges = [], highlightHexes = [],
}: GameBoardSVGProps) {
  const board = view.board;
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayReady, setOverlayReady] = useState(false);

  const hexPixels = board.hexes.map((h) => hexToPixel(h.coord.q, h.coord.r, hexSize));
  const padding = hexSize * 1.8;
  const allX = hexPixels.map((p) => p.x);
  const allY = hexPixels.map((p) => p.y);
  const minX = Math.min(...allX) - padding;
  const minY = Math.min(...allY) - padding;
  const maxX = Math.max(...allX) + padding;
  const maxY = Math.max(...allY) + padding;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const vertexPos = new Map<string, { x: number; y: number }>();
  for (const v of board.vertices) vertexPos.set(v.id, vertexPixelPosition(v, hexSize));

  const highlightVSet = new Set(highlightVertices);
  const highlightESet = new Set(highlightEdges);
  const highlightHSet = new Set(highlightHexes.map((h) => `${h.q},${h.r}`));
  const roadMap = new Map(view.roads.map((r) => [r.edgeId, r]));
  const buildingMap = new Map(view.buildings.map((b) => [b.vertexId, b]));

  // Land hex pixels for harbor push direction
  const landHexPixels = board.hexes
    .filter((h) => h.terrain !== 'sea')
    .map((h) => hexToPixel(h.coord.q, h.coord.r, hexSize));

  // Force overlay re-render when SVG resizes
  useEffect(() => { setOverlayReady(true); }, []);

  /** Convert SVG coordinate to % position within the container */
  function svgToPercent(svgX: number, svgY: number): { left: string; top: string } {
    return {
      left: `${((svgX - minX) / vbW) * 100}%`,
      top: `${((svgY - minY) / vbH) * 100}%`,
    };
  }

  // Compute harbor positions (push away from nearest land hex)
  const harborPositions = board.harbors.map((harbor, i) => {
    const a = vertexPos.get(harbor.vertexIds[0]);
    const b = vertexPos.get(harbor.vertexIds[1]);
    if (!a || !b) return null;

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    // Find nearest land hex
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

    const dx = midX - nearestX;
    const dy = midY - nearestY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const pushDist = hexSize * 0.4;
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    return {
      x: midX + (dx / dist) * pushDist,
      y: midY + (dy / dist) * pushDist,
      type: harbor.type,
      rotation: angleDeg,
    };
  }).filter(Boolean) as { x: number; y: number; type: any; rotation: number }[];

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* SVG Board */}
      <svg ref={svgRef} viewBox={`${minX} ${minY} ${vbW} ${vbH}`} className="w-full h-full">
        <rect x={minX} y={minY} width={vbW} height={vbH} fill="#0e1a2e" rx={8} />

        {/* Hexes */}
        {board.hexes.map((hex, i) => {
          const c = hexPixels[i];
          const isSea = hex.terrain === 'sea';
          const isHL = highlightHSet.has(`${hex.coord.q},${hex.coord.r}`);
          return (
            <g key={`h${i}`}>
              <TerrainHexSVG terrain={hex.terrain} x={c.x} y={c.y} size={hexSize} />
              <polygon
                points={hexPolygonPoints(c, hexSize)}
                fill="transparent"
                stroke={isHL ? '#fbbf24' : 'none'}
                strokeWidth={isHL ? 3 : 0}
                opacity={isSea ? 0.5 : 1}
              />
              {hex.number != null && <NumberToken cx={c.x} cy={c.y} number={hex.number} radius={hexSize * 0.24} />}
              {/* Pirate on sea hex */}
              {hex.hasPirate && (
                <image
                  href="/tiles/pirate.webp"
                  x={c.x - hexSize * 0.4}
                  y={c.y - hexSize * 0.4}
                  width={hexSize * 0.8}
                  height={hexSize * 0.8}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}
            </g>
          );
        })}

        {/* Harbors (behind pieces) */}
        {harborPositions.map((hp, i) => (
          <HarborMarker key={`hb${i}`} cx={hp.x} cy={hp.y} type={hp.type} rotation={hp.rotation} hexSize={hexSize} />
        ))}

        {/* Roads */}
        {board.edges.map((edge) => {
          const road = roadMap.get(edge.id);
          const isHL = highlightESet.has(edge.id);
          const a = vertexPos.get(edge.vertexIds[0]);
          const b = vertexPos.get(edge.vertexIds[1]);
          if (!a || !b) return null;
          if (road) {
            const fill = COLOR_HEX[road.color] ?? '#888';
            return <RoadPiece key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={fill} width={hexSize * 0.1} />;
          }
          if (isHL) {
            return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />;
          }
          return null;
        })}

        {/* TODO: Ships would go here when Seafarers gameplay is wired */}

        {/* Buildings (topmost layer) */}
        {board.vertices.map((v) => {
          const building = buildingMap.get(v.id);
          const isHL = highlightVSet.has(v.id);
          const pos = vertexPos.get(v.id);
          if (!pos) return null;
          if (building) {
            const fill = COLOR_HEX[building.color] ?? '#888';
            if (building.type === 'city') {
              return <CityPiece key={v.id} x={pos.x} y={pos.y} color={fill} size={hexSize * 0.38} />;
            }
            return <SettlementPiece key={v.id} x={pos.x} y={pos.y} color={fill} size={hexSize * 0.3} />;
          }
          if (isHL) {
            return <circle key={v.id} cx={pos.x} cy={pos.y} r={5} fill="#fbbf24" opacity={0.7} />;
          }
          return null;
        })}

        {/* Robber (hires WebP) */}
        <Robber
          cx={hexToPixel(view.robberPosition.q, view.robberPosition.r, hexSize).x}
          cy={hexToPixel(view.robberPosition.q, view.robberPosition.r, hexSize).y}
          size={hexSize * 0.36}
        />
      </svg>

      {/* ─── HTML Overlay: invisible click targets for Playwright ─── */}
      {overlayReady && (
        <div className="absolute inset-0 pointer-events-none" data-testid="board-overlay">
          {highlightVertices.map((vId) => {
            const pos = vertexPos.get(vId);
            if (!pos) return null;
            const { left, top } = svgToPercent(pos.x, pos.y);
            return (
              <button key={vId}
                data-action="vertex" data-vertex-id={vId}
                onClick={() => onVertexClick?.(vId)}
                className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer opacity-0"
                style={{ left, top }}
                aria-label="Place on vertex"
              />
            );
          })}

          {highlightEdges.map((eId) => {
            const edge = board.edges.find((e) => e.id === eId);
            if (!edge) return null;
            const a = vertexPos.get(edge.vertexIds[0]);
            const b = vertexPos.get(edge.vertexIds[1]);
            if (!a || !b) return null;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const { left, top } = svgToPercent(midX, midY);
            return (
              <button key={eId}
                data-action="edge" data-edge-id={eId}
                onClick={() => onEdgeClick?.(eId)}
                className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer opacity-0"
                style={{ left, top }}
                aria-label="Place road"
              />
            );
          })}

          {highlightHexes.map((hc) => {
            const pixel = hexToPixel(hc.q, hc.r, hexSize);
            const { left, top } = svgToPercent(pixel.x, pixel.y);
            return (
              <button key={`${hc.q},${hc.r}`}
                data-action="hex" data-hex-q={hc.q} data-hex-r={hc.r}
                onClick={() => onHexClick?.(hc)}
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer opacity-0"
                style={{ left, top }}
                aria-label="Place robber"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
