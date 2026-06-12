import Snake from "./Snake";
import Food from "./Food"
import ScorePanel from "./ScorePanel";

// 游戏状态
const POWER_OFF = 0;
const POWER_ON = 1;
const PLAYING = 2;
const PAUSED = 3;

class GameControl {
  snake!: Snake;
  food!: Food;
  scorePanel!: ScorePanel;

  snakeToDirection: string = '';
  rightToDirection: Array<string> = [ 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Up', 'Down', 'Left', 'Right' ];

  snakeIsLive: Boolean = false;
  isFast: boolean = false;
  gameState: number = POWER_OFF;

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
  clockTimer: any = null;

  constructor() {
    this.gameOverEle = document.getElementById('gameOver')!;
    this.finalScoreEle = document.getElementById('finalScore')!;
    this.restartBtn = document.getElementById('restartBtn')!;
    this.powerBtn = document.getElementById('powerBtn')!;
    this.startBtn = document.getElementById('startBtn')!;
    this.standbyOverlay = document.getElementById('standbyOverlay')!;
    this.readyOverlay = document.getElementById('readyOverlay')!;
    this.pauseOverlay = document.getElementById('pauseOverlay')!;
    this.ledLight = document.getElementById('ledLight')!;
    this.standbyClock = document.getElementById('standbyClock')!;
    this.gameInit()
  }

  gameInit() {
    console.log('%cGreedySnake Console Ready!', 'color: red; font-size: 20px; font-weight: 600;');
    this.initPower();
    this.initStartBtn();
    this.initRestart();
    this.initVirtualControls();
    this.initTouchControls();
    document.addEventListener('keydown', this.keyDownHandler.bind(this));
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
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
  }

  powerOff() {
    this.gameState = POWER_OFF;
    this.snakeIsLive = false;
    this.isFast = false;
    this.snakeToDirection = '';
    this.readyOverlay.classList.remove('show');
    this.gameOverEle.classList.remove('show');
    this.pauseOverlay.classList.remove('show');
    this.standbyOverlay.classList.add('show');
    this.ledLight.classList.remove('on');
    this.startBtn.textContent = 'START';

    // 重置分数
    this.scorePanel && (this.scorePanel.score = 0);
    this.scorePanel && (this.scorePanel.level = 1);
    document.getElementById('score')!.innerHTML = '0';
    document.getElementById('level')!.innerHTML = '1';

    // 重置蛇
    const snakeBody = document.querySelector('.snake');
    if (snakeBody) snakeBody.innerHTML = '<div></div>';
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
    this.snakeToDirection = '';
    this.startBtn.textContent = 'PAUSE';

    this.snake = new Snake();
    this.food = new Food();
    this.scorePanel = new ScorePanel();
    this.snakeRun();
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
    this.snakeRun();
  }

  // ========== 重新开始 ==========
  initRestart() {
    this.restartBtn.addEventListener('click', () => {
      this.restart();
    });
    this.restartBtn.addEventListener('touchstart', ((e: Event) => {
      e.preventDefault();
      this.restart();
    }) as EventListener, { passive: false });
  }

  restart() {
    this.gameState = PLAYING;
    this.snakeIsLive = true;
    this.snakeToDirection = '';
    this.isFast = false;
    this.scorePanel.score = 0;
    this.scorePanel.level = 1;
    this.scorePanel.scoreEle.innerHTML = '0';
    this.scorePanel.levelEle.innerHTML = '1';
    this.gameOverEle.classList.remove('show');
    this.pauseOverlay.classList.remove('show');
    this.startBtn.textContent = 'PAUSE';

    const snakeBody = document.querySelector('.snake')!;
    snakeBody.innerHTML = '<div></div>';

    this.snake = new Snake();
    this.food = new Food();
    this.food.change();

    this.snakeRun();
  }

  showGameOver() {
    this.finalScoreEle.innerHTML = String(this.scorePanel.score);
    this.gameOverEle.classList.add('show');
    this.startBtn.textContent = 'START';
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
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    const actionBtns = document.querySelectorAll('.action-btn');

    dpadBtns.forEach(btn => {
      const dir = btn.getAttribute('data-dir');
      if (!dir) return;

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.handleDirection(dir);
      });

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleDirection(dir);
      }, { passive: false });
    });

    actionBtns.forEach(btn => {
      const action = btn.getAttribute('data-action');
      if (!action) return;

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.handleAction(action);
      });

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleAction(action);
      }, { passive: false });
    });
  }

  handleDirection(dir: string) {
    if (this.gameState === POWER_ON) {
      this.startGame();
      return;
    }
    if (this.gameState === PLAYING) {
      this.snakeToDirection = dir;
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

  // ========== 触摸滑动 ==========
  initTouchControls() {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    let startX = 0;
    let startY = 0;

    stage.addEventListener('touchstart', ((e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }) as EventListener, { passive: true });

    stage.addEventListener('touchend', ((e: TouchEvent) => {
      if (this.gameState !== PLAYING) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = endX - startX;
      const diffY = endY - startY;
      const minSwipe = 20;

      if (Math.abs(diffX) < minSwipe && Math.abs(diffY) < minSwipe) return;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        this.snakeToDirection = diffX > 0 ? 'ArrowRight' : 'ArrowLeft';
      } else {
        this.snakeToDirection = diffY > 0 ? 'ArrowDown' : 'ArrowUp';
      }
    }) as EventListener, { passive: true });
  }

  // ========== 键盘 ==========
  keyDownHandler(event: KeyboardEvent) {
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
      if (this.rightToDirection.includes(event.key)) {
        this.snakeToDirection = event.key;
      }
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

  snakeRun() {
    if (!this.snakeIsLive) return;

    let X = this.snake.X;
    let Y = this.snake.Y;

    switch (this.snakeToDirection) {
      case "ArrowUp":
      case "Up":
        Y -= 10;
        break;
      case "ArrowDown":
      case "Down":
        Y += 10;
        break;
      case "ArrowLeft":
      case "Left":
        X -= 10;
        break;
      case "ArrowRight":
      case "Right":
        X += 10;
        break;
      default:
        console.log('%cWrong Direction!', 'color: red; font-size: 20px; font-weight: 600;')
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

    this.snakeIsLive && setTimeout(this.snakeRun.bind(this), this.getSpeed())
  }

  checkIsEating(X: number, Y: number) {
    if(X === this.food.X && Y === this.food.Y) {
      this.food.change();
      this.scorePanel.addScore();
      this.snake.addSnakeBody();
    }
  }
}

export default GameControl
