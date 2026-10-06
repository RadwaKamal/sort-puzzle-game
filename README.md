# Potion Sort

A casual sort puzzle game: pour colored potions between flasks until every flask holds one
color. Built for Android first with a single web codebase (see `CLAUDE.md` for the full project
brief, milestones, and constraints).

## Tech stack

- TypeScript + Phaser 3 (game engine)
- Vite (dev server and build)
- Vitest (unit tests for game logic)
- Capacitor (native Android/iOS wrapper, added in a later milestone)

## Setup

Requires [Node.js](https://nodejs.org/) 20 or later.

```bash
npm install
```

## Run the game

Starts a dev server with hot reload at http://localhost:5173:

```bash
npm run dev
```

## Build

Type-checks and bundles for production into `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Test

Runs the Vitest suite (pure game logic in `src/core/`, no Phaser/browser needed):

```bash
npm run test
```

Watch mode while developing:

```bash
npm run test:watch
```

## Lint and format

```bash
npm run lint
npm run format
```

## Project status

Currently on **Milestone 1** of the plan in `CLAUDE.md`: project scaffold with a blank Phaser
scene running in the browser. See `CLAUDE.md` for the full milestone list and game design.

## Repo structure

```text
src/
  main.ts       Phaser game config and boot
  theme.ts      colors, fonts, sizes (single source of truth for the visual theme)
  core/         pure game logic (board state, level generation, solver) — no Phaser imports
  scenes/       Phaser scenes (Boot, Menu, LevelSelect, Game, Settings)
  view/         flask drawing, pour animation, particles
  services/     ads, save/load storage, audio/haptics
tests/          Vitest tests for src/core/
public/assets/  fonts and sounds bundled with the app
```
