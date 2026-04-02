'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameBoard, BalanceScore, PlayerColor } from '@catan/shared';
import { BOARD_VARIANTS } from '@catan/shared';
import { generateRandomBalancedBoard, generateBoardFromArrays, BEGINNER_PRESET } from '@catan/game-engine';
import { HexBoard } from '@/components/board/HexBoard';
import type { BoardBuilding, BoardRoad } from '@catan/shared';

const variantEntries = Object.values(BOARD_VARIANTS);

export default function BoardPreviewPage() {
  const [variantId, setVariantId] = useState('base-3-4');
  const [state, setState] = useState<{ board: GameBoard; score: BalanceScore } | null>(null);
  const [showPieces, setShowPieces] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => {
      const next = e.deltaY < 0 ? z * 1.15 : z / 1.15;
      return Math.max(0.25, Math.min(20, next));
    });
  }, []);

  useEffect(() => {
    if (!state) setState(generateRandomBalancedBoard('base-3-4'));
  }, []);

  const generateNew = useCallback(() => {
    setState(generateRandomBalancedBoard(variantId));
  }, [variantId]);

  const loadBeginner = useCallback(() => {
    setState(
      generateBoardFromArrays(
        BEGINNER_PRESET.terrains,
        BEGINNER_PRESET.numbers,
        BEGINNER_PRESET.harbors.map((h) => h.type),
        'base-3-4'
      )
    );
  }, []);

  const switchVariant = useCallback((id: string) => {
    setVariantId(id);
    setState(generateRandomBalancedBoard(id));
  }, []);

  const variant = BOARD_VARIANTS[variantId];

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0e1a2e] text-white/50">
        Generating board...
      </div>
    );
  }

  const hexCount = state.board.hexes.length;
  const landCount = state.board.hexes.filter((h) => h.terrain !== 'sea').length;
  const seaCount = hexCount - landCount;

  return (
    <div className="flex flex-col min-h-screen bg-[#0e1a2e]">
      {/* ── Compact toolbar — one line ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#132038] border-b border-white/10 flex-wrap">
        {/* Variant dropdown */}
        <select
          value={variantId}
          onChange={(e) => switchVariant(e.target.value)}
          className="bg-amber-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg cursor-pointer appearance-none"
        >
          {variantEntries.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        {/* Generate */}
        <button onClick={generateNew} className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg cursor-pointer hover:bg-white/20">
          🎲 Nyt board
        </button>
        {variantId === 'base-3-4' && (
          <button onClick={loadBeginner} className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg cursor-pointer hover:bg-white/20">
            📐 Begynder
          </button>
        )}

        {/* Demo pieces */}
        <button
          onClick={() => setShowPieces((p) => !p)}
          className={`px-3 py-1.5 text-sm rounded-lg cursor-pointer ${
            showPieces ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          🏠 Brikker
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/15" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.25, z / 1.5))} className="px-2 py-1 bg-white/10 text-white rounded cursor-pointer hover:bg-white/20 text-sm">−</button>
        <span className="text-white/50 text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => z * 1.5)} className="px-2 py-1 bg-white/10 text-white rounded cursor-pointer hover:bg-white/20 text-sm">+</button>
        <button onClick={() => setRotation(r => r - 30)} className="px-2 py-1 bg-white/10 text-white rounded cursor-pointer hover:bg-white/20 text-sm">↶</button>
        <button onClick={() => setRotation(r => r + 30)} className="px-2 py-1 bg-white/10 text-white rounded cursor-pointer hover:bg-white/20 text-sm">↷</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }} className="px-2 py-1 bg-white/10 text-white/40 rounded cursor-pointer hover:bg-white/20 text-xs">↺</button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/15" />

        {/* Stats */}
        <div className="flex gap-3 text-xs text-white/40">
          <span>{hexCount} hex{seaCount > 0 ? ` (${landCount}+${seaCount})` : ''}</span>
          <span>{state.board.harbors.length} havne</span>
          <span>{variant?.defaultVictoryPoints} VP</span>
        </div>

        {/* Balance scores */}
        <div className="flex gap-2 text-xs ml-auto">
          <ScorePill label="Bal" value={state.score.total} />
          <ScorePill label="EV" value={state.score.resourceEV} />
          <ScorePill label="Int" value={state.score.intersectionBalance} />
          <ScorePill label="Spr" value={state.score.geographicSpread} />
        </div>
      </div>

      {/* Board — pannable & zoomable canvas */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden flex-1"
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <div
          className="w-full max-w-3xl mx-auto"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.15s',
          }}
        >
          <HexBoard
            board={state.board}
            hexSize={50}
            buildings={showPieces ? generateDemoBuildings(state.board) : undefined}
            roads={showPieces ? generateDemoRoads(state.board) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ScoreDisplay removed — scores shown inline in toolbar

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'white', 'orange', 'green', 'brown'];
const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#e5e5e5',
  orange: '#f97316', green: '#22c55e', brown: '#92400e',
};

/** Generate demo buildings: 2 settlements + 1 city per "player" on land vertices */
function generateDemoBuildings(board: GameBoard): BoardBuilding[] {
  const landHexKeys = new Set(
    board.hexes.filter((h) => h.terrain !== 'sea' && h.terrain !== 'desert').map((h) => `${h.coord.q},${h.coord.r}`)
  );
  // Find vertices that touch at least one land hex
  // Vertex ID format: "v:q1,r1:q2,r2:q3,r3" — extract hex coords
  const landVertices = board.vertices.filter((v) => {
    const parts = v.id.slice(2).split(':'); // remove "v:" prefix, split by ":"
    return parts.some((hk) => landHexKeys.has(hk));
  });

  const used = new Set<string>();
  const buildings: BoardBuilding[] = [];
  const players = PLAYER_COLORS.slice(0, 4);

  for (let p = 0; p < players.length; p++) {
    const color = players[p];
    let placed = 0;
    for (const v of landVertices) {
      if (placed >= 3) break;
      if (used.has(v.id)) continue;
      // Distance rule: skip if any neighbor vertex is used
      const neighborIds = board.edges
        .filter((e) => e.vertexIds.includes(v.id))
        .flatMap((e) => e.vertexIds)
        .filter((vid) => vid !== v.id);
      if (neighborIds.some((nid) => used.has(nid))) continue;

      used.add(v.id);
      buildings.push({
        vertexId: v.id,
        type: placed === 2 ? 'city' : 'settlement',
        playerId: `player-${p}`,
        color,
      });
      placed++;
    }
  }
  return buildings;
}

/** Generate demo roads: connect each player's buildings */
function generateDemoRoads(board: GameBoard): BoardRoad[] {
  const buildings = generateDemoBuildings(board);
  const roads: BoardRoad[] = [];
  const usedEdges = new Set<string>();

  for (let p = 0; p < 4; p++) {
    const playerBuildings = buildings.filter((b) => b.playerId === `player-${p}`);
    for (const building of playerBuildings) {
      // Find edges connected to this vertex
      const connectedEdges = board.edges.filter(
        (e) => e.vertexIds.includes(building.vertexId) && !usedEdges.has(e.id)
      );
      if (connectedEdges.length > 0) {
        const edge = connectedEdges[0];
        usedEdges.add(edge.id);
        roads.push({
          edgeId: edge.id,
          playerId: `player-${p}`,
          color: PLAYER_COLORS[p],
        } as BoardRoad);
      }
    }
  }
  return roads;
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <span className="flex items-center gap-1">
      <span className="text-white/40">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </span>
  );
}
