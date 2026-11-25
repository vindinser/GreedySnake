import GameControl from '../../moduls/GameControl'
import { GameModule } from '../types'
import CONSOLE_TEMPLATE from './template'

// 卡片图标：像素风小蛇
const ICON = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="24" width="8" height="8" fill="#2d5a1e"/>
  <rect x="12" y="24" width="8" height="8" fill="#3a7a28"/>
  <rect x="20" y="24" width="8" height="8" fill="#4d9a34"/>
  <rect x="20" y="16" width="8" height="8" fill="#57ab3d"/>
  <rect x="28" y="16" width="8" height="8" fill="#6fd44a"/>
  <rect x="30" y="18" width="2" height="2" fill="#0a0a0a"/>
  <rect x="33" y="18" width="2" height="2" fill="#0a0a0a"/>
  <rect x="28" y="28" width="5" height="5" fill="#cc3333" transform="rotate(45 30.5 30.5)"/>
</svg>
`

const snakeGame: GameModule = {
  id: 'snake',
  name: '贪吃蛇',
  title: 'GREEDY SNAKE',
  description: '吃到食物越来越长，撞墙或撞到自己就结束',
  icon: ICON,
  category: 'arcade',
  tags: ['复古掌机', '单人'],
  mount(container: HTMLElement) {
    container.innerHTML = CONSOLE_TEMPLATE
    const control = new GameControl(container)
    return {
      destroy() {
        control.destroy()
      }
    }
  }
}

export default snakeGame
