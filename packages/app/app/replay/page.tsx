'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameBoard } from '@catan/shared';
import { vertexPixelPosition } from '@catan/game-engine';
import { hexToPixel, hexPolygonPoints, TERRAIN_COLORS } from '@/components/board/hex-utils';
import { NumberToken } from '@/components/board/NumberToken';
import { HarborMarker } from '@/components/board/HarborMarker';
import { runSimulation, type SimulationResult, type ReplayFrame } from '@/lib/run-simulation';

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#e5e5e5',
  orange: '#f97316', green: '#22c55e', brown: '#92400e',
};

const ACTION_ICONS: Record<string, string> = {
  'dice-roll': '🎲', 'build-settlement': '🏠', 'build-city': '🏙️', 'build-road': '🛤️',
  'buy-dev-card': '🃏', 'play-knight': '⚔️', 'play-monopoly': '💰', 'play-year-of-plenty': '🎁',
  'play-road-building': '🛤️', 'maritime-trade': '🚢', 'move-robber': '👤', 'steal': '💎',
  'discard': '🗑️', 'longest-road': '🛤️', 'largest-army': '⚔️', 'VICTORY': '👑',
  'setup-settlement': '🏠', 'setup-road': '🛤️', 'game-start': '🎮', 'end-turn': '⏭️',
};

export default function ReplayPage() {
  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Run simulation and auto-play targeting ~45 seconds
  useEffect(() => {
    const result = runSimulation('base-5-6');
    setSim(result);
    const targetMs = 45000;
    const autoSpeed = Math.max(10, Math.round(targetMs / result.frames.length));
    setSpeed(autoSpeed);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (playing && sim) {
      intervalRef.current = setInterval(() => {
        setFrameIdx((prev) => {
          if (prev >= sim.frames.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, sim, speed]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [frameIdx]);

  const regenerate = useCallback(() => {
    setPlaying(false);
    setFrameIdx(0);
    const result = runSimulation('base-5-6');
    setSim(result);
    const autoSpeed = Math.max(10, Math.round(45000 / result.frames.length));
    setSpeed(autoSpeed);
    setTimeout(() => setPlaying(true), 100);
  }, []);

  if (!sim) return <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">Simulerer spil...</div>;

  const frame = sim.frames[frameIdx];
  if (!frame) return null;

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a1525] border-b border-white/10">
        <h1 className="text-lg font-bold">Catan Replay — 6 Players</h1>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span>Turn {frame.turn}</span>
          <span>·</span>
          <span>Frame {frameIdx + 1}/{sim.frames.length}</span>
          <span>·</span>
          <span>{sim.totalTurns} turns total</span>
          <span>·</span>
          <span className="text-amber-400">Winner: {sim.winner}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Board */}
        <div className="flex-1 min-w-0 p-2 flex items-center justify-center overflow-hidden">
          <ReplayBoard board={sim.board} frame={frame} hexSize={42} />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-[#0a1525] border-l border-white/10 flex flex-col">
          {/* Scoreboard */}
          <div className="p-3 border-b border-white/10">
            <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Scoreboard</div>
            {frame.scores.map((s) => (
              <div key={s.name} className={`flex items-center gap-2 py-1 text-xs ${frame.winner === s.name ? 'text-amber-400 font-bold' : ''}`}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HEX[s.color] }} />
                <span className="flex-1">{s.name}</span>
                <span className="w-6 text-right font-mono">{s.vp}</span>
                <span className="text-white/30 w-16 text-right">
                  {s.settlements}s {s.cities}c {s.roads}r
                </span>
              </div>
            ))}
          </div>

          {/* Event log */}
          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {sim.frames.slice(0, frameIdx + 1).map((f, i) => (
              <div
                key={i}
                className={`text-xs py-0.5 px-1 rounded flex gap-1.5 items-start cursor-pointer hover:bg-white/5 ${i === frameIdx ? 'bg-white/10 text-white' : 'text-white/40'}`}
                onClick={() => { setPlaying(false); setFrameIdx(i); }}
              >
                <span className="text-white/20 w-6 text-right shrink-0">T{f.turn}</span>
                <span>{ACTION_ICONS[f.logEntry.action] ?? '·'}</span>
                <span style={{ color: COLOR_HEX[sim.players.find((p) => p.name === f.logEntry.player)?.color ?? ''] }}>
                  {f.logEntry.player}
                </span>
                <span className="text-white/50">{formatAction(f.logEntry)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#0a1525] border-t border-white/10">
        <button onClick={regenerate} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm cursor-pointer">
          Nyt Spil
        </button>
        <button
          onClick={() => setFrameIdx((i) => Math.max(0, i - 1))}
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer"
        >
          ◀
        </button>
        <button
          onClick={() => setPlaying(!playing)}
          className={`px-4 py-1 rounded font-medium cursor-pointer ${playing ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => setFrameIdx((i) => Math.min(sim.frames.length - 1, i + 1))}
          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer"
        >
          ▶
        </button>
        <input
          type="range"
          min={0}
          max={sim.frames.length - 1}
          value={frameIdx}
          onChange={(e) => { setPlaying(false); setFrameIdx(Number(e.target.value)); }}
          className="flex-1"
        />
        <div className="flex items-center gap-1 text-xs text-white/40">
          <span>Speed:</span>
          {[300, 150, 50, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded cursor-pointer ${speed === s ? 'bg-amber-600 text-white' : 'bg-white/10'}`}
            >
              {s === 300 ? '1x' : s === 150 ? '2x' : s === 50 ? '5x' : '🚀'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Replay Board (board + pieces overlay) ───────────────────────────────────

function ReplayBoard({ board, frame, hexSize }: { board: GameBoard; frame: ReplayFrame; hexSize: number }) {
  const hexPixels = board.hexes.map((h) => hexToPixel(h.coord.q, h.coord.r, hexSize));
  const padding = hexSize * 1.8;
  const allX = hexPixels.map((p) => p.x);
  const allY = hexPixels.map((p) => p.y);
  const minX = Math.min(...allX) - padding;
  const minY = Math.min(...allY) - padding;
  const maxX = Math.max(...allX) + padding;
  const maxY = Math.max(...allY) + padding;

  // Pre-compute vertex positions
  const vertexPos = new Map<string, { x: number; y: number }>();
  for (const v of board.vertices) {
    vertexPos.set(v.id, vertexPixelPosition(v, hexSize));
  }

  // Compute harbor positions
  const centroidX = allX.reduce((a, b) => a + b, 0) / allX.length;
  const centroidY = allY.reduce((a, b) => a + b, 0) / allY.length;
  const harborPositions = board.harbors.map((h) => {
    const a = vertexPos.get(h.vertexIds[0]);
    const b = vertexPos.get(h.vertexIds[1]);
    if (!a || !b) return null;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = mx - centroidX, dy = my - centroidY;
    const d = Math.sqrt(dx * dx + dy * dy);
    return { x: mx + (dx / d) * hexSize * 0.55, y: my + (dy / d) * hexSize * 0.55, type: h.type };
  }).filter(Boolean) as { x: number; y: number; type: string }[];

  // Robber hex position
  const robberPixel = hexToPixel(frame.robberPosition.q, frame.robberPosition.r, hexSize);

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="w-full h-full">
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="#0d47a1" rx={8} />

      {/* Hexes */}
      {board.hexes.map((hex, i) => {
        const c = hexPixels[i];
        const isSea = hex.terrain === 'sea';
        return (
          <g key={`h${i}`}>
            <polygon
              points={hexPolygonPoints(c, hexSize)}
              fill={TERRAIN_COLORS[hex.terrain] ?? '#888'}
              stroke={isSea ? '#1256a0' : '#8b7355'}
              strokeWidth={isSea ? 1 : 1.5}
              opacity={isSea ? 0.5 : 1}
            />
            {hex.number != null && <NumberToken cx={c.x} cy={c.y} number={hex.number} radius={hexSize * 0.24} />}
          </g>
        );
      })}

      {/* Harbors */}
      {harborPositions.map((h, i) => (
        <HarborMarker key={`hb${i}`} cx={h.x} cy={h.y} type={h.type as any} />
      ))}

      {/* Roads */}
      {board.edges.map((edge) => {
        const color = frame.roads.get(edge.id);
        if (!color) return null;
        const a = vertexPos.get(edge.vertexIds[0]);
        const b = vertexPos.get(edge.vertexIds[1]);
        if (!a || !b) return null;
        return (
          <line
            key={edge.id}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={COLOR_HEX[color] ?? '#888'}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        );
      })}

      {/* Buildings */}
      {board.vertices.map((v) => {
        const building = frame.buildings.get(v.id);
        if (!building) return null;
        const pos = vertexPos.get(v.id);
        if (!pos) return null;
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
      })}

      {/* Robber */}
      <g>
        <ellipse cx={robberPixel.x} cy={robberPixel.y + 3} rx={5} ry={8} fill="#111" stroke="#444" strokeWidth={0.8} />
        <circle cx={robberPixel.x} cy={robberPixel.y - 6} r={3.5} fill="#111" stroke="#444" strokeWidth={0.8} />
      </g>
    </svg>
  );
}

function formatAction(entry: ReplayFrame['logEntry']): string {
  switch (entry.action) {
    case 'dice-roll': return `rolled ${entry.details.d1}+${entry.details.d2}=${entry.details.total}`;
    case 'build-settlement': return 'built settlement';
    case 'build-city': return 'upgraded to city';
    case 'build-road': return 'built road';
    case 'buy-dev-card': return `bought ${entry.details.card}`;
    case 'play-knight': return `played knight (#${entry.details.knightsPlayed})`;
    case 'play-monopoly': return `monopoly ${entry.details.resource} (stole ${entry.details.stolen})`;
    case 'play-year-of-plenty': return `year of plenty`;
    case 'play-road-building': return 'road building';
    case 'maritime-trade': return `traded ${entry.details.ratio}:1 ${entry.details.give}→${entry.details.receive}`;
    case 'move-robber': return 'moved robber';
    case 'steal': return `stole ${entry.details.resource} from ${entry.details.from}`;
    case 'discard': return `discarded ${entry.details.count} cards`;
    case 'longest-road': return `longest road (${entry.details.length})`;
    case 'largest-army': return `largest army (${entry.details.knights})`;
    case 'VICTORY': return `WON with ${entry.details.vp} VP!`;
    case 'setup-settlement': return 'placed settlement';
    case 'setup-road': return 'placed road';
    case 'game-start': return 'game started';
    case 'end-turn': return 'ended turn';
    default: return entry.action;
  }
}
