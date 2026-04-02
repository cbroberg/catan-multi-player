# Catan Expansions — Complete Reference

> Oversigt over alle officielle Catan-udvidelser vi skal understøtte.
> Prioriteret i tiers: T1 = Phase 1-5, T2 = Phase 6, T3 = fremtidig, T4 = out of scope.

---

## Tier 1 — Base Game (Phase 1-5)

### CATAN Base Game (3-4 players)
- 19 hex tiles, 5 resource types, robber, development cards
- 10 VP to win
- Our core implementation

### CATAN 5-6 Player Extension
- Expands base game to 5-6 players
- 30 hex tiles (11 extra), more number tokens, harbors
- Adds **Special Building Phase** between turns (all non-active players may build)
- Extra pieces: 10 settlements, 8 cities, 30 roads (2 new colors)
- Already planned in Phase 6

---

## Tier 2 — Major Expansions (Phase 6+)

### 1. CATAN: Seafarers
- **Released:** 1997 | **Players:** 3-4 (5-6 with extension)
- **Key additions:**
  - Ships (water roads, cost: wool + lumber) — can be moved
  - Ocean hex tiles + gold river hex (produces any resource)
  - Pirate (water version of robber)
  - Discovery of new islands
  - 9 different scenarios with progressive difficulty
- **VP to win:** 13 (varies by scenario)
- **Board impact:** Much larger board, variable map shapes, sea frame pieces
- **New terrain types:** Ocean, Gold River
- **New pieces:** Ships (15 per player)
- **Combinable with:** Cities & Knights, Traders & Barbarians
- **5-6 Player Extension:** Yes

### 2. CATAN: Cities & Knights
- **Released:** 1998 | **Players:** 3-4 (5-6 with extension)
- **Key additions:**
  - 3 commodities: Coin (mountains), Paper (forests), Cloth (pastures)
  - City improvements in 3 tracks: Science, Trade, Politics
  - Metropolis (worth 4 VP, immune to barbarians)
  - Knights (3 levels: basic, strong, mighty) — must be activated with grain
  - Barbarian attacks (event die triggers invasion fleet)
  - Progress cards replace development cards (more varied effects)
  - City walls (hold more cards when 7 is rolled)
  - Event die (replaces robber on some rolls with barbarian/event)
- **VP to win:** 13
- **Board impact:** Same board as base, but adds flip-chart city improvement boards per player
- **New pieces:** Knights (6 per player, 3 ranks), city walls (3 per player), metropolis markers
- **Combinable with:** Seafarers, Traders & Barbarians
- **5-6 Player Extension:** Yes
- **Complexity:** Significantly higher — longest games

### 3. CATAN: Traders & Barbarians
- **Released:** 2008 | **Players:** 3-4 (5-6 with extension)
- **Key additions:** Bundle of 5 independent scenarios + variants:
  1. **The Fishermen of Catan** — fish tokens from coastal hexes, trade for resources/dev cards
  2. **The Rivers of Catan** — river tiles, gold coins, bridges, bonus VP for wealth
  3. **The Caravans** — camel meeples, oasis hex, voting mechanic
  4. **Barbarian Invasion** — barbarians sweep across board, recruit knights to defend
  5. **Traders & Barbarians** — wagons, delivery routes, trade goods, coins
- **Also includes official 2-player variant rules**
- **New terrain types:** Oasis, River tiles
- **New pieces:** Wagons, camels, barbarians, knights, bridges, fish tokens, gold coins
- **Combinable with:** Seafarers, Cities & Knights
- **5-6 Player Extension:** Yes

### 4. CATAN: Explorers & Pirates
- **Released:** 2013 | **Players:** 3-4 (5-6 with extension)
- **Key additions:**
  - 5 progressive scenarios building on each other
  - Ships carry settlers, soldiers, or goods (physically placed on ship pieces)
  - Harbor settlements (new building type, replace cities)
  - Explore fog-covered islands
  - Fight pirates with soldiers
  - Deliver spice/fish to council of Catan for VP
  - No trading with other players (self-sufficient economy)
  - No development cards
  - No Longest Road
- **VP to win:** Varies by scenario (up to 17)
- **Board impact:** Much larger board with hidden tiles
- **New pieces:** Ships (transport), settlers, soldiers, pirate lairs, spice/fish sacks
- **Combinable with:** Cities & Knights (limited), Traders & Barbarians (limited)
- **5-6 Player Extension:** Yes
- **Note:** Most standalone-feeling expansion, recommended NOT to combine

---

## Tier 3 — Scenario Packs & Mini-Expansions (Future)

### CATAN: Treasures, Dragons & Adventurers
- **Requires:** Base + Seafarers + Cities & Knights
- 6 scenarios: Desert Dragons, The Great Canal, The Enchanted Land, The Treasure Islands, Greater Catan, Departure Into The Unknown
- New components: dragon figures (19), treasure tokens (20), canal tokens, extra terrain tiles
- Originally digital-only, physical release 2021

### CATAN: Helpers of Catan
- Mini-expansion compatible with Base + Seafarers
- Each player gets a helper character card with a unique bonus ability
- 10 helper cards

### CATAN: Frenemies
- Rewards altruistic behavior with favor tokens
- Moving robber harmlessly, giving away resources, connecting roads to opponents
- Favor tokens can be redeemed for VP or resources

### CATAN: Oil Springs
- Environmental scenario — oil fields produce any resource or build metropolis
- Disasters if too much oil used
- Oil can be sequestered for VP
- Free download / print-and-play available

### CATAN: Crop Trust
- Cooperative scenario — players work together to fund a seed vault
- Unique cooperative win condition alongside competitive play

### CATAN Scenarios: Legend of the Sea Robbers
- 4 linked campaign scenarios for Seafarers
- Progressive narrative across sessions

### CATAN Scenarios: Legend of the Conquerors
- Campaign scenarios for Cities & Knights
- Linked narrative

---

## Tier 4 — Standalone Games (Out of Scope)

These are separate games, NOT expansions. Listed for reference only:

- **CATAN Junior** — simplified kids version
- **CATAN: Starfarers** — space theme, completely different mechanics
- **CATAN: Rise of the Inkas** — civilizations rise and fall
- **CATAN: Dawn of Humankind** (Settlers of the Stone Age reprint)
- **A Game of Thrones: CATAN** — Night's Watch theme
- **Star Trek: CATAN** — Star Trek reskin
- **CATAN: Settlers of America** — US map, railroads
- **Rivals for CATAN** — 2-player card game
- **CATAN: Logic Puzzle** — solo puzzle game

---

## Implementation Impact Matrix

| Expansion | New Terrain Types | New Piece Types | Board Size Change | New Mechanics | Complexity |
|-----------|------------------|-----------------|-------------------|---------------|------------|
| **5-6 Players** | — | 2 new colors | 30 hexes | Special Building Phase | Low |
| **Seafarers** | Ocean, Gold | Ships | Much larger | Ship movement, pirate, exploration | Medium |
| **Cities & Knights** | — | Knights, walls, metropolis | Same | Commodities, city improvements, barbarians, event die | High |
| **Traders & Barbarians** | Oasis, River | Wagons, camels, knights | Same + new tiles | 5 independent scenarios, 2-player mode | Medium |
| **Explorers & Pirates** | Fog (hidden) | Transport ships, soldiers, settlers | Much larger | Exploration, pirate combat, no trading | High |
| **Treasures/Dragons** | — | Dragons | Slightly larger | Dragon combat, canal building, treasures | High |

---

## Architecture Implications

Designing for expansion support from day 1 means:

1. **Terrain types must be extensible** — enum/union type, not hardcoded list
2. **Piece types must be extensible** — settlements, cities, roads, ships, knights, wagons, etc.
3. **Board shape must be flexible** — not just the standard 3-4-5-4-3 hexagonal shape
4. **VP win condition must be configurable** — 10, 13, 17, or custom
5. **Resource types must be extensible** — base 5 + commodities (coin, paper, cloth) + gold
6. **Turn phases must be pluggable** — Cities & Knights completely changes the dice/event system
7. **Trading rules vary** — Explorers & Pirates has no player trading
8. **Development cards are replaced** in Cities & Knights with progress cards
9. **Multiple "robber" entities** — robber (land), pirate (sea), barbarians (army)
10. **Board generation must support variable board shapes** — islands, channels, fog tiles

### Recommended Type Design

```typescript
// Extensible terrain — new expansions add to this union
type TerrainType = 
  | 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert'
  // Seafarers
  | 'ocean' | 'gold_river'
  // Traders & Barbarians
  | 'oasis' | 'river'
  // Explorers & Pirates  
  | 'fog';

// Extensible resources
type ResourceType = 
  | 'lumber' | 'wool' | 'grain' | 'brick' | 'ore'
  // Seafarers
  | 'gold'
  // Cities & Knights commodities
  | 'coin' | 'paper' | 'cloth';

// Extensible building/piece types
type PieceType =
  | 'settlement' | 'city' | 'road'
  // Seafarers
  | 'ship'
  // Cities & Knights
  | 'knight_basic' | 'knight_strong' | 'knight_mighty'
  | 'city_wall' | 'metropolis'
  // Traders & Barbarians
  | 'wagon' | 'bridge'
  // Explorers & Pirates
  | 'harbor_settlement' | 'transport_ship' | 'soldier' | 'settler_piece';

// Game mode determines which rules/expansions are active
type GameMode = 
  | 'base'
  | 'base_5_6'
  | 'seafarers'
  | 'seafarers_5_6'
  | 'cities_knights'
  | 'cities_knights_5_6'
  | 'traders_barbarians'
  | 'explorers_pirates'
  | 'seafarers_cities_knights'  // combined
  | 'treasures_dragons';        // requires SF + C&K
```

This ensures the game engine is expansion-aware from the start, even if we only implement the base game initially.
