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

Tests are a menu smoke test (`src/App.test.tsx`) plus `src/components/map/games.smoke.test.tsx`, which mounts each game **inside `React.StrictMode`** and drives 120–180 real frames through a mocked `requestAnimationFrame`. That StrictMode wrapper is the point: the game loops put side effects inside state updaters, so double-invocation is the failure mode worth guarding. Don't use `jest.useFakeTimers()` there — it replaces `requestAnimationFrame` too and breaks the frame driver.

## Architecture

`App.tsx` → `SelectMap` is the entire routing layer. There is **no router**: `SelectMap` holds a single `select` state string and conditionally renders one of three game components, passing each an `onExit` callback that resets `select` back to the menu. Each game is mounted with `key={select}` so switching games fully remounts (and resets) the component. Nothing is persisted — no `localStorage`, no backend — so exiting a game discards all progress by design.

The three games live in `src/components/map/`:
- `NumberLaneGame.tsx` ("숫자를 더하라" / addGame) — lane-based math runner
- `ZoombieGame.tsx` ("좀비를 무찔러라" / zoombieGame) — zombie shooter
- `SpaceShooterMode.tsx` ("우주를 지켜라" / spaceGame) — vertical space shooter

Each game is 2700–3200 lines and fully self-contained, but they share the **same internal skeleton** — learn it once:

- **Everything is in one file.** Entity types, tuning constants, stage config arrays, inline SVG sub-components, the RAF loop, and the JSX all live in the game's own file, in that order. Tuning gameplay means editing the config arrays (`stageSettings`, `STAGE_RULES`, `ENEMY_SPECS`, `WEAPONS`, `BOSS_MISSIONS`), not the loop.
- A `Mode` union drives the screen: `"playing" | "paused" | "cleared" | "gameover"` (SpaceShooterMode adds `"chapter"`). Render branches on this.
- **A `requestAnimationFrame` loop keyed on the mode** does all simulation. `dt` is always clamped to `Math.min(0.033, …)` in every game so a backgrounded tab doesn't teleport entities on resume — preserve that clamp when touching a loop.
- **React state is for coarse values; per-frame data is mutated in bulk.** `useState` holds mode/stage/score; positions, enemies, and bullets are updated once per frame. Don't convert per-frame data into individual `useState` calls.
- Keyboard input is `window` `keydown` listeners; touch input is recorded into a ref during `touchmove` and applied inside the RAF loop (a `setState` per `touchmove` doubles renders per frame — there's an in-code comment saying so). Containers set `touchAction: "none"`.

### The StrictMode trap

`App.tsx` wraps everything in `React.StrictMode`, so **functional state updaters run twice**. Never put side effects (`setPlayer`, `setStage`, score accumulation) inside a `setX(prev => …)` updater in the loop — the effect gets applied twice and values double. The established pattern is: compute the next frame purely (reading from a ref mirror of the state), then apply state changes once, outside the updater. `NumberLaneGame` carries an explicit ⚠️ comment about this at its loop.

### How each game stores frame state (they differ)

- `SpaceShooterMode` — a single `g = useRef<GameState>` mutated in place, then `forceRender(t => t + 1)`. It also runs a second **render-only RAF loop** for non-playing modes so touch/keyboard still moves the ship on menus.
- `ZoombieGame` — a `world` React state committed once per frame via `setWorld(prev => …)`, with `worldRef` mirroring it for event handlers.
- `NumberLaneGame` — rows are computed from `rowsRef` into a fresh array, then committed with a single `setRows`; `latestX` / `latestValue` / `latestStage` refs mirror state for the loop.

### Coordinates and layout

All three games use the same normalized space: **y is 0 (top) → 1 (bottom)**, **x is in lane units 0…`LANE_COUNT` (5)**, converted to pixels only at render time. Play area is portrait and capped at `MAX_WIDTH = 480`. Viewport size comes from a `visualViewport` resize/scroll effect (not `innerHeight`) so mobile browser chrome doesn't break the layout; `BackButton` uses `env(safe-area-inset-top)`.

`NumberLaneGame` adds a pseudo-3D road: `makeProjectors(height)` returns `projectRowYpx` / `getPerspective`, driven by `GAMMA_Y` and `VANISH_RATIO`, so rows accelerate and widen toward the player. Anything positioned in that lane view must go through those projectors, not raw y.

### Shared pieces

- `src/components/item/BackButton.tsx` — the absolute-positioned back + optional pause/play overlay used by every game; pass `onExit`, optional `onPause`/`isPaused`.
- `src/components/map/DigitIcon.tsx` — renders a single digit as `/count/<n>.svg`. NumberLaneGame composes these into multi-digit numbers.
- `src/components/map/spaceSvgAssets.tsx` — inline SVG asset components for SpaceShooterMode.
- `src/enum/typeCollect.ts` — vestigial `Player`/`FallingNum` types; nothing imports them. Games define their own local `Player`.

Note that duplication across games is intentional and common: `LANE_COUNT`, `MAX_WIDTH`, `FIRST_STAGE_TARGET`, `NEXT_STAGE_STEP`, `MAX_STAGE`, `clamp`, and the `WeaponId`/`CombatState` shapes are re-declared per file with slightly different values. Changing one game's constants does not affect the others — and don't hoist them into a shared module without being asked.

## Conventions

- **styled-components** for the menu and chrome; in-game elements use inline `style` objects for per-frame dynamic values. Transient styled-component props use the `$`-prefix (e.g. `$accent`, `$dx`).
- Imports use `baseUrl: "src"`, so `components/...` is an absolute import from `src/`.
- Visual style is deliberately retro/pixel: "Press Start 2P" font, scanline overlays, neon accents. Game art is in `public/` (`bg/`, `charactor/`, `items/`, `count/`) — note the misspelled `charactor` directory.
- Comments and game-facing strings are in Korean; keep that consistent when editing.
