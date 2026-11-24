# AGENTS.md

## Project Overview

Browser mini-game collection (currently: Greedy Snake, 游龙52式) — TypeScript + webpack, no backend, no framework. DOM manipulation via `document.querySelector` and `offsetLeft/offsetTop`.

## Quick Start

```bash
npm install
npm run dev       # webpack-dev-server on localhost:8080
npm run build     # production build to dist/
```

No test framework is configured. No lint or typecheck commands exist (`npx tsc --noEmit` works).

## Architecture

Entry: `src/index.ts` → instantiates `App`.

Two views live in `src/index.html` and are toggled by the `show` class: the home page (`#homeView`, game picker) and the game view (`#gameView`, title bar + `#gameContent` mount point).

`App` (`src/moduls/App.ts`) renders the home page from the game registry and switches views.

| File | Responsibility |
|---|---|
| `src/games/types.ts` | `GameModule` / `GameInstance` interfaces — the extension point for new games |
| `src/games/index.ts` | Game registry — add a game by appending one entry here |
| `src/games/snake/index.ts` | Snake game module: injects the console template, owns the `GameControl` lifecycle |
| `src/games/snake/template.ts` | Snake console HTML template |
| `src/games/dragon52/index.ts` | 游龙52式 game module: injects the card template, toggles the `theme-pink` body class |
| `src/games/dragon52/cards.ts` | 52 card definitions (4 suits × 13 ranks), special-event table |
| `src/games/dragon52/Dragon52.ts` | 游龙52式 controller: shuffle, draw, special events, scoring, deck track |
| `src/games/dragon52/template.ts` | 游龙52式 HTML template |
| `src/games/dragon52/style.less` | 游龙52式 styles (imported by the module, pink theme) |
| `src/moduls/App.ts` | App shell: home page rendering, view switching, game mount/destroy |

Four classes in `src/moduls/` (note: directory is misspelled as "moduls"):

| Class | File | Responsibility |
|---|---|---|
| `GameControl` | `GameControl.ts` | Orchestrates game loop, keyboard input, collision detection; `destroy()` releases timers/listeners |
| `Snake` | `Snake.ts` | DOM-based snake movement, wall/self collision |
| `Food` | `Food.ts` | Random food positioning |
| `ScorePanel` | `ScorePanel.ts` | Score tracking, level-ups |

`Snake` / `Food` / `ScorePanel` / `GameControl` query elements **inside the container passed to their constructor**, never `document` — one game can be mounted at a time.

## Adding a game

1. Create `src/games/<id>/index.ts` exporting a `GameModule` (`id`, `name`, `title`, `description`, `icon`, `mount(container)`).
2. `mount()` must render its own DOM into `container` and return `{ destroy() }` that clears timers and listeners.
3. Register it in `src/games/index.ts`.
4. A game may own its own `.less` (import it from the module) and may set a `theme-*` class on `document.body` — remove it in `destroy()`.

## Key Implementation Details

- **Grid system**: 10px increments. Stage is 304x304px, playable area is 30x30 cells (0–290px range).
- **Speed formula**: `300 - (level - 1) * 30` ms per tick. Starts at 300ms, min ~30ms at level 10.
- **Level-up**: Every 10 points. Max level 10.
- **Collision**: Throws `Error` on wall hit or self-collision. Caught in `GameControl.snakeRun()`.
- **Snake body**: New segments added via `insertAdjacentHTML('beforeend', '<div></div>')`.
- **Snake start**: The head spawns at the grid center (150,150) with an initial direction of `ArrowRight`, so the first input can never be an instant wall hit. `Snake.reset()` re-centers it (start / restart / power-off).

## Toolchain

- TypeScript 4.9, strict mode, ES2015 target/module, `moduleResolution: node` (matches webpack's directory-index resolution)
- Webpack 5 with babel-loader → ts-loader chain
- Less for styles, PostCSS with `postcss-preset-env` for browser compat
- Webpack configured for IE 10 compat (no arrow functions, no const in output)
- HTML template at `src/index.html`

## Conventions

- Comments are in Chinese (Simplified)
- Classes use getter/setter for coordinate access (`get X()`, `set X(val)`)
- DOM queries use non-null assertions (`!`) extensively
