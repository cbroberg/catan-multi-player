'use client';

import { useState, useCallback, useEffect } from 'react';
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
    <div className="flex flex-col items-center gap-6 p-6 min-h-screen bg-[#0e1a2e]">
      <h1 className="text-2xl font-bold text-white">Catan Board Preview</h1>

      {/* Variant selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {variantEntries.map((v) => (
          <button
            key={v.id}
            onClick={() => switchVariant(v.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              variantId === v.id
                ? 'bg-amber-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={generateNew}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          Generate New Board
        </button>
        {variantId === 'base-3-4' && (
          <button
            onClick={loadBeginner}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            Beginner Layout
          </button>
        )}
      </div>

      {/* Board info */}
      <div className="flex gap-6 text-xs text-white/50">
        <span>{hexCount} hexes{seaCount > 0 ? ` (${landCount} land, ${seaCount} sea)` : ''}</span>
        <span>{state.board.vertices.length} vertices</span>
        <span>{state.board.edges.length} edges</span>
        <span>{state.board.harbors.length} harbors</span>
        <span>{variant?.playerRange[0]}-{variant?.playerRange[1]} players</span>
        <span>{variant?.defaultVictoryPoints} VP</span>
      </div>

      {/* Balance Score */}
      <ScoreDisplay score={state.score} />

      {/* Demo pieces toggle */}
      <button
        onClick={() => setShowPieces((p) => !p)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          showPieces ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        {showPieces ? 'Hide Demo Pieces' : 'Show Demo Pieces'}
      </button>

      {/* Board */}
      <div className="w-full max-w-3xl">
        <HexBoard
          board={state.board}
          hexSize={50}
          buildings={showPieces ? generateDemoBuildings(state.board) : undefined}
          roads={showPieces ? generateDemoRoads(state.board) : undefined}
        />
      </div>
    </div>
  );
}

function ScoreDisplay({ score }: { score: BalanceScore }) {
  return (
    <div className="flex gap-4 text-sm text-white/80">
      <ScoreBadge label="Balance" value={score.total} />
      <ScoreBadge label="Resource EV" value={score.resourceEV} />
      <ScoreBadge label="Intersections" value={score.intersectionBalance} />
      <ScoreBadge label="Spread" value={score.geographicSpread} />
    </div>
  );
}

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

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-white/50">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}
