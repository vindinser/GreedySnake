# GreedySnake 游戏合集

基于 TypeScript + Webpack 实现的小游戏合集网页应用，支持电脑键盘和手机触屏操控。
目前收录 **贪吃蛇**（复古游戏机主题）与 **游龙52式**（情侣扑克牌主题），游戏注册表已预留扩展位，后续可继续添加其他小游戏。

## [在线体验](http://greedysnake.zsawxotof.site/)

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:8080` 即可开始游戏。

## 构建部署

```bash
npm run build        # 开发构建
npm run build:prod   # 生产构建（压缩 + 文件名哈希）
```

打包产物输出到 `dist/` 目录。

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 webpack-dev-server，访问 http://localhost:8080 |
| `npm run build` | 开发构建到 `dist/` |
| `npm run build:prod` | 生产构建到 `dist/`（压缩 + 哈希文件名，产物在 `dist/js/`） |
| `npm run typecheck` | `tsc --noEmit` 类型检查 |
| `npm test` | 测试（暂未配置测试框架） |

## 页面结构

应用分为两个视图，通过 `.show` 类切换：

| 视图 | 说明 |
|------|------|
| **主页** `#homeView` | 游戏选择页，列出注册表中的所有游戏卡片，点击卡片进入对应游戏 |
| **游戏视图** `#gameView` | 顶部为标题条（含 `◀ MENU` 返回主页按钮），下方为游戏内容 |

## 操作方式

| 操作 | 电脑 | 手机 |
|------|------|------|
| 选择游戏 | 在主页点击游戏卡片 | 同左 |
| 返回主页 | 点击 **◀ MENU** | 同左 |
| 开始游戏 | 按 **START** 键 或 任意方向键 | 点击 **START** 按钮 |
| 控制方向 | 方向键 ↑↓←→ | 点击十字方向键 / 在屏幕上滑动 |
| 加速 | 空格键 / 点击 **A** 按钮 | 点击 **A** 按钮 |
| 减速 | 点击 **B** 按钮 | 点击 **B** 按钮 |
| 暂停/继续 | **START** 键 / **ESC** / **P** | 点击 **START** 按钮 |
| 重启 | Game Over 后点击 **RESTART** | 同左 |
| 开/关机 | 电源按钮 | 同左 |

## 游戏机功能

- **电源键**：开关机，关机后显示待机时钟页面
- **START 键**：开始游戏 / 暂停 / 继续
- **SELECT 键**：预留功能键
- **A 按钮**：加速模式
- **B 按钮**：恢复正常速度
- **LED 指示灯**：开机时常亮并呼吸闪烁

## 游戏规则

- 蛇每吃到一个食物得 1 分，蛇身增长一节
- 每 10 分升一级，最高等级 10 级
- 等级越高蛇移动越快（速度公式：`300 - (等级-1) × 30` ms）
- 撞墙或撞到自身则 Game Over
- 开局蛇头位于网格中心 (150,150)，初始方向向右，四个方向都有空间，不会一开局就撞墙

## 技术栈

- **语言**：TypeScript（严格模式）
- **构建**：Webpack 5 + Babel + ts-loader
- **样式**：Less + PostCSS
- **兼容性**：现代浏览器（Chrome 108+）。Webpack 运行时虽降级为 ES5，但业务代码按现代浏览器转译，**不再支持 IE 10**
- **代码分割**：动态 `import()` 会被切成独立 chunk，第三方库按需下载，不进首屏主包

## 项目结构

```
src/
├── index.html          # HTML 模板（主页 + 游戏视图两个容器）
├── index.ts            # 入口文件
├── moduls/             # 游戏模块（注意：目录名拼写如此）
│   ├── App.ts          # 应用外壳（主页渲染、视图切换、游戏挂载/销毁）
│   ├── GameControl.ts  # 贪吃蛇控制器（状态机、输入处理）
│   ├── Snake.ts        # 蛇（移动、碰撞检测）
│   ├── Food.ts         # 食物（随机生成）
│   └── ScorePanel.ts   # 计分板（分数、等级）
├── games/              # 游戏注册表（新增小游戏的扩展点）
│   ├── types.ts        # GameModule / GameInstance 接口定义
│   ├── index.ts        # 游戏清单，追加一项即可上线一款新游戏
│   ├── snake/          # 贪吃蛇游戏模块
│   │   ├── index.ts    # 挂载逻辑与图标
│   │   └── template.ts # 游戏机外壳 HTML 模板
│   └── dragon52/       # 游龙52式游戏模块（自带粉色主题样式）
│       ├── index.ts    # 挂载逻辑与图标
│       ├── cards.ts    # 52 张牌的数据与特殊事件
│       ├── Dragon52.ts # 洗牌、抽牌、特殊事件、计分、牌堆轨道
│       ├── template.ts # 牌桌 HTML 模板
│       └── style.less  # 粉色主题样式
└── style/
    └── index.less      # 全局样式（主页、贪吃蛇游戏机、粉色主题、响应式）
```

## 新增一款小游戏

1. 新建 `src/games/<id>/index.ts`，导出一个 `GameModule`：

   ```ts
   const myGame: GameModule = {
     id: 'my-game',
     name: '我的游戏',
     title: 'MY GAME',
     description: '一句话简介',
     icon: '<svg>...</svg>',       // 主页卡片图标
     mount(container: HTMLElement) {
       container.innerHTML = '<div class="my-game"></div>'
       return {
         destroy() {
           // 清理定时器、事件监听
         }
       }
     }
   }
   ```

2. 在 `src/games/index.ts` 中登记：`const games: GameModule[] = [snake, dragon52, myGame]`

3. 主页卡片、游戏标题条、返回主页逻辑都由 `App` 自动处理，无需改动外壳代码。
4. 需要独立主题时，可在模块内 `import './style.less'`，并在 `mount` 时给 `document.body` 加 `theme-xxx` 类、`destroy` 时移除（参考 `games/dragon52`）。

### 引入第三方库

第三方库**不能**在 `index.ts` 里静态引入 —— `index.ts` 属于主包，静态引入会让所有访客都下载这个库。正确做法是用动态 `import()` 单独放在 `runtime.ts` 里：

```ts
// src/games/<id>/runtime.ts
export async function createGame(container: HTMLElement) {
  const THREE = await import(/* webpackChunkName: "three" */ 'three')
  return new Game(container, THREE)
}

// src/games/<id>/Game.ts
import type * as THREE_NS from 'three'   // 类型导入，编译期擦除，不产生运行时依赖
export class Game {
  constructor(container: HTMLElement, THREE: typeof THREE_NS) { /* ... */ }
}
```

`import type` 不产生运行时依赖；`import()` 会被 webpack 切成独立 chunk 落到 `dist/js/`。用 `webpackChunkName` 给 chunk 命名，产物目录才可读。

## 收录游戏

### 贪吃蛇

复古游戏机外观的经典贪吃蛇，规则见「游戏规则」一节。

### 游龙52式

两个人的情侣扑克牌游戏，粉红主题，一副 52 张牌：

- **52 张牌** = 4 种花色 × A~K 13 个档位，洗牌后不放回抽取，两人轮流各抽 26 张
  - ♥ 红桃 · **真心话**（A→K 越来越私密）
  - ♠ 黑桃 · **大冒险**
  - ♣ 梅花 · **惩罚**（羞羞的那些都在这里）
  - ♦ 方块 · **奖励**
- **特殊事件**：每抽一张有 22% 概率触发，牌堆上方弹出横幅
  - 龙鳞护体：本次惩罚免除，惩罚牌转为奖励牌
  - 桃花劫：追加一条同类型附加任务
  - 双龙戏珠：立即重抽一张，本张作废
  - 龙抬头：直接加 5 分
  - 龙凤呈祥：双方各加 2 分
- **计分**：♥/♠ 由对方完成，抽牌方 +1 分；♣/♦ 由抽牌方承担，对方 +1 分
- **牌堆轨道**：52 格底牌实时显示已抽的牌，高亮当前牌
- 抽完全部 52 张结算比分，可「再来一局」

## 作者

ZhangShuang
