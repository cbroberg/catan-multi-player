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

  return (
    <g>
      {/* Token background circle */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="#f5f0e1"
        stroke="#8b7355"
        strokeWidth={1.5}
      />
      {/* Number */}
      <text
        x={cx}
        y={cy - 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius * 0.9}
        fontWeight={isRed ? 'bold' : 'normal'}
        fill={isRed ? '#c62828' : '#3e2723'}
        fontFamily="serif"
      >
        {number}
      </text>
      {/* Pip dots */}
      <g>
        {Array.from({ length: pips }, (_, i) => {
          const dotSpacing = 3.5;
          const totalWidth = (pips - 1) * dotSpacing;
          const dotX = cx - totalWidth / 2 + i * dotSpacing;
          const dotY = cy + radius * 0.55;
          return (
            <circle
              key={i}
              cx={dotX}
              cy={dotY}
              r={1.3}
              fill={isRed ? '#c62828' : '#5d4037'}
            />
          );
        })}
      </g>
    </g>
  );
}
