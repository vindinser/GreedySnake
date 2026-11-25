import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import games from '../src/games'
import { FAKE_TIMERS } from './fake-timers'

describe('游戏注册表冒烟测试', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: FAKE_TIMERS });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('注册表非空', () => {
    expect(games.length).toBeGreaterThan(0);
  });

  it('每款游戏的 id 唯一', () => {
    const ids = games.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('能检出未清理的 timer（检测手段本身有效）', () => {
    const interval = setInterval(() => { }, 1000);
    expect(vi.getTimerCount()).toBe(1);
    clearInterval(interval);
    expect(vi.getTimerCount()).toBe(0);
  });

  for (const game of games) {
    it(`${game.id}：连续两轮挂载 → 销毁，无异常且无残留 timer`, () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      for (let round = 0; round < 2; round++) {
        const instance = game.mount(container);

        // 游戏确实渲染出了内容
        expect(container.innerHTML.length).toBeGreaterThan(0);
        // 循环确实在跑：存在待触发的帧
        expect(vi.getTimerCount()).toBeGreaterThan(0);

        instance.destroy();

        // 销毁后不允许残留任何定时器
        expect(vi.getTimerCount()).toBe(0);
        container.innerHTML = '';
      }

      document.body.removeChild(container);
    });
  }
});
