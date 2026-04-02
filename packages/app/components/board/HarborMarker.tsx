import type { HarborType } from '@catan/shared';

interface HarborMarkerProps {
  cx: number;
  cy: number;
  type: HarborType;
  /** Rotation in degrees — sign post points toward land */
  rotation?: number;
  /** Hex size (radius) — marker width matches hex edge length */
  hexSize?: number;
}

const HARBOR_LABELS: Record<HarborType, string> = {
  '3:1': '3:1',
  lumber: '2:1',
  wool: '2:1',
  grain: '2:1',
  brick: '2:1',
  ore: '2:1',
};

const HARBOR_RESOURCE: Record<HarborType, string> = {
  '3:1': '⚓',
  lumber: '🪵',
  wool: '🐑',
  grain: '🌾',
  brick: '🧱',
  ore: '⛏️',
};

// Terrain-matching colors for resource harbor backgrounds
const HARBOR_BG: Record<HarborType, string> = {
  '3:1': '#4a5568',    // neutral grey
  lumber: '#2d6a30',   // forest green
  wool: '#5a9e2a',     // pasture green
  grain: '#d4952a',    // golden amber
  brick: '#b85c2a',    // terracotta
  ore: '#546e7a',      // slate grey
};

export function HarborMarker({ cx, cy, type, rotation = 0, hexSize = 50 }: HarborMarkerProps) {
  // Width = hex edge length (= hexSize), height scales proportionally
  const w = hexSize;
  const h = hexSize * 0.8;
  const scaleX = w / 50;
  const scaleY = h / 40;

  const bg = HARBOR_BG[type];

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation}) translate(${-w / 2}, ${-h / 2}) scale(${scaleX}, ${scaleY})`}>
      {/* Colored sign board with rounded corners */}
      <rect x="2" y="2" width="46" height="36" rx="4" fill={bg} stroke="#fff" strokeWidth="1.5" opacity="0.95" />
      {/* Resource emoji */}
      <text
        x="25"
        y="15"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
      >
        {HARBOR_RESOURCE[type]}
      </text>
      {/* Trade ratio — white text */}
      <text
        x="25"
        y="30"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="10"
        fontWeight="bold"
        fill="#ffffff"
      >
        {HARBOR_LABELS[type]}
      </text>
    </g>
  );
}
