import games from '../games'
import { GameInstance, GameModule } from '../games/types'

// 应用外壳：负责主页渲染与「主页 / 游戏」视图切换
class App {
  // 主页
  homeView!: HTMLElement;
  gameList!: HTMLElement;
  // 游戏视图
  gameView!: HTMLElement;
  gameTitle!: HTMLElement;
  gameContent!: HTMLElement;
  backBtn!: HTMLElement;
  // 当前运行的游戏实例
  currentGame: GameInstance | null = null;

  constructor() {
    this.homeView = document.getElementById('homeView')!;
    this.gameList = document.getElementById('gameList')!;
    this.gameView = document.getElementById('gameView')!;
    this.gameTitle = document.getElementById('gameTitle')!;
    this.gameContent = document.getElementById('gameContent')!;
    this.backBtn = document.getElementById('backBtn')!;

    this.renderGameList();
    this.initBackBtn();
    this.showHome();
  }

  // ========== 主页：游戏列表 ==========
  renderGameList() {
    this.gameList.innerHTML = '';
    games.forEach(game => {
      const card = document.createElement('button');
      card.className = 'game-card';
      card.innerHTML = `
        <div class="card-screen">${game.icon}</div>
        <div class="card-info">
          <div class="card-name">${game.name}</div>
          <div class="card-title">${game.title}</div>
          <div class="card-desc">${game.description}</div>
        </div>
      `;
      card.addEventListener('click', () => this.openGame(game));
      this.gameList.appendChild(card);
    });
  }

  // ========== 视图切换 ==========
  openGame(game: GameModule) {
    this.closeGame();
    this.gameTitle.textContent = game.title;
    this.gameContent.innerHTML = '';
    // 先显示视图再挂载，保证游戏能拿到正确的布局尺寸
    this.gameView.classList.add('show');
    this.homeView.classList.remove('show');
    this.currentGame = game.mount(this.gameContent);
  }

  showHome() {
    this.closeGame();
    this.gameContent.innerHTML = '';
    this.gameView.classList.remove('show');
    this.homeView.classList.add('show');
  }

  closeGame() {
    if (!this.currentGame) return;
    this.currentGame.destroy();
    this.currentGame = null;
  }

  // ========== 返回主页按钮 ==========
  initBackBtn() {
    this.backBtn.addEventListener('click', () => {
      this.showHome();
    });
  }
}

export default App
