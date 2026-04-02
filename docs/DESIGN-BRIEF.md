# Catan Design Brief — SOTA Visual Design

> Input til design-session. To uafhængige design-agenter laver SVG-forslag.

## Mål

State-of-the-art visuelt design til digital Catan. Boardet skal se ud som et premium brætspil — varme materialer, taktile texturer, dyb farvedybde. Ikke "programmer-art" men heller ikke over-realistisk — stiliseret, clean, og læseligt på alle skærmstørrelser.

## Leverancer

### 1. Hexagon Tiles (6 terrain-typer + 2 specielle)

Hver hex skal fungere som SVG i størrelse 100×115px (flat-top).

| Terrain | Farve-retning | Visuelle elementer |
|---------|---------------|-------------------|
| **Forest** (lumber) | Dyb mørkegrøn | Stiliserede grantræer, evt. skovbund-tekstur |
| **Pasture** (wool) | Varm lysegrøn | Bølgende græs, evt. får-silhouetter |
| **Fields** (grain) | Gylden/amber | Kornaks, bølgende mark |
| **Hills** (brick) | Varm terracotta/rust | Lerovn-tekstur, lagdelte bakker |
| **Mountains** (ore) | Koldt blå-grå | Klippeformationer, sne på toppen |
| **Desert** | Sand/beige | Sand-dunes, kaktus eller tør jord |
| **Sea** | Dyb ocean-blå | Bølgemønster, subtle animation-ready |
| **Gold River** | Gylden shimmer | Glittrende flod-mønster |

**Krav:**
- Hvert tile skal have intern variation (ikke bare flat farve)
- Kanter skal smelte sammen med naboer (evt. via gradient langs kanten)
- Number token i midten skal stå klart mod baggrunden
- Skal skalere fra 30px til 120px uden at miste læsbarhed

### 2. Number Tokens

Cirkulære tokens centreret på hex:
- Baggrund: pergament/læder-tekstur (varm beige)
- Tal: serif font, sort (rød+fed for 6 og 8)
- Pip-dots under tallet (sandsynligheds-indikator)
- Subtle skygge for "lagt ovenpå hex"-effekt

### 3. Resource Cards (5 typer)

Kort vist i spillerens hånd på mobilen. Kompakt format (~50×70px) der viser type + antal.

| Resource | Ikon | Farve |
|----------|------|-------|
| **Lumber** 🪵 | Træstamme/økse | Mørkegrøn/brun |
| **Brick** 🧱 | Mursten/teglsten | Terracotta |
| **Wool** 🐑 | Uldnøgle/får | Lysegrøn |
| **Grain** 🌾 | Kornaks | Gylden |
| **Ore** ⛏️ | Krystal/hakke | Blågrå |

**Krav:**
- Klart ikon der er genkendeligt i 30px størrelse
- Antal-badge (cirkel med tal) i hjørnet
- Farve-kodning matcher terrain-hexen
- Mørkt tema (kort skal passe til mørk baggrund)

### 4. Development Cards (5 typer)

Separate kort-design med mystisk/middelalder-tema:

| Card | Ikon | Effekt-tekst |
|------|------|-------------|
| **Knight** ⚔️ | Ridder med sværd | Flyt røveren |
| **Victory Point** 🏆 | Krone/slot | +1 VP |
| **Road Building** 🛤️ | To vejstumper | 2 gratis veje |
| **Year of Plenty** 🎁 | Overfyldt skatkiste | 2 valgfrie ressourcer |
| **Monopoly** 💰 | Pengepung/krone | Tag alle af én type |

**Krav:**
- Bagsiden er identisk (spilleren ved ikke hvad andre har)
- Forsiden har klart ikon + kort tekst
- Kompakt mobil-størrelse (~60×80px)
- Lilla/magisk farvetema (adskiller sig fra resource-kort)

### 5. Building Cost Reference (mobil-layout)

Kompakt panel der viser hvad hver ting koster:

```
┌─────────────────────────────┐
│  🏠 Settlement               │
│  🪵 🧱 🐑 🌾                │
│                               │
│  🏙️ City (upgrade)           │
│  🌾🌾 ⛏️⛏️⛏️               │
│                               │
│  🛤️ Road                     │
│  🪵 🧱                       │
│                               │
│  🃏 Development Card          │
│  🐑 🌾 ⛏️                   │
└─────────────────────────────┘
```

**Krav:**
- Altid tilgængelig som overlay/drawer fra bunden
- Viser cost med de faktiske resource-ikoner (ikke tekst)
- Viser spillerens nuværende antal af hver ressource
- Grøn highlight hvis spilleren har råd, grå hvis ikke
- Kompakt nok til at passe på en mobil-skærm

### 6. Robber & Pirate

- **Robber**: Sort/mørk figur, middelalder-bandit look
- **Pirate**: Lilla/mørk skibsfigur, placeret på hav-hexes

### 7. Dice (terninger)

To terninger vist efter kast:
- 3D-isometrisk look eller stiliseret flat design
- Hvid baggrund med sorte prikker (klassisk)
- Skygge for dybde
- Stor nok til at aflæse på big screen (~60×60px)
- Kast-animation-ready (rotation)

### 8. Harbor Markers

Havne-skilte langs boardets kant:
- Nuværende rektangler er for simple
- Brug et skilt/tavle-design med trætekstur
- Vis trade-ratio (3:1 eller 2:1) + resource-ikon
- Peger ind mod boardet med en "bro"-linje til de to vertices

### 9. Scoreboard / Player Panel (big screen sidebar)

Sidebar på big screen (~320px bred) med:
- Spillerliste med farve, navn, VP (stort tal)
- Aktiv spiller highlighted med glow/border
- Resource-kort antal (skjult), dev card antal
- Longest Road / Largest Army badges
- Kompakt men let at aflæse fra sofaen (TV-afstand)

### 10. Turn Indicator

Visuelt tydeligt hvem der er aktiv:
- Big screen: spillerens panel glower, evt. animeret kant
- Mobil: header-farve matcher aktiv spillers farve
- Fase-indikator: "Kast terninger" / "Byg & Handel" / "Flyt røver"

### 11. Player Pieces (settlements, cities, roads)

- **Settlement**: Lille hus med tag (spillerfarve)
- **City**: Større bygning med tårn (spillerfarve)
- **Road**: Farvet linje/sti mellem vertices
- 6 spillerfarver: rød, blå, hvid, orange, grøn, brun

## Design Constraints

- **SVG only** — alt skal være vektor (skalerbart)
- **Mørk baggrund** — spillet bruger `bg-[#0e1a2e]` som base
- **Havet** er `#0d47a1` (mørk blå)
- **Tilgængelighed** — farveblinde skal kunne skelne terrains (brug mønster/ikon, ikke kun farve)
- **Performance** — SVG'er skal være lette (<5KB per hex tile)
- **Konsistens** — alle elementer skal føles som del af samme spil-univers

## Eksisterende Farver (nuværende implementation)

```typescript
TERRAIN_COLORS = {
  forest: '#2d6a30',   // kan ændres
  pasture: '#8bc34a',
  fields: '#fdd835',
  hills: '#d4852e',
  mountains: '#78909c',
  desert: '#f5e6c8',
  sea: '#1565c0',
  gold_river: '#ffc107',
};

PLAYER_COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  white: '#e5e5e5',
  orange: '#f97316',
  green: '#22c55e',
  brown: '#92400e',
};
```

## Teknisk Context

- Board renderer: `packages/app/components/board/GameBoardSVG.tsx`
- Hex utils: `packages/app/components/board/hex-utils.ts` (farver, pixel conversion)
- Number token: `packages/app/components/board/NumberToken.tsx`
- Robber: `packages/app/components/board/Robber.tsx`
- Harbor marker: `packages/app/components/board/HarborMarker.tsx`
- Mobile play: `packages/app/app/(mobile)/play/[gameId]/page.tsx`

## Design Agent Instruktioner

**Agent A** — fokus på **boardet**: hex tiles, number tokens, havne, robber/pirate, player pieces (settlements/cities/roads). Lav SVG-eksempler for hvert terrain med intern variation og tekstur.

**Agent B** — fokus på **kort og mobil-UI**: resource cards, development cards, building cost reference panel, spillerens hånd-layout. Lav SVG-eksempler + layout-mockups.

Begge agenter arbejder uafhængigt og leverer SVG-filer + farvepaletter. Vi sammenligner og vælger det bedste fra hver.
