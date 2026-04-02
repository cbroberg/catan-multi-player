const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, 'board/hires/cards.png');
const OUT = path.join(__dirname, 'board/hires/sliced');

// Image is 2816 x 1536
// 3 rows of assets, with padding/borders around them
// Row 1: 5 resource cards (roughly equal width)
// Row 2: 6 dev cards (5 + back)
// Row 3: token, harbor, robber, pirate, settlement, city, road, 2 dice

// Let's extract each piece with generous bounds, then we trim later

const pieces = [
  // ── Row 1: Resource Cards (y ≈ 20-470) ──
  { name: 'card-lumber',    left: 18,   top: 18,  width: 420, height: 480 },
  { name: 'card-brick',     left: 460,  top: 18,  width: 420, height: 480 },
  { name: 'card-wool',      left: 900,  top: 18,  width: 420, height: 480 },
  { name: 'card-grain',     left: 1340, top: 18,  width: 420, height: 480 },
  { name: 'card-ore',       left: 1780, top: 18,  width: 420, height: 480 },

  // ── Row 2: Dev Cards (y ≈ 520-1000) ──
  { name: 'devcard-knight',         left: 18,   top: 520, width: 420, height: 480 },
  { name: 'devcard-victory-point',  left: 460,  top: 520, width: 420, height: 480 },
  { name: 'devcard-road-building',  left: 900,  top: 520, width: 420, height: 480 },
  { name: 'devcard-year-of-plenty', left: 1340, top: 520, width: 420, height: 480 },
  { name: 'devcard-monopoly',       left: 1780, top: 520, width: 420, height: 480 },
  { name: 'devcard-back',           left: 2220, top: 520, width: 420, height: 480 },

  // ── Row 3: Tokens, Pieces, Dice (y ≈ 1040-1500) ──
  { name: 'number-token',    left: 18,   top: 1040, width: 300, height: 300 },
  { name: 'harbor-marker',   left: 340,  top: 1040, width: 300, height: 300 },
  { name: 'robber',          left: 680,  top: 1040, width: 300, height: 380 },
  { name: 'pirate',          left: 1000, top: 1040, width: 340, height: 380 },
  { name: 'settlement',      left: 1360, top: 1040, width: 300, height: 380 },
  { name: 'city',            left: 1680, top: 1040, width: 300, height: 380 },
  { name: 'road',            left: 2000, top: 1040, width: 340, height: 300 },
  { name: 'dice',            left: 2360, top: 1040, width: 420, height: 380 },
];

async function main() {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });

  const img = sharp(SRC);

  for (const piece of pieces) {
    const outPath = path.join(OUT, `${piece.name}.png`);
    try {
      await sharp(SRC)
        .extract({
          left: piece.left,
          top: piece.top,
          width: Math.min(piece.width, 2816 - piece.left),
          height: Math.min(piece.height, 1536 - piece.top),
        })
        .trim()  // auto-trim transparent/dark borders
        .png()
        .toFile(outPath);

      const meta = await sharp(outPath).metadata();
      console.log(`✓ ${piece.name}.png  (${meta.width}×${meta.height})`);
    } catch (err) {
      console.error(`✗ ${piece.name}: ${err.message}`);
    }
  }

  console.log(`\nDone! Sliced ${pieces.length} assets to ${OUT}`);
}

main();
