import { GameModule } from './types'
import snake from './snake'
import dragon52 from './dragon52'

// 游戏注册表：新增小游戏只需在此追加一项
const games: GameModule[] = [
  snake,
  dragon52
]

export default games
