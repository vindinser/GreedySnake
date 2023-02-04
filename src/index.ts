// 引入样式表
import './style/index.less'
// 引入游戏控制类
import GameControl from './moduls/GameControl'

const gameControl = new GameControl
setInterval(() => {
  console.log(gameControl)
}, 1000)

