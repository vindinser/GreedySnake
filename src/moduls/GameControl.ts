import Snake from './Snake';
import Food from './Food'
import ScorePanel from './ScorePanel';
import { GameLoop } from '../core/loop'
import { Direction, InputManager } from '../core/input'
import { audio } from '../core/audio'
import { storage } from '../core/storage'
import { createHud, Hud } from '../ui'

// 游戏状态
const POWER_OFF = 0;
const POWER_ON = 1;
const PLAYING = 2;
const PAUSED = 3;

// 最高分存储键
const BEST_KEY = 'snake.best';

class GameControl {
  // 游戏挂载的容器，所有元素都在该容器内查找
  root: HTMLElement;
  snake!: Snake;
  food!: Food;
  scorePanel!: ScorePanel;
  // 统一游戏循环：驱动蛇的移动与待机时钟
  loop: GameLoop;
  // 统一输入层：键盘与滑动
  input: InputManager;
  // 最高分信息条
  bestHud!: Hud;

  // 蛇的朝向
  snakeToDirection: Direction = 'right';

  snakeIsLive: boolean = false;
  isFast: boolean = false;
  gameState: number = POWER_OFF;

  // 距离下一次移动还需累积的毫秒数
  private moveAccumulator = 0;
  // 距离待机时钟跳一秒还需累积的秒数
  private clockAccumulator = 0;
  // 历史最高分
  private best = 0;

  // DOM 元素
  gameOverEle!: HTMLElement;
  finalScoreEle!: HTMLElement;
  restartBtn!: HTMLElement;
  powerBtn!: HTMLElement;
  startBtn!: HTMLElement;
  standbyOverlay!: HTMLElement;
  readyOverlay!: HTMLElement;
  pauseOverlay!: HTMLElement;
  ledLight!: HTMLElement;
  standbyClock!: HTMLElement;
  bestSlotEle!: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.gameOverEle = this.root.querySelector('#gameOver')!;
    this.finalScoreEle = this.root.querySelector('#finalScore')!;
    this.restartBtn = this.root.querySelector('#restartBtn')!;
    this.powerBtn = this.root.querySelector('#powerBtn')!;
    this.startBtn = this.root.querySelector('#startBtn')!;
    this.standbyOverlay = this.root.querySelector('#standbyOverlay')!;
    this.readyOverlay = this.root.querySelector('#readyOverlay')!;
    this.pauseOverlay = this.root.querySelector('#pauseOverlay')!;
    this.ledLight = this.root.querySelector('#ledLight')!;
    this.standbyClock = this.root.querySelector('#standbyClock')!;
    this.bestSlotEle = this.root.querySelector('#bestSlot')!;

    // 读取历史最高分
    this.best = storage.get<number>(BEST_KEY, 0);

    this.loop = new GameLoop({ update: (dt) => this.update(dt) });
    this.input = new InputManager(document);

    this.initBestHud();
    this.gameInit()
  }

  gameInit() {
    console.log('%cGreedySnake Console Ready!', 'color: red; font-size: 20px; font-weight: 600;');
    this.initPower();
    this.initStartBtn();
    this.initRestart();
    this.initVirtualControls();
    this.initInput();
    // 循环常驻：待机时钟与蛇的移动都由它驱动
    this.loop.start();
  }

  // ========== 最高分 ==========
  initBestHud() {
    this.bestHud = createHud([{ label: 'BEST:', value: this.best }]);
    this.bestSlotEle.innerHTML = '';
    this.bestSlotEle.appendChild(this.bestHud.el);
  }

  saveBest(score: number) {
    if (score <= this.best) return;
    this.best = score;
    storage.set(BEST_KEY, this.best);
    this.bestHud.setItem(0, this.best);
  }

  // ========== 电源控制 ==========
  initPower() {
    const handler = (e: Event) => {
      e.preventDefault();
      this.togglePower();
    };
    this.powerBtn.addEventListener('click', handler);
    this.powerBtn.addEventListener('touchstart', handler as EventListener, { passive: false });
  }

  togglePower() {
    if (this.gameState === POWER_OFF) {
      this.powerOn();
    } else {
      this.powerOff();
    }
  }

  powerOn() {
    this.gameState = POWER_ON;
    this.standbyOverlay.classList.remove('show');
    this.readyOverlay.classList.add('show');
    this.ledLight.classList.add('on');
    this.snakeIsLive = false;
    this.startBtn.textContent = 'START';
    audio.play('select');
  }

  powerOff() {
    this.gameState = POWER_OFF;
    this.snakeIsLive = false;
    this.isFast = false;
    this.snakeToDirection = 'right';
    this.readyOverlay.classList.remove('show');
    this.gameOverEle.classList.remove('show');
    this.pauseOverlay.classList.remove('show');
    this.standbyOverlay.classList.add('show');
    this.ledLight.classList.remove('on');
    this.startBtn.textContent = 'START';

    // 重置分数
    this.scorePanel && (this.scorePanel.score = 0);
    this.scorePanel && (this.scorePanel.level = 1);
    this.root.querySelector('#score')!.innerHTML = '0';
    this.root.querySelector('#level')!.innerHTML = '1';

    // 重置蛇
    this.resetSnake();
    audio.play('select');
  }

  // ========== START / PAUSE 按钮 ==========
  initStartBtn() {
    const handler = (e: Event) => {
      e.preventDefault();
      this.handleStartPause();
    };
    this.startBtn.addEventListener('click', handler);
    this.startBtn.addEventListener('touchstart', handler as EventListener, { passive: false });
  }

  handleStartPause() {
    if (this.gameState === POWER_OFF) {
      this.powerOn();
      this.startGame();
    } else if (this.gameState === POWER_ON) {
      this.startGame();
    } else if (this.gameState === PLAYING) {
      this.pause();
    } else if (this.gameState === PAUSED) {
      this.resume();
    }
  }

  startGame() {
    if (this.gameState !== POWER_ON) return;
    this.gameState = PLAYING;
    this.readyOverlay.classList.remove('show');
    this.snakeIsLive = true;
    this.snakeToDirection = 'right';
    this.startBtn.textContent = 'PAUSE';
    this.moveAccumulator = 0;

    this.resetSnake();
    this.food = new Food(this.root);
    this.scorePanel = new ScorePanel(this.root);
    audio.play('click');
  }

  // 重置蛇：蛇头回到网格中心
  resetSnake() {
    if (!this.snake) {
      this.snake = new Snake(this.root);
      return;
    }
    this.snake.reset();
  }

  pause() {
    if (this.gameState !== PLAYING) return;
    this.gameState = PAUSED;
    this.snakeIsLive = false;
    this.pauseOverlay.classList.add('show');
    this.startBtn.textContent = 'START';
  }

  resume() {
    if (this.gameState !== PAUSED) return;
    this.gameState = PLAYING;
    this.snakeIsLive = true;
    this.pauseOverlay.classList.remove('show');
    this.startBtn.textContent = 'PAUSE';
    this.moveAccumulator = 0;
  }

  // ========== 重新开始 ==========
  initRestart() {
    this.restartBtn.addEventListener('click', () => {
      this.restart();
    });
    this.restartBtn.addEventListener('touchstart', ((e: TouchEvent) => {
      e.preventDefault();
      this.restart();
    }) as EventListener, { passive: false });
  }

  restart() {
    this.gameState = PLAYING;
    this.snakeIsLive = true;
    this.snakeToDirection = 'right';
    this.isFast = false;
    this.scorePanel.score = 0;
    this.scorePanel.level = 1;
    this.scorePanel.scoreEle.innerHTML = '0';
    this.scorePanel.levelEle.innerHTML = '1';
    this.gameOverEle.classList.remove('show');
    this.pauseOverlay.classList.remove('show');
    this.startBtn.textContent = 'PAUSE';
    this.moveAccumulator = 0;

    this.resetSnake();
    this.food = new Food(this.root);
    this.food.change();

    audio.play('click');
  }

  showGameOver() {
    this.finalScoreEle.innerHTML = String(this.scorePanel.score);
    this.saveBest(this.scorePanel.score);
    this.gameOverEle.classList.add('show');
    this.startBtn.textContent = 'START';
    audio.play('lose');
  }

  // ========== 销毁游戏（离开游戏时调用） ==========
  destroy() {
    this.snakeIsLive = false;
    this.loop.stop();
    this.input.destroy();
  }

  // ========== 待机时钟 ==========
  updateClock() {
    if (this.gameState !== POWER_OFF) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    this.standbyClock.innerHTML = `${h}:${m}:${s}`;
  }

  // ========== 虚拟按键 ==========
  initVirtualControls() {
    const dpadBtns = this.root.querySelectorAll('.dpad-btn');
    const actionBtns = this.root.querySelectorAll('.action-btn');

    dpadBtns.forEach(btn => {
      const dir = btn.getAttribute('data-dir');
      if (!dir) return;

      const handler = (e: Event) => {
        e.preventDefault();
        this.handleDirection(dir as Direction);
      };

      btn.addEventListener('mousedown', handler);
      btn.addEventListener('touchstart', handler, { passive: false });
    });

    actionBtns.forEach(btn => {
      const action = btn.getAttribute('data-action');
      if (!action) return;

      const handler = (e: Event) => {
        e.preventDefault();
        this.handleAction(action);
      };

      btn.addEventListener('mousedown', handler);
      btn.addEventListener('touchstart', handler, { passive: false });
    });
  }

  handleDirection(direction: Direction) {
    if (this.gameState === POWER_ON) {
      // 开机状态下按方向键只用来开始游戏，不改变朝向
      this.startGame();
      return;
    }
    if (this.gameState === PLAYING) {
      this.snakeToDirection = direction;
    }
  }

  handleAction(action: string) {
    if (this.gameState !== PLAYING) return;
    if (action === 'fast') {
      this.isFast = true;
    } else if (action === 'slow') {
      this.isFast = false;
    }
  }

  // ========== 键盘与滑动 ==========
  initInput() {
    // 方向监听先注册：开机状态下按方向键只用来开始游戏
    this.input.onDirection(direction => this.handleDirection(direction));

    this.input.onAnyKey(event => this.handleKey(event));

    // 屏幕滑动操控方向
    const stage = this.root.querySelector<HTMLElement>('.stage');
    if (stage) {
      this.input.onSwipe(stage, direction => this.handleDirection(direction));
    }
  }

  handleKey(event: KeyboardEvent) {
    // 开机状态：任意键开始游戏
    if (this.gameState === POWER_ON) {
      this.startGame();
      return;
    }

    // 暂停状态：ESC/P 键恢复
    if (this.gameState === PAUSED) {
      if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        this.resume();
      }
      return;
    }

    // 游戏中
    if (this.gameState === PLAYING) {
      if (event.key === ' ') {
        this.isFast = !this.isFast;
      }
      // ESC / P 键暂停
      if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        this.pause();
      }
    }
  }

  // ========== 游戏循环 ==========
  getSpeed(): number {
    const levelSpeed = 300 - (this.scorePanel.level - 1) * 30;
    if (this.isFast) {
      return Math.max(50, levelSpeed - 200);
    }
    return levelSpeed;
  }

  // 每帧推进：待机时钟与蛇的移动
  update(dt: number) {
    this.clockAccumulator += dt;
    if (this.clockAccumulator >= 1) {
      this.clockAccumulator -= 1;
      this.updateClock();
    }

    if (!this.snakeIsLive) return;

    // 按当前速度累积步进时长
    this.moveAccumulator += dt * 1000;
    const speed = this.getSpeed();
    // 单帧最多推进几步，避免卡顿后瞬间连跳
    let guard = 0;
    while (this.moveAccumulator >= speed && this.snakeIsLive && guard < 4) {
      this.moveAccumulator -= speed;
      this.step();
      guard++;
    }
  }

  // 走一格
  step() {
    let X = this.snake.X;
    let Y = this.snake.Y;

    switch (this.snakeToDirection) {
      case 'up':
        Y -= 10;
        break;
      case 'down':
        Y += 10;
        break;
      case 'left':
        X -= 10;
        break;
      case 'right':
        X += 10;
        break;
    }

    this.checkIsEating(X, Y);

    try {
      this.snake.X = X;
      this.snake.Y = Y;
    } catch (e) {
      console.log(e)
      this.showGameOver();
      this.snakeIsLive = false
    }
  }

  checkIsEating(X: number, Y: number) {
    if(X === this.food.X && Y === this.food.Y) {
      this.food.change();
      this.scorePanel.addScore();
      this.snake.addSnakeBody();
      audio.play('eat');
    }
  }
}

export default GameControl
