// 统一游戏循环：单个 requestAnimationFrame、帧间隔截断、页面隐藏自动暂停

export interface LoopOptions {
  // 每帧回调，dt 为秒，elapsed 为累计运行时间（不含暂停时长）
  update(dt: number, elapsed: number): void;
  // 可选的渲染回调
  render?(): void;
  // 单帧最大步长（秒），防止切回标签页时一帧跳变，默认 0.05
  maxDelta?: number;
}

export class GameLoop {
  private options: LoopOptions;
  private maxDelta: number;
  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private running = false;
  private paused = false;
  // 是否因为页面隐藏而暂停：只有这种情况才允许页面恢复时自动继续
  private pausedByVisibility = false;

  constructor(options: LoopOptions) {
    this.options = options;
    this.maxDelta = options.maxDelta ?? 0.05;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  // 累计运行时间（秒），不含暂停时长
  get elapsedTime(): number {
    return this.elapsed;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTime = this.now();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.pausedByVisibility = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // 暂停：不再推进帧，但保留 visibilitychange 监听，页面恢复后可继续
  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    // 重置时间基准，暂停期间的时间不计入 elapsed
    this.lastTime = this.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      if (this.running && !this.paused) {
        this.pausedByVisibility = true;
        this.pause();
      }
    } else if (this.pausedByVisibility) {
      this.pausedByVisibility = false;
      this.resume();
    }
  };

  private tick = () => {
    if (!this.running || this.paused) return;
    const time = this.now();
    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (dt < 0) dt = 0;
    if (dt > this.maxDelta) dt = this.maxDelta;
    this.elapsed += dt;
    this.options.update(dt, this.elapsed);
    if (this.options.render) this.options.render();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private now(): number {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }
}
