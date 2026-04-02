import type { HarborType } from '@catan/shared';

interface HarborMarkerProps {
  cx: number;
  cy: number;
  type: HarborType;
}

const HARBOR_LABELS: Record<HarborType, string> = {
  '3:1': '3:1',
  lumber: '2:1 L',
  wool: '2:1 W',
  grain: '2:1 G',
  brick: '2:1 B',
  ore: '2:1 O',
};

export function HarborMarker({ cx, cy, type }: HarborMarkerProps) {
  const w = 32;
  const h = 26;

  return (
    <g>
      {/* High-res harbor sign background */}
      <image
        href="/tiles/harbor-marker.webp"
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
      />
      {/* Trade ratio text overlay */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="7"
        fontWeight="bold"
        fill="#3a2010"
      >
        {HARBOR_LABELS[type]}
      </text>
    </g>
  );
}
