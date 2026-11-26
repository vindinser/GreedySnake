import Minesweeper from './Minesweeper'
import { GameModule } from '../types'
import GAME_TEMPLATE from './template'
import './style.less'

// 卡片图标：钢蓝色地雷与旗子
const ICON = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="34" height="34" rx="5" fill="#2a3a49" stroke="#7fb3d5" stroke-width="2"/>
  <circle cx="20" cy="21" r="8" fill="#34424f" stroke="#7fb3d5" stroke-width="1.5"/>
  <circle cx="20" cy="21" r="4.5" fill="#141c24"/>
  <path d="M20 13v-3M20 32v-3M12 21h-3M31 21h-3" stroke="#7fb3d5" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 13c3-3 6-1 6 1" stroke="#ffd166" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M26 10l4 4-2 2-4-4z" fill="#ffd166"/>
</svg>
`

const minesweeper: GameModule = {
  id: 'minesweeper',
  name: '扫雷',
  title: 'MINESWEEPER',
  description: '在雷区里标出所有地雷，首击永远安全',
  icon: ICON,
  category: 'puzzle',
  tags: ['单人', '经典', '推理'],
  // 主题由外壳托管：挂载时加 body.theme-minesweeper，退出时移除
  theme: 'minesweeper',
  mount(container: HTMLElement) {
    container.innerHTML = GAME_TEMPLATE
    const game = new Minesweeper(container)
    return {
      destroy() {
        game.destroy()
      }
    }
  }
}

export default minesweeper
