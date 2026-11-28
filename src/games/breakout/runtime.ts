import Breakout from './Breakout'
import type * as MatterNS from 'matter-js'
import GAME_TEMPLATE from './template'

// 第三方库按需加载：只有真正进入打砖块时才会下载 matter.js，
// 主包（主页与其它游戏）里不含这个库
export async function createBreakout(container: HTMLElement): Promise<Breakout> {
  const mod = await import(/* webpackChunkName: "matter-js" */ 'matter-js');
  // matter-js 是 CommonJS：webpack 的动态 import 可能只给出 default
  const Matter = ((mod as any).default || mod) as typeof MatterNS;
  container.innerHTML = GAME_TEMPLATE;
  return new Breakout(container, Matter);
}
