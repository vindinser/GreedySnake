// 定义 被吃的蛇 类
class Food {
  element: HTMLElement; // 对应的元素

  constructor() {
    // 获取页面中的 food 并赋值
    // 不一定有此元素， ! 表示一定有次元素
    this.element = document.querySelector('.food')!;
  }

  // 获取food x轴坐标
  get X() {
    return this.element.offsetLeft;
  }

  // 获取food y轴坐标
  get Y() {
    return this.element.offsetTop;
  }

  // 修改food 位置
  change() {
    // 生成随机位置
    const top = Math.round(Math.random() * 29) * 10,
      left = Math.round(Math.random() * 29) * 10; // 0-290之间取整 10 的数

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }
}

export default Food;
