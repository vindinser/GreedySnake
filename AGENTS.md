# AGENTS.md

## Project Overview

Browser mini-game collection (currently: 惊喜点点, Greedy Snake, 游龙52式, 2048, 扫雷, 翻牌配对, 打砖块) — TypeScript + webpack, no backend, no framework. DOM manipulation via `document.querySelector` and `offsetLeft/offsetTop`.

## Quick Start

```bash
npm install
npm run dev         # webpack-dev-server on localhost:8080
npm run build       # development build to dist/
npm run build:prod  # production build to dist/ (minified, hashed filenames)
npm run typecheck   # tsc --noEmit -p tsconfig.test.json
npm test            # vitest run (unit + smoke tests)
npm run test:watch  # vitest in watch mode
npm run verify:e2e  # headless-browser E2E over dist/ (needs `npm run build:prod` first)
```

## Architecture

Entry: `src/index.ts` → instantiates `App`.

Two views live in `src/index.html` and are toggled by the `show` class: the home page (`#homeView`, game picker) and the game view (`#gameView`, title bar + `#gameContent` mount point).

`App` (`src/moduls/App.ts`) renders the home page from the game registry, owns the hash route, and is the only place allowed to touch `document.body` theme classes.

### Shared core — `src/core/`

Every game builds on these instead of re-implementing timers, input, audio and persistence.

| Module | Exports | Notes |
|---|---|---|
| `core/loop.ts` | `GameLoop` | Single `requestAnimationFrame`; `dt` clamped to `maxDelta` (0.05 s); auto-pause when the tab is hidden, auto-resume only if the pause was caused by hiding |
| `core/input.ts` | `InputManager`, `Direction` | Keyboard (`onKey` / `onAnyKey` / `onDirection`) and pointer swipe (`onSwipe`); directions are normalised to `up`/`down`/`left`/`right` from arrow keys **and** WASD; every subscription returns an unsubscribe function |
| `core/audio.ts` | `audio`, `AudioEngine`, `SfxSpec` | WebAudio synthesis, no audio asset files; 15 built-in 8-bit sounds (`click/move/eat/coin/flip/place/clear/boom/win/lose/laser/explode/blip/select/error`); games may `define()` their own; mute state persists |
| `core/storage.ts` | `storage` | `localStorage` behind a `gs:` prefix, JSON-serialised, silently falls back when storage is unavailable |
| `core/dispose.ts` | `DisposableGroup` | Reverse-order, idempotent disposer collection |

### Shared UI — `src/ui/`

`createButton` / `createPanel` / `createOverlay` / `createHud` / `createLoading` — all styled from the CSS custom properties in `src/style/index.less` via `src/style/ui.less`. Use these instead of hand-rolling buttons and panels.

### Game registry

| File | Responsibility |
|---|---|
| `src/games/types.ts` | `GameModule` / `GameInstance` / `GameCategory` — the extension point for new games |
| `src/games/index.ts` | Game registry — add a game by appending one entry here |
| `src/games/snake/index.ts` | Snake game module: injects the console template, owns the `GameControl` lifecycle |
| `src/games/snake/template.ts` | Snake console HTML template |
| `src/games/dragon52/index.ts` | 游龙52式 game module: injects the card template, declares `theme: 'dragon52'` |
| `src/games/dragon52/cards.ts` | 52 card definitions (4 suits × 13 ranks), special-event table |
| `src/games/dragon52/Dragon52.ts` | 游龙52式 controller: shuffle, draw, special events, scoring, deck track |
| `src/games/dragon52/template.ts` | 游龙52式 HTML template |
| `src/games/dragon52/style.less` | 游龙52式 styles (imported by the module, pink theme) |
| `src/games/game2048/index.ts` | 2048 game module: injects the board template, declares `theme: '2048'` |
| `src/games/game2048/logic.ts` | 2048 board logic as pure functions (move / merge / dead-board) — no DOM, unit-testable |
| `src/games/game2048/Game2048.ts` | 2048 controller: rendering, input, SFX, high score |
| `src/games/game2048/style.less` | 2048 styles (imported by the module, amber theme) |
| `src/games/minesweeper/index.ts` | 扫雷 game module: injects the board template, declares `theme: 'minesweeper'` |
| `src/games/minesweeper/logic.ts` | 扫雷 board logic as pure functions (mine placement / flood-fill reveal / flagging / win check) |
| `src/games/minesweeper/Minesweeper.ts` | 扫雷 controller: rendering, pointer input, timer, high scores |
| `src/games/minesweeper/style.less` | 扫雷 styles (imported by the module, steel-blue theme) |
| `src/games/memory/index.ts` | 翻牌配对 game module: injects the board template, declares `theme: 'memory'` |
| `src/games/memory/logic.ts` | 翻牌配对 deck + matching rules as pure functions |
| `src/games/memory/Memory.ts` | 翻牌配对 controller: rendering, flip animation, move counting, high scores |
| `src/games/memory/style.less` | 翻牌配对 styles (imported by the module, green-felt theme, 3D flip) |
| `src/games/breakout/index.ts` | 打砖块 game module: async mount with a loading placeholder, declares `theme: 'breakout'` |
| `src/games/breakout/runtime.ts` | The dynamic-`import()` boundary for `matter-js` — the only place the physics engine is referenced |
| `src/games/breakout/logic.ts` | 打砖块 level + brick-layout logic as pure functions |
| `src/games/breakout/Breakout.ts` | 打砖块 controller: canvas rendering, matter.js bodies, scoring, high score |
| `src/games/breakout/style.less` | 打砖块 styles (imported by the module, neon-blue theme) |
| `src/games/surprise/index.ts` | 惊喜点点 game module: birthday surprise entry, declares `special: true` + `theme: 'surprise'` |
| `src/games/surprise/lines.ts` | 惊喜点点 password check / random rounds / playful lines + confession text as pure functions |
| `src/games/surprise/Surprise.ts` | 惊喜点点 controller: password gate, button chase, typewriter confession, particle FX |
| `src/games/surprise/template.ts` | 惊喜点点 HTML template (birthday stage: cake, balloons, stars, letter) |
| `src/games/surprise/style.less` | 惊喜点点 styles (imported by the module, pink-night theme) |
| `src/ui/cardFace.ts` | Shared card primitives — the single definition of suits and ranks, used by 游龙52式 and 翻牌配对 |

Four classes in `src/moduls/` (note: directory is misspelled as "moduls"):

| Class | File | Responsibility |
|---|---|---|
| `GameControl` | `GameControl.ts` | Orchestrates the game loop, keyboard input, collision detection; `destroy()` stops the loop and unbinds input |
| `Snake` | `Snake.ts` | DOM-based snake movement, wall/self collision |
| `Food` | `Food.ts` | Random food positioning |
| `ScorePanel` | `ScorePanel.ts` | Score tracking, level-ups |

`Snake` / `Food` / `ScorePanel` / `GameControl` query elements **inside the container passed to their constructor**, never `document` — one game can be mounted at a time.

### Routing

The hash is the single source of truth: `#/home` is the home page, `#/<gameId>` is a game. `App` listens to `hashchange` and mounts/unmounts accordingly; unknown ids fall back to `#/home`. Returning home uses `history.replaceState` so the browser back button does not re-enter the game you just left. Deep links (`dist/index.html#/snake`) work.

### Theming

Theme tokens live as CSS custom properties on `body` (`--gs-accent`, `--gs-surface`, `--gs-border`, `--gs-text`, `--gs-text-dim`, `--gs-accent-soft`, `--gs-accent-dark`). A game declares `theme: '<name>'` and the shell adds `body.theme-<name>` on mount and removes it on unmount — **games never touch `document.body` themselves**. The home page uses the base dark tokens.

## Adding a game

1. Create `src/games/<id>/index.ts` exporting a `GameModule` (`id`, `name`, `title`, `description`, `icon`, optional `category` / `tags` / `theme`, `mount(container)`).
2. `mount()` must render its own DOM into `container` and return `{ destroy() }` that clears timers and listeners.
3. Register it in `src/games/index.ts`.
4. Build on `src/core/` and `src/ui/` — do not re-implement game loops, keyboard handling, audio or persistence.
5. A game may own its own `.less` (import it from the module). Theme switching goes through the declarative `theme` field, not by adding body classes in `mount()`.

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
- **Collision**: Throws `Error` on wall hit or self-collision. Caught in `GameControl.step()`.
- **Snake body**: New segments added via `insertAdjacentHTML('beforeend', '<div></div>')`.
- **Snake start**: The head spawns at the grid center (150,150) with an initial direction of `right`, so the first input can never be an instant wall hit. `Snake.reset()` re-centers it (start / restart / power-off).
- **Movement**: the snake advances inside `GameLoop.update()` via a millisecond accumulator, so the tick rate no longer drifts and the game pauses itself when the tab is hidden.
- **Directions**: normalised to `up`/`down`/`left`/`right` by `core/input`; the d-pad buttons carry `data-dir="up|down|left|right"`.
- **High scores**: persisted via `core/storage` under `gs:snake.best`, `gs:dragon52.best` and `gs:2048.best`, and shown through `createHud`.
- **Board games**: keep the rules in a separate pure module (e.g. `src/games/game2048/logic.ts`) and let the controller own only DOM, input, audio and storage. Pure rules get cheap, thorough unit tests; the controller stays thin.
- **Shared data belongs in `src/ui/`**: suits and ranks live once in `src/ui/cardFace.ts`; 游龙52式 imports them and adds its own task tables on top, 翻牌配对 renders them via `createCardFace()`. Never duplicate the suit definitions in a second game.
- **3D flip cards**: the *back* of the card faces the viewer at rest (`transform: none`) and the *face* is pre-rotated `rotateY(180deg)`; flipping rotates the inner wrapper. Get this backwards and the game starts with every card face-up — the class names still look right, so verify with a hit test (`document.elementFromPoint`) rather than by reading the DOM classes.
- **Turn-based games do not need a game loop**: only games with continuous motion start a `GameLoop`. The smoke test measures timer leaks against a per-mount baseline, not an absolute count. A timed board game (扫雷) uses the loop purely as a stopwatch — the loop's tab-hide auto-pause then pauses the clock for free.
- **A game that loads a library asynchronously** shows `createLoading()` in its container, resolves the library inside `import()`, and disposes the instance if the user navigated away before it resolved. `matter-js` (打砖块) is the reference implementation — it lands in its own 81 KiB chunk and never enters the main bundle.
- **Canvas games**: size the backing store for the device pixel ratio (`canvas.width = cssWidth * dpr`) and scale the context with `ctx.setTransform(scale, 0, 0, scale, 0, 0)` so all drawing uses logical coordinates.
- **Special home entry**: a module with `special: true` renders as a flashy rainbow card (`.game-card--special` + `.card-ribbon`) in `App.renderGameList`. 惊喜点点 uses it and is pinned to the top of the registry.
- **惊喜点点 flow**: correct password `么么儿` → candles blow out + confetti → chase button teleports to random percentage positions with playful lines (3–10 rounds, `rollRounds`) → final click drops a gift box, it bursts and envelopes pop out → click any envelope (or auto-pick after 6s) to read the love letters **from the first one onward** regardless of which was clicked, with a snow-flurry pause between letters → then the grand love letter (`BIG_LETTER`, `sp-letter--grand` gold styling) → finale reveals the milestone timeline (相识 2019.3.18 → 相遇 3.24 → 相恋 3.28 → 订婚 2025 正月初三 → 领证 2025.3.18 → 结婚 2025 四月初六 → 闺女出生 2025 七月二十三), a snow-scene SVG (moon, firs, snow mound, a family-of-three silhouette holding hands with a trail of footprints, all hand-drawn SVG primitives — no image assets) and the birthday wish (11月29日, 2804 days). Background music is an original 8-bar WebAudio lullaby loop (`BGM_LEAD`/`BGM_PAD` in `Surprise.ts`) on its own AudioContext with a toggle button (`gs:surprise.bgm` persisted) — it starts on the first in-stage gesture, fades out on stop, and is fully torn down in `destroy()`. The stage has persistent CSS snow (she likes snow). Wrong password → shake + a taunting button that refreshes forever; a small "重新输入口令" link is the only way back. All `setTimeout`s are registered through a `timers` set and cleared in `destroy()` — the smoke test asserts zero leaks.

## Toolchain

- TypeScript 5.9, strict mode, ES2015 target, `module: ESNext`, `moduleResolution: bundler` (matches webpack's resolution: directory index + `exports` maps). `ESNext` module is required for dynamic `import()`
- Two tsconfigs: `tsconfig.json` covers `src/**` only and is what ts-loader/webpack reads; `tsconfig.test.json` extends it and adds `test/**` + `vitest.config.ts` for `npm run typecheck`
- Webpack 5 with babel-loader → ts-loader chain; `node_modules` is excluded from babel, so third-party code is not rewritten by core-js
- Vitest 5 + jsdom for unit and smoke tests; `test/setup.ts` shims what jsdom lacks (layout offsets, AudioContext, matchMedia, ResizeObserver)
- Less for styles, PostCSS with `postcss-preset-env` for browser compat
- Browser baseline is Chrome 108+ (`@babel/preset-env` target). `output.environment` keeps webpack's *runtime* ES5-only — it does not make the app IE10-compatible, since business code is transpiled for modern browsers
- Code splitting: the default vendor merging in `splitChunks` is disabled, so every dynamic `import()` becomes an independent chunk under `dist/js/`
- HTML template at `src/index.html`

## Testing

- `test/core.test.ts` — unit tests for `storage` / `dispose` / `loop` / `input` / `audio`
- `test/ui.test.ts` — unit tests for the shared UI components
- `test/games-2048.test.ts` — unit tests for the 2048 board rules (merge, one-merge-per-line, no mutation of the input board, dead-board detection)
- `test/games-minesweeper.test.ts` — unit tests for the 扫雷 board rules (mine count, first-click safety, flood-fill reveal, flagging, win check)
- `test/games-memory.test.ts` — unit tests for the 翻牌配对 deck rules (card count, each face appears exactly twice, matching)
- `test/games-breakout.test.ts` — unit tests for the 打砖块 level rules (brick count, layout inside the field, row scoring, paddle clamping)
- `test/games-surprise.test.ts` — unit tests for the 惊喜点点 rules (password check, rounds within 3–10, line picking) and the full password → chase → confession flow under fake timers
- `test/smoke.test.ts` — mounts **every** game in the registry twice, asserting no exception and **no timers left behind** after `destroy()` (fake timers + `vi.getTimerCount()` compared against a per-mount baseline)
- `scripts/e2e.mjs` — zero-dependency CDP script driving headless Chromium over `dist/`: routing, deep links, browser back, theme switching, score persistence, 2048 tile alignment, and a clean console

## Conventions

- Comments are in Chinese (Simplified)
- Classes use getter/setter for coordinate access (`get X()`, `set X(val)`)
- DOM queries use non-null assertions (`!`) extensively
- Reach for `src/core/` and `src/ui/` before writing anything a third game would need
