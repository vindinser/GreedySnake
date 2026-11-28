import Surprise from './Surprise'
import { GameModule } from '../types'
import SURPRISE_TEMPLATE from './template'
import './style.less'

// 卡片图标：闪光礼物盒
const ICON = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="spGift" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff6b9d"/>
      <stop offset="0.5" stop-color="#c44ce0"/>
      <stop offset="1" stop-color="#6c5ce7"/>
    </linearGradient>
  </defs>
  <rect x="6" y="16" width="28" height="20" rx="3" fill="url(#spGift)"/>
  <rect x="4" y="12" width="32" height="7" rx="2.5" fill="#ffd43b"/>
  <rect x="18.5" y="12" width="3" height="24" fill="#ff9ec0" opacity="0.9"/>
  <path d="M20 12c-3-1-6-4-4-6 1.6-1.6 4 0 4 2 0-2 2.4-3.6 4-2 2 2-1 5-4 6z" fill="#ff6b9d"/>
  <text x="7" y="10" font-size="8" fill="#ffffff">✦</text>
  <text x="30" y="26" font-size="6" fill="#ffffff">✦</text>
</svg>
`

const surprise: GameModule = {
  id: 'surprise',
  name: '惊喜点点',
  title: 'SURPRISE · 生日快乐',
  description: '对口令、追按钮、收告白——一份只属于你的生日惊喜',
  icon: ICON,
  category: 'puzzle',
  tags: ['惊喜', '生日', '专属'],
  // 特殊入口：主页用花里胡哨的卡片样式单独渲染
  special: true,
  // 主题由外壳托管：挂载时加 body.theme-surprise，退出时移除
  theme: 'surprise',
  mount(container: HTMLElement) {
    container.innerHTML = SURPRISE_TEMPLATE
    const game = new Surprise(container)
    return {
      destroy() {
        game.destroy()
      }
    }
  }
}

export default surprise
