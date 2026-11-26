import { GameLoop } from '../../core/loop'
import { audio } from '../../core/audio'
import { storage } from '../../core/storage'
import { createButton, createHud, createOverlay, Hud, Overlay } from '../../ui'
import {
  Cell,
  createBoard,
  DIFFICULTIES,
  Difficulty,
  isWon,
  remainingMines,
  revealArea,
  toggleFlag
} from './logic'

// 各难度最佳通关时间的存储键
const BEST_KEY = 'minesweeper.best';
// 长按判定时长（毫秒）
const LONG_PRESS_MS = 400;

// 各难度最佳通关时间，键为难度 key
type BestTimes = Record<string, number | undefined>;

class Minesweeper {
  root: HTMLElement;
  panelEle!: HTMLElement;
  boardEle!: HTMLElement;
  levelsEle!: HTMLElement;
  hud!: Hud;
  overlay!: Overlay;
  loop: GameLoop;

  difficulty: Difficulty = DIFFICULTIES[0];
  // 未开始时为 null —— 首击时才生成棋盘，以保证首击安全
  board: Cell[][] | null = null;
  started = false;
  over = false;
  won = false;
  // 插旗模式：开启后点按即为插旗
  flagMode = false;

  // 已用秒数
  private elapsed = 0;
  private displayedSeconds = 0;
  // 各难度的最佳通关时间
  private bestTimes: BestTimes = {};
  // 格子 DOM
  private cellEls: HTMLElement[][] = [];
  // 触发的地雷位置
  private hitRow = -1;
  private hitCol = -1;
  // 长按插旗
  private longPressTimer: number | null = null;
  private longPressFired = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.panelEle = this.root.querySelector('.ms')!;
    this.boardEle = this.root.querySelector('#board')!;
    this.levelsEle = this.root.querySelector('#levels')!;

    this.bestTimes = storage.get<BestTimes>(BEST_KEY, {});

    // 计数信息条：剩余雷数 / 用时 / 最佳
    this.hud = createHud([
      { label: 'MINES', value: this.difficulty.mines },
      { label: 'TIME', value: '00:00' },
      { label: 'BEST', value: this.bestText(this.difficulty.key) }
    ]);
    const hudSlot = this.root.querySelector('#hudSlot')!;
    hudSlot.innerHTML = '';
    hudSlot.appendChild(this.hud.el);

    // 结算覆盖层
    this.overlay = createOverlay({ html: '<div class="ms-over"></div>' });
    this.panelEle.appendChild(this.overlay.el);

    this.initLevels();
    this.initBoardInput();

    // 计时器：页面切走时自动暂停
    this.loop = new GameLoop({ update: (dt) => this.tick(dt) });

    this.reset();
    this.loop.start();
  }

  // ========== 难度切换 ==========
  initLevels() {
    this.levelsEle.innerHTML = '';
    for (const level of DIFFICULTIES) {
      const btn = createButton({
        label: level.name,
        variant: 'ghost',
        className: 'ms-level' + (level.key === this.difficulty.key ? ' ms-level--active' : ''),
        onClick: () => {
          audio.play('click');
          this.difficulty = level;
          this.initLevels();
          this.reset();
        }
      });
      btn.dataset.level = level.key;
      this.levelsEle.appendChild(btn);
    }

    // 插旗模式开关（手机端更顺手）
    this.levelsEle.appendChild(createButton({
      label: '🚩 标记',
      variant: 'ghost',
      className: 'ms-flagmode' + (this.flagMode ? ' ms-flagmode--active' : ''),
      onClick: () => {
        audio.play('click');
        this.flagMode = !this.flagMode;
        this.initLevels();
      }
    }));
  }

  // ========== 棋盘交互 ==========
  initBoardInput() {
    this.boardEle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return; // 右键交给 contextmenu
      const cell = this.cellFromEvent(e);
      if (!cell) return;
      this.longPressFired = false;
      this.longPressTimer = window.setTimeout(() => {
        this.longPressTimer = null;
        this.longPressFired = true;
        this.toggleFlagAt(cell);
      }, LONG_PRESS_MS);
    });

    this.boardEle.addEventListener('pointerup', (e: PointerEvent) => {
      this.clearLongPress();
      if (this.longPressFired) {
        this.longPressFired = false;
        return;
      }
      const cell = this.cellFromEvent(e);
      if (cell) this.revealAt(cell);
    });

    this.boardEle.addEventListener('pointercancel', () => this.clearLongPress());
    this.boardEle.addEventListener('pointerleave', () => this.clearLongPress());

    this.boardEle.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      const cell = this.cellFromEvent(e);
      if (cell) this.toggleFlagAt(cell);
    });
  }

  private cellFromEvent(e: Event): HTMLElement | null {
    const target = e.target as HTMLElement | null;
    if (!target || !target.classList.contains('ms-cell')) return null;
    return target;
  }

  private clearLongPress() {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // ========== 开局 / 重开 ==========
  reset() {
    this.board = null;
    this.started = false;
    this.over = false;
    this.won = false;
    this.elapsed = 0;
    this.displayedSeconds = 0;
    this.hitRow = -1;
    this.hitCol = -1;
    this.clearLongPress();
    this.overlay.hide();
    this.renderBoard();
    this.updateHud();
  }

  private renderBoard() {
    const { rows, cols } = this.difficulty;
    this.boardEle.innerHTML = '';
    this.boardEle.dataset.level = this.difficulty.key;
    // repeat() 的数量必须是字面量，所以列数用内联样式给出
    this.boardEle.style.gridTemplateColumns = 'repeat(' + cols + ', var(--ms-cell))';
    this.cellEls = [];

    for (let r = 0; r < rows; r++) {
      const rowEls: HTMLElement[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'ms-cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        this.boardEle.appendChild(cell);
        rowEls.push(cell);
      }
      this.cellEls.push(rowEls);
    }
  }

  // ========== 翻开 ==========
  private revealAt(cellEl: HTMLElement) {
    if (this.over) return;
    if (this.flagMode) {
      this.toggleFlagAt(cellEl);
      return;
    }

    const row = Number(cellEl.dataset.row);
    const col = Number(cellEl.dataset.col);

    // 首击：此时才生成棋盘，保证首击及其邻域没有雷
    if (!this.started) {
      this.start(row, col);
      return;
    }

    const board = this.board!;
    const cell = board[row][col];
    if (cell.revealed || cell.flagged) return;

    const revealed = revealArea(board, row, col);
    for (const p of revealed) this.updateCell(p.row, p.col);
    audio.play('flip');

    // 踩雷
    if (cell.mine) {
      this.hitRow = row;
      this.hitCol = col;
      this.gameOver();
      return;
    }
    this.checkWin();
  }

  private start(row: number, col: number) {
    const { rows, cols, mines } = this.difficulty;
    this.board = createBoard(rows, cols, mines, { row, col });
    this.started = true;
    this.elapsed = 0;
    this.displayedSeconds = 0;

    const revealed = revealArea(this.board, row, col);
    for (const p of revealed) this.updateCell(p.row, p.col);
    audio.play('flip');
    this.updateHud();
    this.checkWin();
  }

  // ========== 插旗 ==========
  private toggleFlagAt(cellEl: HTMLElement) {
    if (this.over || !this.started) return;
    const row = Number(cellEl.dataset.row);
    const col = Number(cellEl.dataset.col);
    if (!toggleFlag(this.board!, row, col)) return;
    this.updateCell(row, col);
    this.updateHud();
    audio.play('select');
  }

  // ========== 单元格渲染 ==========
  private updateCell(row: number, col: number) {
    const el = this.cellEls[row] && this.cellEls[row][col];
    if (!el || !this.board) return;
    const cell = this.board[row][col];

    el.className = 'ms-cell';
    el.textContent = '';

    if (cell.revealed) {
      el.classList.add('ms-cell--revealed');
      if (cell.mine) {
        el.classList.add('ms-cell--mine');
        el.textContent = '✹';
        if (row === this.hitRow && col === this.hitCol) el.classList.add('ms-cell--hit');
      } else if (cell.adjacent > 0) {
        el.classList.add('ms-cell--n' + cell.adjacent);
        el.textContent = String(cell.adjacent);
      }
    } else if (cell.flagged) {
      el.classList.add('ms-cell--flag');
      el.textContent = '⚑';
    }
  }

  // ========== 计时 ==========
  private tick(dt: number) {
    if (!this.started || this.over) return;
    this.elapsed += dt;
    const seconds = Math.floor(this.elapsed);
    if (seconds !== this.displayedSeconds) {
      this.displayedSeconds = seconds;
      this.hud.setItem(1, this.formatTime(seconds));
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  private bestText(key: string): string {
    const best = this.bestTimes[key];
    return best === undefined ? '--:--' : this.formatTime(best);
  }

  // ========== 计数 ==========
  private updateHud() {
    const mines = this.board ? remainingMines(this.board) : this.difficulty.mines;
    this.hud.setItem(0, mines);
    this.hud.setItem(1, this.formatTime(this.displayedSeconds));
    this.hud.setItem(2, this.bestText(this.difficulty.key));
  }

  // ========== 胜负 ==========
  private checkWin() {
    if (!this.board || this.over) return;
    if (!isWon(this.board)) return;
    this.over = true;
    this.won = true;

    const seconds = Math.floor(this.elapsed);
    const best = this.bestTimes[this.difficulty.key];
    const isRecord = best === undefined || seconds < best;
    if (isRecord) {
      this.bestTimes[this.difficulty.key] = seconds;
      storage.set(BEST_KEY, this.bestTimes);
    }

    // 胜利后把剩下的雷都插上旗
    for (let r = 0; r < this.board.length; r++) {
      for (let c = 0; c < this.board[r].length; c++) {
        const cell = this.board[r][c];
        if (cell.mine && !cell.flagged) {
          cell.flagged = true;
          this.updateCell(r, c);
        }
      }
    }
    this.updateHud();
    this.showOverlay(isRecord ? '新纪录！' : '全部排除', '用时 ' + this.formatTime(seconds), '再来一局');
    audio.play('win');
  }

  private gameOver() {
    this.over = true;
    const board = this.board!;

    // 揭开所有雷，并标出错插的旗
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const cell = board[r][c];
        if (cell.mine && !cell.flagged) {
          cell.revealed = true;
          this.updateCell(r, c);
        } else if (!cell.mine && cell.flagged) {
          cell.flagged = false;
          this.updateCell(r, c);
        }
      }
    }
    this.updateCell(this.hitRow, this.hitCol);
    this.updateHud();
    this.showOverlay('踩到雷了', '用时 ' + this.formatTime(this.displayedSeconds), '再来一局');
    audio.play('boom');
  }

  private showOverlay(title: string, desc: string, buttonLabel: string) {
    const box = this.overlay.el.querySelector('.ms-over')!;
    box.innerHTML = '';
    const titleEl = document.createElement('div');
    titleEl.className = 'ms-over-title';
    titleEl.textContent = title;
    const descEl = document.createElement('div');
    descEl.className = 'ms-over-desc';
    descEl.textContent = desc;
    box.appendChild(titleEl);
    box.appendChild(descEl);
    box.appendChild(createButton({
      label: buttonLabel,
      onClick: () => {
        audio.play('click');
        this.reset();
      }
    }));
    this.overlay.show();
  }

  // ========== 销毁 ==========
  destroy() {
    this.loop.stop();
    this.clearLongPress();
    this.cellEls = [];
  }
}

export default Minesweeper;
