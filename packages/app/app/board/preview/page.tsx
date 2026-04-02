'use client';

import { useState, useCallback, useEffect } from 'react';
import type { GameBoard, BalanceScore } from '@catan/shared';
import { BOARD_VARIANTS } from '@catan/shared';
import { generateRandomBalancedBoard, generateBoardFromArrays, BEGINNER_PRESET } from '@catan/game-engine';
import { HexBoard } from '@/components/board/HexBoard';

const variantEntries = Object.values(BOARD_VARIANTS);

export default function BoardPreviewPage() {
  const [variantId, setVariantId] = useState('base-3-4');
  const [state, setState] = useState<{ board: GameBoard; score: BalanceScore } | null>(null);

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

      {/* Board */}
      <div className="w-full max-w-3xl">
        <HexBoard board={state.board} hexSize={50} />
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
