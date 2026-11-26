import { describe, it, expect } from 'vitest'
import {
  Cell,
  countAdjacent,
  createBoard,
  DIFFICULTIES,
  isWon,
  neighbors,
  remainingMines,
  revealArea,
  revealedSafeCount,
  toggleFlag
} from '../src/games/minesweeper/logic'

// 按雷位图构造棋盘（1 表示雷），并计算相邻雷数
function makeBoard(mineMap: number[][]): Cell[][] {
  const rows = mineMap.length;
  const cols = mineMap[0].length;
  const board: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ mine: mineMap[r][c] === 1, adjacent: 0, revealed: false, flagged: false });
    }
    board.push(row);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board[r][c].adjacent = countAdjacent(board, r, c);
    }
  }
  return board;
}

function countMines(board: Cell[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.mine) count++;
    }
  }
  return count;
}

describe('扫雷逻辑 / 难度表', () => {
  it('三档难度的尺寸与雷数', () => {
    expect(DIFFICULTIES.map(d => d.key)).toEqual(['easy', 'normal', 'hard']);
    expect(DIFFICULTIES[0]).toMatchObject({ rows: 9, cols: 9, mines: 10 });
    expect(DIFFICULTIES[1]).toMatchObject({ rows: 16, cols: 16, mines: 40 });
    expect(DIFFICULTIES[2]).toMatchObject({ rows: 16, cols: 30, mines: 99 });
  });
});

describe('扫雷逻辑 / neighbors 与 countAdjacent', () => {
  it('八邻域不含自身', () => {
    const list = neighbors({ row: 1, col: 1 }, 3, 3);
    expect(list).toHaveLength(8);
    expect(list.some(p => p.row === 1 && p.col === 1)).toBe(false);
  });

  it('边角只有三个邻居', () => {
    expect(neighbors({ row: 0, col: 0 }, 3, 3)).toHaveLength(3);
  });

  it('统计相邻雷数', () => {
    const board = makeBoard([
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1]
    ]);
    expect(board[0][0].adjacent).toBe(1);
    expect(board[1][1].adjacent).toBe(2);
    expect(board[2][2].adjacent).toBe(0);
  });
});

describe('扫雷逻辑 / createBoard', () => {
  it('尺寸正确、雷数正确', () => {
    const board = createBoard(16, 16, 40);
    expect(board).toHaveLength(16);
    expect(board[0]).toHaveLength(16);
    expect(countMines(board)).toBe(40);
  });

  it('首击安全：安全格本身没有雷', () => {
    const board = createBoard(9, 9, 10, { row: 4, col: 4 });
    expect(board[4][4].mine).toBe(false);
  });

  it('首击安全：八邻域也没有雷', () => {
    const board = createBoard(9, 9, 10, { row: 4, col: 4 });
    for (const n of neighbors({ row: 4, col: 4 }, 9, 9)) {
      expect(board[n.row][n.col].mine).toBe(false);
    }
  });

  it('安全区之外雷数依然正确', () => {
    const board = createBoard(9, 9, 10, { row: 4, col: 4 });
    expect(countMines(board)).toBe(10);
  });

  it('相邻雷数计算正确', () => {
    const board = createBoard(9, 9, 10);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(board[r][c].adjacent).toBe(countAdjacent(board, r, c));
      }
    }
  });
});

describe('扫雷逻辑 / revealArea', () => {
  it('空白区域连片展开', () => {
    const board = makeBoard([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 1]
    ]);
    const revealed = revealArea(board, 0, 0);
    // 9 格里只有雷那格没被翻开
    expect(revealed).toHaveLength(8);
    expect(board[2][2].revealed).toBe(false);
  });

  it('数字格不会继续扩散', () => {
    const board = makeBoard([
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]);
    const revealed = revealArea(board, 0, 0);
    expect(revealed).toHaveLength(1);
    expect(board[0][0].revealed).toBe(true);
    expect(board[1][1].revealed).toBe(false);
  });

  it('不会翻开被插旗的格子', () => {
    const board = makeBoard([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 1]
    ]);
    board[0][1].flagged = true;
    revealArea(board, 0, 0);
    expect(board[0][1].revealed).toBe(false);
  });

  it('已翻开的格子不会被重复返回', () => {
    const board = makeBoard([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 1]
    ]);
    revealArea(board, 0, 0);
    const again = revealArea(board, 0, 0);
    expect(again).toHaveLength(0);
  });
});

describe('扫雷逻辑 / toggleFlag 与 remainingMines', () => {
  it('插旗与取消插旗', () => {
    const board = makeBoard([[0, 0], [0, 0]]);
    expect(toggleFlag(board, 0, 0)).toBe(true);
    expect(board[0][0].flagged).toBe(true);
    expect(toggleFlag(board, 0, 0)).toBe(true);
    expect(board[0][0].flagged).toBe(false);
  });

  it('已翻开的格子不能插旗', () => {
    const board = makeBoard([[0, 0], [0, 0]]);
    board[0][0].revealed = true;
    expect(toggleFlag(board, 0, 0)).toBe(false);
    expect(board[0][0].flagged).toBe(false);
  });

  it('剩余雷数 = 总雷数 - 已插旗数', () => {
    const board = makeBoard([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]);
    expect(remainingMines(board)).toBe(2);
    board[0][0].flagged = true;
    expect(remainingMines(board)).toBe(1);
  });
});

describe('扫雷逻辑 / isWon 与 revealedSafeCount', () => {
  it('还有非雷格没翻开就不算赢', () => {
    const board = makeBoard([
      [1, 0],
      [0, 0]
    ]);
    expect(isWon(board)).toBe(false);
  });

  it('所有非雷格都翻开即胜利', () => {
    const board = makeBoard([
      [1, 0],
      [0, 0]
    ]);
    board[0][1].revealed = true;
    board[1][0].revealed = true;
    board[1][1].revealed = true;
    expect(isWon(board)).toBe(true);
    expect(revealedSafeCount(board)).toBe(3);
  });
});
