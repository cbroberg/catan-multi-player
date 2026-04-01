# Catan Multiplayer — Project Context

Digital Catan med storskærm + mobiltelefoner.

## Stack
- Next.js 16+ (App Router), React 19+, TypeScript
- Tailwind CSS v4 (CSS-first), shadcn/ui
- Socket.IO for real-time
- SVG board + Canvas animation overlay
- SQLite/Drizzle, Fly.io deploy
- pnpm + Turbo monorepo

## Key Docs
- `docs/CATAN-PLAN.md` — Complete game design, rules, architecture

## Packages
- `@catan/app` — Next.js app (board + mobile views, API, Socket.IO)
- `@catan/game-engine` — Pure game logic (rules, state machine, board gen, timer)
- `@catan/shared` — Types, constants, utilities

## Rendering
- SVG for board (hex grid, vertices, edges — klikbare React components)
- Canvas overlay for animations (dice, robber, hourglass timer)
- Flat-top hexagons, axial coordinates (q, r)

## Architecture
- Server-authoritative: all game logic on server, clients send actions only
- Single Next.js app with route groups: (board)/ for TV, (mobile)/ for phones
- Lobby: QR code + 5-digit code (same pattern as apple-music-mcp quiz)
