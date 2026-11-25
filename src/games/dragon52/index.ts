import Dragon52 from './Dragon52'
import { GameModule } from '../types'
import DRAGON_TEMPLATE from './template'
import './style.less'

// 卡片图标：粉色牌面
const ICON = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="9" y="3" width="22" height="34" rx="3" fill="#fff5f7" stroke="#ff4d6d" stroke-width="2"/>
  <text x="20" y="16" font-family="Courier, monospace" font-size="12" font-weight="bold" fill="#c9184a" text-anchor="middle">52</text>
  <path d="M20 30c-4-3.6-7-5.4-7-8.4a3.4 3.4 0 0 1 7-1.2 3.4 3.4 0 0 1 7 1.2c0 3-3 4.8-7 8.4z" fill="#ff4d6d"/>
</svg>
`

const dragon52: GameModule = {
  id: 'dragon52',
  name: '游龙52式',
  title: '游龙52式',
  description: '52 张牌的情侣挑战，藏着羞羞的惩罚',
  icon: ICON,
  category: 'card',
  tags: ['双人', '聚会'],
  // 主题由外壳托管：挂载时加 body.theme-dragon52，退出时移除
  theme: 'dragon52',
  mount(container: HTMLElement) {
    container.innerHTML = DRAGON_TEMPLATE
    const game = new Dragon52(container)
    return {
      destroy() {
        game.destroy()
      }
    }
  }
}

export default dragon52
