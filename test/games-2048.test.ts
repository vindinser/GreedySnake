import { describe, it, expect } from 'vitest'
import { buildLines, CELL_COUNT, emptyCells, isDead, moveTiles, SIZE, Tile } from '../src/games/game2048/logic'

// 用行数据构造棋盘：0 表示空格
function board(rows: number[][]): (Tile | null)[] {
  const cells: (Tile | null)[] = new Array(CELL_COUNT).fill(null);
  let id = 1;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = rows[r][c];
      if (value > 0) cells[r * SIZE + c] = { id: id++, value, row: r, col: c };
    }
  }
  return cells;
}

// 把棋盘读回行数据
function read(tiles: (Tile | null)[]): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < SIZE; c++) {
      const tile = tiles[r * SIZE + c];
      row.push(tile ? tile.value : 0);
    }
    rows.push(row);
  }
  return rows;
}

const EMPTY = [0, 0, 0, 0];

describe('2048 逻辑 / buildLines', () => {
  it('向左时每行按 0→3 排列', () => {
    expect(buildLines('left')[0]).toEqual([0, 1, 2, 3]);
  });

  it('向右时每行按 3→0 排列', () => {
    expect(buildLines('right')[0]).toEqual([3, 2, 1, 0]);
  });

  it('向上时每列按 0→3 排列', () => {
    expect(buildLines('up')[0]).toEqual([0, 4, 8, 12]);
  });

  it('向下时每列按 3→0 排列', () => {
    expect(buildLines('down')[0]).toEqual([12, 8, 4, 0]);
  });
});

describe('2048 逻辑 / moveTiles', () => {
  it('相等的两个方块向左合并成翻倍的一个', () => {
    const result = moveTiles(board([[2, 2, 0, 0], EMPTY, EMPTY, EMPTY]), 'left');
    expect(read(result.tiles)[0]).toEqual([4, 0, 0, 0]);
    expect(result.gained).toBe(4);
    expect(result.merges).toHaveLength(1);
    expect(result.changed).toBe(true);
  });

  it('四个相同的方块合并成两个', () => {
    const result = moveTiles(board([[2, 2, 2, 2], EMPTY, EMPTY, EMPTY]), 'left');
    expect(read(result.tiles)[0]).toEqual([4, 4, 0, 0]);
    expect(result.gained).toBe(8);
    expect(result.merges).toHaveLength(2);
  });

  it('一次移动中同一条线最多合并一次', () => {
    // 三个 2 左移：前两个合并成 4，第三个保持 2 —— 不能合成 8
    const result = moveTiles(board([[2, 2, 2, 0], EMPTY, EMPTY, EMPTY]), 'left');
    expect(read(result.tiles)[0]).toEqual([4, 2, 0, 0]);
    expect(result.gained).toBe(4);
  });

  it('不相等的方块不合并，只做位移', () => {
    const result = moveTiles(board([[2, 4, 0, 0], EMPTY, EMPTY, EMPTY]), 'left');
    expect(read(result.tiles)[0]).toEqual([2, 4, 0, 0]);
    expect(result.gained).toBe(0);
    expect(result.merges).toHaveLength(0);
  });

  it('向右移动时方块贴到右边缘', () => {
    const result = moveTiles(board([[2, 0, 0, 0], EMPTY, EMPTY, EMPTY]), 'right');
    expect(read(result.tiles)[0]).toEqual([0, 0, 0, 2]);
  });

  it('向右移动时靠右的两个相同方块合并', () => {
    const result = moveTiles(board([[0, 0, 2, 2], EMPTY, EMPTY, EMPTY]), 'right');
    expect(read(result.tiles)[0]).toEqual([0, 0, 0, 4]);
    expect(result.gained).toBe(4);
  });

  it('向上移动时按列合并', () => {
    const result = moveTiles(board([[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'up');
    expect(read(result.tiles)[0][0]).toBe(4);
    expect(read(result.tiles)[1][0]).toBe(0);
    expect(result.gained).toBe(4);
  });

  it('向下移动时按列合并', () => {
    const result = moveTiles(board([[0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0], [2, 0, 0, 0]]), 'down');
    expect(read(result.tiles)[3][0]).toBe(4);
    expect(result.gained).toBe(4);
  });

  it('空棋盘移动后不产生任何变化', () => {
    const result = moveTiles(board([EMPTY, EMPTY, EMPTY, EMPTY]), 'left');
    expect(result.changed).toBe(false);
    expect(result.gained).toBe(0);
    expect(result.tiles.every(t => t === null)).toBe(true);
  });

  it('已经贴边的方块移动后不产生变化', () => {
    const result = moveTiles(board([[2, 4, 8, 16], EMPTY, EMPTY, EMPTY]), 'left');
    expect(result.changed).toBe(false);
  });

  it('不会修改传入的棋盘', () => {
    const tiles = board([[2, 2, 4, 4], EMPTY, EMPTY, EMPTY]);
    const snapshot = JSON.stringify(tiles);
    moveTiles(tiles, 'left');
    expect(JSON.stringify(tiles)).toBe(snapshot);
  });

  it('合并记录标出幸存的方块与被吸收的方块', () => {
    const tiles = board([[2, 2, 0, 0], EMPTY, EMPTY, EMPTY]);
    const survivorId = tiles[0]!.id;
    const absorbedId = tiles[1]!.id;
    const result = moveTiles(tiles, 'left');
    expect(result.merges[0].survivorId).toBe(survivorId);
    expect(result.merges[0].absorbedId).toBe(absorbedId);
    expect(result.merges[0].value).toBe(4);
  });

  it('方块总数在合并后减少', () => {
    const result = moveTiles(board([[2, 2, 0, 0], EMPTY, EMPTY, EMPTY]), 'left');
    const count = result.tiles.filter(t => t !== null).length;
    expect(count).toBe(1);
  });
});

describe('2048 逻辑 / emptyCells 与 isDead', () => {
  it('列出所有空格下标', () => {
    const tiles = board([[2, 0, 0, 0], EMPTY, EMPTY, EMPTY]);
    const empty = emptyCells(tiles);
    expect(empty).toHaveLength(15);
    expect(empty).not.toContain(0);
  });

  it('还有空格时不是死局', () => {
    expect(isDead(board([[2, 0, 0, 0], EMPTY, EMPTY, EMPTY]))).toBe(false);
  });

  it('棋盘已满且没有相邻相等时是死局', () => {
    const tiles = board([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2]
    ]);
    expect(isDead(tiles)).toBe(true);
  });

  it('棋盘已满但存在相邻相等时不是死局', () => {
    const tiles = board([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 4]
    ]);
    expect(isDead(tiles)).toBe(false);
  });
});
