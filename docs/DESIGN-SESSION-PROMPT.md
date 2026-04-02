# Design Session — Starter Prompt

> Kopiér dette som din første besked i en ny Claude Code session i dette repo.

---

Læs `docs/DESIGN-BRIEF.md` — det er en komplet design-brief for Catan multiplayer spillet.

Motoren er færdig (GameEngine, Socket.IO multiplayer, board generation, 76 tests). Nu skal vi lave SOTA visuelt design. Alt er SVG.

**Opgaven:** Start to uafhængige design-agenter parallelt (brug Agent tool med isolation: "worktree"):

**Agent A — "Board Designer":**
Fokus på boardet og spillepladen. Lav SVG-eksempler (gemmes i `design/board/`) for:
1. Alle 8 terrain hex tiles med intern tekstur og variation (forest, pasture, fields, hills, mountains, desert, sea, gold_river)
2. Number tokens (pergament-stil med pip-dots)
3. Harbor markers (træ-skilt design)
4. Robber og Pirate figurer
5. Player pieces: settlement (lille hus), city (stor bygning), road (sti)
6. Dice (to terninger, 3D-isometrisk)
7. En komplet farvepalette til hele boardet

Hvert SVG skal være <5KB, skalere fra 30px til 120px, og fungere på mørk baggrund (#0e1a2e). Lav en HTML preview-side der viser alle elementer samlet.

**Agent B — "Card & Mobile Designer":**
Fokus på kort og mobil-UI. Lav SVG-eksempler (gemmes i `design/cards/`) for:
1. Alle 5 resource cards (lumber, brick, wool, grain, ore) — kompakt format med ikon + antal
2. Alle 5 development cards (knight, victory point, road building, year of plenty, monopoly) — med bagside
3. Building cost reference panel til mobil (viser priser med resource-ikoner, highlight grøn/grå baseret på hvad spilleren har råd til)
4. Spillerens hånd-layout (ressourcer + dev cards + actions)
5. Scoreboard entry (spillernavn, farve, VP, stats)
6. Turn-phase indikator

Hvert design skal fungere i dark theme på en mobil-skærm (~375px bred). Lav en HTML preview-side der viser alle elementer.

**Begge agenter:** Tænk premium brætspil — varme materialer, taktile texturer, middelalder-tema. Ikke programmer-art, men heller ikke hyper-realistisk. Stiliseret, clean, læseligt. Tilgængeligt for farveblinde (brug mønstre/ikoner, ikke kun farve).

Når begge er færdige, sammenlign deres output og lav en samlet anbefaling.
