// 2048 棋盘纯逻辑：不碰 DOM，便于单元测试
import { Direction } from '../../core/input'

// 棋盘边长
export const SIZE = 4;
export const CELL_COUNT = SIZE * SIZE;

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
}

// 一次合并的记录
export interface MergeInfo {
  // 合并后幸存的方块
  survivorId: number;
  // 被吸收的方块
  absorbedId: number;
  // 合并后的数值
  value: number;
}

export interface MoveResult {
  // 移动后的棋盘
  tiles: (Tile | null)[];
  // 本次发生的合并
  merges: MergeInfo[];
  // 本次得分
  gained: number;
  // 棋盘是否发生变化（位移或合并）
  changed: boolean;
}

// 每条线上的格子下标，按行进方向排列
export function buildLines(direction: Direction): number[][] {
  const lines: number[][] = [];
  for (let i = 0; i < SIZE; i++) {
    if (direction === 'left') {
      lines.push([i * SIZE, i * SIZE + 1, i * SIZE + 2, i * SIZE + 3]);
    } else if (direction === 'right') {
      lines.push([i * SIZE + 3, i * SIZE + 2, i * SIZE + 1, i * SIZE]);
    } else if (direction === 'up') {
      lines.push([i, SIZE + i, SIZE * 2 + i, SIZE * 3 + i]);
    } else {
      lines.push([SIZE * 3 + i, SIZE * 2 + i, SIZE + i, i]);
    }
  }
  return lines;
}

// 沿指定方向移动并合并。不修改传入的棋盘
export function moveTiles(tiles: (Tile | null)[], direction: Direction): MoveResult {
  const next: (Tile | null)[] = new Array(CELL_COUNT).fill(null);
  const merges: MergeInfo[] = [];
  let gained = 0;
  let changed = false;

  for (const line of buildLines(direction)) {
    // 按行进方向取出这一行/列上有方块的格子
    const occupied: Tile[] = [];
    for (const index of line) {
      const tile = tiles[index];
      if (tile) occupied.push(tile);
    }

    const out: Tile[] = [];
    let i = 0;
    while (i < occupied.length) {
      const a = occupied[i];
      const b = occupied[i + 1];
      if (b && b.value === a.value) {
        // 合并：a 留下并翻倍，b 被吸收
        const value = a.value * 2;
        out.push({ id: a.id, value, row: a.row, col: a.col });
        merges.push({ survivorId: a.id, absorbedId: b.id, value });
        gained += value;
        changed = true;
        i += 2;
      } else {
        out.push({ id: a.id, value: a.value, row: a.row, col: a.col });
        i += 1;
      }
    }

    // 紧凑排列到行进方向的起点
    out.forEach((tile, idx) => {
      const target = line[idx];
      const newRow = Math.floor(target / SIZE);
      const newCol = target % SIZE;
      if (tile.row !== newRow || tile.col !== newCol) changed = true;
      tile.row = newRow;
      tile.col = newCol;
      next[target] = tile;
    });
  }

  return { tiles: next, merges, gained, changed };
}

// 空格子下标
export function emptyCells(tiles: (Tile | null)[]): number[] {
  const empty: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (!tiles[i]) empty.push(i);
  }
  return empty;
}

// 是否死局：棋盘已满且没有相邻相等的方块
export function isDead(tiles: (Tile | null)[]): boolean {
  for (let i = 0; i < CELL_COUNT; i++) {
    if (!tiles[i]) return false;
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = tiles[r * SIZE + c]!.value;
      if (c + 1 < SIZE && tiles[r * SIZE + c + 1]!.value === value) return false;
      if (r + 1 < SIZE && tiles[(r + 1) * SIZE + c]!.value === value) return false;
    }
  }
  return true;
}
