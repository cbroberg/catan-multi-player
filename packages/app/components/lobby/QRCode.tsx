'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeSVGProps {
  url: string;
  size?: number;
}

export function QRCodeSVG({ url, size = 200 }: QRCodeSVGProps) {
  const [svgData, setSvgData] = useState<string>('');

  useEffect(() => {
    QRCode.toString(url, {
      type: 'svg',
      width: size,
      margin: 1,
      color: { dark: '#fbbf24', light: '#00000000' },
    }).then(setSvgData);
  }, [url, size]);

  if (!svgData) return <div style={{ width: size, height: size }} />;

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svgData }}
      style={{ width: size, height: size }}
    />
  );
}
