// 引入样式表
import './style/index.less'
// 引入类
import Food from './moduls/Food'
import ScorePanel from './moduls/ScorePanel'

console.log('%cGreedySnake', 'color: red; font-size: 20px; font-weight: 600;');

const scorePanel = new ScorePanel();
for(let i = 0; i < 200; i++) {
  scorePanel.addScore()
}

const food = new Food()
console.log(food.X, food.Y)
food.change()
console.log(food.X, food.Y)
