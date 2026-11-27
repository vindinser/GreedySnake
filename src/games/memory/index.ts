import Memory from './Memory'
import { GameModule } from '../types'
import GAME_TEMPLATE from './template'
import './style.less'

// 卡片图标：两张牌背与一张翻开的牌
const ICON = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="34" height="34" rx="5" fill="#24493a" stroke="#d4af6a" stroke-width="2"/>
  <rect x="8" y="9" width="12" height="17" rx="2" fill="#37705a" stroke="#d4af6a" stroke-width="1" transform="rotate(-10 14 17)"/>
  <rect x="16" y="12" width="13" height="19" rx="2" fill="#fdfbf5" stroke="#d4af6a" stroke-width="1.2"/>
  <text x="22.5" y="26" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="#e03131" text-anchor="middle">♥</text>
</svg>
`

const memory: GameModule = {
  id: 'memory',
  name: '翻牌配对',
  title: 'MEMORY MATCH',
  description: '翻开两张相同的牌完成配对，步数越少越好',
  icon: ICON,
  category: 'puzzle',
  tags: ['单人', '益智', '记忆'],
  // 主题由外壳托管：挂载时加 body.theme-memory，退出时移除
  theme: 'memory',
  mount(container: HTMLElement) {
    container.innerHTML = GAME_TEMPLATE
    const game = new Memory(container)
    return {
      destroy() {
        game.destroy()
      }
    }
  }
}

export default memory
