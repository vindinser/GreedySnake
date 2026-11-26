import { Direction, InputManager } from '../../core/input'
import { audio } from '../../core/audio'
import { storage } from '../../core/storage'
import { createButton, createHud, createOverlay, Hud, Overlay } from '../../ui'
import { CELL_COUNT, emptyCells, isDead, MergeInfo, moveTiles, SIZE, Tile } from './logic'

// 最高分存储键
const BEST_KEY = '2048.best';
// 合成目标
const WIN_VALUE = 2048;

class Game2048 {
  root: HTMLElement;
  panelEle!: HTMLElement;
  boardEle!: HTMLElement;
  gridEle!: HTMLElement;
  tilesLayerEle!: HTMLElement;
  hud!: Hud;
  overlay!: Overlay;
  input: InputManager;

  // 棋盘：16 格，null 表示空格
  tiles: (Tile | null)[] = new Array(CELL_COUNT).fill(null);
  private nextId = 1;
  // 每个方块对应的 DOM 节点
  private tileEls = new Map<number, HTMLElement>();
  // 待清理的定时器（淡出动画结束后移除节点）
  private pendingTimers: number[] = [];

  score = 0;
  best = 0;
  private won = false;
  private over = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.panelEle = this.root.querySelector('.g2048')!;
    this.boardEle = this.root.querySelector('#board')!;
    this.gridEle = this.root.querySelector('#grid')!;
    this.tilesLayerEle = this.root.querySelector('#tilesLayer')!;

    this.best = storage.get<number>(BEST_KEY, 0);

    // 分数信息条
    this.hud = createHud([{ label: 'SCORE', value: 0 }, { label: 'BEST', value: this.best }]);
    const hudSlot = this.root.querySelector('#hudSlot')!;
    hudSlot.innerHTML = '';
    hudSlot.appendChild(this.hud.el);

    // 结算覆盖层
    this.overlay = createOverlay({ html: '<div class="g2048-over"></div>' });
    this.panelEle.appendChild(this.overlay.el);

    this.buildGrid();

    this.input = new InputManager(document);
    this.initInput();

    this.reset();
  }

  // ========== 静态网格 ==========
  buildGrid() {
    this.gridEle.innerHTML = '';
    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = document.createElement('div');
      cell.className = 'g2048-cell';
      this.gridEle.appendChild(cell);
    }
  }

  // ========== 输入 ==========
  initInput() {
    // 方向键 / WASD
    this.input.onDirection(direction => this.move(direction));
    // 棋盘上滑动
    this.input.onSwipe(this.boardEle, direction => this.move(direction));
  }

  // ========== 重开 ==========
  reset() {
    this.tiles = new Array(CELL_COUNT).fill(null);
    this.tileEls.forEach(el => el.remove());
    this.tileEls.clear();
    this.clearTimers();
    this.score = 0;
    this.won = false;
    this.over = false;
    this.nextId = 1;
    this.hud.setScore([0, this.best]);
    this.overlay.hide();
    this.spawnTile();
    this.spawnTile();
    // 开局的两个方块也要有对应的 DOM 节点
    this.render([], []);
  }

  // ========== 移动 ==========
  move(direction: Direction) {
    if (this.over) return;

    // 保留移动前的方块快照，用于滑动动画
    const previous = this.tiles.slice();
    const result = moveTiles(this.tiles, direction);
    this.tiles = result.tiles;

    // 没有任何变化：只有死局才算结束
    if (!result.changed) {
      if (isDead(this.tiles)) this.gameOver();
      return;
    }

    this.score += result.gained;
    if (this.score > this.best) {
      this.best = this.score;
      storage.set(BEST_KEY, this.best);
    }
    this.hud.setScore([this.score, this.best]);

    // 新方块：没有 DOM 节点，render 里会补上并播放出现动画
    this.spawnTile();
    this.render(previous, result.merges);

    audio.play(result.gained > 0 ? 'coin' : 'move');

    if (!this.won && this.tiles.some(t => t !== null && t.value >= WIN_VALUE)) {
      this.won = true;
      this.showWin();
    }
    if (isDead(this.tiles)) this.gameOver();
  }

  // ========== 生成新方块 ==========
  spawnTile(): Tile | null {
    const empty = emptyCells(this.tiles);
    if (empty.length === 0) return null;

    const index = empty[Math.floor(Math.random() * empty.length)];
    const tile: Tile = {
      id: this.nextId++,
      value: Math.random() < 0.9 ? 2 : 4,
      row: Math.floor(index / SIZE),
      col: index % SIZE
    };
    this.tiles[index] = tile;
    return tile;
  }

  // ========== 渲染 ==========
  render(previous: (Tile | null)[], merges: MergeInfo[]) {
    const prevMap = new Map<number, Tile>();
    for (const tile of previous) {
      if (tile) prevMap.set(tile.id, tile);
    }

    // 存活的方块：更新位置与数值
    for (const tile of this.tiles) {
      if (!tile) continue;
      let el = this.tileEls.get(tile.id);
      if (!el) {
        // 新方块：还没有 DOM 节点，补一个并播放出现动画
        el = this.createTileEl(tile);
        el.classList.add('g2048-tile--new');
        this.tileEls.set(tile.id, el);
      } else {
        const prev = prevMap.get(tile.id);
        if (!prev || prev.row !== tile.row || prev.col !== tile.col) {
          el.style.setProperty('--x', String(tile.col));
          el.style.setProperty('--y', String(tile.row));
        }
      }

      const valueEl = el.firstElementChild as HTMLElement;
      const text = String(tile.value);
      if (valueEl.textContent !== text) {
        valueEl.textContent = text;
        el.dataset.v = text;
      }
    }

    // 合并：幸存方块弹出，被吸收方块滑过去后淡出
    for (const merge of merges) {
      const survivorEl = this.tileEls.get(merge.survivorId);
      if (survivorEl) {
        // 先移除再强制重排，保证动画能重复播放
        survivorEl.classList.remove('g2048-tile--merged');
        void survivorEl.offsetWidth;
        survivorEl.classList.add('g2048-tile--merged');
      }

      const absorbedEl = this.tileEls.get(merge.absorbedId);
      const survivor = this.tiles.find(t => t !== null && t.id === merge.survivorId) as Tile | undefined;
      if (absorbedEl && survivor) {
        absorbedEl.style.setProperty('--x', String(survivor.col));
        absorbedEl.style.setProperty('--y', String(survivor.row));
        absorbedEl.classList.add('g2048-tile--absorbed');
        const timer = window.setTimeout(() => {
          absorbedEl.remove();
          this.tileEls.delete(merge.absorbedId);
          this.pendingTimers = this.pendingTimers.filter(t => t !== timer);
        }, 220);
        this.pendingTimers.push(timer);
      }
    }
  }

  createTileEl(tile: Tile): HTMLElement {
    const el = document.createElement('div');
    el.className = 'g2048-tile';
    el.style.setProperty('--x', String(tile.col));
    el.style.setProperty('--y', String(tile.row));
    el.dataset.v = String(tile.value);
    const inner = document.createElement('div');
    inner.className = 'g2048-tile-inner';
    inner.textContent = String(tile.value);
    el.appendChild(inner);
    this.tilesLayerEle.appendChild(el);
    return el;
  }

  // ========== 胜负判定 ==========
  showWin() {
    const box = this.overlay.el.querySelector('.g2048-over')!;
    box.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'g2048-over-title';
    title.textContent = '合成 2048！';
    const desc = document.createElement('div');
    desc.className = 'g2048-over-desc';
    desc.textContent = '已经合成大块，继续挑战更高分';
    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(createButton({
      label: '继续',
      onClick: () => {
        audio.play('click');
        this.overlay.hide();
      }
    }));
    this.overlay.show();
    audio.play('win');
  }

  gameOver() {
    this.over = true;
    const box = this.overlay.el.querySelector('.g2048-over')!;
    box.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'g2048-over-title';
    title.textContent = '游戏结束';
    const desc = document.createElement('div');
    desc.className = 'g2048-over-desc';
    desc.textContent = '最终得分 ' + this.score;
    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(createButton({
      label: '再来一局',
      onClick: () => {
        audio.play('click');
        this.reset();
      }
    }));
    this.overlay.show();
    audio.play('lose');
  }

  // ========== 销毁 ==========
  private clearTimers() {
    this.pendingTimers.forEach(t => clearTimeout(t));
    this.pendingTimers = [];
  }

  destroy() {
    this.input.destroy();
    this.clearTimers();
    this.tileEls.clear();
  }
}

export default Game2048;
