# Hex Tile Generation Prompt — High Fidelity SVG

> Brug denne prompt i Midjourney, DALL-E, Ideogram, eller anden AI billedgenerator.
> Generer ét billede per terrain-type, derefter clip til hex-form.

---

## Universal Prompt Template

```
Top-down view of a single hexagonal board game tile for a premium digital Catan game.
The tile represents [TERRAIN TYPE] terrain.
Style: Hand-painted miniature board game art, rich textures, warm lighting, slight 3D depth.
The art should feel like a high-end physical board game photographed from above — not flat vector art, not photorealistic.
Think Catan 25th Anniversary Edition or Terraforming Mars board quality.
The hexagon is flat-top oriented (wider left-right, pointed top-bottom edges are angled).
Dark navy background (#0e1a2e) surrounding the hex.
No text, no numbers, no tokens, no UI elements — just the terrain art filling the hexagonal shape.
The edges of the hex should have a subtle golden/bronze metallic border (1-2px).
Output as SVG or high-res PNG with transparent background outside the hex shape.
Aspect ratio: 100:86.6 (flat-top hexagon proportions).
```

---

## Per Terrain Type

### 1. Forest (produces Lumber)
```
[Base prompt] + 
Dense pine and oak forest seen from above. Mix of dark and emerald greens.
Visible tree canopy with individual tree crowns casting soft shadows.
Forest floor barely visible between the trees — dark mossy ground.
A few lighter birch trees for contrast. Subtle mist between the trees.
Color palette: dark forest green (#1a4a1e), emerald (#2d6a30), moss (#3a5a2a).
```

### 2. Pasture (produces Wool)
```
[Base prompt] + 
Rolling green meadow with gentle hills, seen from above.
2-3 small white sheep grazing. A rustic wooden fence crossing one corner.
Wildflowers dotting the grass — tiny yellow and white spots.
Lush grass with visible wind-swept texture and light/dark patches.
Color palette: fresh green (#6abf3a), light green (#8bc34a), grass (#5a9e2a).
```

### 3. Fields (produces Grain)
```
[Base prompt] + 
Golden wheat field ready for harvest, seen from above.
Parallel rows of ripe wheat stalks creating a striped pattern.
Some stalks bending in the wind. Rich amber and gold tones.
A small dirt path cutting through one edge. Warm afternoon light.
Color palette: golden (#e8b520), amber (#d4952a), wheat (#fdd835).
```

### 4. Hills (produces Brick)
```
[Base prompt] + 
Terracotta clay hills with a brick kiln or clay pit, seen from above.
Layered reddish-brown earth with visible sediment strata.
A small brick kiln with orange glow near the center.
Scattered clay bricks and raw clay deposits. Warm earthy tones.
Color palette: terracotta (#c0622a), rust (#d4852e), clay (#a85420).
```

### 5. Mountains (produces Ore)
```
[Base prompt] + 
Rugged mountain peaks with snow caps, seen from above at an angle.
Grey and blue-tinted rock formations with sharp ridges.
Snow on the highest peaks, bare rock faces below.
A small cave entrance or mine shaft visible. Cold dramatic lighting.
Crystal/ore veins glinting in the rock face.
Color palette: slate (#546e7a), blue-grey (#78909c), snow (#e0e8f0).
```

### 6. Desert (no resource)
```
[Base prompt] + 
Arid desert with sand dunes, seen from above.
Warm beige and tan sand with wind-carved ripple patterns.
A few sun-bleached rocks. Cracked dry earth in one area.
Heat shimmer effect suggested by lighter patches.
Sparse — mostly empty, desolate atmosphere.
Color palette: sand (#e8d5b0), beige (#f5e6c8), tan (#c4a870).
```

### 7. Sea (no resource, ships traverse)
```
[Base prompt] + 
Deep ocean water, seen from above.
Dark blue water with visible wave patterns and white foam crests.
Subtle depth variation — darker in center, lighter near edges.
A few wave lines creating natural texture. No land visible.
Mysterious deep water feeling. Slight teal/green in the shallows near edges.
Color palette: deep blue (#0d47a1), ocean (#1565c0), dark (#0a3680).
```

### 8. Gold River (player chooses resource)
```
[Base prompt] + 
Lush river valley with a golden glittering river, seen from above.
A meandering river with gold-tinted water flowing through green banks.
Gold nuggets and sparkles visible in the shallow riverbed.
Rich vegetation on the banks. Magical/precious atmosphere.
The gold color should shimmer and feel valuable, almost enchanted.
Color palette: gold (#ffc107), amber (#e8a800), shimmer (#fff3b0).
```

---

## Technical Integration Notes

After generating, each hex tile needs to be:

1. **Clipped to flat-top hex shape** with polygon points:
   ```
   100,43.3  75,86.6  25,86.6  0,43.3  25,0  75,0
   ```
   (viewBox: `0 0 100 86.6`)

2. **Kept under 15KB** as SVG (or rasterized to ~512px wide PNG and embedded as `<image>` in SVG)

3. **Must work on dark background** `#0e1a2e`

4. **Must be recognizable at 30px width** — the core visual identity (color + main feature) should read at small sizes

5. **Current component**: `packages/app/components/board/TerrainHexSVG.tsx` renders inline SVG per terrain. Replace the JSX content with the new art (either inline SVG paths or embedded `<image href="data:image/png;base64,...">`)

---

## Player Piece Colors (for reference)

| Player | Color | Hex |
|--------|-------|-----|
| Red | Warm red | `#ef4444` |
| Blue | Ocean blue | `#3b82f6` |
| White | Off-white | `#e5e5e5` |
| Orange | Bright orange | `#f97316` |
| Green | Emerald | `#22c55e` |
| Brown | Dark brown | `#92400e` |
