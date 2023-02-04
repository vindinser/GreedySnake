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
  rightToDirection: Array<string> = [ 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Up', 'Down', 'Left', 'Right' ];

  // 记录游戏是否结束
  snakeIsLive: Boolean = true;

  constructor() {
    this.snake = new Snake();
    this.food = new Food();
    this.scorePanel = new ScorePanel();
    this.gameInit()
  }

  // 初始化游戏
  gameInit() {
    console.log('%cGreedySnake Begin!', 'color: red; font-size: 20px; font-weight: 600;');
    // 监听键盘事件
    document.addEventListener('keydown', this.keyDownHandler.bind(this));
    // 使蛇开始移动
    this.snakeRun()
  }

  // 键盘按下的响应函数
  keyDownHandler(event: KeyboardEvent) {
    this.rightToDirection.includes(event.key) && (this.snakeToDirection = event.key)
  }

  // 控制蛇头移动的方法
  snakeRun() {
    let X = this.snake.X;
    let Y = this.snake.Y;

    switch (this.snakeToDirection) {
      case "ArrowUp":
      case "Up":
        Y -= 10;
        break;
      case "ArrowDown":
      case "Down":
        Y += 10;
        break;
      case "ArrowLeft":
      case "Left":
        X -= 10;
        break;
      case "ArrowRight":
      case "Right":
        X += 10;
        break;
      default:
        console.log('%cWrong Direction!', 'color: red; font-size: 20px; font-weight: 600;')
    }

    this.checkIsEating(X, Y);

    try {
      this.snake.X = X;
      this.snake.Y = Y;
    } catch (e) {
      console.log(e)
      // alert(e.message)
      alert('Game Over!')
      this.snakeIsLive = false
    }

    // 定时调用使蛇移动
    this.snakeIsLive && setTimeout(this.snakeRun.bind(this), 300 - (this.scorePanel.level - 1) * 30)
  }

  // 蛇是否吃到了food
  checkIsEating(X: number, Y: number) {
    if(X === this.food.X && Y === this.food.Y) {
      this.food.change();
      this.scorePanel.addScore();
      this.snake.addSnakeBody();
    }
  }
}

export default GameControl
