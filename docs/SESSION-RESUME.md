# Session Resume — Næste Session Starter Her

> Kopiér dette som din første besked i en ny Claude Code session.

---

## Kontekst

Læs `CLAUDE.md` og `docs/CATAN-PLAN.md` for fuld projektbeskrivelse.

Digital Catan multiplayer — storskærm (TV) som spilleplade, mobiltelefoner som spillerkort. Monorepo med `@catan/shared`, `@catan/game-engine`, `@catan/app`.

## Hvad er færdigt

### Motor & Multiplayer
- Komplet GameEngine med fulde Catan-regler (setup, dice, build, trade, robber, dev cards, longest road, largest army, victory)
- Socket.IO real-time multiplayer, server-autoritativ
- 6 board-varianter: base 3-4/5-6/7-8, seafarers 3-4/5-6/7-8
- Procedural ø-generering for Seafarers (main island + foreign islands, valideret separation)
- Sea tiles låst til designerede positioner under terrain placement
- Turn timer: 90s/120s, server-autoritativ, auto-end, pause under robber discard

### Design & Assets
- Hires Gemini-genererede WebP terrain tiles (forest, pasture, fields, hills, mountains, desert, gold_river) — flat-top hex med clipPath
- SVG hav-tiles (#617484) med bølgemønstre
- Hires pieces: settlement, city, ship (med player color tint via feColorMatrix)
- Hires robber, pirate (WebP med transparent baggrund)
- Hires number tokens (pergament-tekstur, tal + ingen pip dots)
- Hires dice (individuelle face-billeder 1-6)
- Hires resource cards (lumber, brick, wool, grain, ore) på mobil
- Harbor markers: terrain-image baggrund, roteret mod kystlinje, pushed fra nærmeste land-hex
- 8 spillerfarver: red #AE0100, blue #071C8F, white #e5e5e5, orange #FF940F, green #003224, brown #461E00, purple #8b5cf6, cyan #06b6d4

### Bot & Simulation
- BotAI klasse med strategi for alle faser (setup, build priority, robber, trade, dev cards)
- BotManager server-side med konfigurerbar tænketid
- Bot observer mode: `/play/{gameId}?bot={playerId}` viser bot's hånd read-only
- Headless simulation: `pnpm --filter @catan/app sim` (4 bots, ~25s, immutable log)
- Visual simulation: `pnpm --filter @catan/app sim:visual` (Playwright, 4 browser-vinduer)
- Immutable logs i `scripts/logs/sim-{timestamp}.log`

### i18n & UX
- next-intl med da.json + en.json, alle sider bruger useTranslations()
- LoadingSpinner component, socket timeouts (10s, 5 retries)
- Board preview: zoom/pan/rotate, pinch-to-zoom på mobil, demo pieces toggle

### Infrastructure
- Server binder til 0.0.0.0 (mobil LAN-adgang)
- allowedDevOrigins for dev mode
- /api/board server-side board generation API
- Chrome translate disabled via meta tag

## Hvad mangler — denne sessions opgaver

### 1. Seafarers Ship Building (game engine)
**Status:** Ships vises visuelt men kan IKKE bygges i GameEngine. Mangler:
- `buildShip(playerId, edgeId)` metode i GameEngine
- Ship koster: 1 wool + 1 lumber
- Ships placeres på sea/coastal edges (ikke land edges)
- Ships forbinder til settlements/cities ved kystlinje
- Ship movement (flytte et skib der ikke er "locked")
- Pirate mekanik: som robber men på hav-hexes, blokerer ships
- Foreign island VP bonus: +2 VP for første settlement på en fremmed ø
- `ValidActions.canBuildShip` + `validShipSpots` i game-view-builder
- BotAI skal kunne bygge ships i Seafarers
- Mobil UI: "Build Ship" knap
- Vigtige filer:
  - `packages/game-engine/src/engine/game-engine.ts` — tilføj buildShip, moveShip
  - `packages/game-engine/src/engine/types.ts` — tilføj ship-relaterede typer
  - `packages/shared/src/types/game-view.ts` — ValidActions, BoardShip
  - `packages/app/server/game-view-builder.ts` — validShipSpots
  - `packages/game-engine/src/bot/bot-ai.ts` — ship building strategi
  - `packages/app/app/(mobile)/play/[gameId]/page.tsx` — Build Ship knap

### 2. Lydeffekter
**Status:** Ingen lyd overhovedet. Tilføj:
- Dice roll sound (ved terningkast)
- Player join sound (ny spiller joiner lobby)
- Turn change sound (ny spillers tur)
- Build sound (settlement/city/road/ship)
- Trade sound (handel gennemført)
- Robber sound (7 rullet)
- Victory fanfare (spil slut)
- Implementation: Web Audio API eller simple `<audio>` tags
- Lydeffekter bør være korte (< 1s), royalty-free
- Mute toggle i UI
- Vigtige filer:
  - Opret `packages/app/lib/sounds.ts` — sound manager
  - Gem lydfiler i `packages/app/public/sounds/`
  - Integrer i mobil play page + big screen game page

### 3. Dev Card UI Flows (mobil)
**Status:** Dev cards kan købes og spilles, men UI for at vælge ressourcer mangler:
- **Year of Plenty**: Spiller skal vælge 2 ressourcer — mangler resource picker modal
- **Monopoly**: Spiller skal vælge 1 ressource — mangler resource picker
- **Road Building**: Spiller skal vælge 2 edges — fungerer men UX er uklar
- **Knight**: Fungerer (vælg hex + steal target)
- Implementation: Modal/drawer med de 5 resource-ikoner (brug hires card images)
- Vigtige filer:
  - `packages/app/app/(mobile)/play/[gameId]/page.tsx` — tilføj modals
  - Opret `packages/app/components/game/ResourcePicker.tsx`

### 4. Player-to-Player Trade UI
**Status:** Trade-systemet virker i engine + socket, men mobil-UI er basal:
- Mangler proper trade proposal UI (vælg hvad du tilbyder/ønsker)
- Mangler trade notification til andre spillere
- Mangler accept/reject UI
- Mangler trade history/log
- Implementation: Slide-up drawer med resource cards, drag-to-trade
- Vigtige filer:
  - `packages/app/app/(mobile)/play/[gameId]/page.tsx` — trade UI sektion
  - Opret `packages/app/components/game/TradePanel.tsx`

## Vigtige tekniske detaljer

- Board bruger flat-top hexagoner med axial coordinates (q, r)
- Vertex ID format: `v:q1,r1:q2,r2:q3,r3` (sorteret triple)
- Edge ID format: `e:vertexA|vertexB` (sorteret pair)
- Edge har `edgeType: 'land' | 'sea' | 'coastal'`
- Ship pieces render altid upright (ingen rotation), spejlvendt når de sejler mod venstre
- Server kører på port 3030 (`packages/app/server.ts`)
- 57 engine tests + 3 test-filer, alle grønne
- Bot simulation logger til `scripts/logs/sim-{timestamp}.log`

## Kør tests
```bash
pnpm --filter @catan/game-engine test   # 57 tests
pnpm --filter @catan/app build          # TypeScript check
pnpm --filter @catan/app sim            # Headless bot simulation
pnpm --filter @catan/app sim:visual     # Visual Playwright simulation
```
