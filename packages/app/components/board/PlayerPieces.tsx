'use client';

// ─── Color utilities ─────────────────────────────────────────────────────────

/** Darken a hex color by a factor (0 = black, 1 = original) */
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color towards white by a factor (0 = original, 1 = white) */
function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * factor).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * factor).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * factor).toString(16).padStart(2, '0')}`;
}

// ─── Settlement ──────────────────────────────────────────────────────────────

interface SettlementPieceProps {
  x: number;
  y: number;
  color: string;
  size?: number;
}

/**
 * Renders a styled settlement piece (house with roof, door, window, chimney).
 * The SVG design uses the provided player color with computed light/dark variants.
 */
export function SettlementPiece({ x, y, color, size = 14 }: SettlementPieceProps) {
  // The original SVG viewBox is 20x20, we scale to fit `size`
  const scale = size / 20;
  const dark = darken(color, 0.7);
  const darker = darken(color, 0.5);
  const light = lighten(color, 0.4);

  return (
    <g transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${scale})`}>
      {/* House body */}
      <rect x="4" y="10" width="12" height="8" fill={color} rx="0.5" />
      {/* Shadow side */}
      <rect x="10" y="10" width="6" height="8" fill="#000" opacity="0.15" rx="0.5" />
      {/* Roof */}
      <polygon points="2,10.5 10,3 18,10.5" fill={dark} stroke={darker} strokeWidth="0.4" />
      {/* Roof ridge highlight */}
      <line x1="10" y1="3" x2="10" y2="3.5" stroke={light} strokeWidth="0.5" opacity="0.5" />
      {/* Door */}
      <rect x="8" y="13" width="4" height="5" rx="1" fill={darker} opacity="0.5" />
      {/* Window */}
      <rect x="5.5" y="11.5" width="2" height="2" rx="0.3" fill="#fef3c7" opacity="0.6" />
      {/* Chimney */}
      <rect x="13" y="5" width="2" height="5.5" fill={dark} rx="0.3" />
      {/* Outlines for visibility */}
      <polygon points="2,10.5 10,3 18,10.5" fill="none" stroke={light} strokeWidth="0.3" opacity="0.3" />
      <rect x="4" y="10" width="12" height="8" fill="none" stroke={light} strokeWidth="0.3" opacity="0.2" rx="0.5" />
    </g>
  );
}

// ─── City ────────────────────────────────────────────────────────────────────

interface CityPieceProps {
  x: number;
  y: number;
  color: string;
  size?: number;
}

/**
 * Renders a styled city piece (castle with tower, battlements, windows).
 */
export function CityPiece({ x, y, color, size = 18 }: CityPieceProps) {
  const scale = size / 25;
  const dark = darken(color, 0.7);
  const darker = darken(color, 0.5);
  const light = lighten(color, 0.4);

  return (
    <g transform={`translate(${x - size / 2}, ${y - size * 0.46}) scale(${scale})`}>
      {/* Main building body */}
      <rect x="7" y="12" width="14" height="11" fill={color} rx="0.5" />
      <rect x="14" y="12" width="7" height="11" fill="#000" opacity="0.15" rx="0.5" />
      {/* Main roof */}
      <polygon points="5,12.5 14,6 23,12.5" fill={dark} stroke={darker} strokeWidth="0.4" />
      {/* Tower */}
      <rect x="2" y="7" width="7" height="16" fill={color} rx="0.5" />
      <rect x="5.5" y="7" width="3.5" height="16" fill="#000" opacity="0.12" rx="0.5" />
      {/* Tower roof */}
      <polygon points="1,7.5 5.5,1 10,7.5" fill={dark} stroke={darker} strokeWidth="0.4" />
      {/* Tower windows */}
      <rect x="3.5" y="9" width="2" height="2.5" rx="0.5" fill="#fef3c7" opacity="0.5" />
      <rect x="3.5" y="14" width="2" height="2" rx="0.3" fill="#fef3c7" opacity="0.4" />
      {/* Main building windows */}
      <rect x="9" y="13.5" width="2" height="2" rx="0.3" fill="#fef3c7" opacity="0.5" />
      <rect x="15" y="13.5" width="2" height="2" rx="0.3" fill="#fef3c7" opacity="0.4" />
      {/* Door */}
      <rect x="12" y="18" width="4" height="5" rx="1.2" fill={darker} opacity="0.5" />
      {/* Flag pole */}
      <line x1="5.5" y1="1" x2="5.5" y2="-1" stroke={darker} strokeWidth="0.5" />
      {/* Battlements */}
      <g fill={dark}>
        <rect x="2" y="6" width="1.5" height="2" rx="0.2" />
        <rect x="5" y="6" width="1.5" height="2" rx="0.2" />
        <rect x="8" y="6" width="1.5" height="2" rx="0.2" />
      </g>
      {/* Outlines */}
      <rect x="2" y="7" width="7" height="16" fill="none" stroke={light} strokeWidth="0.2" opacity="0.25" rx="0.5" />
      <rect x="7" y="12" width="14" height="11" fill="none" stroke={light} strokeWidth="0.2" opacity="0.2" rx="0.5" />
    </g>
  );
}

// ─── Road ────────────────────────────────────────────────────────────────────

interface RoadPieceProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
}

/**
 * Renders a styled road piece as a plank-textured line between two points.
 */
export function RoadPiece({ x1, y1, x2, y2, color, width = 4 }: RoadPieceProps) {
  const dark = darken(color, 0.7);
  const light = lighten(color, 0.4);

  // Compute angle and length for the road segment
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g transform={`translate(${mx}, ${my}) rotate(${angle})`}>
      {/* Road body */}
      <rect x={-length / 2} y={-width / 2} width={length} height={width} rx={width / 3} fill={color} />
      {/* Top highlight */}
      <rect x={-length / 2 + 1} y={-width / 2 + 0.3} width={length - 2} height={width * 0.3} rx={width / 4} fill={light} opacity="0.2" />
      {/* Wood plank lines */}
      <g stroke={dark} strokeWidth="0.3" opacity="0.3">
        {Array.from({ length: Math.floor(length / 6) }, (_, i) => {
          const px = -length / 2 + 4 + i * 6;
          return <line key={i} x1={px} y1={-width / 2 + 0.5} x2={px} y2={width / 2 - 0.5} />;
        })}
      </g>
      {/* Edge outline */}
      <rect x={-length / 2} y={-width / 2} width={length} height={width} rx={width / 3} fill="none" stroke={light} strokeWidth="0.2" opacity="0.2" />
    </g>
  );
}
