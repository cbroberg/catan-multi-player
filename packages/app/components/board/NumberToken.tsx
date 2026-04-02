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
      <defs>
        <radialGradient id="nt-bg" cx="0.45" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#f5e6c8" />
          <stop offset="60%" stopColor="#e8d5b0" />
          <stop offset="100%" stopColor="#d4c098" />
        </radialGradient>
        <pattern id="nt-parchment" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="none" />
          <circle cx="1" cy="2" r="0.3" fill="#c4a870" opacity="0.3" />
          <circle cx="4" cy="5" r="0.2" fill="#c4a870" opacity="0.25" />
          <circle cx="3" cy="1" r="0.25" fill="#c4a870" opacity="0.2" />
        </pattern>
      </defs>
      {/* Shadow */}
      <circle cx={cx} cy={cy + 1} r={radius} fill="#000" opacity="0.2" />
      {/* Token body with radial gradient */}
      <circle cx={cx} cy={cy} r={radius} fill="url(#nt-bg)" stroke="#a0895e" strokeWidth={1.2} />
      {/* Parchment texture */}
      <circle cx={cx} cy={cy} r={radius} fill="url(#nt-parchment)" />
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={radius * 0.83} fill="none" stroke="#b8a070" strokeWidth={0.5} opacity="0.5" />
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
      {/* Subtle wear marks */}
      <circle cx={cx - radius * 0.55} cy={cy - radius * 0.42} r={radius * 0.2} fill="#c4a870" opacity="0.1" />
      <circle cx={cx + radius * 0.42} cy={cy + radius * 0.28} r={radius * 0.17} fill="#c4a870" opacity="0.08" />
    </g>
  );
}
