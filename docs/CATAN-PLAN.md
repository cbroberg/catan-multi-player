# Catan — Multiplayer Big Screen + Mobile Game

> Digital Catan med storskærm (TV/monitor) som spilleplade og mobiltelefoner som spillerkort. Genbruger lobby/QR-kode patternen fra Music Quiz.

## 1. Catan Rules — Komplet Reference

### 1.1 Spillets Mål
Første spiller der når **10 Victory Points (VP)** i sin tur vinder.

**VP-kilder:**
- Settlement = 1 VP
- City = 2 VP (erstatter settlement)
- Longest Road (≥5 sammenhængende veje) = 2 VP
- Largest Army (≥3 spillede Knight-kort) = 2 VP
- Victory Point Development Cards = 1 VP hver

### 1.2 Spillepladen

**19 hexagoner** arrangeret i honningkage-mønster (3-4-5-4-3 rækker):
| Terrain | Resource | Antal |
|---------|----------|-------|
| Forest | Lumber (træ) | 4 |
| Pasture | Wool (uld) | 4 |
| Fields | Grain (korn) | 4 |
| Hills | Brick (mursten) | 3 |
| Mountains | Ore (malm) | 3 |
| Desert | Ingen | 1 |

**Number tokens**: 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12 (18 stk, ørkenen får ingen).

### 1.3 Building Costs

| Bygning | Lumber | Brick | Wool | Grain | Ore |
|---------|--------|-------|------|-------|-----|
| **Road** | 1 | 1 | — | — | — |
| **Settlement** | 1 | 1 | 1 | 1 | — |
| **City** (upgrade) | — | — | — | 2 | 3 |
| **Dev Card** | — | — | 1 | 1 | 1 |

**Stykker pr. spiller:** 15 roads, 5 settlements, 4 cities.

### 1.4 Development Cards (25 stk)

| Type | Antal | Effekt |
|------|-------|--------|
| Knight | 14 | Flyt robber, stjæl 1 kort fra modstander |
| Victory Point | 5 | +1 VP (holdes skjult til sejr) |
| Road Building | 2 | Byg 2 gratis veje |
| Year of Plenty | 2 | Tag 2 valgfrie resource-kort fra banken |
| Monopoly | 2 | Alle spillere afleverer alle kort af én valgt type |

### 1.5 Tur-Sekvens

1. **(Valgfrit) Spil Development Card** — Knight før terningkast
2. **Kast terninger** — alle spillere modtager resources
3. **Handel** — med andre spillere eller maritime trade
4. **Byg** — roads, settlements, cities, køb dev cards

### 1.6 Special: Kast 7 (Robber)

1. Alle spillere med >7 kort kasserer halvdelen (rundet ned)
2. Aktiv spiller flytter robber til en ny hex
3. Aktiv spiller stjæler 1 tilfældigt kort fra modstander med settlement/city på den hex
4. Den blokerede hex producerer IKKE resources indtil robber flyttes

### 1.7 Initial Placement

- Runde 1: Spillere placerer 1. settlement + 1 vej (med uret)
- Runde 2: Spillere placerer 2. settlement + 1 vej (mod uret)
- Spiller modtager resources fra hex'er omkring 2. settlement
- **Distance Rule:** Settlements skal minimum være 2 kanter fra hinanden.

### 1.8 Trade

- **Spiller-til-spiller**: Frit forhandlet, kun aktiv spiller kan tilbyde
- **Maritime trade**: 4:1 default, 3:1 med generic harbor, 2:1 med specifik harbor

### 1.9 Longest Road & Largest Army

- **Longest Road**: Første spiller med ≥5 sammenhængende vejer. En modstanders settlement bryder vejen.
- **Largest Army**: Første spiller med ≥3 spillede knights.

---

## 2. Board Generation

### 2.1 Koordinatsystem: Axial (q, r)

Flat-top hexagoner med axial coordinates (q, r), cube coordinate (q, r, s) hvor s = -q-r.
Baseret på Red Blob Games' hex-grid guide.

### 2.2 Balance-Constraints

**Hårde regler:**
1. Ingen to 6/8-numre må ligge på tilstødende hexes
2. Ingen to identiske resource-typer må ligge ved siden af hinanden
3. Ørkenen placeres ideelt centralt
4. 2 og 12 bør ikke være naboer

**Bløde regler (scoring 0-100):**
1. Resource expected value balance
2. Intersection balance — ingen intersection > 11 pips
3. Harbor-til-resource proximity
4. Geografisk spredning af høj-sandsynligheds hexes

### 2.3 Generation-Algoritme

Shuffle + evaluer op til 600 gange, behold højeste score. Curated boards som JSON presets.

---

## 3. Arkitektur

### 3.1 Rendering: SVG + Canvas Overlay ✅

- SVG for board (klikbare vertices/edges, skalerbart, React-venligt)
- Canvas overlay for animationer (terningkast, robber, timeglas)

### 3.2 Én Next.js App med Route Groups ✅

```
app/
  (board)/game/[gameId]/     — Big Screen (TV/monitor)
  (board)/lobby/[gameId]/    — Lobby med QR-kode
  (mobile)/play/[gameId]/    — Spillerens hånd + mini-board
  (mobile)/join/             — QR/kode-entry
```

### 3.3 Lobby Flow (fra Music Quiz)

1. Game Master konfigurerer spil (board, timer, VP-mål, etc.)
2. Server genererer 5-cifret kode + QR-kode
3. Spillere joiner, vælger farve + navn + avatar
4. Server kaster terning for startrækkefølge

### 3.4 Game Setup Config

| Indstilling | Default |
|-------------|---------|
| Board Type | Random Balanced |
| Antal spillere | 3-4 |
| VP-mål | 10 |
| Turn Timer | Off |
| Setup Timer | Off |
| Friendly Robber | Off |

### 3.5 Turn Timer — Timeglas ⏳

- Big Screen: Animeret sandtimeglas med trætekstur
- Mobile: Cirkulær countdown-ring + haptic feedback
- Auto End Turn ved timeout
- Pauser under robber-discard og system-events

### 3.6 Tech Stack

- Next.js 16+ (App Router), React 19+, TypeScript
- Socket.IO, SVG + Canvas overlay
- shadcn/ui + Tailwind v4
- SQLite/Drizzle, Fly.io
- pnpm + Turbo monorepo

### 3.7 Packages

```
@catan/app          — Next.js app
@catan/game-engine  — Pure game logic
@catan/shared       — Types, constants
```

---

## 4. Game State Machine

```
LOBBY → SETUP_ROUND_1 → SETUP_ROUND_2 → PLAYING → GAME_OVER
```

PLAYING turn loop:
```
PRE_ROLL → ROLL_DICE → (ROBBER_DISCARD → ROBBER_MOVE → ROBBER_STEAL)
         → TRADE_BUILD → END_TURN → (next player)
```

Server-authoritative: all game logic on server, clients send actions only.

---

## 5. Implementation Phases

### Phase 1 — Core Engine + Board Visualization (MVP)
### Phase 2 — Lobby + Multiplayer Infrastructure
### Phase 3 — Game Loop + Timer
### Phase 4 — Trade + Robber + Dev Cards
### Phase 5 — Victory + Polish
### Phase 6 — Expansion (5-6 players, Seafarers, AI, tvOS)

---

## 6. Beslutninger

1. ✅ SVG + Canvas overlay
2. ✅ Shared game engine, server er authority
3. ✅ Én Next.js app med route groups
4. ✅ Turn Timer med timeglas
5. ✅ Én Fly.io app med persistent volume

---

## 7. Referencer

- [Catan Official Rules](https://www.catan.com/understand-catan/game-rules)
- [Red Blob Games — Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/)
- [catanboard.com — Balanced Board Generator](https://catanboard.com/)
- [settlers-setup (TypeScript)](https://github.com/cgagliardi/settlers-setup)
- [apple-music-mcp (Lobby/QR pattern)](https://github.com/cbroberg/apple-music-mcp)

---

> Se den fulde version af dette dokument i `/mnt/user-data/outputs/CATAN-PLAN.md` fra Claude chatten.
> Catan er et registreret varemærke. Kun til personlig brug.
