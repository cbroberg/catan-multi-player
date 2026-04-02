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
  lumber: '2:1 L',
  wool: '2:1 W',
  grain: '2:1 G',
  brick: '2:1 B',
  ore: '2:1 O',
};

const HARBOR_ICON: Record<HarborType, string> = {
  '3:1': '?',
  lumber: '\u2663', // club = tree
  wool: '\u2601',   // cloud = wool
  grain: '\u2660',  // spade = wheat
  brick: '\u25A0',  // square = brick
  ore: '\u25C6',    // diamond = ore
};

export function HarborMarker({ cx, cy, type, rotation = 0, hexSize = 50 }: HarborMarkerProps) {
  // Width = hex edge length (= hexSize), height scales proportionally
  const w = hexSize;
  const h = hexSize * 0.8;
  const scaleX = w / 50;
  const scaleY = h / 40;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation}) translate(${-w / 2}, ${-h / 2}) scale(${scaleX}, ${scaleY})`}>
      <defs>
        <linearGradient id="harbor-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6914" />
          <stop offset="30%" stopColor="#6d4c2e" />
          <stop offset="100%" stopColor="#5a3a1e" />
        </linearGradient>
        <linearGradient id="harbor-sign" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e6c8" />
          <stop offset="100%" stopColor="#e0cda5" />
        </linearGradient>
        <pattern id="harbor-grain" patternUnits="userSpaceOnUse" width="4" height="30">
          <rect width="4" height="30" fill="none" />
          <line x1="1" y1="0" x2="1.2" y2="30" stroke="#4a2a10" strokeWidth="0.4" opacity="0.3" />
          <line x1="3" y1="0" x2="2.8" y2="30" stroke="#4a2a10" strokeWidth="0.3" opacity="0.2" />
        </pattern>
      </defs>
      {/* Post */}
      <rect x="23" y="0" width="4" height="8" fill="url(#harbor-wood)" rx="1" />
      <rect x="23" y="0" width="4" height="8" fill="url(#harbor-grain)" rx="1" />
      {/* Cross beam */}
      <rect x="8" y="6" width="34" height="3.5" fill="url(#harbor-wood)" rx="1" />
      <rect x="8" y="6" width="34" height="3.5" fill="url(#harbor-grain)" rx="1" />
      {/* Chains */}
      <line x1="14" y1="9.5" x2="14" y2="13" stroke="#8b7a5e" strokeWidth="0.8" />
      <line x1="36" y1="9.5" x2="36" y2="13" stroke="#8b7a5e" strokeWidth="0.8" />
      {/* Sign board */}
      <rect x="6" y="13" width="38" height="22" rx="2" fill="url(#harbor-sign)" stroke="url(#harbor-wood)" strokeWidth="1.5" />
      <rect x="6" y="13" width="38" height="22" rx="2" fill="url(#harbor-grain)" opacity="0.15" />
      {/* Trade ratio text */}
      <text
        x="25"
        y="25"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="10"
        fontWeight="bold"
        fill="#5a3a1e"
      >
        {HARBOR_LABELS[type]}
      </text>
      {/* Resource icon */}
      <text
        x="25"
        y="33"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Georgia, serif"
        fontSize="6"
        fill="#8b6914"
      >
        {HARBOR_ICON[type]}
      </text>
      {/* Corner nails */}
      <circle cx="10" cy="17" r="1" fill="#a0895e" />
      <circle cx="40" cy="17" r="1" fill="#a0895e" />
      <circle cx="10" cy="31" r="1" fill="#a0895e" />
      <circle cx="40" cy="31" r="1" fill="#a0895e" />
    </g>
  );
}
