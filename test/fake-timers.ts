import { vi } from 'vitest'

type FakeTimersToFake = NonNullable<Parameters<typeof vi.useFakeTimers>[0]>['toFake'];

// 假时钟要覆盖 requestAnimationFrame：游戏循环的帧才是可计数的定时器
export const FAKE_TIMERS: FakeTimersToFake = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame'
];
