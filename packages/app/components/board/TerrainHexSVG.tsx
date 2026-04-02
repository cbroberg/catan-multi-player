'use client';

import type { TerrainType } from '@catan/shared';

interface TerrainHexSVGProps {
  terrain: TerrainType;
  x: number;
  y: number;
  size: number;
}

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
        <polygon points={HEX_POINTS} fill={TERRAIN_FILL[terrain]} />
        {/* High-res terrain image clipped to hex shape.
            Image is zoomed in slightly (-10 offset, 120 size) to crop out
            the pointy-top hex border baked into the source images. */}
        <image
          href={TILE_URLS[terrain]}
          x="-10"
          y="-10"
          width="120"
          height="106.6"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
        {/* Subtle golden border */}
        <polygon
          points={HEX_POINTS}
          fill="none"
          stroke="#b8963a"
          strokeWidth="1"
          opacity="0.6"
        />
      </svg>
    </g>
  );
}
