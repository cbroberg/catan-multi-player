import type { HarborType } from '@catan/shared';

interface HarborMarkerProps {
  /** Center X of the harbor label */
  cx: number;
  /** Center Y of the harbor label */
  cy: number;
  type: HarborType;
  /** Angle from board center to position the dock lines */
  angle?: number;
}

const HARBOR_LABELS: Record<HarborType, string> = {
  '3:1': '3:1',
  lumber: '2:1 L',
  wool: '2:1 W',
  grain: '2:1 G',
  brick: '2:1 B',
  ore: '2:1 O',
};

const HARBOR_COLORS: Record<HarborType, string> = {
  '3:1': '#ffffff',
  lumber: '#2d6a30',
  wool: '#8bc34a',
  grain: '#fdd835',
  brick: '#d4852e',
  ore: '#78909c',
};

export function HarborMarker({ cx, cy, type }: HarborMarkerProps) {
  const bgColor = HARBOR_COLORS[type];
  const textColor = type === '3:1' || type === 'grain' ? '#333' : '#fff';

  return (
    <g>
      <rect
        x={cx - 14}
        y={cy - 8}
        width={28}
        height={16}
        rx={3}
        fill={bgColor}
        stroke="#8b7355"
        strokeWidth={1}
        opacity={0.9}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={7}
        fontWeight="bold"
        fill={textColor}
        fontFamily="sans-serif"
      >
        {HARBOR_LABELS[type]}
      </text>
    </g>
  );
}
