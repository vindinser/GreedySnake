import Snake from "./Snake";
import Food from "./Food"
import ScorePanel from "./ScorePanel";

// 游戏控制器，控制其他的所有类
class GameControl {
  snake: Snake;
  food: Food;
  scorePanel: ScorePanel

  // 存储移动方向
  snakeToDirection: string = '';
  rightToDirection: Array<string> = [ 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'up', 'down', 'left', 'right' ];

  constructor() {
    this.snake = new Snake();
    this.food = new Food();
    this.scorePanel = new ScorePanel();
    this.gameInit()
  }

  // 初始化游戏
  gameInit() {
    console.log('%cGreedySnake Begin!', 'color: red; font-size: 20px; font-weight: 600;');
    document.addEventListener('keydown', this.keyDownHandler.bind(this))
  }

  // 键盘按下的响应函数
  keyDownHandler(event: KeyboardEvent) {
    this.rightToDirection.includes(event.key) && (this.snakeToDirection = event.key)
  }
}

export default GameControl
