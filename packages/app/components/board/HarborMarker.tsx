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

// Terrain tile images used as harbor marker backgrounds
const HARBOR_TILE: Record<HarborType, string> = {
  '3:1': '/tiles/sea.webp',
  lumber: '/tiles/forest.webp',
  wool: '/tiles/pasture.webp',
  grain: '/tiles/fields.webp',
  brick: '/tiles/hills.webp',
  ore: '/tiles/mountains.webp',
};

export function HarborMarker({ cx, cy, type, rotation = 0, hexSize = 50 }: HarborMarkerProps) {
  // Width = hex edge length (= hexSize), height scales proportionally
  const w = hexSize;
  const h = hexSize * 0.8;
  const scaleX = w / 50;
  const scaleY = h / 40;

  const clipId = `harbor-clip-${Math.round(cx)}-${Math.round(cy)}`;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation}) translate(${-w / 2}, ${-h / 2}) scale(${scaleX}, ${scaleY})`}>
      <defs>
        <clipPath id={clipId}>
          <rect x="2" y="2" width="46" height="36" rx="4" />
        </clipPath>
      </defs>
      {/* Terrain image cropped into the sign shape */}
      <image
        href={HARBOR_TILE[type]}
        x="-10"
        y="-10"
        width="70"
        height="56"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      {/* Dark overlay for text readability */}
      <rect x="2" y="2" width="46" height="36" rx="4" fill="black" opacity="0.35" />
      {/* White border */}
      <rect x="2" y="2" width="46" height="36" rx="4" fill="none" stroke="#fff" strokeWidth="1.5" />
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
      {/* Trade ratio — white text with shadow */}
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
