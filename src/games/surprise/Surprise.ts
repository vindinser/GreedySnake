import { audio } from '../../core/audio'
import { storage } from '../../core/storage'
import { createButton } from '../../ui'
import {
  BIG_LETTER,
  CHASE_LINES,
  LETTERS,
  MILESTONES,
  WRONG_LINES,
  checkPassword,
  pickLine,
  rollRounds
} from './lines'

// 流程阶段：口令 →（错误死循环 / 正确追逐）→ 礼物 → 信封 → 情书 → 终场
type Phase = 'password' | 'wrong' | 'chase' | 'gift' | 'envelope' | 'letter' | 'finale'

// 终场漂浮爱心的颜色
const HEART_COLORS = ['#ff6b9d', '#ff8fab', '#ffd1dc', '#ffb3c8', '#ff4d6d']

// 解锁与点击时撒花的颜色
const SPARK_COLORS = ['#ff6b9d', '#ffd43b', '#69db7c', '#4dabf7', '#c44ce0', '#ffa94d']

// 信封散落槽位（舞台百分比），生成时再加一点随机抖动
const ENVELOPE_SLOTS = [
  { x: 12, y: 10 },
  { x: 38, y: 6 },
  { x: 63, y: 11 },
  { x: 9, y: 28 },
  { x: 34, y: 33 },
  { x: 59, y: 29 },
  { x: 13, y: 50 },
  { x: 39, y: 55 },
  { x: 64, y: 50 }
]

// ===== 背景音乐：一首原创的八小节小夜曲（音乐盒主旋律 + 柔和 Pad，循环播放） =====
// 项目不打包音频素材，BGM 用 WebAudio 实时合成；《晚梦中的婚礼》等曲目有版权，
// 这里按同样的氛围写一首原创循环：F 大调，72 BPM，像音乐盒一样轻。
const BGM_BPM = 72;
// 八分音符时长（秒）与循环总位数（8 小节 × 8 拍）
const BGM_EIGHTH = 60 / BGM_BPM / 2;
const BGM_SLOTS = 64;
const BGM_LOOP_MS = BGM_SLOTS * BGM_EIGHTH * 1000;
// 主输出音量（单个音符峰值再乘以各声部的权重）
const BGM_VOLUME = 0.55;
// 音乐开关偏好持久化 key
const BGM_KEY = 'gs:surprise.bgm';

// 主旋律：[八分音符位, MIDI 音高, 持续位数]
const BGM_LEAD: [number, number, number][] = [
  [0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 81, 1], [7, 79, 1],
  [8, 79, 2], [10, 76, 2], [12, 77, 1], [13, 74, 1], [14, 72, 2],
  [16, 77, 2], [18, 81, 2], [20, 86, 2], [22, 81, 2],
  [24, 84, 2], [26, 83, 2], [28, 81, 2], [30, 79, 2],
  [32, 81, 2], [34, 79, 2], [36, 77, 4],
  [40, 86, 2], [42, 83, 2], [44, 82, 2], [46, 79, 2],
  [48, 76, 2], [50, 79, 2], [52, 84, 4],
  [56, 81, 2], [58, 79, 2], [60, 84, 2], [62, 77, 2]
];

// Pad：每小节一个三和弦，长音铺底（F - C - Dm - Bb - F - Gm - C - F）
const BGM_PAD: [number, number, number][] = [
  [0, 53, 8], [0, 57, 8], [0, 60, 8],
  [8, 48, 8], [8, 52, 8], [8, 55, 8],
  [16, 50, 8], [16, 53, 8], [16, 57, 8],
  [24, 46, 8], [24, 50, 8], [24, 53, 8],
  [32, 53, 8], [32, 57, 8], [32, 60, 8],
  [40, 43, 8], [40, 58, 8], [40, 62, 8],
  [48, 48, 8], [48, 52, 8], [48, 55, 8],
  [56, 53, 8], [56, 57, 8], [56, 60, 8]
];

// MIDI 音高 → 频率
const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// 一个正在发声的音符
interface BgmVoice {
  osc: OscillatorNode;
  gain: GainNode;
  until: number;
}

// 惊喜点点控制器：口令校验、按钮追逐、礼物信封、打字机告白
export default class Surprise {
  private container: HTMLElement;
  private stage!: HTMLElement;
  private panel!: HTMLElement;
  private input!: HTMLInputElement;
  private error!: HTMLElement;
  private submitRow!: HTMLElement;
  private retryRow!: HTMLElement;
  private chaseLayer!: HTMLElement;
  private gift!: HTMLElement;
  private envelopeLayer!: HTMLElement;
  private envHint!: HTMLElement;
  private letter!: HTMLElement;
  private letterTitle!: HTMLElement;
  private letterCount!: HTMLElement;
  private letterBody!: HTMLElement;
  private finale!: HTMLElement;
  private timeline!: HTMLElement;
  private hearts!: HTMLElement;
  private snow!: HTMLElement;
  private cake!: HTMLElement;
  private bgmRow!: HTMLElement;
  private submitBtn!: HTMLButtonElement;
  private retryBtn!: HTMLButtonElement;
  private chaseBtn!: HTMLButtonElement;
  private bgmBtn!: HTMLButtonElement;

  private phase: Phase = 'password';
  // 追逐总次数与已点击次数
  private rounds = 0;
  private clicked = 0;
  // 换位冷却中：屏蔽连点，防止计数错乱
  private moving = false;
  // 上一句文案，避免连续重复
  private lastLine = '';
  // 所有 setTimeout 统一登记，销毁时一并清理
  private timers = new Set<number>();
  private destroyed = false;
  // 礼物炸出来的信封
  private envelopes: HTMLElement[] = [];
  // 当前读到第几段（LETTERS.length 处为压卷大情书）
  private readingStep = 0;

  // ===== 背景音乐状态 =====
  // 用户偏好（持久化）与当前是否正在发声
  private bgmWanted = true;
  private bgmRunning = false;
  private bgmCtx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private bgmVoices: BgmVoice[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.stage = container.querySelector('#spStage')!;
    this.panel = container.querySelector('#spPanel')!;
    this.input = container.querySelector('#spInput') as HTMLInputElement;
    this.error = container.querySelector('#spError')!;
    this.submitRow = container.querySelector('#spSubmitRow')!;
    this.retryRow = container.querySelector('#spRetryRow')!;
    this.chaseLayer = container.querySelector('#spChaseLayer')!;
    this.gift = container.querySelector('#spGift')!;
    this.envelopeLayer = container.querySelector('#spEnvelopeLayer')!;
    this.envHint = container.querySelector('#spEnvHint')!;
    this.letter = container.querySelector('#spLetter')!;
    this.letterTitle = container.querySelector('#spLetterTitle')!;
    this.letterCount = container.querySelector('#spLetterCount')!;
    this.letterBody = container.querySelector('#spLetterBody')!;
    this.finale = container.querySelector('#spFinale')!;
    this.timeline = container.querySelector('#spTimeline')!;
    this.hearts = container.querySelector('#spHearts')!;
    this.snow = container.querySelector('#spSnow')!;
    this.cake = container.querySelector('#spCake')!;
    this.bgmRow = container.querySelector('#spBgmRow')!;

    this.submitBtn = createButton({
      label: '验 证 口 令',
      className: 'sp-submit',
      onClick: () => this.onSubmitPassword()
    });
    this.submitRow.appendChild(this.submitBtn);

    // 输错后的退路：回到口令输入（追逐嘲讽循环本身不受影响，想点多久点多久）
    this.retryBtn = createButton({
      label: '↩ 重新输入口令',
      variant: 'ghost',
      className: 'sp-retry',
      onClick: () => this.backToPassword()
    });
    this.retryRow.appendChild(this.retryBtn);

    this.chaseBtn = createButton({
      label: '点点我',
      className: 'sp-chase',
      onClick: () => this.onChaseClick()
    });
    this.chaseLayer.appendChild(this.chaseBtn);

    // 自定义音效：礼物落地、信封蹦出、翻页、压卷登场
    audio.define('surprise-gift', { wave: 'triangle', freq: [174.61, 261.63, 349.23], duration: 0.4, gain: 0.13 });
    audio.define('surprise-pop', { wave: 'square', freq: [660, 990], duration: 0.08, gain: 0.09 });
    audio.define('surprise-page', { wave: 'noise', freq: 1200, duration: 0.08, gain: 0.05 });
    audio.define('surprise-grand', { wave: 'triangle', freq: [261.63, 329.63, 392, 523.25], duration: 0.55, gain: 0.13 });

    // 背景音乐开关
    this.bgmWanted = storage.get<boolean>(BGM_KEY, true);
    this.bgmBtn = createButton({
      label: '♪',
      className: 'sp-bgm',
      onClick: () => this.toggleBgm()
    });
    this.bgmRow.appendChild(this.bgmBtn);
    this.renderBgmBtn();
    // 浏览器要求音频在手势之后发声：第一次在舞台里交互时启动
    this.container.addEventListener('pointerdown', this.onGesture);
    this.container.addEventListener('keydown', this.onGesture);
    // 音乐开关自己的手势不算数（否则想静音会先把音乐点起来）
    this.bgmBtn.addEventListener('pointerdown', e => e.stopPropagation());

    // 她喜欢雪：舞台常驻下雪，纯 CSS 动画，不产生定时器
    this.spawnSnow(26, true);

    // 回车提交口令
    this.input.addEventListener('keydown', this.onInputKeydown);
  }

  destroy() {
    this.destroyed = true;
    this.clearTimers();
    this.input.removeEventListener('keydown', this.onInputKeydown);
    this.container.removeEventListener('pointerdown', this.onGesture);
    this.container.removeEventListener('keydown', this.onGesture);
    this.stopBgmVoices();
    if (this.bgmCtx) {
      void this.bgmCtx.close();
      this.bgmCtx = null;
      this.bgmGain = null;
    }
  }

  // ========== 定时器管理 ==========
  private later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (!this.destroyed) fn();
    }, ms);
    this.timers.add(id);
  }

  private clearTimers() {
    this.timers.forEach(id => window.clearTimeout(id));
    this.timers.clear();
  }

  // ========== 口令 ==========
  private onInputKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') this.onSubmitPassword();
  };

  private onSubmitPassword() {
    if (this.phase !== 'password') return;
    if (!checkPassword(this.input.value)) {
      this.enterWrong();
      return;
    }
    this.enterChase();
  }

  // 口令错误：面板抖动 + 甩一个嘲讽按钮，点了也只会一直刷新
  private enterWrong() {
    this.phase = 'wrong';
    audio.play('error');
    this.error.textContent = pickLine(WRONG_LINES, Math.random, this.error.textContent || undefined);
    this.panel.classList.remove('sp-panel--shake');
    // 强制重排，让抖动动画可以连续重复触发
    void this.panel.offsetWidth;
    this.panel.classList.add('sp-panel--shake');
    this.later(() => this.panel.classList.remove('sp-panel--shake'), 500);
    this.retryRow.classList.add('sp-retry-row--show');
    this.lastLine = '';
    this.showChase(pickLine(WRONG_LINES, Math.random));
  }

  // 口令正确：吹蜡烛、撒花，开始按钮追逐
  private enterChase() {
    this.phase = 'chase';
    audio.play('coin');
    this.cake.classList.add('sp-cake--out');
    this.panel.classList.add('sp-panel--gone');
    this.error.textContent = '';
    this.retryRow.classList.remove('sp-retry-row--show');
    this.rounds = rollRounds();
    this.clicked = 0;
    this.spawnConfetti(60);
    this.later(() => this.showChase(pickLine(CHASE_LINES, Math.random)), 700);
  }

  // 回到口令输入
  private backToPassword() {
    if (this.phase !== 'wrong') return;
    this.phase = 'password';
    audio.play('select');
    this.error.textContent = '';
    this.retryRow.classList.remove('sp-retry-row--show');
    this.hideChase();
    this.input.value = '';
    this.input.focus();
  }

  // ========== 追逐按钮 ==========
  private showChase(label: string) {
    this.lastLine = label;
    this.chaseBtn.textContent = label;
    this.moveChaseRandomly();
    this.chaseBtn.classList.remove('sp-chase--hide');
    this.chaseBtn.classList.add('sp-chase--in');
    this.moving = false;
  }

  private hideChase() {
    this.chaseBtn.classList.add('sp-chase--hide');
    this.chaseBtn.classList.remove('sp-chase--in');
  }

  private moveChaseRandomly() {
    // 百分比定位：不依赖测量，任何屏幕尺寸都跑得动
    const x = 4 + Math.random() * 72;
    const y = 12 + Math.random() * 70;
    this.chaseBtn.style.left = x + '%';
    this.chaseBtn.style.top = y + '%';
  }

  private onChaseClick() {
    if (this.phase === 'wrong') {
      // 错误模式：永远点不到头，换个嘲讽换个地方继续
      audio.play('blip');
      this.lastLine = pickLine(WRONG_LINES, Math.random, this.lastLine);
      this.burstAt(this.chaseBtn, 12);
      this.showChase(this.lastLine);
      return;
    }
    if (this.phase !== 'chase') return;
    // 换位冷却中的连点直接忽略
    if (this.moving) return;

    this.clicked++;
    this.moving = true;
    audio.play('click');
    this.burstAt(this.chaseBtn, 12);

    if (this.clicked >= this.rounds) {
      this.enterGift();
      return;
    }
    // 消失 → 换个位置和俏皮话再出现
    this.chaseBtn.classList.add('sp-chase--hide');
    this.chaseBtn.classList.remove('sp-chase--in');
    this.later(() => {
      if (this.phase !== 'chase') return;
      this.lastLine = pickLine(CHASE_LINES, Math.random, this.lastLine);
      this.showChase(this.lastLine);
    }, 420);
  }

  // ========== 告白第一幕：掉落礼物，炸开蹦出信封 ==========
  private enterGift() {
    this.phase = 'gift';
    audio.play('clear');
    this.hideChase();
    this.stage.classList.add('sp-stage--gift');
    this.gift.classList.add('sp-gift--show');
    // 落地闷响 + 摇晃 → 炸开
    this.later(() => audio.play('surprise-gift'), 1060);
    this.later(() => this.gift.classList.add('sp-gift--shake'), 1150);
    this.later(() => this.burstGift(), 1950);
  }

  private burstGift() {
    this.phase = 'envelope';
    audio.play('explode');
    this.gift.classList.add('sp-gift--open');
    this.burstAt(this.gift, 18);
    this.spawnConfetti(50);
    this.spawnSnowBurst(20);
    this.later(() => this.gift.classList.remove('sp-gift--show', 'sp-gift--shake', 'sp-gift--open'), 850);
    this.spawnEnvelopes();
    this.envHint.classList.add('sp-env-hint--show');
    // 不点就随机抽一封开始（内容仍然从第一封读起）
    this.later(() => {
      if (this.phase !== 'envelope') return;
      this.openEnvelope(Math.floor(Math.random() * this.envelopes.length));
    }, 6000);
  }

  private spawnEnvelopes() {
    this.envelopes = [];
    LETTERS.forEach((_, i) => {
      const envelope = document.createElement('div');
      envelope.className = 'sp-envelope';
      const slot = ENVELOPE_SLOTS[i % ENVELOPE_SLOTS.length];
      envelope.style.left = (slot.x + (Math.random() * 5 - 2.5)) + '%';
      envelope.style.top = (slot.y + (Math.random() * 5 - 2.5)) + '%';
      envelope.innerHTML = `
        <div class="sp-env-inner" style="animation-delay:${(i * 0.22).toFixed(2)}s">
          <div class="sp-env-body"></div>
          <div class="sp-env-flap"></div>
          <div class="sp-env-seal">❤</div>
        </div>
      `;
      envelope.addEventListener('click', () => this.openEnvelope(i));
      this.envelopeLayer.appendChild(envelope);
      this.envelopes.push(envelope);
      this.later(() => {
        envelope.classList.add('sp-envelope--in');
        audio.play('surprise-pop');
      }, 140 * i + 160);
    });
  }

  // ========== 告白第二幕：点信封，读情书 ==========
  private openEnvelope(index: number) {
    if (this.phase !== 'envelope') return;
    this.phase = 'letter';
    audio.play('flip');
    this.envHint.classList.remove('sp-env-hint--show');
    this.envelopes.forEach((envelope, i) => {
      if (i === index) envelope.classList.add('sp-envelope--open');
      else envelope.classList.add('sp-envelope--dim');
    });
    // 不管点中的是哪封，都从第一封开始按顺序读
    this.later(() => this.showLetter(0), 700);
  }

  private showLetter(step: number) {
    if (this.phase !== 'letter') return;
    // 普通情书读罢：先上压卷大情书，再进终场
    if (step >= LETTERS.length) {
      if (step === LETTERS.length) {
        this.showBigLetter();
      } else {
        this.enterFinale();
      }
      return;
    }
    this.readingStep = step;
    const letter = LETTERS[step];
    this.letter.classList.remove('sp-letter--gap', 'sp-letter--grand');
    this.letterTitle.textContent = letter.title;
    this.letterCount.textContent = `第 ${step + 1} 封 / 共 ${LETTERS.length} 封`;
    this.letterBody.innerHTML = '';
    this.letter.classList.add('sp-letter--show');
    audio.play('surprise-page');
    this.typeParagraphs(letter.body, 0, () => {
      // 读完一封：下场雪，停几秒，再读下一封
      this.letter.classList.add('sp-letter--gap');
      this.letterCount.textContent = '稍等，下一封马上来…';
      this.spawnSnowBurst(26);
      audio.play('blip');
      this.later(() => this.showLetter(step + 1), 4200);
    });
  }

  // 压卷大情书：排版最郑重的一封
  private showBigLetter() {
    this.readingStep = LETTERS.length;
    this.letter.classList.remove('sp-letter--gap');
    this.letter.classList.add('sp-letter--grand');
    this.letterTitle.textContent = BIG_LETTER.title;
    this.letterCount.textContent = '压卷 · 大情书';
    this.letterBody.innerHTML = '';
    this.letter.classList.add('sp-letter--show');
    audio.play('surprise-grand');
    this.typeParagraphs(BIG_LETTER.body, 0, () => {
      this.letter.classList.add('sp-letter--gap');
      this.letterCount.textContent = '稍等，最后看一眼我们的这些年…';
      this.spawnSnowBurst(30);
      this.spawnConfetti(40);
      audio.play('blip');
      this.later(() => this.enterFinale(), 4200);
    });
  }

  // 逐段打字机播放正文
  private typeParagraphs(paragraphs: string[], index: number, done: () => void) {
    if (this.phase !== 'letter') return;
    if (index >= paragraphs.length) {
      done();
      return;
    }
    const text = paragraphs[index];
    const p = document.createElement('p');
    p.className = 'sp-letter-p';
    this.letterBody.appendChild(p);
    let cursor = 0;
    const step = () => {
      if (this.phase !== 'letter') return;
      cursor++;
      p.textContent = text.slice(0, cursor);
      if (cursor < text.length) {
        this.later(step, 85);
      } else {
        this.later(() => this.typeParagraphs(paragraphs, index + 1, done), 380);
      }
    };
    this.later(step, 380);
  }

  // ========== 告白终场：我们的时间线 + 生日祝福 ==========
  private enterFinale() {
    this.phase = 'finale';
    audio.play('win');
    this.letter.classList.remove('sp-letter--show');
    this.envelopes.forEach(envelope => envelope.classList.add('sp-envelope--dim'));
    this.spawnConfetti(70);
    this.spawnSnowBurst(30);
    this.spawnHearts(16);
    this.finale.classList.add('sp-finale--show');
    // 时间线逐条亮起
    this.timeline.innerHTML = '';
    MILESTONES.forEach((m, i) => {
      const item = document.createElement('div');
      item.className = 'sp-tl-item';
      item.style.animationDelay = (0.18 * i + 0.25).toFixed(2) + 's';
      const dot = document.createElement('span');
      dot.className = 'sp-tl-dot';
      const date = document.createElement('span');
      date.className = 'sp-tl-date';
      date.textContent = m.date;
      const event = document.createElement('span');
      event.className = 'sp-tl-event';
      event.textContent = m.event;
      item.append(dot, date, event);
      this.timeline.appendChild(item);
    });
  }

  // ========== 粒子特效 ==========
  // 在元素位置炸开一圈火花
  private burstAt(el: HTMLElement, count: number) {
    const elRect = el.getBoundingClientRect();
    const stageRect = this.stage.getBoundingClientRect();
    const cx = elRect.left - stageRect.left + elRect.width / 2;
    const cy = elRect.top - stageRect.top + elRect.height / 2;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = 'sp-spark';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 36 + Math.random() * 46;
      spark.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      spark.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      spark.style.left = cx + 'px';
      spark.style.top = cy + 'px';
      spark.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
      this.stage.appendChild(spark);
      this.later(() => spark.remove(), 760);
    }
  }

  // 从舞台顶部撒一场花
  private spawnConfetti(count: number) {
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'sp-confetti';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
      piece.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
      piece.style.animationDuration = (2.2 + Math.random() * 1.6).toFixed(2) + 's';
      this.stage.appendChild(piece);
      this.later(() => piece.remove(), 4200);
    }
  }

  // 雪花：persistent 为常驻层（无限循环，无定时器），否则为限时飘雪
  private spawnSnow(count: number, persistent: boolean) {
    const host = persistent ? this.snow : this.stage;
    for (let i = 0; i < count; i++) {
      const flake = document.createElement('span');
      flake.className = 'sp-flake';
      flake.textContent = '❄';
      flake.style.left = Math.random() * 100 + '%';
      flake.style.fontSize = (6 + Math.random() * 9).toFixed(1) + 'px';
      flake.style.setProperty('--flake-opacity', (0.35 + Math.random() * 0.5).toFixed(2));
      flake.style.setProperty('--snow-drift', (Math.random() * 60 - 30).toFixed(0) + 'px');
      if (persistent) {
        // 负延迟：雪花在页面出现时就已经在半空中
        flake.style.animationDuration = (6 + Math.random() * 7).toFixed(2) + 's';
        flake.style.animationDelay = (-Math.random() * 10).toFixed(2) + 's';
      } else {
        flake.style.animationDuration = (2.6 + Math.random() * 2).toFixed(2) + 's';
        flake.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
      }
      host.appendChild(flake);
      if (!persistent) this.later(() => flake.remove(), 5200);
    }
  }

  private spawnSnowBurst(count: number) {
    this.spawnSnow(count, false);
  }

  // 终场漂浮的爱心
  private spawnHearts(count: number) {
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('span');
      heart.className = 'sp-heart';
      heart.textContent = '♥';
      heart.style.left = (4 + Math.random() * 90) + '%';
      heart.style.color = HEART_COLORS[i % HEART_COLORS.length];
      heart.style.fontSize = (12 + Math.random() * 16).toFixed(0) + 'px';
      heart.style.animationDelay = (Math.random() * 2.4).toFixed(2) + 's';
      heart.style.animationDuration = (3.6 + Math.random() * 2.4).toFixed(2) + 's';
      this.hearts.appendChild(heart);
    }
  }

  // ========== 背景音乐 ==========
  private onGesture = () => {
    this.container.removeEventListener('pointerdown', this.onGesture);
    this.container.removeEventListener('keydown', this.onGesture);
    if (this.bgmWanted && !audio.muted) this.startBgm();
  };

  private toggleBgm() {
    if (this.bgmRunning) {
      this.stopBgm();
    } else {
      this.bgmWanted = true;
      storage.set(BGM_KEY, true);
      this.startBgm();
    }
  }

  private renderBgmBtn() {
    this.bgmBtn.classList.toggle('sp-bgm--off', !this.bgmRunning);
    this.bgmBtn.title = this.bgmRunning ? '音乐开着了，点我静音' : '音乐关着，点我打开';
  }

  private ensureBgmContext(): AudioContext | null {
    if (this.bgmCtx) return this.bgmCtx;
    const scope = typeof window !== 'undefined' ? (window as any) : null;
    const Ctor = scope && (scope.AudioContext || scope.webkitAudioContext);
    if (!Ctor) return null;
    try {
      const ctx: AudioContext = new Ctor();
      this.bgmCtx = ctx;
      return ctx;
    } catch (e) {
      return null;
    }
  }

  private startBgm() {
    if (this.bgmRunning || this.destroyed) return;
    const ctx = this.ensureBgmContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      // 无手势激活时 resume 可能失败，销毁时也可能已被关闭：忽略 rejection
      void Promise.resolve(ctx.resume()).catch(() => { });
    }
    // 重建主增益：摆脱上一次停止时排入的淡出事件
    if (this.bgmGain) this.bgmGain.disconnect();
    const gain = ctx.createGain();
    gain.gain.value = BGM_VOLUME;
    gain.connect(ctx.destination);
    this.bgmGain = gain;
    this.bgmRunning = true;
    this.renderBgmBtn();
    this.scheduleBgmLoop();
  }

  private stopBgm() {
    if (!this.bgmRunning) return;
    this.bgmRunning = false;
    storage.set(BGM_KEY, false);
    const ctx = this.bgmCtx;
    const gain = this.bgmGain;
    if (ctx && gain) {
      // 已排入的音符淡出后停止，避免咔哒声
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
    }
    this.stopBgmVoices(0.3);
    this.renderBgmBtn();
  }

  // 停止所有在响的音符；delay 秒后停（留给淡出用），缺省立即停
  private stopBgmVoices(delay = 0) {
    const ctx = this.bgmCtx;
    if (ctx) {
      const at = ctx.currentTime + delay;
      this.bgmVoices.forEach(voice => {
        try { voice.osc.stop(at); } catch (e) { /* 已停过的忽略 */ }
      });
    }
    this.bgmVoices = [];
  }

  // 排入一整轮音乐，到点再排下一轮：全程只有一个待触发的定时器
  private scheduleBgmLoop() {
    const ctx = this.bgmCtx;
    if (!ctx || !this.bgmRunning || this.destroyed) return;
    // 清理已经放完的音符，避免越积越多
    this.bgmVoices = this.bgmVoices.filter(voice => voice.until > ctx.currentTime);
    const start = ctx.currentTime + 0.08;
    this.playBgmVoice(ctx, BGM_LEAD, start, 'triangle', 0.16);
    this.playBgmVoice(ctx, BGM_PAD, start, 'sine', 0.1);
    this.later(() => this.scheduleBgmLoop(), BGM_LOOP_MS);
  }

  private playBgmVoice(ctx: AudioContext, notes: [number, number, number][], start: number, wave: OscillatorType, peak: number) {
    const master = this.bgmGain;
    if (!master) return;
    for (const [slot, midi, len] of notes) {
      if (!midi) continue;
      const at = start + slot * BGM_EIGHTH;
      const dur = len * BGM_EIGHTH * 0.9;
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = midiToFreq(midi);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(peak, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + dur + 0.05);
      this.bgmVoices.push({ osc, gain, until: at + dur + 0.05 });
    }
  }
}
