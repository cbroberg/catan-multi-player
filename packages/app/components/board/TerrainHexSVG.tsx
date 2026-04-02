'use client';

import type { ReactNode } from 'react';
import type { TerrainType } from '@catan/shared';

interface TerrainHexSVGProps {
  terrain: TerrainType;
  x: number;
  y: number;
  size: number;
}

export function TerrainHexSVG({ terrain, x, y, size }: TerrainHexSVGProps) {
  const width = size * 2;
  const height = size * Math.sqrt(3);
  const svgX = x - width / 2;
  const svgY = y - height / 2;

  return (
    <g transform={`translate(${svgX}, ${svgY})`}>
      <svg viewBox="0 0 100 86.6" width={width} height={height} overflow="visible">
        {renderTerrain(terrain)}
      </svg>
    </g>
  );
}

// All terrain SVG content is inline JSX with prefixed IDs to avoid conflicts.

function renderTerrain(terrain: TerrainType): ReactNode {
  switch (terrain) {
    case 'forest': return <ForestTerrain />;
    case 'pasture': return <PastureTerrain />;
    case 'fields': return <FieldsTerrain />;
    case 'hills': return <HillsTerrain />;
    case 'mountains': return <MountainsTerrain />;
    case 'desert': return <DesertTerrain />;
    case 'sea': return <SeaTerrain />;
    case 'gold_river': return <GoldRiverTerrain />;
  }
}

// Flat-top hex polygon in 100x86.6 viewBox, centered at (50, 43.3), radius 50
// Corners: right, bottom-right, bottom-left, left, top-left, top-right
const HEX = "100,43.3 75,86.6 25,86.6 0,43.3 25,0 75,0";

function ForestTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="forest-bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#2d6a30" />
          <stop offset="50%" stopColor="#1e5424" />
          <stop offset="100%" stopColor="#163d1a" />
        </linearGradient>
        <linearGradient id="forest-tree-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a8040" />
          <stop offset="100%" stopColor="#1a4a1e" />
        </linearGradient>
        <pattern id="forest-floor" patternUnits="userSpaceOnUse" width="12" height="12">
          <rect width="12" height="12" fill="none" />
          <circle cx="2" cy="3" r="0.8" fill="#1a4a1e" opacity="0.4" />
          <circle cx="8" cy="7" r="0.6" fill="#1a4a1e" opacity="0.3" />
          <circle cx="5" cy="10" r="0.7" fill="#245a28" opacity="0.35" />
        </pattern>
      </defs>
      <polygon points={HEX} fill="url(#forest-bg)" stroke="#163d1a" strokeWidth="1.5" />
      <polygon points={HEX} fill="url(#forest-floor)" opacity="0.5" />
      {/* Back row trees — smaller, further back */}
      <g opacity="0.5">
        <polygon points="27,48 32,30 37,48" fill="#1a5020" />
        <polygon points="27,42 32,24 37,42" fill="#1e5a24" />
        <rect x="31" y="48" width="2" height="4" fill="#4a3520" />
        <polygon points="63,48 68,30 73,48" fill="#1a5020" />
        <polygon points="63,42 68,24 73,42" fill="#1e5a24" />
        <rect x="67" y="48" width="2" height="4" fill="#4a3520" />
      </g>
      {/* Front row trees — larger, closer */}
      <g>
        <polygon points="35,68 42,38 49,68" fill="url(#forest-tree-shade)" />
        <polygon points="36,60 42,32 48,60" fill="#2a7030" />
        <polygon points="37,52 42,26 47,52" fill="#348a3a" />
        <rect x="40.5" y="68" width="3" height="5" fill="#5a4030" />
        <polygon points="52,66 58,40 64,66" fill="url(#forest-tree-shade)" />
        <polygon points="53,58 58,34 63,58" fill="#287028" />
        <polygon points="54,52 58,30 62,52" fill="#308432" />
        <rect x="56.5" y="66" width="3" height="5" fill="#5a4030" />
        <polygon points="43,56 48,32 53,56" fill="url(#forest-tree-shade)" />
        <polygon points="44,48 48,28 52,48" fill="#267026" />
        <polygon points="45,42 48,24 51,42" fill="#2e8230" />
        <rect x="46.5" y="56" width="3" height="5" fill="#5a4030" />
      </g>
      <ellipse cx="50" cy="74" rx="20" ry="4" fill="#0a2a0e" opacity="0.25" />
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

function PastureTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="pasture-bg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#8bc34a" />
          <stop offset="40%" stopColor="#7cb342" />
          <stop offset="100%" stopColor="#689f38" />
        </linearGradient>
        <pattern id="pasture-grass" patternUnits="userSpaceOnUse" width="16" height="10">
          <rect width="16" height="10" fill="none" />
          <path d="M2,10 Q2,6 4,4" stroke="#9ccc65" strokeWidth="0.7" fill="none" opacity="0.5" />
          <path d="M6,10 Q7,5 5,3" stroke="#aed581" strokeWidth="0.6" fill="none" opacity="0.4" />
          <path d="M12,10 Q11,7 13,5" stroke="#9ccc65" strokeWidth="0.7" fill="none" opacity="0.5" />
        </pattern>
      </defs>
      <polygon points={HEX} fill="url(#pasture-bg)" stroke="#558b2f" strokeWidth="1.5" />
      <polygon points={HEX} fill="url(#pasture-grass)" />
      {/* Rolling hills */}
      <path d="M10,55 Q30,47 50,52 Q70,57 90,50" stroke="#7cb342" strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M15,64 Q35,56 55,60 Q72,64 85,58" stroke="#689f38" strokeWidth="1" fill="none" opacity="0.4" />
      {/* Sheep */}
      <g transform="translate(38,35)" opacity="0.35">
        <ellipse cx="0" cy="0" rx="5" ry="3.5" fill="#f5f5f0" />
        <circle cx="-4" cy="-1.5" r="2" fill="#f5f5f0" />
        <rect x="-3" y="2.5" width="1" height="2.5" fill="#666" rx="0.3" />
        <rect x="1" y="2.5" width="1" height="2.5" fill="#666" rx="0.3" />
      </g>
      <g transform="translate(62,48)" opacity="0.3">
        <ellipse cx="0" cy="0" rx="4.5" ry="3" fill="#f0f0e8" />
        <circle cx="4" cy="-1.5" r="1.8" fill="#f0f0e8" />
        <rect x="-2" y="2" width="1" height="2.2" fill="#666" rx="0.3" />
        <rect x="1.5" y="2" width="1" height="2.2" fill="#666" rx="0.3" />
      </g>
      <g transform="translate(48,60)" opacity="0.25">
        <ellipse cx="0" cy="0" rx="4" ry="2.8" fill="#ece8e0" />
        <circle cx="-3.5" cy="-1" r="1.6" fill="#ece8e0" />
        <rect x="-2" y="1.8" width="0.8" height="2" fill="#666" rx="0.3" />
        <rect x="1" y="1.8" width="0.8" height="2" fill="#666" rx="0.3" />
      </g>
      {/* Fence posts */}
      <g opacity="0.2" stroke="#6d4c2e" strokeWidth="0.8">
        <line x1="28" y1="22" x2="28" y2="28" />
        <line x1="34" y1="20" x2="34" y2="26" />
        <line x1="28" y1="24" x2="34" y2="22" />
      </g>
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

function FieldsTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="fields-bg" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#fdd835" />
          <stop offset="50%" stopColor="#f9c826" />
          <stop offset="100%" stopColor="#e8b520" />
        </linearGradient>
        <pattern id="fields-wheat-rows" patternUnits="userSpaceOnUse" width="8" height="20">
          <rect width="8" height="20" fill="none" />
          <line x1="4" y1="20" x2="4" y2="4" stroke="#c8960a" strokeWidth="0.6" opacity="0.3" />
          <line x1="4" y1="20" x2="3" y2="3" stroke="#c8960a" strokeWidth="0.4" opacity="0.2" />
        </pattern>
      </defs>
      <polygon points={HEX} fill="url(#fields-bg)" stroke="#c89b18" strokeWidth="1.5" />
      <polygon points={HEX} fill="url(#fields-wheat-rows)" />
      {/* Wheat stalks group 1 — left cluster */}
      <g opacity="0.7">
        <line x1="30" y1="68" x2="29" y2="38" stroke="#b8880a" strokeWidth="0.8" />
        <ellipse cx="28.5" cy="37" rx="2" ry="4" fill="#daa520" transform="rotate(-5,28.5,37)" />
        <line x1="35" y1="70" x2="36" y2="36" stroke="#b8880a" strokeWidth="0.8" />
        <ellipse cx="36.5" cy="35" rx="2" ry="4" fill="#daa520" transform="rotate(3,36.5,35)" />
        <line x1="40" y1="68" x2="39" y2="40" stroke="#b8880a" strokeWidth="0.8" />
        <ellipse cx="38.5" cy="39" rx="1.8" ry="3.5" fill="#d4a017" transform="rotate(-2,38.5,39)" />
      </g>
      {/* Wheat stalks group 2 — right cluster */}
      <g opacity="0.65">
        <line x1="55" y1="70" x2="54" y2="38" stroke="#b8880a" strokeWidth="0.8" />
        <ellipse cx="53.5" cy="37" rx="2" ry="4" fill="#daa520" transform="rotate(-4,53.5,37)" />
        <line x1="60" y1="68" x2="61" y2="34" stroke="#b8880a" strokeWidth="0.8" />
        <ellipse cx="61.5" cy="33" rx="2" ry="4" fill="#daa520" transform="rotate(5,61.5,33)" />
        <line x1="65" y1="70" x2="64" y2="40" stroke="#b8880a" strokeWidth="0.8" />
        <ellipse cx="63.5" cy="39" rx="1.8" ry="3.5" fill="#d4a017" transform="rotate(-3,63.5,39)" />
      </g>
      {/* Wheat stalks group 3 — center back */}
      <g opacity="0.55">
        <line x1="45" y1="58" x2="44" y2="28" stroke="#b8880a" strokeWidth="0.7" />
        <ellipse cx="43.5" cy="27" rx="1.8" ry="3.5" fill="#c89b18" transform="rotate(-6,43.5,27)" />
        <line x1="50" y1="56" x2="51" y2="26" stroke="#b8880a" strokeWidth="0.7" />
        <ellipse cx="51.5" cy="25" rx="1.8" ry="3.5" fill="#c89b18" transform="rotate(4,51.5,25)" />
      </g>
      <path d="M20,50 Q35,46 50,50 Q65,54 80,50" stroke="#c89b18" strokeWidth="0.8" fill="none" opacity="0.3" />
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

function HillsTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="hills-bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#d4852e" />
          <stop offset="50%" stopColor="#c07028" />
          <stop offset="100%" stopColor="#a85e20" />
        </linearGradient>
        <pattern id="hills-brick" patternUnits="userSpaceOnUse" width="14" height="8">
          <rect width="14" height="8" fill="none" />
          <rect x="0" y="0" width="6" height="3.5" rx="0.3" fill="#b86e28" opacity="0.3" stroke="#8b5a1e" strokeWidth="0.3" />
          <rect x="7" y="0" width="6" height="3.5" rx="0.3" fill="#c47830" opacity="0.3" stroke="#8b5a1e" strokeWidth="0.3" />
          <rect x="3.5" y="4" width="6" height="3.5" rx="0.3" fill="#b86e28" opacity="0.3" stroke="#8b5a1e" strokeWidth="0.3" />
          <rect x="10.5" y="4" width="3" height="3.5" rx="0.3" fill="#c47830" opacity="0.25" stroke="#8b5a1e" strokeWidth="0.3" />
        </pattern>
      </defs>
      <polygon points={HEX} fill="url(#hills-bg)" stroke="#8b5a1e" strokeWidth="1.5" />
      <polygon points={HEX} fill="url(#hills-brick)" />
      {/* Hills back */}
      <path d="M12,55 Q30,38 50,44 Q70,38 88,52" fill="#b86e28" opacity="0.5" />
      <path d="M12,55 Q30,38 50,44 Q70,38 88,52" fill="none" stroke="#8b5a1e" strokeWidth="0.8" opacity="0.4" />
      {/* Hills front */}
      <path d="M15,68 Q35,50 55,56 Q72,50 85,64" fill="#c47830" opacity="0.4" />
      <path d="M15,68 Q35,50 55,56 Q72,50 85,64" fill="none" stroke="#8b5a1e" strokeWidth="0.6" opacity="0.3" />
      {/* Brick kiln */}
      <g transform="translate(42,22)" opacity="0.5">
        <path d="M0,20 L0,8 Q8,0 16,8 L16,20 Z" fill="#a85e20" stroke="#8b4a18" strokeWidth="0.8" />
        <rect x="5" y="12" width="6" height="8" rx="1" fill="#3d1e08" opacity="0.6" />
        <rect x="6" y="14" width="4" height="5" rx="0.5" fill="#e85a10" opacity="0.4" />
        <circle cx="8" cy="4" r="2" fill="#8b5a1e" opacity="0.2" />
        <circle cx="10" cy="1" r="1.5" fill="#8b5a1e" opacity="0.15" />
      </g>
      <circle cx="28" cy="65" r="1.5" fill="#8b4a18" opacity="0.25" />
      <circle cx="70" cy="60" r="1.2" fill="#8b4a18" opacity="0.2" />
      <circle cx="40" cy="70" r="1" fill="#8b4a18" opacity="0.2" />
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

function MountainsTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="mtn-bg" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#90a4ae" />
          <stop offset="50%" stopColor="#78909c" />
          <stop offset="100%" stopColor="#607d8b" />
        </linearGradient>
        <linearGradient id="mtn-face" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#8a9ea8" />
          <stop offset="100%" stopColor="#546e7a" />
        </linearGradient>
        <linearGradient id="mtn-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cfd8dc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={HEX} fill="url(#mtn-bg)" stroke="#455a64" strokeWidth="1.5" />
      {/* Rock texture */}
      <g opacity="0.25">
        <path d="M22,58 L27,53 L30,60 L24,63 Z" fill="#546e7a" />
        <path d="M65,62 L70,56 L74,62 L68,66 Z" fill="#546e7a" />
        <path d="M40,68 L44,64 L48,70 L42,72 Z" fill="#546e7a" />
      </g>
      {/* Mountain back */}
      <polygon points="24,70 40,26 56,70" fill="url(#mtn-face)" opacity="0.7" />
      <polygon points="24,70 40,26 40,70" fill="#546e7a" opacity="0.3" />
      {/* Mountain front */}
      <polygon points="38,75 55,18 72,75" fill="url(#mtn-face)" />
      <polygon points="38,75 55,18 55,75" fill="#455a64" opacity="0.4" />
      {/* Snow caps */}
      <polygon points="35,34 40,26 45,34 42,36 38,35" fill="url(#mtn-snow)" opacity="0.6" />
      <polygon points="49,28 55,18 61,28 58,31 52,30" fill="url(#mtn-snow)" opacity="0.8" />
      <polygon points="51,26 55,18 59,26 57,28 53,27" fill="#fff" opacity="0.5" />
      {/* Ridge lines */}
      <line x1="55" y1="18" x2="72" y2="75" stroke="#37474f" strokeWidth="0.5" opacity="0.4" />
      <line x1="40" y1="26" x2="56" y2="70" stroke="#37474f" strokeWidth="0.4" opacity="0.3" />
      {/* Base rocks */}
      <g opacity="0.3">
        <circle cx="32" cy="72" r="2.5" fill="#546e7a" />
        <circle cx="66" cy="72" r="2" fill="#546e7a" />
        <circle cx="50" cy="76" r="1.8" fill="#607d8b" />
      </g>
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

function DesertTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="desert-bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#f5e6c8" />
          <stop offset="50%" stopColor="#e8d5b0" />
          <stop offset="100%" stopColor="#d4c49a" />
        </linearGradient>
        <pattern id="desert-sand" patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill="none" />
          <circle cx="2" cy="3" r="0.4" fill="#c4a870" opacity="0.4" />
          <circle cx="7" cy="6" r="0.3" fill="#c4a870" opacity="0.3" />
          <circle cx="5" cy="9" r="0.35" fill="#c4a870" opacity="0.35" />
          <circle cx="9" cy="1" r="0.3" fill="#c4a870" opacity="0.3" />
        </pattern>
      </defs>
      <polygon points={HEX} fill="url(#desert-bg)" stroke="#b8a47a" strokeWidth="1.5" />
      <polygon points={HEX} fill="url(#desert-sand)" />
      {/* Sand dunes */}
      <path d="M12,52 Q30,42 50,48 Q68,42 88,50" fill="#dcc8a0" opacity="0.5" />
      <path d="M12,52 Q30,42 50,48 Q68,42 88,50" fill="none" stroke="#c4a870" strokeWidth="0.8" opacity="0.4" />
      <path d="M18,64 Q40,54 58,58 Q72,54 82,62" fill="#d4bc95" opacity="0.4" />
      <path d="M18,64 Q40,54 58,58 Q72,54 82,62" fill="none" stroke="#c4a870" strokeWidth="0.6" opacity="0.3" />
      {/* Wind lines */}
      <g opacity="0.2" stroke="#b8a47a" strokeWidth="0.5">
        <path d="M30,30 Q40,28 47,30" fill="none" />
        <path d="M55,25 Q62,23 68,25" fill="none" />
        <path d="M35,70 Q45,68 52,70" fill="none" />
      </g>
      {/* Cracked earth */}
      <g opacity="0.15" stroke="#a08860" strokeWidth="0.6" fill="none">
        <path d="M42,38 L45,35 L49,37" />
        <path d="M45,35 L46,31" />
        <path d="M58,58 L61,55 L64,57" />
        <path d="M61,55 L62,52" />
      </g>
      {/* Small stones */}
      <circle cx="35" cy="58" r="1.2" fill="#b8a47a" opacity="0.3" />
      <circle cx="65" cy="50" r="0.9" fill="#b8a47a" opacity="0.25" />
      <circle cx="50" cy="68" r="1" fill="#b8a47a" opacity="0.2" />
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

function SeaTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="sea-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1565c0" />
          <stop offset="50%" stopColor="#0d47a1" />
          <stop offset="100%" stopColor="#0a3d8f" />
        </linearGradient>
      </defs>
      <polygon points={HEX} fill="url(#sea-bg)" stroke="#0a3680" strokeWidth="1.5" />
      {/* Wave patterns — narrower at top/bottom, wider at middle */}
      <g opacity="0.4" fill="none" stroke="#2979b3" strokeWidth="1">
        <path d="M22,18 Q32,14 42,18 Q52,22 62,18 Q72,14 78,18" />
        <path d="M12,32 Q22,28 32,32 Q42,36 52,32 Q62,28 72,32 Q82,36 88,32" />
        <path d="M5,44 Q15,40 30,44 Q45,48 55,44 Q65,40 75,44 Q85,48 95,44" />
        <path d="M12,56 Q22,52 32,56 Q42,60 52,56 Q62,52 72,56 Q82,60 88,56" />
        <path d="M22,70 Q32,66 42,70 Q52,74 62,70 Q72,66 78,70" />
      </g>
      {/* Wave crests */}
      <g opacity="0.2" fill="none" stroke="#64b5f6" strokeWidth="0.6">
        <path d="M30,17 Q38,14 46,17" />
        <path d="M42,31 Q50,28 58,31" />
        <path d="M25,43 Q33,40 41,43" />
        <path d="M55,55 Q63,52 71,55" />
        <path d="M35,69 Q43,66 51,69" />
      </g>
      {/* Deep water */}
      <ellipse cx="40" cy="38" rx="10" ry="5" fill="#0a3680" opacity="0.2" />
      <ellipse cx="60" cy="52" rx="8" ry="4" fill="#0a3680" opacity="0.15" />
      {/* Foam specks */}
      <g opacity="0.15" fill="#b3d9f7">
        <circle cx="35" cy="20" r="0.5" />
        <circle cx="55" cy="32" r="0.4" />
        <circle cx="40" cy="55" r="0.5" />
        <circle cx="65" cy="44" r="0.3" />
      </g>
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}

function GoldRiverTerrain() {
  return (
    <>
      <defs>
        <linearGradient id="gold-bg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ffc107" />
          <stop offset="40%" stopColor="#f0a800" />
          <stop offset="100%" stopColor="#d49000" />
        </linearGradient>
        <linearGradient id="gold-river-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffd54f" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffecb3" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffd54f" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <polygon points={HEX} fill="url(#gold-bg)" stroke="#b87800" strokeWidth="1.5" />
      {/* River path — flows from upper-left to lower-right within flat-top hex */}
      <path d="M35,12 Q28,28 42,38 Q56,48 45,60 Q35,70 48,80" fill="none" stroke="url(#gold-river-water)" strokeWidth="8" strokeLinecap="round" />
      <path d="M35,12 Q28,28 42,38 Q56,48 45,60 Q35,70 48,80" fill="none" stroke="#ffd54f" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      {/* River banks */}
      <path d="M31,12 Q24,28 38,38 Q52,48 41,60 Q31,70 44,80" fill="none" stroke="#b87800" strokeWidth="1" opacity="0.4" />
      <path d="M39,12 Q32,28 46,38 Q60,48 49,60 Q39,70 52,80" fill="none" stroke="#b87800" strokeWidth="1" opacity="0.4" />
      {/* Gold shimmer */}
      <g opacity="0.6">
        <circle cx="33" cy="22" r="1.5" fill="#fff8e1" />
        <circle cx="42" cy="38" r="1.2" fill="#fff8e1" />
        <circle cx="48" cy="50" r="1" fill="#fff8e1" />
        <circle cx="40" cy="64" r="1.3" fill="#fff8e1" />
        <circle cx="46" cy="76" r="1.1" fill="#fff8e1" />
      </g>
      {/* Sparkles */}
      <g opacity="0.4">
        <path d="M62,28 L64,26 L66,28 L64,30 Z" fill="#fff8e1" />
        <path d="M68,44 L69.5,42.5 L71,44 L69.5,45.5 Z" fill="#fff8e1" />
        <path d="M58,60 L59.5,58.5 L61,60 L59.5,61.5 Z" fill="#fff8e1" />
        <path d="M25,46 L26.5,44.5 L28,46 L26.5,47.5 Z" fill="#fff8e1" />
      </g>
      {/* Gold nuggets */}
      <g opacity="0.5">
        <ellipse cx="64" cy="34" rx="2.5" ry="1.5" fill="#d4a000" transform="rotate(15,64,34)" />
        <ellipse cx="22" cy="42" rx="2" ry="1.2" fill="#d4a000" transform="rotate(-10,22,42)" />
        <ellipse cx="62" cy="56" rx="1.8" ry="1" fill="#d4a000" transform="rotate(8,62,56)" />
      </g>
      {/* Terrain texture */}
      <g opacity="0.15">
        <circle cx="68" cy="24" r="0.8" fill="#8a6500" />
        <circle cx="20" cy="36" r="0.6" fill="#8a6500" />
        <circle cx="72" cy="48" r="0.7" fill="#8a6500" />
        <circle cx="55" cy="70" r="0.5" fill="#8a6500" />
      </g>
      <polygon points={HEX} fill="none" stroke="#0e1a2e" strokeWidth="0.5" opacity="0.3" />
    </>
  );
}
