// 统一输入层：键盘（方向键 / WASD 归一化）与指针滑动

export type Direction = 'up' | 'down' | 'left' | 'right'
export type KeyHandler = (event: KeyboardEvent) => void
export type DirectionHandler = (direction: Direction) => void
export type SwipeHandler = (direction: Direction) => void

// 方向键与 WASD 归一化：同时匹配 event.code 与 event.key
const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up', Up: 'up', KeyW: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', Down: 'down', KeyS: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', Left: 'left', KeyA: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', Right: 'right', KeyD: 'right', d: 'right', D: 'right'
}

// 滑动识别所需的最小位移（像素）
const SWIPE_THRESHOLD = 24

export class InputManager {
  private target: EventTarget;
  private disposers: (() => void)[] = [];

  constructor(target: EventTarget = window) {
    this.target = target;
  }

  // 监听指定按键：event.code 或 event.key 任一命中即触发
  onKey(code: string, handler: KeyHandler): () => void {
    const listener = (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.code === code || e.key === code) handler(e);
    };
    this.target.addEventListener('keydown', listener);
    return this.track(() => this.target.removeEventListener('keydown', listener));
  }

  // 监听任意按键
  onAnyKey(handler: KeyHandler): () => void {
    const listener = (event: Event) => handler(event as KeyboardEvent);
    this.target.addEventListener('keydown', listener);
    return this.track(() => this.target.removeEventListener('keydown', listener));
  }

  // 方向键 / WASD 归一化后回调
  onDirection(handler: DirectionHandler): () => void {
    const listener = (event: Event) => {
      const e = event as KeyboardEvent;
      const direction = DIRECTION_KEYS[e.code] || DIRECTION_KEYS[e.key];
      if (direction) handler(direction);
    };
    this.target.addEventListener('keydown', listener);
    return this.track(() => this.target.removeEventListener('keydown', listener));
  }

  // 触屏 / 鼠标滑动方向识别
  onSwipe(el: HTMLElement, handler: SwipeHandler, threshold: number = SWIPE_THRESHOLD): () => void {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onDown = (event: Event) => {
      const e = event as PointerEvent;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
    };
    const onUp = (event: Event) => {
      if (!tracking) return;
      tracking = false;
      const e = event as PointerEvent;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      if (Math.abs(dx) > Math.abs(dy)) handler(dx > 0 ? 'right' : 'left');
      else handler(dy > 0 ? 'down' : 'up');
    };
    const onCancel = () => {
      tracking = false;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    return this.track(() => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    });
  }

  destroy(): void {
    const items = this.disposers;
    this.disposers = [];
    for (let i = items.length - 1; i >= 0; i--) items[i]();
  }

  private track(disposer: () => void): () => void {
    this.disposers.push(disposer);
    return disposer;
  }
}
