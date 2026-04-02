'use client';

import type { TerrainType } from '@catan/shared';

interface TerrainHexSVGProps {
  terrain: TerrainType;
  x: number;
  y: number;
  size: number;
}

// ─── Config flags ─────────────────────────────────────────────────────────
const SHOW_HEX_BORDER = false;    // Golden metallic border around each hex
const SHOW_FALLBACK_FILL = true;  // Solid color behind image (covers gaps)

// Flat-top hex polygon in 100x86.6 viewBox, centered at (50, 43.3), radius 50
const HEX_POINTS = '100,43.3 75,86.6 25,86.6 0,43.3 25,0 75,0';

// Fallback colors matching each terrain (visible in hex corners where image doesn't cover)
const TERRAIN_FILL: Record<TerrainType, string> = {
  forest: '#2d6a30',
  pasture: '#8bc34a',
  fields: '#fdd835',
  hills: '#d4852e',
  mountains: '#78909c',
  desert: '#f5e6c8',
  sea: '#0d47a1',
  gold_river: '#ffc107',
};

// High-res terrain tile images (WebP, ~30KB each)
const TILE_URLS: Record<TerrainType, string> = {
  forest: '/tiles/forest.webp',
  pasture: '/tiles/pasture.webp',
  fields: '/tiles/fields.webp',
  hills: '/tiles/hills.webp',
  mountains: '/tiles/mountains.webp',
  desert: '/tiles/desert.webp',
  sea: '/tiles/sea.webp',
  gold_river: '/tiles/gold_river.webp',
};

export function TerrainHexSVG({ terrain, x, y, size }: TerrainHexSVGProps) {
  const width = size * 2;
  const height = size * Math.sqrt(3);
  const svgX = x - width / 2;
  const svgY = y - height / 2;

  // Sea uses inline SVG for crisp vector waves; land uses high-res images
  if (terrain === 'sea') {
    return (
      <g transform={`translate(${svgX}, ${svgY})`}>
        <svg viewBox="0 0 100 86.6" width={width} height={height} overflow="visible">
          <SeaTerrain />
        </svg>
      </g>
    );
  }

  // Unique clip ID per hex position to avoid conflicts
  const clipId = `hex-clip-${Math.round(x)}-${Math.round(y)}`;

  return (
    <g transform={`translate(${svgX}, ${svgY})`}>
      <svg viewBox="0 0 100 86.6" width={width} height={height} overflow="visible">
        <defs>
          <clipPath id={clipId}>
            <polygon points={HEX_POINTS} />
          </clipPath>
        </defs>
        {/* Solid color fill behind image to cover any gaps */}
        {SHOW_FALLBACK_FILL && <polygon points={HEX_POINTS} fill={TERRAIN_FILL[terrain]} />}
        {/* High-res terrain image clipped to hex shape */}
        <image
          href={TILE_URLS[terrain]}
          x="-18"
          y="-18"
          width="136"
          height="122.6"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
        {/* Golden border (toggle via SHOW_HEX_BORDER) */}
        {SHOW_HEX_BORDER && (
          <polygon points={HEX_POINTS} fill="none" stroke="#b8963a" strokeWidth="1" opacity="0.6" />
        )}
      </svg>
    </g>
  );
}

// ─── SVG Sea Terrain ──────────────────────────────────────────────────────

function SeaTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="sea-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#97a6af" />
          <stop offset="50%" stopColor="#87969f" />
          <stop offset="100%" stopColor="#778690" />
        </linearGradient>
      </defs>
      <polygon points={HEX_POINTS} fill="url(#sea-bg)" stroke="#6a7880" strokeWidth="1" />
      <g opacity="0.3" fill="none" stroke="#a8b8c0" strokeWidth="1">
        <path d="M22,18 Q32,14 42,18 Q52,22 62,18 Q72,14 78,18" />
        <path d="M12,32 Q22,28 32,32 Q42,36 52,32 Q62,28 72,32 Q82,36 88,32" />
        <path d="M5,44 Q15,40 30,44 Q45,48 55,44 Q65,40 75,44 Q85,48 95,44" />
        <path d="M12,56 Q22,52 32,56 Q42,60 52,56 Q62,52 72,56 Q82,60 88,56" />
        <path d="M22,70 Q32,66 42,70 Q52,74 62,70 Q72,66 78,70" />
      </g>
      <g opacity="0.2" fill="none" stroke="#c0d0d8" strokeWidth="0.6">
        <path d="M30,17 Q38,14 46,17" />
        <path d="M42,31 Q50,28 58,31" />
        <path d="M25,43 Q33,40 41,43" />
        <path d="M55,55 Q63,52 71,55" />
        <path d="M35,69 Q43,66 51,69" />
      </g>
      <ellipse cx="40" cy="38" rx="10" ry="5" fill="#6a7880" opacity="0.15" />
      <ellipse cx="60" cy="52" rx="8" ry="4" fill="#6a7880" opacity="0.1" />
      <g opacity="0.12" fill="#d0e0e8">
        <circle cx="35" cy="20" r="0.5" />
        <circle cx="55" cy="32" r="0.4" />
        <circle cx="40" cy="55" r="0.5" />
        <circle cx="65" cy="44" r="0.3" />
      </g>
    </>
  );
}
