import Game2048 from './Game2048'
import { GameModule } from '../types'
import GAME_TEMPLATE from './template'
import './style.less'

// 卡片图标：琥珀色数字方块
const ICON = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="34" height="34" rx="5" fill="#3d2b1a" stroke="#ed9b40" stroke-width="2"/>
  <rect x="6" y="6" width="13" height="13" rx="2" fill="#d4c3ae"/>
  <rect x="21" y="6" width="13" height="13" rx="2" fill="#f2b179"/>
  <rect x="6" y="21" width="13" height="13" rx="2" fill="#edcf72"/>
  <rect x="21" y="21" width="13" height="13" rx="2" fill="#f65e3b"/>
  <text x="12.5" y="16" font-family="Courier, monospace" font-size="9" font-weight="bold" fill="#4b3a2a" text-anchor="middle">2</text>
  <text x="27.5" y="16" font-family="Courier, monospace" font-size="9" font-weight="bold" fill="#7a4a12" text-anchor="middle">4</text>
  <text x="12.5" y="31" font-family="Courier, monospace" font-size="9" font-weight="bold" fill="#5c4408" text-anchor="middle">8</text>
  <text x="27.5" y="31" font-family="Courier, monospace" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">16</text>
</svg>
`

const game2048: GameModule = {
  id: '2048',
  name: '2048',
  title: '2048',
  description: '滑动合并数字方块，挑战合成 2048',
  icon: ICON,
  category: 'puzzle',
  tags: ['单人', '益智', '经典'],
  // 主题由外壳托管：挂载时加 body.theme-2048，退出时移除
  theme: '2048',
  mount(container: HTMLElement) {
    container.innerHTML = GAME_TEMPLATE
    const game = new Game2048(container)
    return {
      destroy() {
        game.destroy()
      }
    }
  }
}

export default game2048
