import { GameModule } from './types'
import snake from './snake'
import dragon52 from './dragon52'
import game2048 from './game2048'
import minesweeper from './minesweeper'
import memory from './memory'
import breakout from './breakout'
import surprise from './surprise'

// 游戏注册表：新增小游戏只需在此追加一项
// 惊喜点点是特殊入口，固定排在第一位，进主页第一眼就能看到
const games: GameModule[] = [
  surprise,
  snake,
  dragon52,
  game2048,
  minesweeper,
  memory,
  breakout
]

export default games
