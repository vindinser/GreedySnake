# AGENTS.md

## Project Overview

Greedy Snake browser game — TypeScript + webpack, no backend, no framework. DOM manipulation via `document.querySelector` and `offsetLeft/offsetTop`.

## Quick Start

```bash
npm install
npm run dev       # webpack-dev-server on localhost:8080
npm run build     # production build to dist/
```

No test framework is configured. No lint or typecheck commands exist.

## Architecture

Entry: `src/index.ts` → instantiates `GameControl`.

Four classes in `src/moduls/` (note: directory is misspelled as "moduls"):

| Class | File | Responsibility |
|---|---|---|
| `GameControl` | `GameControl.ts` | Orchestrates game loop, keyboard input, collision detection |
| `Snake` | `Snake.ts` | DOM-based snake movement, wall/self collision |
| `Food` | `Food.ts` | Random food positioning |
| `ScorePanel` | `ScorePanel.ts` | Score tracking, level-ups |

## Key Implementation Details

- **Grid system**: 10px increments. Stage is 304x304px, playable area is 30x30 cells (0–290px range).
- **Speed formula**: `300 - (level - 1) * 30` ms per tick. Starts at 300ms, min ~30ms at level 10.
- **Level-up**: Every 10 points. Max level 10.
- **Collision**: Throws `Error` on wall hit or self-collision. Caught in `GameControl.snakeRun()`.
- **Snake body**: New segments added via `insertAdjacentHTML('beforeend', '<div></div>')`.

## Toolchain

- TypeScript 4.9, strict mode, ES2015 target/module
- Webpack 5 with babel-loader → ts-loader chain
- Less for styles, PostCSS with `postcss-preset-env` for browser compat
- Webpack configured for IE 10 compat (no arrow functions, no const in output)
- HTML template at `src/index.html`

## Conventions

- Comments are in Chinese (Simplified)
- Classes use getter/setter for coordinate access (`get X()`, `set X(val)`)
- DOM queries use non-null assertions (`!`) extensively
