import games from '../games'
import { GameInstance, GameModule } from '../games/types'
import { audio } from '../core/audio'
import { createButton, createOverlay } from '../ui'

// 主页路由
const HOME_HASH = '#/home'

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
  // 当前生效的主题类，切换或退出游戏时移除
  private themeClass: string | null = null;

  constructor() {
    this.homeView = document.getElementById('homeView')!;
    this.gameList = document.getElementById('gameList')!;
    this.gameView = document.getElementById('gameView')!;
    this.gameTitle = document.getElementById('gameTitle')!;
    this.gameContent = document.getElementById('gameContent')!;
    this.backBtn = document.getElementById('backBtn')!;

    this.renderGameList();
    this.initBackBtn();
    this.initAudioUnlock();
    window.addEventListener('hashchange', this.onHashChange);
    // 按当前地址栏的路由决定初始视图
    this.applyRoute();
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
      card.addEventListener('click', () => this.navigateToGame(game));
      this.gameList.appendChild(card);
    });
  }

  // ========== 路由 ==========
  // hash 是唯一状态源：#/home 为主页，#/<游戏id> 为对应游戏
  private onHashChange = () => this.applyRoute();

  private routeGameId(): string | null {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash || hash === 'home') return null;
    return hash;
  }

  private applyRoute() {
    const id = this.routeGameId();
    if (id === null) {
      this.mountHome();
      return;
    }
    const game = games.find(g => g.id === id);
    if (!game) {
      // 未知 id 回到主页
      if (window.location.hash !== HOME_HASH) {
        window.location.hash = HOME_HASH;
        return;
      }
      this.mountHome();
      return;
    }
    this.mountGame(game);
  }

  private navigateToGame(game: GameModule) {
    const next = '#/' + game.id;
    if (window.location.hash === next) {
      this.applyRoute();
      return;
    }
    window.location.hash = next;
  }

  private navigateHome() {
    if (window.location.hash === HOME_HASH) {
      this.applyRoute();
      return;
    }
    // 用 replace 覆盖当前历史条目：浏览器后退不会重新进入刚刚退出的游戏
    history.replaceState(null, '', HOME_HASH);
    this.applyRoute();
  }

  // ========== 视图挂载 ==========
  private mountHome() {
    this.closeGame();
    this.gameContent.innerHTML = '';
    this.gameView.classList.remove('show');
    this.homeView.classList.add('show');
  }

  private mountGame(game: GameModule) {
    this.closeGame();
    this.gameTitle.textContent = game.title;
    this.gameContent.innerHTML = '';
    // 先显示视图再挂载，保证游戏能拿到正确的布局尺寸
    this.gameView.classList.add('show');
    this.homeView.classList.remove('show');
    this.applyTheme(game);
    try {
      this.currentGame = game.mount(this.gameContent);
    } catch (err) {
      this.currentGame = null;
      this.showGameError(game, err);
    }
  }

  // ========== 主题 ==========
  private applyTheme(game: GameModule) {
    this.clearTheme();
    if (!game.theme) return;
    this.themeClass = 'theme-' + game.theme;
    document.body.classList.add(this.themeClass);
  }

  private clearTheme() {
    if (!this.themeClass) return;
    document.body.classList.remove(this.themeClass);
    this.themeClass = null;
  }

  // ========== 启动失败兜底 ==========
  private showGameError(game: GameModule, err: unknown) {
    console.error('游戏启动失败:', err);
    const message = err instanceof Error ? err.message : String(err);
    const overlay = createOverlay({
      html: `
        <div class="gs-error">
          <div class="gs-error-title">游戏启动失败</div>
          <div class="gs-error-msg"></div>
        </div>
      `
    });
    const msgEl = overlay.el.querySelector('.gs-error-msg');
    if (msgEl) msgEl.textContent = message;
    const errorBox = overlay.el.querySelector('.gs-error');
    if (errorBox) {
      errorBox.appendChild(createButton({
        label: '重试',
        onClick: () => {
          overlay.hide();
          this.mountGame(game);
        }
      }));
    }
    this.gameContent.innerHTML = '';
    this.gameContent.appendChild(overlay.el);
    overlay.show();
  }

  // ========== 返回主页按钮 ==========
  private initBackBtn() {
    this.backBtn.addEventListener('click', () => {
      this.navigateHome();
    });
  }

  // ========== 音频解锁 ==========
  // 浏览器自动播放策略要求 AudioContext 在用户手势之后才能出声
  private initAudioUnlock() {
    const unlock = () => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  // ========== 关闭当前游戏 ==========
  private closeGame() {
    if (this.currentGame) {
      this.currentGame.destroy();
      this.currentGame = null;
    }
    this.clearTheme();
  }
}

export default App
