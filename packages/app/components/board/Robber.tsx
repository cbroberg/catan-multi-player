interface RobberProps {
  cx: number;
  cy: number;
  size?: number;
}

export function Robber({ cx, cy, size = 12 }: RobberProps) {
  const w = size * 2.2;
  const h = size * 2.2;

  return (
    <image
      href="/tiles/robber.webp"
      x={cx - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
