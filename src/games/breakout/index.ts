import type Breakout from './Breakout'
import { GameModule } from '../types'
import { createButton, createLoading, createOverlay } from '../../ui'
import './style.less'

// 卡片图标：挡板与彩色砖块
const ICON = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="34" height="34" rx="5" fill="#16283c" stroke="#4dabf7" stroke-width="2"/>
  <rect x="7" y="8" width="9" height="4" rx="1.5" fill="#ff6b6b"/>
  <rect x="17" y="8" width="9" height="4" rx="1.5" fill="#ffd43b"/>
  <rect x="25" y="8" width="8" height="4" rx="1.5" fill="#69db7c"/>
  <rect x="7" y="14" width="9" height="4" rx="1.5" fill="#ffa94d"/>
  <rect x="17" y="14" width="9" height="4" rx="1.5" fill="#4dabf7"/>
  <rect x="25" y="14" width="8" height="4" rx="1.5" fill="#845ef7"/>
  <circle cx="20" cy="24" r="3" fill="#ffd43b"/>
  <rect x="12" y="30" width="16" height="4" rx="2" fill="#4dabf7"/>
</svg>
`

// 加载失败兜底：给出重试入口
function showLoadError(container: HTMLElement, err: unknown, retry: () => void) {
  const overlay = createOverlay({
    html: '<div class="gs-error"><div class="gs-error-title">物理引擎加载失败</div><div class="gs-error-msg"></div></div>'
  });
  const msgEl = overlay.el.querySelector('.gs-error-msg');
  if (msgEl) msgEl.textContent = err instanceof Error ? err.message : String(err);
  const box = overlay.el.querySelector('.gs-error');
  if (box) {
    box.appendChild(createButton({
      label: '重试',
      onClick: () => {
        overlay.hide();
        retry();
      }
    }));
  }
  container.innerHTML = '';
  container.appendChild(overlay.el);
  overlay.show();
}

const breakout: GameModule = {
  id: 'breakout',
  name: '打砖块',
  title: 'BREAKOUT',
  description: '用挡板接住小球，敲碎所有砖块',
  icon: ICON,
  category: 'arcade',
  tags: ['经典', '单人'],
  // 主题由外壳托管：挂载时加 body.theme-breakout，退出时移除
  theme: 'breakout',
  mount(container: HTMLElement) {
    let cancelled = false;
    let game: Breakout | null = null;
    let loading = false;

    // 物理引擎按需下载：只有真正进入打砖块时才会拉取 matter.js
    const load = () => {
      if (cancelled || loading) return;
      loading = true;
      container.innerHTML = '';
      container.appendChild(createLoading('正在准备物理引擎…'));

      import('./runtime')
        .then(m => m.createBreakout(container))
        .then(instance => {
          loading = false;
          // 加载期间用户已经离开：直接销毁，不要挂到已卸载的 DOM 上
          if (cancelled) {
            instance.destroy();
            return;
          }
          game = instance;
        })
        .catch(err => {
          loading = false;
          if (cancelled) return;
          console.error('打砖块加载失败:', err);
          showLoadError(container, err, load);
        });
    };

    load();

    return {
      destroy() {
        cancelled = true;
        if (game) {
          game.destroy();
          game = null;
        }
      }
    };
  }
}

export default breakout
