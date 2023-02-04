// 记分牌 类
class ScorePanel {
  // score、level用来记录分数、等级
  score = 0;
  level = 1;
  // 分数、等级所在的元素，在构造函数中进行初始化
  scoreEle: HTMLElement;
  levelEle: HTMLElement;

  // 最大等级
  maxLevel: number;
  // 多少分升级
  upScore: number;

  constructor(maxLevel: number = 10, upScore: number = 10) {
    this.scoreEle = document.querySelector('#score')!;
    this.levelEle = document.querySelector('#level')!;
    this.maxLevel = maxLevel;
    this.upScore = upScore;
  }

  // 加分方法
  addScore() {
    this.scoreEle.innerHTML = String(++this.score);
    // 每十分升一级
    this.score % this.upScore === 0 && this.levelUp();
  }

  // 升级方法
  levelUp() {
    if(this.level >= this.maxLevel) return false;
    this.levelEle.innerHTML = String(++this.level);
  }
}

export default ScorePanel;
