// 扫雷棋盘纯逻辑：不碰 DOM，便于单元测试

export interface Position {
  row: number;
  col: number;
}

export interface Cell {
  // 是否地雷
  mine: boolean;
  // 相邻地雷数量
  adjacent: number;
  // 是否已翻开
  revealed: boolean;
  // 是否插旗
  flagged: boolean;
}

export interface Difficulty {
  key: string;
  name: string;
  rows: number;
  cols: number;
  mines: number;
}

// 三档难度：初级 9×9、中级 16×16、高级 30×16
export const DIFFICULTIES: Difficulty[] = [
  { key: 'easy', name: '初级', rows: 9, cols: 9, mines: 10 },
  { key: 'normal', name: '中级', rows: 16, cols: 16, mines: 40 },
  { key: 'hard', name: '高级', rows: 16, cols: 30, mines: 99 }
];

function cellKey(row: number, col: number): string {
  return row + ':' + col;
}

// 八邻域
export function neighbors(pos: Position, rows: number, cols: number): Position[] {
  const list: Position[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) list.push({ row: r, col: c });
    }
  }
  return list;
}

// 相邻地雷数量
export function countAdjacent(board: Cell[][], row: number, col: number): number {
  const rows = board.length;
  const cols = board[0].length;
  let count = 0;
  for (const n of neighbors({ row, col }, rows, cols)) {
    if (board[n.row][n.col].mine) count++;
  }
  return count;
}

// 生成棋盘。传入 safe 时，该格及其八邻域都不放雷（保证首击不会踩雷）
export function createBoard(rows: number, cols: number, mines: number, safe?: Position): Cell[][] {
  const board: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ mine: false, adjacent: 0, revealed: false, flagged: false });
    }
    board.push(row);
  }

  // 首击安全区
  const forbidden = new Set<string>();
  if (safe) {
    forbidden.add(cellKey(safe.row, safe.col));
    for (const n of neighbors(safe, rows, cols)) forbidden.add(cellKey(n.row, n.col));
  }

  const candidates: Position[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!forbidden.has(cellKey(r, c))) candidates.push({ row: r, col: c });
    }
  }

  // Fisher-Yates 洗牌后取前 N 个放雷
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  const count = Math.min(mines, candidates.length);
  for (let i = 0; i < count; i++) {
    board[candidates[i].row][candidates[i].col].mine = true;
  }

  // 计算相邻地雷数
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board[r][c].adjacent = countAdjacent(board, r, c);
    }
  }
  return board;
}

// 翻开一格：空白区域会连片展开。返回本次新翻开的格子
export function revealArea(board: Cell[][], row: number, col: number): Position[] {
  const rows = board.length;
  const cols = board[0].length;
  const revealed: Position[] = [];
  const stack: Position[] = [{ row, col }];

  while (stack.length) {
    const pos = stack.pop()!;
    const cell = board[pos.row][pos.col];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    revealed.push(pos);
    // 只有空白格才继续向四周扩散
    if (cell.adjacent === 0) {
      for (const n of neighbors(pos, rows, cols)) {
        const target = board[n.row][n.col];
        if (!target.revealed && !target.flagged) stack.push(n);
      }
    }
  }
  return revealed;
}

// 插旗 / 取消插旗。已翻开的格子不能插旗
export function toggleFlag(board: Cell[][], row: number, col: number): boolean {
  const cell = board[row][col];
  if (cell.revealed) return false;
  cell.flagged = !cell.flagged;
  return true;
}

// 剩余地雷数 = 地雷总数 - 已插旗数
export function remainingMines(board: Cell[][]): number {
  let mines = 0;
  let flags = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.mine) mines++;
      if (cell.flagged) flags++;
    }
  }
  return mines - flags;
}

// 是否胜利：所有非雷格都已翻开
export function isWon(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.mine && !cell.revealed) return false;
    }
  }
  return true;
}

// 已翻开的非雷格数量
export function revealedSafeCount(board: Cell[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell.mine && cell.revealed) count++;
    }
  }
  return count;
}
