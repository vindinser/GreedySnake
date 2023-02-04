// 蛇
class Snake {
  // 蛇元素(蛇头)
  snakeHeadEle: HTMLElement;
  // 蛇元素（身体，包括蛇头）
  snakeBodyEle: HTMLCollection;
  // 蛇的容器
  snakeAllEle: HTMLElement;

  constructor() {
    this.snakeAllEle = document.querySelector('.snake')!
    this.snakeHeadEle = document.querySelector('.snake > div') as HTMLElement;
    this.snakeBodyEle = this.snakeAllEle.getElementsByTagName('div');
  }

  // 获取蛇头x轴的坐标
  get X() {
    return this.snakeHeadEle.offsetLeft
  }
  // 获取蛇头y轴的坐标
  get Y() {
    return this.snakeHeadEle.offsetTop
  }

  // 设置蛇头x轴坐标
  set X(val) {
    if(val < 0 || val > 290) {
      throw new Error('Game Over！')
    }
    this.X !== val && (this.snakeHeadEle.style.left = `${val}px`)
  }

  // 设置蛇头x轴坐标
  set Y(val) {
    if(val < 0 || val > 290) {
      throw new Error('Game Over！')
    }
    this.Y !== val && (this.snakeHeadEle.style.top = `${val}px`)
  }

  // 蛇增加长度
  addSnakeBody() {
    this.snakeAllEle.insertAdjacentHTML('beforeend', '<div></div>')
  }
}

export default Snake;
