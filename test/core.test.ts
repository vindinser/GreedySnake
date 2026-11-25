import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { storage } from '../src/core/storage'
import { DisposableGroup } from '../src/core/dispose'
import { GameLoop } from '../src/core/loop'
import { InputManager } from '../src/core/input'
import { AudioEngine } from '../src/core/audio'
import { FAKE_TIMERS } from './fake-timers'

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

describe('core/storage', () => {
  beforeEach(() => localStorage.clear());

  it('没有值时返回默认值', () => {
    expect(storage.get('missing', 42)).toBe(42);
  });

  it('写入后可读回对象', () => {
    storage.set('obj', { a: 1 });
    expect(storage.get('obj', { a: 0 })).toEqual({ a: 1 });
  });

  it('remove 之后回到默认值', () => {
    storage.set('k', 7);
    storage.remove('k');
    expect(storage.get('k', 0)).toBe(0);
  });

  it('统一使用 gs: 前缀', () => {
    storage.set('prefixed', 1);
    expect(localStorage.getItem('gs:prefixed')).toBe('1');
  });

  it('存储不可用时静默失败并回落到默认值', () => {
    // jsdom 的 localStorage 是 Proxy，方法挂在 Storage.prototype 上，必须打在原型上才能拦截
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => storage.set('x', 1)).not.toThrow();
    expect(storage.get('x', 'fallback')).toBe('fallback');
    spy.mockRestore();
  });
});

describe('core/dispose', () => {
  it('逆序释放', () => {
    const order: number[] = [];
    const group = new DisposableGroup();
    group.add(() => order.push(1));
    group.add(() => order.push(2));
    group.dispose();
    expect(order).toEqual([2, 1]);
  });

  it('重复释放不会重复执行', () => {
    const group = new DisposableGroup();
    let count = 0;
    group.add(() => count++);
    group.dispose();
    group.dispose();
    expect(count).toBe(1);
  });

  it('释放后新增的清理动作立即执行', () => {
    const group = new DisposableGroup();
    group.dispose();
    let count = 0;
    group.add(() => count++);
    expect(count).toBe(1);
  });

  it('单个清理动作抛错不影响其它动作', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const group = new DisposableGroup();
    let count = 0;
    group.add(() => count++);
    group.add(() => { throw new Error('boom'); });
    group.dispose();
    expect(count).toBe(1);
    errorSpy.mockRestore();
  });
});

describe('core/loop', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: FAKE_TIMERS });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('逐帧回调，dt 不超过 maxDelta', () => {
    const nowSpy = vi.spyOn(performance, 'now');
    nowSpy.mockReturnValue(0);
    const dts: number[] = [];
    const loop = new GameLoop({ update: dt => dts.push(dt) });
    loop.start();
    // 模拟一次 1 秒的卡顿
    nowSpy.mockReturnValue(1000);
    vi.advanceTimersByTime(20);
    expect(dts.length).toBeGreaterThan(0);
    expect(Math.max(...dts)).toBeLessThanOrEqual(0.05);
    loop.stop();
    nowSpy.mockRestore();
  });

  it('pause / resume 幂等，暂停期间不推进', () => {
    const dts: number[] = [];
    const loop = new GameLoop({ update: dt => dts.push(dt) });
    loop.start();
    loop.pause();
    loop.pause();
    expect(loop.isPaused).toBe(true);
    const before = dts.length;
    vi.advanceTimersByTime(100);
    expect(dts.length).toBe(before);
    loop.resume();
    loop.resume();
    expect(loop.isPaused).toBe(false);
    vi.advanceTimersByTime(50);
    expect(dts.length).toBeGreaterThan(before);
    loop.stop();
  });

  it('stop 之后不再回调', () => {
    const dts: number[] = [];
    const loop = new GameLoop({ update: dt => dts.push(dt) });
    loop.start();
    vi.advanceTimersByTime(50);
    loop.stop();
    const before = dts.length;
    vi.advanceTimersByTime(100);
    expect(dts.length).toBe(before);
    expect(loop.isRunning).toBe(false);
  });

  it('页面隐藏时自动暂停，恢复后自动继续', () => {
    const loop = new GameLoop({ update: () => { } });
    loop.start();
    setDocumentHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.isPaused).toBe(true);
    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.isPaused).toBe(false);
    loop.stop();
    setDocumentHidden(false);
  });

  it('手动暂停后不会因页面恢复而被自动继续', () => {
    const loop = new GameLoop({ update: () => { } });
    loop.start();
    loop.pause();
    setDocumentHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.isPaused).toBe(true);
    loop.stop();
    setDocumentHidden(false);
  });
});

describe('core/input', () => {
  it('onKey 命中 event.key 或 event.code 任一即可', () => {
    const target = new EventTarget();
    const input = new InputManager(target);
    const hits: string[] = [];
    input.onKey('ArrowUp', () => hits.push('up'));
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(hits).toEqual(['up', 'up']);
    input.destroy();
  });

  it('onDirection 把方向键与 WASD 归一化', () => {
    const target = new EventTarget();
    const input = new InputManager(target);
    const dirs: string[] = [];
    input.onDirection(d => dirs.push(d));
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(dirs).toEqual(['up', 'left', 'down', 'right']);
    input.destroy();
  });

  it('解除订阅后回调不再触发', () => {
    const target = new EventTarget();
    const input = new InputManager(target);
    let hits = 0;
    const off = input.onAnyKey(() => hits++);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(hits).toBe(1);
    off();
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(hits).toBe(1);
    input.destroy();
  });

  it('destroy 之后所有回调都不再触发', () => {
    const target = new EventTarget();
    const input = new InputManager(target);
    let hits = 0;
    input.onAnyKey(() => hits++);
    input.destroy();
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(hits).toBe(0);
  });

  it('滑动超过阈值才触发方向', () => {
    const el = document.createElement('div');
    const input = new InputManager();
    const dirs: string[] = [];
    input.onSwipe(el, d => dirs.push(d));

    const pointer = (type: string, x: number, y: number) =>
      new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });

    // 位移不足阈值：忽略
    el.dispatchEvent(pointer('pointerdown', 0, 0));
    el.dispatchEvent(pointer('pointerup', 5, 5));
    expect(dirs).toEqual([]);

    // 横向位移足够
    el.dispatchEvent(pointer('pointerdown', 0, 0));
    el.dispatchEvent(pointer('pointerup', 60, 0));
    expect(dirs).toEqual(['right']);

    // 纵向位移足够
    el.dispatchEvent(pointer('pointerdown', 0, 0));
    el.dispatchEvent(pointer('pointerup', 0, -60));
    expect(dirs).toEqual(['right', 'up']);

    input.destroy();
  });
});

describe('core/audio', () => {
  beforeEach(() => localStorage.clear());

  it('播放已定义的音效不抛错', () => {
    const engine = new AudioEngine();
    engine.define('test', { wave: 'square', freq: 440, duration: 0.1 });
    expect(() => engine.play('test')).not.toThrow();
  });

  it('未注册的音效名被静默忽略', () => {
    const engine = new AudioEngine();
    expect(() => engine.play('not-exist')).not.toThrow();
  });

  it('频率序列按顺序演奏', () => {
    const engine = new AudioEngine();
    engine.define('melody', { wave: 'square', freq: [440, 550, 660], duration: 0.3 });
    expect(() => engine.play('melody')).not.toThrow();
  });

  it('静音状态写入 storage 并可恢复', () => {
    const engine = new AudioEngine();
    engine.setMuted(true);
    expect(engine.muted).toBe(true);
    expect(storage.get('audio.muted', false)).toBe(true);
    expect(new AudioEngine().muted).toBe(true);
  });
});
