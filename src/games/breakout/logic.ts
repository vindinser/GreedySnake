// 打砖块：关卡与砖块布局纯逻辑，不碰 DOM

// 逻辑世界尺寸（画布按此尺寸等比缩放）
export const WORLD_WIDTH = 400;
export const WORLD_HEIGHT = 300;

// 挡板
export const PADDLE_WIDTH = 72;
export const PADDLE_HEIGHT = 12;
export const PADDLE_Y = 272;

// 球
export const BALL_RADIUS = 7;

// 砖块
export const BRICK_WIDTH = 40;
export const BRICK_HEIGHT = 15;
export const BRICK_GAP = 3;
export const BRICK_TOP = 30;

// 砖块配色（按行取）
export const BRICK_COLORS: string[] = [
  '#ff6b6b',
  '#ffa94d',
  '#ffd43b',
  '#69db7c',
  '#38d9a9',
  '#4dabf7',
  '#845ef7'
];

// 生命数
export const START_LIVES = 3;

export interface Level {
  key: string;
  name: string;
  // 每行一个字符串：'#' 有砖，'.' 空
  pattern: string[];
  // 球速（像素/秒）
  ballSpeed: number;
}

export const LEVELS: Level[] = [
  {
    key: 'l1',
    name: '第一关',
    pattern: [
      '#########',
      '#########',
      '#########',
      '#########',
      '#########'
    ],
    ballSpeed: 260
  },
  {
    key: 'l2',
    name: '第二关',
    pattern: [
      '#########',
      '#########',
      '.#######.',
      '..#####..',
      '...###...',
      '....#....'
    ],
    ballSpeed: 300
  },
  {
    key: 'l3',
    name: '第三关',
    pattern: [
      '#########',
      '.#.#.#.#.',
      '#########',
      '.#.#.#.#.',
      '#########',
      '.#.#.#.#.',
      '..#####..'
    ],
    ballSpeed: 340
  }
];

export interface Brick {
  row: number;
  col: number;
  // 左上角坐标
  x: number;
  y: number;
  width: number;
  height: number;
  points: number;
  color: string;
}

// 砖块得分：越靠上越贵
export function brickPoints(row: number, totalRows: number): number {
  return (totalRows - row) * 10;
}

// 按关卡生成砖块
export function buildBricks(level: Level): Brick[] {
  const bricks: Brick[] = [];
  const cols = level.pattern[0].length;
  const totalWidth = cols * BRICK_WIDTH + (cols - 1) * BRICK_GAP;
  const left = (WORLD_WIDTH - totalWidth) / 2;

  level.pattern.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '#') continue;
      bricks.push({
        row: r,
        col: c,
        x: left + c * (BRICK_WIDTH + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        points: brickPoints(r, level.pattern.length),
        color: BRICK_COLORS[r % BRICK_COLORS.length]
      });
    }
  });
  return bricks;
}

// 挡板可移动的 x 范围
export function clampPaddleX(x: number): number {
  const half = PADDLE_WIDTH / 2;
  return Math.max(half, Math.min(WORLD_WIDTH - half, x));
}

// 球是否掉出下边界
export function isBallLost(y: number): boolean {
  return y - BALL_RADIUS > WORLD_HEIGHT;
}

// 关卡推进：最后关之后回到第一关
export function nextLevelIndex(index: number): number {
  return (index + 1) % LEVELS.length;
}
