# AGENTS.md

## Project Overview

Browser mini-game collection (currently: Greedy Snake, 游龙52式) — TypeScript + webpack, no backend, no framework. DOM manipulation via `document.querySelector` and `offsetLeft/offsetTop`.

## Quick Start

```bash
npm install
npm run dev        # webpack-dev-server on localhost:8080
npm run build      # development build to dist/
npm run build:prod # production build to dist/ (minified, hashed filenames)
npm run typecheck  # tsc --noEmit
```

No test framework is configured yet. `npm run typecheck` runs the type checker.

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

### Loading a third-party library

Third-party libraries must never be statically imported from `index.ts` — `index.ts` is in the main bundle, so a static import would ship the library to every visitor of the home page. Load them through a dynamic `import()` in a separate module:

```ts
// src/games/<id>/runtime.ts
export async function createGame(container: HTMLElement) {
  const THREE = await import(/* webpackChunkName: "three" */ 'three')
  return new Game(container, THREE)
}

// src/games/<id>/Game.ts
import type * as THREE_NS from 'three'   // type-only import, erased at compile time
export class Game {
  constructor(container: HTMLElement, THREE: typeof THREE_NS) { /* ... */ }
}
```

`import type` produces no runtime dependency; `import()` is split into its own chunk under `dist/js/`. Give the chunk a name via the `webpackChunkName` magic comment so the output stays readable.

## Key Implementation Details

- **Grid system**: 10px increments. Stage is 304x304px, playable area is 30x30 cells (0–290px range).
- **Speed formula**: `300 - (level - 1) * 30` ms per tick. Starts at 300ms, min ~30ms at level 10.
- **Level-up**: Every 10 points. Max level 10.
- **Collision**: Throws `Error` on wall hit or self-collision. Caught in `GameControl.snakeRun()`.
- **Snake body**: New segments added via `insertAdjacentHTML('beforeend', '<div></div>')`.
- **Snake start**: The head spawns at the grid center (150,150) with an initial direction of `ArrowRight`, so the first input can never be an instant wall hit. `Snake.reset()` re-centers it (start / restart / power-off).

## Toolchain

- TypeScript 4.9, strict mode, ES2015 target, `module: ESNext`, `moduleResolution: node` (matches webpack's directory-index resolution). `ESNext` module is required for dynamic `import()` — TS 4.9 rejects it under `module: ES2015` (TS1323)
- Webpack 5 with babel-loader → ts-loader chain; `node_modules` is excluded from babel, so third-party code is not rewritten by core-js
- Less for styles, PostCSS with `postcss-preset-env` for browser compat
- Browser baseline is Chrome 108+ (`@babel/preset-env` target). `output.environment` keeps webpack's *runtime* ES5-only — it does not make the app IE10-compatible, since business code is transpiled for modern browsers
- Code splitting: the default vendor merging in `splitChunks` is disabled, so every dynamic `import()` becomes an independent chunk under `dist/js/`
- HTML template at `src/index.html`

## Conventions

- Comments are in Chinese (Simplified)
- Classes use getter/setter for coordinate access (`get X()`, `set X(val)`)
- DOM queries use non-null assertions (`!`) extensively
