// 游龙52式：游戏控制器
import {
  Card,
  SpecialEvent,
  EVENT_CHANCE,
  EVENT_WEIGHTS,
  SPECIAL_EVENTS,
  SUITS,
  cardInfo,
  randomTask,
  withSuit
} from './cards'

const PLAYER_NAMES = ['你', 'TA'];
const TOTAL_CARDS = 52;

class Dragon52 {
  root: HTMLElement;
  // 牌堆（洗牌后的 1~52）
  deck: number[] = [];
  // 已抽出的牌号
  drawn: boolean[] = [];
  // 已抽张数
  drawIndex = 0;
  // 当前回合的玩家下标
  turn = 0;
  // 双方得分
  scores: number[] = [0, 0];
  // 各玩家已抽张数
  draws: number[] = [0, 0];
  // 是否已抽完
  finished = false;
  // 抽牌动画锁
  drawing = false;
  // 当前特殊事件
  currentEvent: SpecialEvent | null = null;
  bannerTimer: any = null;

  // DOM 元素
  cardEle!: HTMLElement;
  cardSuitEle!: HTMLElement;
  cardRankEle!: HTMLElement;
  cardNumberEle!: HTMLElement;
  cardTypeEle!: HTMLElement;
  cardTaskEle!: HTMLElement;
  cardHintEle!: HTMLElement;
  eventBannerEle!: HTMLElement;
  eventNameEle!: HTMLElement;
  eventDescEle!: HTMLElement;
  scoreEles!: HTMLElement[];
  playerDrawsEles!: HTMLElement[];
  playerBoxEles!: HTMLElement[];
  drawBtnEle!: HTMLElement;
  reshuffleBtnEle!: HTMLElement;
  trackGridEle!: HTMLElement;
  trackInfoEle!: HTMLElement;
  turnHintEle!: HTMLElement;
  gameOverEle!: HTMLElement;
  finalScoreEles!: HTMLElement[];
  againBtnEle!: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.cardEle = this.root.querySelector('#card')!;
    this.cardSuitEle = this.root.querySelector('#cardSuit')!;
    this.cardRankEle = this.root.querySelector('#cardRank')!;
    this.cardNumberEle = this.root.querySelector('#cardNumber')!;
    this.cardTypeEle = this.root.querySelector('#cardType')!;
    this.cardTaskEle = this.root.querySelector('#cardTask')!;
    this.cardHintEle = this.root.querySelector('#cardHint')!;
    this.eventBannerEle = this.root.querySelector('#eventBanner')!;
    this.eventNameEle = this.root.querySelector('#eventName')!;
    this.eventDescEle = this.root.querySelector('#eventDesc')!;
    this.scoreEles = [
      this.root.querySelector('#score0')!,
      this.root.querySelector('#score1')!
    ];
    this.playerBoxEles = [
      this.root.querySelector('#playerBox0')!,
      this.root.querySelector('#playerBox1')!
    ];
    this.playerDrawsEles = [
      this.root.querySelector('#draws0')!,
      this.root.querySelector('#draws1')!
    ];
    this.drawBtnEle = this.root.querySelector('#drawBtn')!;
    this.reshuffleBtnEle = this.root.querySelector('#reshuffleBtn')!;
    this.trackGridEle = this.root.querySelector('#trackGrid')!;
    this.trackInfoEle = this.root.querySelector('#trackInfo')!;
    this.turnHintEle = this.root.querySelector('#turnHint')!;
    this.gameOverEle = this.root.querySelector('#gameOver')!;
    this.finalScoreEles = [
      this.root.querySelector('#finalScore0')!,
      this.root.querySelector('#finalScore1')!
    ];
    this.againBtnEle = this.root.querySelector('#againBtn')!;

    this.initTrack();
    this.initButtons();
    this.reset();
  }

  // ========== 牌堆轨道 ==========
  initTrack() {
    this.trackGridEle.innerHTML = '';
    for (let n = 1; n <= TOTAL_CARDS; n++) {
      const cell = document.createElement('div');
      const suit = SUITS[(n - 1) % 4];
      cell.className = 'track-cell suit-' + suit.key;
      cell.title = suit.symbol + ' ' + suit.type + ' · ' + n;
      cell.innerHTML = String(n);
      this.trackGridEle.appendChild(cell);
    }
  }

  updateTrack(currentNumber: number) {
    const cells = this.trackGridEle.children;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as HTMLElement;
      const n = i + 1;
      cell.classList.toggle('done', this.drawn[n - 1]);
      cell.classList.toggle('current', n === currentNumber);
    }
    this.trackInfoEle.innerHTML = this.drawIndex + ' / ' + TOTAL_CARDS;
  }

  // ========== 按钮 ==========
  initButtons() {
    this.drawBtnEle.addEventListener('click', () => this.drawCard());
    this.reshuffleBtnEle.addEventListener('click', () => this.reset());
    this.againBtnEle.addEventListener('click', () => {
      this.gameOverEle.classList.remove('show');
      this.reset();
    });
  }

  // ========== 洗牌开局 ==========
  reset() {
    this.deck = [];
    for (let n = 1; n <= TOTAL_CARDS; n++) this.deck.push(n);
    // Fisher-Yates 洗牌
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this.deck[i];
      this.deck[i] = this.deck[j];
      this.deck[j] = tmp;
    }
    this.drawn = [];
    for (let n = 0; n < TOTAL_CARDS; n++) this.drawn.push(false);
    this.drawIndex = 0;
    this.turn = 0;
    this.scores = [0, 0];
    this.draws = [0, 0];
    this.finished = false;
    this.currentEvent = null;
    this.hideEvent();
    this.gameOverEle.classList.remove('show');
    this.drawBtnEle.innerHTML = '抽 牌';
    this.cardEle.classList.remove('flipped');
    this.cardTaskEle.innerHTML = '';
    this.cardHintEle.innerHTML = '';
    this.cardNumberEle.innerHTML = '';
    this.cardSuitEle.innerHTML = '';
    this.cardRankEle.innerHTML = '';
    this.cardTypeEle.innerHTML = '';
    this.updateUI();
    this.updateTrack(0);
  }

  // ========== 抽牌 ==========
  drawCard() {
    if (this.finished || this.drawing) return;
    if (this.drawIndex >= TOTAL_CARDS) {
      this.finish();
      return;
    }
    this.drawing = true;

    const number = this.deck[this.drawIndex++];
    this.drawn[number - 1] = true;
    let card = cardInfo(number);
    let extraTask = '';

    // 概率触发特殊事件
    const event = this.rollEvent();
    if (event) {
      this.currentEvent = event;
      switch (event.effect) {
        case 'shield':
          // 惩罚免除：梅花转为方块，牌号与档位不变
          if (card.suit.key === 'club') card = withSuit(card, 'diamond');
          break;
        case 'extra':
          extraTask = randomTask(card.suit.key);
          break;
        case 'redraw':
          // 立即重抽，本张作废
          if (this.drawIndex < TOTAL_CARDS) {
            const again = this.deck[this.drawIndex++];
            this.drawn[again - 1] = true;
            card = cardInfo(again);
          }
          break;
        case 'bonus':
          this.scores[this.turn] += 5;
          break;
        case 'both':
          this.scores[0] += 2;
          this.scores[1] += 2;
          break;
      }
    }

    // 结算：对方完成任务则抽牌方得分，否则对方得分
    const winner = card.suit.opponentActs ? this.turn : 1 - this.turn;
    this.scores[winner] += 1;
    this.draws[this.turn] += 1;

    this.showCard(card, extraTask);
    this.updateTrack(card.number);

    if (event) this.showEvent(event);

    // 换回合
    this.turn = 1 - this.turn;
    this.updateUI();

    // 抽完最后一张
    if (this.drawIndex >= TOTAL_CARDS) {
      this.drawBtnEle.innerHTML = '牌已抽完';
      setTimeout(() => this.finish(), 800);
    }

    setTimeout(() => {
      this.drawing = false;
    }, 300);
  }

  // 显示牌面（带翻牌动画）
  showCard(card: Card, extraTask: string) {
    this.cardEle.classList.remove('flipped');
    // 强制重排，保证翻牌动画重新播放
    void this.cardEle.offsetWidth;

    this.cardSuitEle.innerHTML = card.suit.symbol;
    this.cardRankEle.innerHTML = card.rank;
    this.cardNumberEle.innerHTML = String(card.number);
    this.cardTypeEle.innerHTML = card.suit.type;
    this.cardTaskEle.innerHTML = card.task;
    this.cardEle.setAttribute('data-suit', card.suit.key);

    // 得分提示
    const other = 1 - this.turn;
    const hint = card.suit.opponentActs
      ? '由 ' + PLAYER_NAMES[other] + ' 完成 · ' + PLAYER_NAMES[this.turn] + ' +1 分'
      : '由 ' + PLAYER_NAMES[this.turn] + ' 承担 · ' + PLAYER_NAMES[other] + ' +1 分';
    this.cardHintEle.innerHTML = hint + (extraTask ? '<br><span class="card-extra">附加：' + extraTask + '</span>' : '');

    this.cardEle.classList.add('flipped');
  }

  // ========== 特殊事件 ==========
  rollEvent(): SpecialEvent | null {
    if (Math.random() >= EVENT_CHANCE) return null;
    const total = EVENT_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < EVENT_WEIGHTS.length; i++) {
      roll -= EVENT_WEIGHTS[i].weight;
      if (roll < 0) {
        const key = EVENT_WEIGHTS[i].key;
        return SPECIAL_EVENTS.filter(e => e.key === key)[0];
      }
    }
    return null;
  }

  showEvent(event: SpecialEvent) {
    this.eventNameEle.innerHTML = event.name;
    this.eventDescEle.innerHTML = event.desc;
    this.eventBannerEle.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.hideEvent(), 4000);
  }

  hideEvent() {
    this.eventBannerEle.classList.remove('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = null;
  }

  // ========== 界面刷新 ==========
  updateUI() {
    for (let i = 0; i < 2; i++) {
      this.scoreEles[i].innerHTML = String(this.scores[i]);
      this.playerDrawsEles[i].innerHTML = '已抽 ' + this.draws[i] + ' 张';
      this.playerBoxEles[i].classList.toggle('active', i === this.turn);
      this.playerBoxEles[i].classList.toggle('winning', this.scores[i] > this.scores[1 - i]);
    }
    this.turnHintEle.innerHTML = '轮到 ' + PLAYER_NAMES[this.turn] + ' 抽牌';
  }

  // ========== 结束 ==========
  finish() {
    this.finished = true;
    this.finalScoreEles[0].innerHTML = String(this.scores[0]);
    this.finalScoreEles[1].innerHTML = String(this.scores[1]);
    this.gameOverEle.classList.add('show');
  }

  // ========== 销毁 ==========
  destroy() {
    clearTimeout(this.bannerTimer);
    this.bannerTimer = null;
  }
}

export default Dragon52;
