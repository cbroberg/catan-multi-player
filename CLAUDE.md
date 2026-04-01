# Catan Multiplayer — Project Context

Digital Catan med storskærm (TV/monitor) som spilleplade og mobiltelefoner som spillerkort.

## CRITICAL: Read the plan first
Before writing ANY code, read `docs/CATAN-PLAN.md` thoroughly. It contains complete Catan rules, board generation algorithms, data models, architecture decisions, and implementation phases. Every decision in that document is deliberate.

## Stack
- Next.js 16+ (App Router), React 19+, TypeScript (strict)
- Tailwind CSS v4 (CSS-first config, NO tailwind.config.js)
- shadcn/ui (latest v4-compatible)
- Socket.IO for real-time WebSocket communication
- SVG board rendering + Canvas animation overlay
- SQLite/Drizzle for persistence (game history, leaderboards, curated boards)
- Fly.io deploy (min_machines_running = 1, persistent volume)
- pnpm + Turbo monorepo

## Monorepo Structure
```
packages/
  app/               — Next.js app (board + mobile views, API, Socket.IO)
  game-engine/       — Pure game logic (ZERO framework dependencies)
  shared/            — Types, constants, utilities
```

## Key Docs
- `docs/CATAN-PLAN.md` — Complete game design, rules, architecture, decisions

## Architecture Rules

### Game Engine (`@catan/game-engine`)
- MUST be pure TypeScript — no React, no Next.js, no DOM, no Node.js APIs
- All game rules, validation, state machine, board generation, timer logic
- Exported as ES modules, usable by both server and client
- Board uses flat-top hexagons with axial coordinates (q, r) based on Red Blob Games
- Board generation evaluates up to 600 random layouts, returns highest balance score

### App (`@catan/app`)
- Single Next.js app serving both big screen AND mobile via route groups
- `app/(board)/game/[gameId]/` — Big screen view (TV/monitor)
- `app/(board)/lobby/[gameId]/` — Lobby with QR code
- `app/(mobile)/play/[gameId]/` — Player hand + mini-board
- `app/(mobile)/join/` — QR/code entry + color/avatar selection
- Server-authoritative: ALL game state lives on server, clients send actions only
- Socket.IO for real-time state sync

### Rendering
- SVG for the board: hexagons, vertices (settlements/cities), edges (roads), harbors
- Each vertex and edge MUST be individually clickable (React SVG components)
- Canvas overlay layer for animations only (dice roll, robber movement, hourglass timer)
- Board must scale to any screen size (responsive SVG viewBox)

### Lobby (same pattern as apple-music-mcp quiz)
- Game Master creates game → server generates 5-digit code + QR
- Players scan/enter code on mobile → choose color + name + avatar
- Server rolls dice for all players to determine turn order

## Coding Standards
- Use ES modules (import/export) everywhere
- Prefer server components in Next.js — use 'use client' only when necessary
- All game state types defined in `@catan/shared`
- Board coordinates: always use { q: number, r: number } (axial), compute s = -q-r when needed
- Name hex terrain types exactly: 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert'
- Name resources exactly: 'lumber' | 'wool' | 'grain' | 'brick' | 'ore'

## Current Phase
Phase 1 — Core Engine + Board Visualization (MVP). See docs/CATAN-PLAN.md section 7.
