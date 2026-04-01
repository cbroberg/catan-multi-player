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

**Pip-system** (sandsynlighed pr. nummer):
| Nummer | Kombinationer | Pips | Sandsynlighed |
|--------|--------------|------|---------------|
| 2 | 1 | • | 2.78% |
| 3 | 2 | •• | 5.56% |
| 4 | 3 | ••• | 8.33% |
| 5 | 4 | •••• | 11.11% |
| 6 | 5 | ••••• | 13.89% |
| 7 | 6 | — | 16.67% (robber) |
| 8 | 5 | ••••• | 13.89% |
| 9 | 4 | •••• | 11.11% |
| 10 | 3 | ••• | 8.33% |
| 11 | 2 | •• | 5.56% |
| 12 | 1 | • | 2.78% |

**Havne** (9 stk rundt om øen):
- 4× Generic harbor (3:1 trade)
- 1× Lumber harbor (2:1)
- 1× Wool harbor (2:1)
- 1× Grain harbor (2:1)
- 1× Brick harbor (2:1)
- 1× Ore harbor (2:1)

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

**Regler for dev cards:**
- Max 1 dev card spilles pr. tur
- Kan IKKE spilles den tur den købes
- VP-kort er undtagelsen — kan afsløres med det samme
- Knight-kort spilles FØR terningkast

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

### 1.7 Initial Placement (Vores Setup)

**Standard Catan:**
- Runde 1: Spillere placerer 1. settlement + 1 vej (med uret)
- Runde 2: Spillere placerer 2. settlement + 1 vej (mod uret — sidste spiller i runde 1 er første i runde 2)
- Spiller modtager resources fra hex'er omkring 2. settlement

**Distance Rule:** Settlements skal minimum være 2 kanter fra hinanden.

### 1.8 Trade

- **Spiller-til-spiller**: Frit forhandlet, kun aktiv spiller kan tilbyde
- **Maritime trade**: 4:1 default, 3:1 med generic harbor, 2:1 med specifik harbor
- Handel kun i aktiv spillers tur

### 1.9 Longest Road & Largest Army

- **Longest Road**: Første spiller med ≥5 sammenhængende vejer. Andre kan overtage med LÆNGERE vej. En modstanders settlement bryder vejen.
- **Largest Army**: Første spiller med ≥3 spillede knights. Andre kan overtage med FLERE knights.


---

## 2. Board Generation — Algoritmisk Tilgang

### 2.1 Koordinatsystem: Axial (q, r)

Baseret på Red Blob Games' hex-grid guide. Bruger **flat-top hexagoner** (standard Catan-look) med **axial coordinates (q, r)** og cube coordinate (q, r, s) hvor s = -q-r.

```
Standard Catan board (3-4-5-4-3):
     q=-2  q=-1  q=0
r=-2  [0]   [1]  [2]
r=-1 [3]  [4]  [5]  [6]
r=0 [7] [8]  [9] [10] [11]
r=1 [12] [13] [14] [15]
r=2  [16] [17] [18]
```

**19 valide hex-positioner** defineret som:
```typescript
const BOARD_HEXES: [number, number][] = [
  // Row 0 (3 hexes): r = -2, q = 0..2
  [0,-2], [1,-2], [2,-2],
  // Row 1 (4 hexes): r = -1, q = -1..2
  [-1,-1], [0,-1], [1,-1], [2,-1],
  // Row 2 (5 hexes): r = 0, q = -2..2
  [-2,0], [-1,0], [0,0], [1,0], [2,0],
  // Row 3 (4 hexes): r = 1, q = -2..1
  [-2,1], [-1,1], [0,1], [1,1],
  // Row 4 (3 hexes): r = 2, q = -2..0
  [-2,2], [-1,2], [0,2],
];
```

### 2.2 Balance-Constraints (baseret på research)

**Hårde regler:**
1. Ingen to 6/8-numre (røde) må ligge på tilstødende hexes
2. Ingen to identiske resource-typer må ligge ved siden af hinanden
3. Ørkenen placeres ideelt centralt eller semi-centralt
4. 2 og 12 bør ikke være naboer

**Bløde regler (scoring 0-100):**
1. Resource expected value balance — hver resource bør have nogenlunde ens total sandsynlighed
2. Intersection balance — ingen enkelt intersection bør have >11 pips
3. Harbor-til-resource proximity — specialhavne bør ligge nær deres resource
4. Geografisk spredning — høj-sandsynligheds hexes spredt over hele boardet

### 2.3 Generation-Algoritme

```
1. Shuffle resource tiles tilfældigt
2. Placer desert
3. For number tokens: brug spiral-metoden (officiel) eller random
4. Evaluer board med scoring-funktion
5. Gentag op til 600 gange, behold højeste score
6. Returner best board
```

**Curated Boards**: Pre-definerede layouts der kan loades som JSON (f.eks. begynder-layout, turneringslayouts, udfordrende layouts).

### 2.4 Board Data Model

```typescript
interface GameBoard {
  hexes: Hex[];
  edges: Edge[];          // 72 kanter (veje)
  vertices: Vertex[];     // 54 hjørner (settlements/cities)
  harbors: Harbor[];
  robberPosition: HexCoord;
}

interface Hex {
  coord: { q: number; r: number };
  terrain: 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert';
  number: number | null;  // null for desert
  hasRobber: boolean;
}

interface Vertex {
  id: string;             // e.g. "v_0_-2_1_-2_1_-1" (3 tilstødende hex coords)
  adjacentHexes: HexCoord[];
  building: null | { type: 'settlement' | 'city'; playerId: string };
  harbor: Harbor | null;
}

interface Edge {
  id: string;
  vertices: [string, string];
  road: null | { playerId: string };
}

interface Harbor {
  type: '3:1' | 'lumber' | 'wool' | 'grain' | 'brick' | 'ore';
  position: { edge: string };
}
```

---

## 3. Arkitektur — Big Screen + Mobile

### 3.1 Overblik

```
┌──────────────────┐     ┌──────────────────┐
│   TV / Monitor   │     │  Mobile Device   │
│   (Big Screen)   │     │   (Per Player)   │
│                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │
│  │ Game Board │  │     │  │ Mini Board  │  │
│  │  (SVG)     │  │     │  │ + Hand      │  │
│  │ + Canvas   │  │     │  │ + Actions   │  │
│  │  overlay   │  │     │  └────────────┘  │
│  │ (animat.)  │  │     │                  │
│  └────────────┘  │     │  Resources,      │
│                  │     │  Dev Cards,      │
│  Scores, Log,   │     │  Trade UI,       │
│  ⏳ Turn Timer,  │     │  Build Menu,     │
│  Turn Indicator  │     │  ⏳ Turn Timer    │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │   WebSocket (Socket.IO) │
         │                        │
    ┌────▼────────────────────────▼───┐
    │         Game Server             │
    │   (Next.js + Socket.IO)         │
    │                                 │
    │   - Game State Machine          │
    │   - Board Generation            │
    │   - Dice / Randomness           │
    │   - Rule Enforcement            │
    │   - Trade Negotiation           │
    │   - Victory Detection           │
    └─────────────────────────────────┘
```

### 3.2 Lobby Flow (genbrugt fra Music Quiz)

1. **Game Master opretter spil** — konfigurerer indstillinger (se 3.2.1)
2. Server genererer **5-cifret kode** + **QR-kode** → Big Screen viser lobby
3. Spillere scanner/indtaster kode på mobil → vælger **farve** + **navn** + **avatar**
4. Lobby viser alle tilsluttede spillere med deres farve/avatar
5. Når alle er klar (3-4 spillere, 5-6 med expansion) → Game Master starter
6. Server kaster terning for alle spillere for at bestemme startrækkefølge

#### 3.2.1 Game Setup (Game Master Config)

Ligesom Music Quiz genererer quiz-parametre, konfigurerer Game Master spillet FØR lobby åbnes:

| Indstilling | Muligheder | Default |
|-------------|------------|---------|
| **Board Type** | Random Balanced / Curated Preset / Beginner | Random Balanced |
| **Antal spillere** | 3-4 (base) / 5-6 (expansion) | 3-4 |
| **VP-mål** | 10 / 12 / 15 | 10 |
| **Turn Timer** | Off / 60s / 90s / 120s / 180s / Custom | Off |
| **Setup Timer** | Off / 30s / 60s / 90s | Off |
| **Friendly Robber** | On / Off (robber kan ikke placeres på spiller med ≤2 VP) | Off |
| **Trade med inaktive** | On / Off (kun aktiv spiller kan handle) | On |

#### 3.2.2 Turn Timer — Timeglas

Når Turn Timer er aktiveret:

- **Big Screen**: Animeret **sandtimeglas** (SVG/Canvas) der visuelt tømmes i realtid. Catan-tematisk design med trætekstur og sandkorn-partikeleffekt. Sidste 10 sekunder pulserer timeglasset rødt.
- **Mobile**: Cirkulær countdown-ring rundt om tur-indikatoren + sekund-tæller. Haptic feedback ved 10s og 5s.
- **Når tiden udløber**: Spillerens tur afsluttes automatisk (End Turn). Ubrugte handlinger fortabes. Evt. aktive trade-tilbud annulleres.
- **Timer pauser under**: Robber discard-fase (alle spillere skal vælge), terningkast-animation, og system-prompts.

```typescript
interface GameConfig {
  boardType: 'random-balanced' | 'curated' | 'beginner';
  boardPresetId?: string;       // for curated boards
  maxPlayers: 3 | 4 | 5 | 6;
  victoryPoints: number;        // default 10
  turnTimerSeconds: number | null;   // null = no timer
  setupTimerSeconds: number | null;  // null = no timer
  friendlyRobber: boolean;
  tradeWithInactive: boolean;
}
```

### 3.3 Tech Stack

| Komponent | Teknologi |
|-----------|-----------|
| **App** | Next.js 16+ (App Router) — én app, route groups for board/mobile |
| **Real-time** | Socket.IO |
| **Board Rendering** | SVG (React components) — interaktivt board med klikbare vertices/edges |
| **Animations** | Canvas overlay — terningkast, robber-bevægelse, timeglas |
| **Mobile UI** | React + shadcn/ui + Tailwind v4 |
| **State Management** | Server-authoritative (Zustand on client for local) |
| **Database** | SQLite/Drizzle (game history, leaderboards, curated boards) |
| **Deploy** | Fly.io (`min_machines_running = 1`, persistent volume) |
| **Monorepo** | pnpm + Turbo |

### 3.4 Route Structure (Én Next.js App)

```
app/
  (board)/             — Big Screen route group
    game/[gameId]/     — Fuld spilleplade (TV/monitor)
    lobby/[gameId]/    — Lobby med QR-kode + spillervisning
  (mobile)/            — Mobile route group
    play/[gameId]/     — Spillerens hånd + mini-board + actions
    join/              — QR/kode-entry + farve/avatar-valg
  api/
    socket/            — Socket.IO endpoint
    game/              — REST endpoints (create, presets, etc.)
```

### 3.5 Packages (Monorepo)

```
@catan/
  app/               — Next.js app (board + mobile views, API, Socket.IO)
  game-engine/       — Pure game logic (rules, state machine, board gen, timer)
  shared/            — Types, constants, utilities
```

---

## 4. Game State Machine

### 4.1 Game Phases

```
LOBBY → SETUP_ROUND_1 → SETUP_ROUND_2 → PLAYING → GAME_OVER
```

**LOBBY:**
- Game Master konfigurerer spil (board, timer, VP-mål, etc.)
- Spillere joiner, vælger farve/avatar

**SETUP_ROUND_1:**
- Spillere placerer 1. settlement + 1 vej (med uret fra startspiller)
- Setup timer aktiv (hvis konfigureret)

**SETUP_ROUND_2:**
- Spillere placerer 2. settlement + 1 vej (mod uret)
- Modtager startressourcer fra 2. settlement
- Setup timer aktiv (hvis konfigureret)

**PLAYING (turn loop):**
```
PRE_ROLL → ROLL_DICE → (ROBBER_DISCARD → ROBBER_MOVE → ROBBER_STEAL)
         → TRADE_BUILD → END_TURN → (next player)

⏳ Turn timer starter ved TRADE_BUILD fasen (efter dice + robber er håndteret).
   Timer pauser under robber-discard (kræver alle spillere).
   Auto END_TURN ved timeout.
```

**GAME_OVER:**
- Spiller når VP-mål → animation + scoreboard + leaderboard-opdatering

### 4.2 Server-Authoritative Design

- **Al game logic kører på serveren** — klienter sender kun actions
- Server validerer ALLE handlinger mod regler
- Klienter modtager opdateret state via WebSocket
- Forhindrer snyd og sikrer konsistens

---

## 5. Rendering af Spillepladen

### 5.1 Big Screen (TV/Monitor)

**SVG Layer (board):**
- Hexagoner med farverige terrain-texturer/gradienter
- Number tokens med pips-indikation
- Spillerfarver på settlements/cities/roads
- Robber-figur
- Havne markeret langs kanten
- Scoreboard i siden
- Turn-indikator med spillers navn/avatar/farve
- Game log med seneste handlinger

**Canvas Overlay (animationer):**
- Terningkast animation (3D terninger eller stiliserede 2D)
- Robber-bevægelse med trail-effekt
- Ressource-fordeling animation (kort flyver ud fra hex)
- Byggeri-animation (settlement/city pops op)

**⏳ Timeglas-Timer (Canvas eller SVG-animeret):**
- Catan-tematisk sandtimeglas med trætekstur-ramme
- Sand-partikeleffekt der realistisk falder fra øverste kammer til nederste
- Placeres prominent ved siden af aktiv spillers info
- Farve-progression: sand → gul → orange → rød (sidste 10 sek)
- Sidste 10 sek: pulserende glow-effekt + evt. ticking lyd
- Ved timeout: timeglas "knækker" animation → auto End Turn
- Når timer er off: timeglasset vises ikke

### 5.2 Mobile (Per Player)

- **Mini-board** i toppen — interaktivt for placering (tap vertex/edge)
- **⏳ Turn Timer** — cirkulær countdown-ring rundt om tur-status med sekund-tæller. Haptic feedback ved 10s og 5s resterende.
- **Hand** — resource-kort visuelt (antal af hver type, farvekodede ikoner)
- **Dev Cards** — skjulte kort med reveal-mulighed
- **Actions:**
  - 🎲 Roll Dice (kun aktiv spiller)
  - 🏘️ Build menu (road/settlement/city/dev card) — grayed out hvis ikke nok resources
  - 🤝 Trade panel (tilbyd/accepter/afvis/counter-offer)
  - 🃏 Play Dev Card
  - ⏭️ End Turn
- **Notifications** — "Det er din tur!", "Du fik 2 Lumber", "⏳ 10 sekunder tilbage!", etc.

### 5.3 Hex Rendering (SVG)

```typescript
// Flat-top hex corner beregning
function hexCorner(center: Point, size: number, i: number): Point {
  const angle = (Math.PI / 180) * (60 * i);
  return {
    x: center.x + size * Math.cos(angle),
    y: center.y + size * Math.sin(angle),
  };
}

// Axial → pixel (flat-top)
function hexToPixel(q: number, r: number, size: number): Point {
  return {
    x: size * (3/2 * q),
    y: size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r),
  };
}
```

---

## 6. Curated vs. Random Boards

### 6.1 Board Presets (JSON)

```typescript
interface BoardPreset {
  id: string;
  name: string;          // "Beginner", "Tournament 2024", "Island Chain"
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  terrains: TerrainType[];  // 19 entries, ordered by hex index
  numbers: (number|null)[]; // 19 entries (null for desert)
  harbors: HarborPlacement[];
  balanceScore: number;  // pre-computed 0-100
}
```

### 6.2 Board Gallery

- Game Master kan browse curated boards med preview
- Community kan lave og dele boards (fremtidig feature)
- Favoritter gemmes i SQLite

---

## 7. Implementation Phases

### Phase 1 — Core Engine + Board Visualization (MVP)
- [ ] Monorepo setup (pnpm + Turbo): `@catan/app`, `@catan/game-engine`, `@catan/shared`
- [ ] Game engine: board generation med balance-scoring
- [ ] Hex grid rendering i SVG (flat-top, axial coords)
- [ ] Terrain textures/farver + number tokens med pips
- [ ] Board preview component (static, standalone)

### Phase 2 — Lobby + Multiplayer Infrastructure
- [ ] Socket.IO integration i Next.js
- [ ] Game Setup screen (Game Master config: board, timer, VP-mål, friendly robber)
- [ ] Lobby system (QR-kode + 5-cifret kode, genbrugt fra Music Quiz)
- [ ] Spillerregistrering (farve, navn, avatar)
- [ ] Big Screen lobby view med spillerliste
- [ ] Mobile join + lobby view

### Phase 3 — Game Loop + Timer
- [ ] State machine (phases, turns)
- [ ] Terningkast med Canvas-animation overlay
- [ ] Resource distribution
- [ ] Initial placement (round 1 med uret + round 2 mod uret)
- [ ] Building (roads, settlements, cities) med distance rule
- [ ] Turn management med automatisk rækkefølge
- [ ] ⏳ Turn Timer: sandtimeglas (big screen) + countdown-ring (mobile)
- [ ] Timer pause/resume logic (pauser under robber-discard, system-events)
- [ ] Auto End Turn ved timeout

### Phase 4 — Trade + Robber + Dev Cards
- [ ] Player-to-player trade UI
- [ ] Maritime trade
- [ ] Robber mechanics (7-roll, discard, move, steal)
- [ ] Development card system
- [ ] Longest Road detection
- [ ] Largest Army detection

### Phase 5 — Victory + Polish
- [ ] Win detection + celebration animation
- [ ] Game log / history
- [ ] Sound effects
- [ ] Leaderboards (SQLite)
- [ ] Curated board gallery
- [ ] Deployment til Fly.io

### Phase 6 — Expansion (Fremtid)
- [ ] 5-6 player extension (30 hexes)
- [ ] Seafarers expansion (skibe, guldfloder)
- [ ] AI-spillere (simple heuristic bots)
- [ ] Spectator mode
- [ ] tvOS shell app (WKWebView, ligesom Music Quiz plan)

---

## 8. Beslutninger & Åbne Spørgsmål

### ✅ Afgjort

1. **Rendering: SVG + Canvas overlay** — SVG for boardet (klikbare vertices/edges, skalerbart, React-venligt). Canvas overlay for animationer (terningkast, robber, timeglas). ✅

2. **Shared game engine** — `@catan/game-engine` som shared package for regler, validation, board gen. Server er authority, men client kan bruge det til preview/optimistic UI. ✅

3. **Én Next.js app med route groups** — `/game/[gameId]` for big screen, `/play/[gameId]` for mobile. Én deploy, delt Socket.IO server, simplere ops. ✅

4. **Turn Timer med timeglas** — Konfigureres ved game setup (ligesom quiz-parametre). Visuelt sandtimeglas på big screen, countdown-ring på mobile. Auto End Turn ved timeout. Timer pauser under system-events. ✅

5. **Hosting: Én Fly.io app** — Med `min_machines_running = 1`, persistent volume for SQLite. Ligesom Music Quiz / cronjobs servicen. ✅

### 🔶 Åbne Spørgsmål

6. **Trade-forhandlinger: Structured offers med timer inden for turn-timer?**
   Aktiv spiller poster trade-tilbud → andre accepterer/afviser/counter-offer. Trades skal ske inden turn-timer løber ud. Skal der være en separat trade-timer (f.eks. 15s per tilbud), eller er den overordnede turn-timer nok?

7. **Avatars: Predefinerede Catan-tema ikoner eller frie billeder?**
   Predefinerede er enklere og mere tematiske (viking, bonde, smed, købmand, etc.). Frie billeder kræver upload-logik.

8. **Sound: Skal vi have lyd fra start (Phase 3) eller som polish (Phase 5)?**
   Terningkast-lyd, timeglas-ticking, resource-collect chime, "din tur"-notification. Kan tilføjes incrementalt.

9. **Reconnect-strategi: Session-token i localStorage eller URL-param?**
   URL-param er simplere (QR-koden indeholder alt). localStorage overlever browser-refresh. Begge?

10. **Board rotation på big screen?**
    Skal boardet kunne roteres så det "vender rigtigt" for alle spillere, eller er det fast orientation?

---

## 9. Juridisk Note

Catan er et registreret varemærke tilhørende Catan GmbH / Catan Studio / Asmodee. Dette projekt er et uafhængigt fan-projekt kun til personlig/privat brug og er IKKE affilieret med eller godkendt af rettighedshaverne. Projektet vil aldrig blive distribueret kommercielt.

---

## 10. Referencer

- [Catan Official Rules](https://www.catan.com/understand-catan/game-rules)
- [Red Blob Games — Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/)
- [catanboard.com — Balanced Board Generator](https://catanboard.com/)
- [Board Game Analysis — Fair Catan Boards](https://www.boardgameanalysis.com/fair-catan-boards-this-time-with-resources/)
- [Simon Vandevelde — Balanced Board Generator (IDP-Z3)](https://simonvandevelde.be/posts/Balanced_Catan_Board_Generator.html)
- [settlers-setup (TypeScript, balanced algorithm)](https://github.com/cgagliardi/settlers-setup)
- [apple-music-mcp (Lobby/QR pattern)](https://github.com/cbroberg/apple-music-mcp)
