'use client';

import { useRef, useEffect, useState } from 'react';
import type { GameView, HexCoord } from '@catan/shared';
import { vertexPixelPosition } from '@catan/game-engine';
import { hexToPixel, hexPolygonPoints, TERRAIN_COLORS } from './hex-utils';
import { NumberToken } from './NumberToken';
import { HarborMarker } from './HarborMarker';

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#e5e5e5',
  orange: '#f97316', green: '#22c55e', brown: '#92400e',
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

  const centroidX = allX.reduce((a, b) => a + b, 0) / allX.length;
  const centroidY = allY.reduce((a, b) => a + b, 0) / allY.length;

  const highlightVSet = new Set(highlightVertices);
  const highlightESet = new Set(highlightEdges);
  const highlightHSet = new Set(highlightHexes.map((h) => `${h.q},${h.r}`));
  const roadMap = new Map(view.roads.map((r) => [r.edgeId, r]));
  const buildingMap = new Map(view.buildings.map((b) => [b.vertexId, b]));

  // Force overlay re-render when SVG resizes
  useEffect(() => { setOverlayReady(true); }, []);

  /** Convert SVG coordinate to % position within the container */
  function svgToPercent(svgX: number, svgY: number): { left: string; top: string } {
    return {
      left: `${((svgX - minX) / vbW) * 100}%`,
      top: `${((svgY - minY) / vbH) * 100}%`,
    };
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* SVG Board */}
      <svg ref={svgRef} viewBox={`${minX} ${minY} ${vbW} ${vbH}`} className="w-full h-full">
        <rect x={minX} y={minY} width={vbW} height={vbH} fill="#0d47a1" rx={8} />

        {/* Hexes */}
        {board.hexes.map((hex, i) => {
          const c = hexPixels[i];
          const isSea = hex.terrain === 'sea';
          const isHL = highlightHSet.has(`${hex.coord.q},${hex.coord.r}`);
          return (
            <g key={`h${i}`}>
              <polygon
                points={hexPolygonPoints(c, hexSize)}
                fill={TERRAIN_COLORS[hex.terrain] ?? '#888'}
                stroke={isHL ? '#fbbf24' : isSea ? '#1256a0' : '#8b7355'}
                strokeWidth={isHL ? 3 : isSea ? 1 : 1.5}
                opacity={isSea ? 0.5 : 1}
              />
              {hex.number != null && <NumberToken cx={c.x} cy={c.y} number={hex.number} radius={hexSize * 0.24} />}
            </g>
          );
        })}

        {/* Harbors */}
        {board.harbors.map((h, i) => {
          const a = vertexPos.get(h.vertexIds[0]);
          const b = vertexPos.get(h.vertexIds[1]);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = mx - centroidX, dy = my - centroidY;
          const d = Math.sqrt(dx * dx + dy * dy);
          return <HarborMarker key={`hb${i}`} cx={mx + (dx / d) * hexSize * 0.55} cy={my + (dy / d) * hexSize * 0.55} type={h.type} />;
        })}

        {/* Roads */}
        {board.edges.map((edge) => {
          const road = roadMap.get(edge.id);
          const isHL = highlightESet.has(edge.id);
          const a = vertexPos.get(edge.vertexIds[0]);
          const b = vertexPos.get(edge.vertexIds[1]);
          if (!a || !b) return null;
          if (road) {
            return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={COLOR_HEX[road.color] ?? '#888'} strokeWidth={3.5} strokeLinecap="round" />;
          }
          if (isHL) {
            return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />;
          }
          return null;
        })}

        {/* Buildings */}
        {board.vertices.map((v) => {
          const building = buildingMap.get(v.id);
          const isHL = highlightVSet.has(v.id);
          const pos = vertexPos.get(v.id);
          if (!pos) return null;
          if (building) {
            const fill = COLOR_HEX[building.color] ?? '#888';
            if (building.type === 'city') {
              return (
                <g key={v.id}>
                  <rect x={pos.x - 5} y={pos.y - 6} width={10} height={12} rx={1.5} fill={fill} stroke="#000" strokeWidth={0.8} />
                  <rect x={pos.x - 3} y={pos.y - 9} width={6} height={5} rx={1} fill={fill} stroke="#000" strokeWidth={0.8} />
                </g>
              );
            }
            return (
              <g key={v.id}>
                <rect x={pos.x - 4} y={pos.y - 3} width={8} height={7} rx={1} fill={fill} stroke="#000" strokeWidth={0.8} />
                <polygon points={`${pos.x - 5},${pos.y - 3} ${pos.x},${pos.y - 8} ${pos.x + 5},${pos.y - 3}`} fill={fill} stroke="#000" strokeWidth={0.8} />
              </g>
            );
          }
          if (isHL) {
            return <circle key={v.id} cx={pos.x} cy={pos.y} r={5} fill="#fbbf24" opacity={0.7} />;
          }
          return null;
        })}

        {/* Robber */}
        {(() => {
          const rp = hexToPixel(view.robberPosition.q, view.robberPosition.r, hexSize);
          return (
            <g>
              <ellipse cx={rp.x} cy={rp.y + 3} rx={5} ry={8} fill="#111" stroke="#444" strokeWidth={0.8} />
              <circle cx={rp.x} cy={rp.y - 6} r={3.5} fill="#111" stroke="#444" strokeWidth={0.8} />
            </g>
          );
        })()}
      </svg>

      {/* ─── HTML Overlay: invisible click targets for Playwright ─── */}
      {overlayReady && (
        <div className="absolute inset-0 pointer-events-none" data-testid="board-overlay">
          {/* Vertex click targets */}
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
                aria-label={`Place on vertex`}
              />
            );
          })}

          {/* Edge click targets */}
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
                aria-label={`Place road`}
              />
            );
          })}

          {/* Hex click targets */}
          {highlightHexes.map((hc) => {
            const pixel = hexToPixel(hc.q, hc.r, hexSize);
            const { left, top } = svgToPercent(pixel.x, pixel.y);
            return (
              <button key={`${hc.q},${hc.r}`}
                data-action="hex" data-hex-q={hc.q} data-hex-r={hc.r}
                onClick={() => onHexClick?.(hc)}
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer opacity-0"
                style={{ left, top }}
                aria-label={`Place robber`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
