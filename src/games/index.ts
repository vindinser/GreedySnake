import { GameModule } from './types'
import snake from './snake'

// 游戏注册表：新增小游戏只需在此追加一项
const games: GameModule[] = [
  snake
]

export default games
