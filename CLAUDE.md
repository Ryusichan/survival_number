# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A retro-styled arcade of three self-contained mini-games, built with Create React App + TypeScript + styled-components. All UI text is in Korean. The dev server runs on port **3005** (set in `.env`).

## Commands

- `npm start` — dev server (CRA, port 3005)
- `npm run build` — production build (`CI=false` so warnings don't fail the build)
- `npm test` — Jest/RTL in watch mode; `npm test -- <pattern>` to run a single test
- `npx tsc --noEmit` — typecheck without emitting (the fastest way to validate changes; CRA's build also typechecks)

Node 22.x is required (`engines` in package.json). TypeScript is pinned to 4.9 even though React types are v19.

## Architecture

`App.tsx` → `SelectMap` is the entire routing layer. There is **no router**: `SelectMap` holds a single `select` state string and conditionally renders one of three game components, passing each an `onExit` callback that resets `select` back to the menu. Each game is mounted with `key={select}` so switching games fully remounts (and resets) the component.

The three games live in `src/components/map/`:
- `NumberLaneGame.tsx` ("숫자를 더하라" / addGame) — lane-based math runner
- `ZoombieGame.tsx` ("좀비를 무찔러라" / zoombieGame) — zombie shooter
- `SpaceShooterMode.tsx` ("우주를 지켜라" / spaceGame) — vertical space shooter

Each game is large (1000–3000+ lines) and fully self-contained, but they all follow the **same internal pattern** — learn it once:

- A `Mode`/`Mode`-like union state drives the screen: typically `"playing" | "paused" | "cleared" | "gameover"` (SpaceShooterMode adds `"chapter"`). Render branches on this.
- **Game state lives in refs, not React state.** A `requestAnimationFrame` loop mutates refs (positions, enemies, bullets) every frame, and a separate `forceRender`/`useState(0)` tick or a render-only RAF loop pushes the visuals. React `useState` is reserved for coarse mode/stage/score that changes infrequently. Don't try to convert the per-frame ref mutations into React state.
- Stages/difficulty come from in-file config arrays (e.g. `stageSettings` in NumberLaneGame, `StageRule`/`SpaceEnemySpec` specs in SpaceShooterMode). Tuning gameplay = editing these arrays, not the loop.
- Type definitions for entities (enemies, bullets, players, items) are declared at the top of each file.

Shared pieces:
- `src/components/item/BackButton.tsx` — the absolute-positioned back + optional pause/play button overlay used by every game; pass `onExit`, optional `onPause`/`isPaused`.
- `src/components/map/DigitIcon.tsx` — renders a single digit as `/count/<n>.svg`. NumberLaneGame composes these into multi-digit numbers.
- `src/components/map/spaceSvgAssets.tsx` — inline SVG asset components for SpaceShooterMode.
- `src/enum/typeCollect.ts` — a few shared `Player`/`FallingNum` types (note: games often redefine their own local `Player` type instead of importing this).

## Conventions

- **styled-components** for the menu and chrome; many in-game elements use inline `style` objects for per-frame dynamic values. Transient styled-component props use the `$`-prefix (e.g. `$accent`, `$dx`).
- Imports use `baseUrl: "src"`, so `components/...` is an absolute import from `src/`.
- Visual style is deliberately retro/pixel: "Press Start 2P" font, scanline overlays, neon accents. Game art is in `public/` (`bg/`, `charactor/`, `items/`, `count/`).
- Comments and game-facing strings are in Korean; keep that consistent when editing.
