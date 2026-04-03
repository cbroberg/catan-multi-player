import { NUMBER_PIPS } from './hex-utils';

interface NumberTokenProps {
  cx: number;
  cy: number;
  number: number;
  radius?: number;
}

export function NumberToken({ cx, cy, number, radius = 14 }: NumberTokenProps) {
  const isRed = number === 6 || number === 8;
  const pips = NUMBER_PIPS[number] ?? 0;
  const size = radius * 2.2;

  return (
    <g>
      {/* Shadow */}
      <circle cx={cx} cy={cy + 1} r={radius} fill="#000" opacity="0.2" />
      {/* Hires token background */}
      <image
        href="/tiles/number-token.webp"
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
      {/* Number */}
      <text
        x={cx}
        y={cy - 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius * 0.9}
        fontWeight={isRed ? 'bold' : 'normal'}
        fill={isRed ? '#c62828' : '#2c1810'}
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        {number}
      </text>
      {/* Pips removed — not used in physical Catan */}
    </g>
  );
}
