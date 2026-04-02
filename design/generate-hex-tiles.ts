#!/usr/bin/env node
/**
 * Generate high-fidelity hex tile images using Google Gemini Nano Banana 2.
 *
 * Usage:
 *   GEMINI_API_KEY=your-key npx tsx design/generate-hex-tiles.ts
 *
 * Requires: google-generativeai package
 *   pnpm add -D @google/genai
 */

import { GoogleGenAI } from '@google/genai';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Set GEMINI_API_KEY environment variable');
  process.exit(1);
}

const client = new GoogleGenAI({ apiKey: API_KEY });
const OUTPUT_DIR = join(import.meta.dirname, 'board', 'hires');
mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Base prompt ────────────────────────────────────────────────────────────

const BASE = `Top-down bird's-eye view of a single hexagonal board game tile.
The hexagon is flat-top oriented (wider left-to-right, with angled edges at top-left, top-right, bottom-left, bottom-right, and flat edges at the very left and very right).
Style: Premium hand-painted miniature board game art. Rich textures, warm lighting, subtle 3D depth and relief.
Think Catan 25th Anniversary Edition quality — painterly, tactile, inviting. NOT flat vector art, NOT photorealistic photography.
The hex fills the entire frame edge-to-edge. Dark navy background (#0e1a2e) visible only outside the hex shape.
Subtle golden metallic border along the hex edges.
No text, no numbers, no tokens, no icons, no UI — ONLY the terrain art filling the hexagonal shape.
Square image, 1024x1024 pixels.`;

// ─── Terrain prompts ────────────────────────────────────────────────────────

const TERRAINS: Record<string, string> = {
  forest: `${BASE}
TERRAIN: Dense coniferous and deciduous forest.
Lush tree canopy seen from above — individual pine and oak crowns visible, casting soft dappled shadows.
Dark mossy forest floor barely visible between trees. A few lighter birch trunks for contrast.
Atmospheric mist drifting between the trees. Rich depth.
Dominant colors: dark forest green (#1a4a1e), emerald (#2d6a30), moss (#3a5a2a), touches of brown bark.`,

  pasture: `${BASE}
TERRAIN: Rolling green pasture meadow.
Gentle hills with lush grass showing wind-swept texture — light and dark green patches.
2-3 small fluffy white sheep grazing peacefully. A rustic wooden fence crossing one corner.
Tiny wildflowers (yellow, white, purple) dotting the grass. Warm sunlit afternoon feeling.
Dominant colors: fresh green (#6abf3a), light green (#8bc34a), warm grass (#5a9e2a).`,

  fields: `${BASE}
TERRAIN: Golden wheat field ready for harvest.
Rows of ripe golden wheat stalks creating a beautiful striped pattern seen from above.
Some stalks gently bending in the wind. A narrow dirt path winding through.
Warm golden-hour afternoon light bathing everything. Rich amber and gold tones.
Dominant colors: gold (#e8b520), amber (#d4952a), warm wheat (#fdd835).`,

  hills: `${BASE}
TERRAIN: Terracotta clay hills with brick production.
Layered reddish-brown earth with visible geological strata and sediment layers.
A small rustic brick kiln with warm orange glow near center. Stacks of clay bricks nearby.
Raw clay deposits and quarried earth. Warm earthy Mediterranean feeling.
Dominant colors: terracotta (#c0622a), rust (#d4852e), dark clay (#a85420).`,

  mountains: `${BASE}
TERRAIN: Dramatic snow-capped mountain peaks.
Rugged grey and blue-tinted rock formations with sharp ridges and deep crevasses.
Pristine white snow on the highest peaks, exposed dark rock faces below.
A small mine entrance or cave visible in the rock. Glinting crystal/ore veins in the cliff.
Cold dramatic lighting with long shadows. Majestic and imposing.
Dominant colors: slate grey (#546e7a), blue-grey (#78909c), snow white (#e0e8f0).`,

  desert: `${BASE}
TERRAIN: Arid desert with sand dunes.
Smooth wind-sculpted sand dunes with beautiful ripple patterns seen from above.
Warm beige and tan tones. A few sun-bleached rocks breaking through the sand.
Cracked dry earth in one area. Subtle heat shimmer. Desolate but beautiful.
Sparse and empty — vast open feeling.
Dominant colors: warm sand (#e8d5b0), pale beige (#f5e6c8), dusty tan (#c4a870).`,

  sea: `${BASE}
TERRAIN: Deep ocean water.
Dark blue water with naturalistic wave patterns and scattered white foam crests.
Visible depth variation — darker mysterious center, slightly lighter translucent edges.
Gentle rolling wave texture. Oceanic and vast. Deep, mysterious water.
Dominant colors: deep navy (#0d47a1), ocean blue (#1565c0), dark abyss (#0a3680).`,

  gold_river: `${BASE}
TERRAIN: Enchanted river valley with golden waters.
A meandering river with shimmering gold-tinted water flowing through lush green banks.
Visible gold nuggets and sparkling particles in the shallow crystal-clear riverbed.
Rich tropical vegetation on the riverbanks. Magical, precious, enchanted atmosphere.
Warm golden light emanating from the water itself. Fantasy treasure feeling.
Dominant colors: rich gold (#ffc107), warm amber (#e8a800), magical shimmer (#fff3b0).`,
};

// ─── Generate ───────────────────────────────────────────────────────────────

async function generateTile(name: string, prompt: string): Promise<void> {
  console.log(`Generating ${name}...`);

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    // Extract image from response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const buffer = Buffer.from(part.inlineData.data!, 'base64');
          const ext = part.inlineData.mimeType.includes('png') ? 'png' : 'webp';
          const path = join(OUTPUT_DIR, `hex-${name}.${ext}`);
          writeFileSync(path, buffer);
          console.log(`  ✓ Saved ${path} (${(buffer.length / 1024).toFixed(0)}KB)`);
          return;
        }
      }
    }

    console.log(`  ✗ No image in response for ${name}`);
    // Log text response for debugging
    const text = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    if (text) console.log(`    Response: ${text.slice(0, 200)}`);
  } catch (err: any) {
    console.error(`  ✗ Error generating ${name}: ${err.message}`);
  }
}

async function main() {
  console.log('Generating high-fidelity hex tiles via Gemini...\n');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  for (const [name, prompt] of Object.entries(TERRAINS)) {
    await generateTile(name, prompt);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\nDone! Check design/board/hires/ for generated tiles.');
  console.log('Next step: clip to hex shape and integrate into TerrainHexSVG.tsx');
}

main();
