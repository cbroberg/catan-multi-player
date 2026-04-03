'use client';

// ─── Color utilities ─────────────────────────────────────────────────────────

/** Parse hex color to RGB */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

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
  const s = size * 1.2;
  const filterId = `tint-s-${Math.round(x)}-${Math.round(y)}`;
  const { r, g, b } = hexToRgb(color);

  return (
    <g>
      <defs>
        <filter id={filterId}>
          {/* Tint: blend the grayscale image toward player color */}
          <feColorMatrix type="matrix" values={`
            ${0.2 + r / 255 * 0.8} ${0.05 * (1 - r / 255)} 0 0 ${r / 255 * 0.25}
            ${0.05 * (1 - g / 255)} ${0.2 + g / 255 * 0.8} 0 0 ${g / 255 * 0.25}
            ${0.05 * (1 - b / 255)} 0 ${0.2 + b / 255 * 0.8} 0 ${b / 255 * 0.25}
            0 0 0 1 0
          `} />
        </filter>
      </defs>
      {/* Player color base ring */}
      <ellipse cx={x} cy={y + s * 0.15} rx={s * 0.5} ry={s * 0.25} fill={color} opacity="0.9" />
      <ellipse cx={x} cy={y + s * 0.15} rx={s * 0.5} ry={s * 0.25} fill="none" stroke={darken(color, 0.6)} strokeWidth="1" />
      {/* Tinted settlement image — nudged down to sit on base */}
      <image
        href="/tiles/settlement.webp"
        x={x - s / 2}
        y={y - s / 2 - s * 0.08}
        width={s}
        height={s}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${filterId})`}
      />
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
  const s = size * 1.3;
  const filterId = `tint-c-${Math.round(x)}-${Math.round(y)}`;
  const { r, g, b } = hexToRgb(color);

  return (
    <g>
      <defs>
        <filter id={filterId}>
          <feColorMatrix type="matrix" values={`
            ${0.2 + r / 255 * 0.8} ${0.05 * (1 - r / 255)} 0 0 ${r / 255 * 0.25}
            ${0.05 * (1 - g / 255)} ${0.2 + g / 255 * 0.8} 0 0 ${g / 255 * 0.25}
            ${0.05 * (1 - b / 255)} 0 ${0.2 + b / 255 * 0.8} 0 ${b / 255 * 0.25}
            0 0 0 1 0
          `} />
        </filter>
      </defs>
      {/* Player color base ring */}
      <ellipse cx={x} cy={y + s * 0.15} rx={s * 0.55} ry={s * 0.28} fill={color} opacity="0.9" />
      <ellipse cx={x} cy={y + s * 0.15} rx={s * 0.55} ry={s * 0.28} fill="none" stroke={darken(color, 0.6)} strokeWidth="1.2" />
      {/* Tinted city image — nudged down to sit on base */}
      <image
        href="/tiles/city.webp"
        x={x - s / 2}
        y={y - s / 2 - s * 0.15}
        width={s}
        height={s}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${filterId})`}
      />
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

  // Compute angle and length for the road segment (75% of edge, centered)
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fullLength = Math.sqrt(dx * dx + dy * dy);
  const length = fullLength * 0.75;
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
