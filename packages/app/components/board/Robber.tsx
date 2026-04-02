interface RobberProps {
  cx: number;
  cy: number;
  size?: number;
}

export function Robber({ cx, cy, size = 12 }: RobberProps) {
  return (
    <g>
      {/* Body */}
      <ellipse
        cx={cx}
        cy={cy + size * 0.15}
        rx={size * 0.45}
        ry={size * 0.65}
        fill="#1a1a1a"
        stroke="#444"
        strokeWidth={0.8}
      />
      {/* Head */}
      <circle
        cx={cx}
        cy={cy - size * 0.55}
        r={size * 0.3}
        fill="#1a1a1a"
        stroke="#444"
        strokeWidth={0.8}
      />
    </g>
  );
}
