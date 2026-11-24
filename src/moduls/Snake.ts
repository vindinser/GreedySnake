// 蛇头初始位置：网格中心，四周都有空间，不会一开局就撞墙
const START_X = 150;
const START_Y = 150;

// 蛇
class Snake {
  // 蛇元素(蛇头)
  snakeHeadEle: HTMLElement;
  // 蛇元素（身体，包括蛇头）
  snakeBodyEle: HTMLCollection;
  // 蛇的容器
  snakeAllEle: HTMLElement;

  constructor(root: ParentNode = document) {
    this.snakeAllEle = root.querySelector<HTMLElement>('.snake')!
    this.snakeHeadEle = root.querySelector<HTMLElement>('.snake > div')!;
    this.snakeBodyEle = this.snakeAllEle.getElementsByTagName('div');
    this.reset();
  }

  // 重置蛇：清空身体，蛇头回到网格中心
  reset() {
    this.snakeAllEle.innerHTML = '<div></div>';
    this.snakeHeadEle = this.snakeAllEle.firstElementChild as HTMLElement;
    this.snakeHeadEle.style.left = `${START_X}px`;
    this.snakeHeadEle.style.top = `${START_Y}px`;
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
    // X、Y不能同时移动
    if(this.X === val) return;
    // 撞墙检测
    if(val < 0 || val > 290) {
      throw new Error('Game Over！')
    }
    // 不能覆盖自己的身体
    if(this.snakeBodyEle[1] && (this.snakeBodyEle[1] as HTMLElement).offsetLeft === val) {
      if(val > this.X) { // 向右
        // 继续向左走
        val = this.X -10
      } else {
        val = this.X + 10
      }
    }
    this.snakeBodyMove();
    this.snakeHeadEle.style.left = `${val}px`
    this.checkSnakeHeadToBody();
  }

  // 设置蛇头x轴坐标
  set Y(val) {
    if(this.Y === val) return;
    if(val < 0 || val > 290) {
      throw new Error('Game Over！')
    }
    if(this.snakeBodyEle[1] && (this.snakeBodyEle[1] as HTMLElement).offsetTop === val) {
      if(val > this.Y) { // 向上
        // 继续向下走
        val = this.Y -10
      } else {
        val = this.Y + 10
      }
    }
    this.snakeBodyMove();
    this.snakeHeadEle.style.top = `${val}px`
    this.checkSnakeHeadToBody()
  }

  // 蛇增加长度
  addSnakeBody() {
    this.snakeAllEle.insertAdjacentHTML('beforeend', '<div></div>')
    // 新增的身体紧跟蛇头，避免默认出现在左上角
    const lastEle = this.snakeAllEle.lastElementChild as HTMLElement;
    lastEle.style.left = `${this.snakeHeadEle.offsetLeft}px`;
    lastEle.style.top = `${this.snakeHeadEle.offsetTop}px`;
  }

  // 身体移动
  snakeBodyMove() {
    for(let i = this.snakeBodyEle.length - 1; i > 0; i--) {
      let X = (this.snakeBodyEle[i-1] as HTMLElement).offsetLeft;
      let Y = (this.snakeBodyEle[i-1] as HTMLElement).offsetTop;
      (this.snakeBodyEle[i] as HTMLElement).style.left = `${ X }px`;
      (this.snakeBodyEle[i] as HTMLElement).style.top = `${ Y }px`;
    }
  }

  // 检查头与身体是否相撞
  checkSnakeHeadToBody() {
    for(let i = 1; i < this.snakeBodyEle.length; i++) {
      let bd = this.snakeBodyEle[i] as HTMLElement;
      if(this.X === bd.offsetLeft && this.Y === bd.offsetTop) {
        // 撞到身体，游戏结束
        throw new Error('撞到自己！')
      }
    }
  }
}

export default Snake;
