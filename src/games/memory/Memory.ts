import { GameLoop } from '../../core/loop'
import { audio } from '../../core/audio'
import { storage } from '../../core/storage'
import { createButton, createCardFace, createHud, createOverlay, CARD_SUITS, Hud, Overlay } from '../../ui'
import { createDeck, isMatch, LEVELS, Level, MemoryCard } from './logic'

// 各难度最佳步数的存储键
const BEST_KEY = 'memory.best';
// 不匹配时两张牌停留多久再翻回去（毫秒）
const MISMATCH_DELAY = 800;

// 各难度最佳步数
type BestMoves = Record<string, number | undefined>;

class Memory {
  root: HTMLElement;
  panelEle!: HTMLElement;
  gridEle!: HTMLElement;
  levelsEle!: HTMLElement;
  hud!: Hud;
  overlay!: Overlay;
  loop: GameLoop;

  level: Level = LEVELS[0];
  cards: MemoryCard[] = [];
  private cardEls: HTMLElement[] = [];
  // 已配对的牌的 id
  private matched = new Set<number>();
  // 当前翻开、尚未结算的牌
  private flipped: MemoryCard[] = [];
  // 等待翻回时锁定输入
  private locked = false;
  // 步数
  moves = 0;
  // 是否已开始（第一张牌翻开时开始计时）
  private started = false;
  // 是否已结束
  over = false;
  // 用时（秒）
  private elapsed = 0;
  private displayedSeconds = 0;
  // 各难度最佳步数
  private bestMoves: BestMoves = {};
  // 待清理的定时器
  private pendingTimers: number[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.panelEle = this.root.querySelector('.mm')!;
    this.gridEle = this.root.querySelector('#grid')!;
    this.levelsEle = this.root.querySelector('#levels')!;

    this.bestMoves = storage.get<BestMoves>(BEST_KEY, {});

    // 计数信息条：步数 / 用时 / 最佳
    this.hud = createHud([
      { label: 'MOVES', value: 0 },
      { label: 'TIME', value: '00:00' },
      { label: 'BEST', value: this.bestText(this.level.key) }
    ]);
    const hudSlot = this.root.querySelector('#hudSlot')!;
    hudSlot.innerHTML = '';
    hudSlot.appendChild(this.hud.el);

    // 结算覆盖层
    this.overlay = createOverlay({ html: '<div class="mm-over"></div>' });
    this.panelEle.appendChild(this.overlay.el);

    this.initLevels();
    this.initGridInput();

    // 计时器：页面切走时自动暂停
    this.loop = new GameLoop({ update: (dt) => this.tick(dt) });

    this.reset();
    this.loop.start();
  }

  // ========== 难度切换 ==========
  initLevels() {
    this.levelsEle.innerHTML = '';
    for (const level of LEVELS) {
      this.levelsEle.appendChild(createButton({
        label: level.name,
        variant: 'ghost',
        className: 'mm-level' + (level.key === this.level.key ? ' mm-level--active' : ''),
        onClick: () => {
          audio.play('click');
          this.level = level;
          this.initLevels();
          this.reset();
        }
      }));
    }
  }

  // ========== 牌阵交互 ==========
  initGridInput() {
    this.gridEle.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest('.mm-card') as HTMLElement | null;
      if (!el) return;
      const card = this.cards[Number(el.dataset.index)];
      if (card) this.onCardClick(card, el);
    });
  }

  // ========== 开局 / 重开 ==========
  reset() {
    this.cards = createDeck(this.level.pairs);
    this.matched = new Set<number>();
    this.flipped = [];
    this.locked = false;
    this.moves = 0;
    this.started = false;
    this.over = false;
    this.elapsed = 0;
    this.displayedSeconds = 0;
    this.clearTimers();
    this.overlay.hide();
    this.renderGrid();
    this.updateHud();
  }

  private renderGrid() {
    this.gridEle.innerHTML = '';
    this.gridEle.dataset.cols = String(this.level.cols);
    // repeat() 的数量必须是字面量
    this.gridEle.style.gridTemplateColumns = 'repeat(' + this.level.cols + ', var(--mm-card))';
    this.cardEls = [];

    this.cards.forEach((card, index) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'mm-card';
      el.dataset.index = String(index);

      const inner = document.createElement('div');
      inner.className = 'mm-card-inner';

      // 正面：牌面
      const front = document.createElement('div');
      front.className = 'mm-card-face mm-card-front';
      const suit = CARD_SUITS.filter(s => s.key === card.suit)[0];
      front.appendChild(createCardFace(suit, card.rank));

      // 背面：牌背
      const back = document.createElement('div');
      back.className = 'mm-card-face mm-card-back';
      back.innerHTML = '<span class="mm-card-back-mark">♠</span>';

      inner.appendChild(front);
      inner.appendChild(back);
      el.appendChild(inner);
      this.gridEle.appendChild(el);
      this.cardEls.push(el);
    });
  }

  // ========== 翻牌 ==========
  private onCardClick(card: MemoryCard, el: HTMLElement) {
    if (this.over || this.locked) return;
    if (this.matched.has(card.id)) return;
    // 已经翻开的牌不再响应
    if (this.flipped.some(c => c.id === card.id)) return;

    this.flipUp(el);
    this.flipped.push(card);
    // 第一张牌翻开时开始计时
    this.started = true;
    audio.play('flip');

    if (this.flipped.length < 2) return;

    // 每翻开两张算一步
    this.moves++;
    this.updateHud();

    const [a, b] = this.flipped;
    if (isMatch(a, b)) {
      this.matched.add(a.id);
      this.matched.add(b.id);
      this.flipped = [];
      this.markMatched(a);
      this.markMatched(b);
      audio.play('coin');
      this.checkWin();
      return;
    }

    // 不匹配：稍等一下再翻回去
    const pair = this.flipped.slice();
    this.locked = true;
    const timer = window.setTimeout(() => {
      this.locked = false;
      for (const c of pair) {
        const el = this.cardEl(c);
        if (el) this.flipDown(el);
      }
      this.flipped = [];
      this.pendingTimers = this.pendingTimers.filter(t => t !== timer);
    }, MISMATCH_DELAY);
    this.pendingTimers.push(timer);
  }

  // 牌对应的 DOM 节点
  private cardEl(card: MemoryCard): HTMLElement | null {
    const index = this.cards.indexOf(card);
    return index >= 0 ? this.cardEls[index] : null;
  }

  private flipUp(el: HTMLElement) {
    el.classList.add('mm-card--flipped');
  }

  private flipDown(el: HTMLElement) {
    el.classList.remove('mm-card--flipped');
  }

  private markMatched(card: MemoryCard) {
    const el = this.cardEl(card);
    if (el) el.classList.add('mm-card--matched');
  }

  // ========== 计时 ==========
  private tick(dt: number) {
    if (this.over || !this.started) return;
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
    const best = this.bestMoves[key];
    return best === undefined ? '--' : String(best);
  }

  // ========== 计数 ==========
  private updateHud() {
    this.hud.setItem(0, this.moves);
    this.hud.setItem(1, this.formatTime(this.displayedSeconds));
    this.hud.setItem(2, this.bestText(this.level.key));
  }

  // ========== 胜负 ==========
  private checkWin() {
    if (this.over) return;
    if (this.matched.size !== this.cards.length) return;
    this.over = true;

    const best = this.bestMoves[this.level.key];
    const isRecord = best === undefined || this.moves < best;
    if (isRecord) {
      this.bestMoves[this.level.key] = this.moves;
      storage.set(BEST_KEY, this.bestMoves);
    }
    this.updateHud();
    this.showOverlay(
      isRecord ? '新纪录！' : '全部配对',
      this.moves + ' 步 · 用时 ' + this.formatTime(this.displayedSeconds),
      '再来一局'
    );
    audio.play('win');
  }

  private showOverlay(title: string, desc: string, buttonLabel: string) {
    const box = this.overlay.el.querySelector('.mm-over')!;
    box.innerHTML = '';
    const titleEl = document.createElement('div');
    titleEl.className = 'mm-over-title';
    titleEl.textContent = title;
    const descEl = document.createElement('div');
    descEl.className = 'mm-over-desc';
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
  private clearTimers() {
    this.pendingTimers.forEach(t => clearTimeout(t));
    this.pendingTimers = [];
  }

  destroy() {
    this.loop.stop();
    this.clearTimers();
    this.cardEls = [];
  }
}

export default Memory;
