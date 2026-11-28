import { describe, it, expect } from 'vitest'
import {
  BALL_RADIUS,
  brickPoints,
  buildBricks,
  clampPaddleX,
  isBallLost,
  LEVELS,
  nextLevelIndex,
  PADDLE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../src/games/breakout/logic'

describe('打砖块 / 关卡表', () => {
  it('三关，每关都有图案与球速', () => {
    expect(LEVELS).toHaveLength(3);
    for (const level of LEVELS) {
      expect(level.pattern.length).toBeGreaterThan(0);
      expect(level.ballSpeed).toBeGreaterThan(0);
    }
  });

  it('每关图案各行等宽', () => {
    for (const level of LEVELS) {
      const width = level.pattern[0].length;
      for (const row of level.pattern) {
        expect(row.length).toBe(width);
      }
    }
  });

  it('球速逐关递增', () => {
    expect(LEVELS[1].ballSpeed).toBeGreaterThan(LEVELS[0].ballSpeed);
    expect(LEVELS[2].ballSpeed).toBeGreaterThan(LEVELS[1].ballSpeed);
  });
});

describe('打砖块 / buildBricks', () => {
  it('砖块数等于图案里的 # 个数', () => {
    for (const level of LEVELS) {
      const expected = level.pattern.join('').split('#').length - 1;
      expect(buildBricks(level)).toHaveLength(expected);
    }
  });

  it('第一关是 5×9 共 45 块', () => {
    expect(buildBricks(LEVELS[0])).toHaveLength(45);
  });

  it('砖块横向居中', () => {
    const bricks = buildBricks(LEVELS[0]);
    const left = Math.min(...bricks.map(b => b.x));
    const right = Math.max(...bricks.map(b => b.x + b.width));
    expect(left).toBeCloseTo(right === left ? left : (WORLD_WIDTH - (right - left)) / 2, 5);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(WORLD_WIDTH);
  });

  it('砖块不重叠且按行递增', () => {
    const bricks = buildBricks(LEVELS[0]);
    for (let i = 1; i < bricks.length; i++) {
      // 同一行内 x 递增，跨行时 y 递增
      if (bricks[i].row === bricks[i - 1].row) {
        expect(bricks[i].x).toBeGreaterThan(bricks[i - 1].x);
      } else {
        expect(bricks[i].y).toBeGreaterThan(bricks[i - 1].y);
      }
    }
  });

  it('砖块都在画面内', () => {
    for (const level of LEVELS) {
      for (const brick of buildBricks(level)) {
        expect(brick.x).toBeGreaterThanOrEqual(0);
        expect(brick.y).toBeGreaterThanOrEqual(0);
        expect(brick.x + brick.width).toBeLessThanOrEqual(WORLD_WIDTH);
        expect(brick.y + brick.height).toBeLessThanOrEqual(WORLD_HEIGHT);
      }
    }
  });

  it('每块砖都有颜色与得分', () => {
    for (const brick of buildBricks(LEVELS[0])) {
      expect(brick.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(brick.points).toBeGreaterThan(0);
    }
  });
});

describe('打砖块 / brickPoints', () => {
  it('越靠上得分越高', () => {
    expect(brickPoints(0, 5)).toBeGreaterThan(brickPoints(1, 5));
    expect(brickPoints(3, 5)).toBeGreaterThan(brickPoints(4, 5));
  });

  it('最底行为 10 分', () => {
    expect(brickPoints(4, 5)).toBe(10);
  });
});

describe('打砖块 / clampPaddleX', () => {
  it('不会越出左右边界', () => {
    expect(clampPaddleX(-100)).toBe(PADDLE_WIDTH / 2);
    expect(clampPaddleX(99999)).toBe(WORLD_WIDTH - PADDLE_WIDTH / 2);
  });

  it('范围内的位置保持不变', () => {
    expect(clampPaddleX(200)).toBe(200);
  });
});

describe('打砖块 / isBallLost', () => {
  it('球心掉出下边界才算丢', () => {
    expect(isBallLost(WORLD_HEIGHT - BALL_RADIUS - 1)).toBe(false);
    expect(isBallLost(WORLD_HEIGHT + 10)).toBe(true);
  });
});

describe('打砖块 / nextLevelIndex', () => {
  it('逐关推进，最后一关之后回到第一关', () => {
    expect(nextLevelIndex(0)).toBe(1);
    expect(nextLevelIndex(1)).toBe(2);
    expect(nextLevelIndex(2)).toBe(0);
  });
});
