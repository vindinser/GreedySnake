import { GameLoop } from '../../core/loop'
import { InputManager } from '../../core/input'
import { audio } from '../../core/audio'
import { storage } from '../../core/storage'
import { createButton, createHud, createOverlay, Hud, Overlay } from '../../ui'
import type * as MatterNS from 'matter-js'
import {
  BALL_RADIUS,
  Brick,
  buildBricks,
  clampPaddleX,
  isBallLost,
  LEVELS,
  Level,
  nextLevelIndex,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  START_LIVES,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './logic'

// 最高分存储键
const BEST_KEY = 'breakout.best';
// 物理固定步长（毫秒）
const PHYSICS_STEP = 1000 / 60;
// 挡板最大出球角度（弧度）
const MAX_BOUNCE_ANGLE = 1.0;
// 键盘每按一次挡板移动的像素
const KEY_STEP = 24;

type State = 'serve' | 'playing' | 'dead' | 'levelclear' | 'gameover';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export default class Breakout {
  private Matter: typeof MatterNS;
  private root: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private hud!: Hud;
  private overlay!: Overlay;
  private loop: GameLoop;
  private input!: InputManager;

  // 物理
  private engine!: MatterNS.Engine;
  private ball!: MatterNS.Body;
  private paddle!: MatterNS.Body;
  private brickBodies: MatterNS.Body[] = [];
  // body id -> 砖块数据
  private brickMap = new Map<number, Brick>();

  // 状态
  private state: State = 'serve';
  private stateTimer = 0;
  private levelIndex = 0;
  score = 0;
  best = 0;
  lives = START_LIVES;
  // 当前关卡球速（像素/秒）
  private ballSpeed = LEVELS[0].ballSpeed;
  // 挡板目标 x
  private paddleX = WORLD_WIDTH / 2;
  // 物理步进累加器
  private physicsAccumulator = 0;
  // 本帧是否撞到挡板
  private paddleHit = false;
  // 待移除的砖块
  private pendingBrickRemovals: MatterNS.Body[] = [];
  // 碎屑粒子
  private particles: Particle[] = [];
  // 画布缩放比（逻辑像素 -> 设备像素）
  private scale = 1;

  constructor(container: HTMLElement, Matter: typeof MatterNS) {
    this.Matter = Matter;
    this.root = container;

    const canvas = container.querySelector<HTMLCanvasElement>('#canvas');
    if (!canvas) throw new Error('打砖块缺少画布');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('打砖块无法获取 2D 上下文');
    this.ctx = ctx;

    this.best = storage.get<number>(BEST_KEY, 0);

    // 计数信息条：得分 / 最高分 / 生命
    this.hud = createHud([
      { label: 'SCORE', value: 0 },
      { label: 'BEST', value: this.best },
      { label: 'LIVES', value: '♥'.repeat(START_LIVES) }
    ]);
    const hudSlot = container.querySelector('#hudSlot')!;
    hudSlot.innerHTML = '';
    hudSlot.appendChild(this.hud.el);

    // 结算覆盖层
    this.overlay = createOverlay({ html: '<div class="bk-over"></div>' });
    container.querySelector('.bk')!.appendChild(this.overlay.el);

    this.setupPhysics();
    this.initInput();

    this.loop = new GameLoop({ update: (dt) => this.update(dt), render: () => this.render() });
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);

    this.reset();
    this.loop.start();
  }

  // ========== 物理世界 ==========
  private setupPhysics() {
    const M = this.Matter;
    this.engine = M.Engine.create({ gravity: { x: 0, y: 0 } });

    // 三面墙：内侧分别贴着 x=0 / x=WORLD_WIDTH / y=0
    const walls = [
      M.Bodies.rectangle(-10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT * 2, { isStatic: true, restitution: 1, friction: 0, label: 'wall' }),
      M.Bodies.rectangle(WORLD_WIDTH + 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT * 2, { isStatic: true, restitution: 1, friction: 0, label: 'wall' }),
      M.Bodies.rectangle(WORLD_WIDTH / 2, -10, WORLD_WIDTH * 2, 20, { isStatic: true, restitution: 1, friction: 0, label: 'wall' })
    ];

    this.paddle = M.Bodies.rectangle(WORLD_WIDTH / 2, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT, {
      isStatic: true,
      restitution: 1,
      friction: 0,
      label: 'paddle'
    });

    this.ball = M.Bodies.circle(WORLD_WIDTH / 2, PADDLE_Y - 30, BALL_RADIUS, {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      density: 0.001,
      label: 'ball'
    });

    M.Composite.add(this.engine.world, [...walls, this.paddle, this.ball]);

    // 碰撞事件
    M.Events.on(this.engine, 'collisionStart', (event: any) => {
      for (const pair of event.pairs) {
        const other = pair.bodyA === this.ball ? pair.bodyB : pair.bodyA;
        if (other === this.paddle) {
          this.paddleHit = true;
        } else if (other.label === 'brick') {
          this.pendingBrickRemovals.push(other);
        }
      }
    });

    // 物理步进之后再改速度与移除砖块，保证本帧的弹跳已经生效
    M.Events.on(this.engine, 'afterUpdate', () => {
      if (this.paddleHit) {
        this.applyPaddleBounce();
        this.paddleHit = false;
      }
      while (this.pendingBrickRemovals.length) {
        const body = this.pendingBrickRemovals.pop()!;
        this.removeBrick(body);
      }
    });
  }

  // ========== 输入 ==========
  private initInput() {
    // 鼠标 / 触屏移动挡板
    const onPointer = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const worldX = ((e.clientX - rect.left) / rect.width) * WORLD_WIDTH;
      this.paddleX = clampPaddleX(worldX);
    };
    this.canvas.addEventListener('pointermove', onPointer);
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      onPointer(e);
      this.serve();
    });

    // 键盘：左右微调挡板
    this.input = new InputManager(document);
    this.input.onDirection(direction => {
      if (direction === 'left') this.paddleX = clampPaddleX(this.paddleX - KEY_STEP);
      else if (direction === 'right') this.paddleX = clampPaddleX(this.paddleX + KEY_STEP);
    });
    this.input.onKey(' ', () => this.serve());
    this.input.onKey('Enter', () => this.serve());
  }

  // ========== 开局 / 重开 ==========
  reset() {
    this.score = 0;
    this.lives = START_LIVES;
    this.levelIndex = 0;
    this.particles = [];
    this.overlay.hide();
    this.loadLevel(0);
    this.updateHud();
  }

  private loadLevel(index: number) {
    const M = this.Matter;
    this.levelIndex = index;
    const level: Level = LEVELS[index];
    this.ballSpeed = level.ballSpeed;

    // 清掉旧的砖块
    for (const body of this.brickBodies) M.Composite.remove(this.engine.world, body);
    this.brickBodies = [];
    this.brickMap.clear();

    // 生成新砖块
    for (const brick of buildBricks(level)) {
      const body = M.Bodies.rectangle(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width, brick.height, {
        isStatic: true,
        restitution: 1,
        friction: 0,
        label: 'brick'
      });
      this.brickBodies.push(body);
      this.brickMap.set(body.id, brick);
      M.Composite.add(this.engine.world, body);
    }

    this.parkBall();
    this.state = 'serve';
  }

  // 球停在挡板上
  private parkBall() {
    const M = this.Matter;
    M.Body.setPosition(this.ball, { x: this.paddleX, y: PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_RADIUS - 1 });
    M.Body.setVelocity(this.ball, { x: 0, y: 0 });
  }

  private serve() {
    if (this.state !== 'serve') return;
    this.state = 'playing';
    const speed = this.ballSpeed / 60;
    this.Matter.Body.setVelocity(this.ball, { x: speed * 0.45, y: -speed * 0.89 });
    audio.play('laser');
  }

  // ========== 每帧更新 ==========
  private update(dt: number) {
    this.updateParticles(dt);
    // 挡板始终跟随输入
    this.Matter.Body.setPosition(this.paddle, { x: this.paddleX, y: PADDLE_Y });

    if (this.state === 'serve') {
      this.parkBall();
      return;
    }

    if (this.state === 'dead' || this.state === 'levelclear') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.advanceState();
      return;
    }

    if (this.state !== 'playing') return;

    // 固定步长推进物理
    this.physicsAccumulator += dt * 1000;
    let steps = 0;
    while (this.physicsAccumulator >= PHYSICS_STEP && steps < 5) {
      this.physicsAccumulator -= PHYSICS_STEP;
      this.Matter.Engine.update(this.engine, PHYSICS_STEP);
      this.clampBallSpeed();
      steps++;
    }

    // 掉出下边界
    if (isBallLost(this.ball.position.y)) this.loseLife();
  }

  private advanceState() {
    if (this.state === 'dead') {
      if (this.lives <= 0) {
        this.state = 'gameover';
        this.showGameOver();
      } else {
        this.parkBall();
        this.state = 'serve';
      }
      return;
    }
    if (this.state === 'levelclear') {
      this.loadLevel(nextLevelIndex(this.levelIndex));
      this.updateHud();
    }
  }

  // ========== 挡板反弹 ==========
  private applyPaddleBounce() {
    const M = this.Matter;
    const v = this.ball.velocity;
    const speed = Math.hypot(v.x, v.y);
    const max = this.ballSpeed / 60;
    if (speed < 0.01) return;

    // 按击球点相对挡板中心的偏移决定出球角度
    const rel = Math.max(-1, Math.min(1, (this.ball.position.x - this.paddle.position.x) / (PADDLE_WIDTH / 2)));
    const angle = rel * MAX_BOUNCE_ANGLE;
    const out = Math.min(speed, max);
    M.Body.setVelocity(this.ball, {
      x: Math.sin(angle) * out,
      y: -Math.abs(Math.cos(angle) * out)
    });
  }

  // 限速并避免球水平卡死
  private clampBallSpeed() {
    const M = this.Matter;
    const v = this.ball.velocity;
    const max = this.ballSpeed / 60;
    const speed = Math.hypot(v.x, v.y);
    if (speed > max) {
      M.Body.setVelocity(this.ball, { x: (v.x / speed) * max, y: (v.y / speed) * max });
      return;
    }
    if (Math.abs(v.y) < max * 0.25) {
      M.Body.setVelocity(this.ball, { x: v.x, y: (v.y >= 0 ? 1 : -1) * max * 0.25 });
    }
  }

  // ========== 砖块 ==========
  private removeBrick(body: MatterNS.Body) {
    const index = this.brickBodies.indexOf(body);
    if (index < 0) return;
    this.brickBodies.splice(index, 1);
    const brick = this.brickMap.get(body.id);
    this.brickMap.delete(body.id);
    this.Matter.Composite.remove(this.engine.world, body);

    if (brick) {
      this.score += brick.points;
      this.spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
    }
    audio.play('clear');
    this.updateHud();

    if (this.brickBodies.length === 0) {
      this.state = 'levelclear';
      this.stateTimer = 1.2;
    }
  }

  // ========== 粒子 ==========
  private spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        color
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
    }
  }

  // ========== 生命 ==========
  private loseLife() {
    this.lives--;
    this.updateHud();
    audio.play('boom');
    this.state = 'dead';
    this.stateTimer = 1;
  }

  // ========== 计数 ==========
  private updateHud() {
    this.hud.setItem(0, this.score);
    if (this.score > this.best) {
      this.best = this.score;
      storage.set(BEST_KEY, this.best);
    }
    this.hud.setItem(1, this.best);
    this.hud.setItem(2, '♥'.repeat(Math.max(0, this.lives)) || '—');
  }

  // ========== 结算 ==========
  private showGameOver() {
    const box = this.overlay.el.querySelector('.bk-over')!;
    box.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'bk-over-title';
    title.textContent = '游戏结束';
    const desc = document.createElement('div');
    desc.className = 'bk-over-desc';
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

  // ========== 画布 ==========
  private resizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = this.canvas.clientWidth || WORLD_WIDTH;
    const cssHeight = cssWidth * (WORLD_HEIGHT / WORLD_WIDTH);
    this.canvas.style.height = cssHeight + 'px';
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.scale = (cssWidth * dpr) / WORLD_WIDTH;
  };

  // ========== 渲染 ==========
  private render() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 背景
    ctx.fillStyle = '#0c141d';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 砖块
    for (const body of this.brickBodies) {
      const brick = this.brickMap.get(body.id);
      if (!brick) continue;
      ctx.fillStyle = brick.color;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
      ctx.fill();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.roundRect(brick.x + 2, brick.y + 2, brick.width - 4, 3, 2);
      ctx.fill();
    }

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // 挡板
    ctx.fillStyle = '#4dabf7';
    ctx.beginPath();
    ctx.roundRect(this.paddle.position.x - PADDLE_WIDTH / 2, PADDLE_Y - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
    ctx.fill();

    // 球
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.arc(this.ball.position.x, this.ball.position.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // 待发球提示
    if (this.state === 'serve') {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '13px "Courier", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('点击画面或按空格发球', WORLD_WIDTH / 2, PADDLE_Y - 46);
      ctx.textAlign = 'left';
    }
  }

  // ========== 销毁 ==========
  destroy() {
    this.loop.stop();
    this.input.destroy();
    window.removeEventListener('resize', this.resizeCanvas);
    this.Matter.Events.off(this.engine, 'collisionStart');
    this.Matter.Events.off(this.engine, 'afterUpdate');
    this.Matter.Engine.clear(this.engine);
    this.brickBodies = [];
    this.brickMap.clear();
    this.particles = [];
  }
}
