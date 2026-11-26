# GreedySnake 游戏合集

基于 TypeScript + Webpack 实现的小游戏合集网页应用，支持电脑键盘和手机触屏操控。
目前收录 **贪吃蛇**（复古游戏机主题）、 **游龙52式**（情侣扑克牌主题）、 **2048**（数字合成益智）与 **扫雷**（钢蓝经典推理），游戏注册表已预留扩展位，后续可继续添加其他小游戏。

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
| `npm run typecheck` | `tsc --noEmit` 类型检查（覆盖 `src` 与 `test`） |
| `npm test` | Vitest 单元测试 + 全注册表冒烟测试 |
| `npm run test:watch` | Vitest 监听模式 |
| `npm run verify:e2e` | 用无头浏览器跑一遍真实页面（需先 `npm run build:prod`） |

## 页面结构

应用分为两个视图，通过 `.show` 类切换：

| 视图 | 说明 |
|------|------|
| **主页** `#homeView` | 游戏选择页，列出注册表中的所有游戏卡片，点击卡片进入对应游戏 |
| **游戏视图** `#gameView` | 顶部为标题条（含 `◀ MENU` 返回主页按钮），下方为游戏内容 |

地址栏采用哈希路由：`#/home` 是主页，`#/<游戏id>` 直接进入对应游戏（深链可分享，浏览器后退键可用，未知 id 自动回落到主页）。

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

- **语言**：TypeScript 5.9（严格模式）
- **构建**：Webpack 5 + Babel + ts-loader
- **样式**：Less + PostCSS
- **测试**：Vitest + jsdom（单元测试 + 全注册表挂载/销毁冒烟测试）
- **兼容性**：现代浏览器（Chrome 108+）。Webpack 运行时虽降级为 ES5，但业务代码按现代浏览器转译，**不再支持 IE 10**
- **代码分割**：动态 `import()` 会被切成独立 chunk，第三方库按需下载，不进首屏主包

## 公共基建

所有游戏共用 `src/core/` 与 `src/ui/`，新增游戏不用重复造轮子：

| 模块 | 能力 |
|------|------|
| `src/core/loop.ts` | 统一游戏循环：单 rAF、帧间隔截断、页面隐藏自动暂停 |
| `src/core/input.ts` | 统一输入：键盘（方向键 / WASD 归一化）与触屏滑动 |
| `src/core/audio.ts` | WebAudio 程序化音效，15 个内置 8-bit 音色，无音频素材文件 |
| `src/core/storage.ts` | `localStorage` 封装（`gs:` 前缀，异常兜底），用于最高分等存档 |
| `src/core/dispose.ts` | 逆序、幂等的清理动作收拢器 |
| `src/ui/` | 共享按钮 / 面板 / 覆盖层 / 信息条 / 载入占位组件 |

主题采用 CSS 变量 token（`--gs-accent` 等）。每款游戏声明 `theme` 字段，由外壳统一加挂 `body.theme-*` 并在退出时移除 —— 游戏本身不再操作 `document.body`。

## 项目结构

```
src/
├── index.html          # HTML 模板（主页 + 游戏视图两个容器）
├── index.ts            # 入口文件
├── core/               # 公共基建（循环 / 输入 / 音效 / 存档 / 清理）
│   ├── loop.ts         #   统一游戏循环
│   ├── input.ts        #   统一输入层
│   ├── audio.ts        #   WebAudio 音效引擎
│   ├── storage.ts      #   localStorage 封装
│   └── dispose.ts      #   清理动作收拢器
├── ui/                 # 共享 UI 组件（按钮 / 面板 / 覆盖层 / 信息条 / 载入）
├── moduls/             # 游戏模块（注意：目录名拼写如此）
│   ├── App.ts          # 应用外壳（主页渲染、哈希路由、主题托管、游戏挂载/销毁）
│   ├── GameControl.ts  # 贪吃蛇控制器（状态机、游戏循环、输入处理）
│   ├── Snake.ts        # 蛇（移动、碰撞检测）
│   ├── Food.ts         # 食物（随机生成）
│   └── ScorePanel.ts   # 计分板（分数、等级）
├── games/              # 游戏注册表（新增小游戏的扩展点）
│   ├── types.ts        # GameModule / GameInstance / GameCategory 接口定义
│   ├── index.ts        # 游戏清单，追加一项即可上线一款新游戏
│   ├── snake/          # 贪吃蛇游戏模块
│   │   ├── index.ts    # 挂载逻辑与图标
│   │   └── template.ts # 游戏机外壳 HTML 模板
│   ├── game2048/       # 2048 游戏模块（琥珀色主题）
│   │   ├── index.ts    # 挂载逻辑与图标
│   │   ├── template.ts # 棋盘 HTML 模板
│   │   ├── logic.ts    # 棋盘纯逻辑（移动 / 合并 / 死局判定，可单测）
│   │   ├── Game2048.ts # 渲染、输入、音效与存档
│   │   └── style.less  # 琥珀色主题与棋盘样式
│   ├── minesweeper/    # 扫雷游戏模块（钢蓝主题）
│   │   ├── index.ts    # 挂载逻辑与图标
│   │   ├── template.ts # 棋盘 HTML 模板
│   │   ├── logic.ts    # 棋盘纯逻辑（布雷 / 展开 / 插旗 / 胜负判定，可单测）
│   │   ├── Minesweeper.ts # 渲染、输入、计时与存档
│   │   └── style.less  # 钢蓝主题与格子样式
│   └── dragon52/       # 游龙52式游戏模块（自带粉色主题样式）
│       ├── index.ts    # 挂载逻辑与图标
│       ├── cards.ts    # 52 张牌的数据与特殊事件
│       ├── Dragon52.ts # 洗牌、抽牌、特殊事件、计分、牌堆轨道
│       ├── template.ts # 牌桌 HTML 模板
│       └── style.less  # 粉色主题样式
└── style/
    ├── index.less      # 全局样式（主页、贪吃蛇游戏机、主题 token、响应式）
    └── ui.less         # 共享 UI 组件样式

test/                  # Vitest 测试
├── setup.ts            # jsdom 环境补齐（布局偏移、AudioContext 等）
├── core.test.ts        # core 各模块单元测试
├── ui.test.ts          # UI 组件单元测试
├── games-2048.test.ts  # 2048 棋盘合并规则单元测试
├── games-minesweeper.test.ts # 扫雷布雷与展开规则单元测试
└── smoke.test.ts       # 全注册表挂载/销毁冒烟测试
scripts/
└── e2e.mjs             # 无依赖 CDP 脚本：无头浏览器跑真实页面
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
     category: 'puzzle',           // 可选：arcade / puzzle / card / board / 3d
     tags: ['单人'],               // 可选
     theme: 'my-game',             // 可选：外壳会自动加挂 body.theme-my-game
     mount(container: HTMLElement) {
       container.innerHTML = '<div class="my-game"></div>'
       const loop = new GameLoop({ update: (dt) => { /* ... */ } })
       loop.start()
       return {
         destroy() {
           loop.stop()   // 清理定时器、事件监听
         }
       }
     }
   }
   ```

2. 在 `src/games/index.ts` 中登记：`const games: GameModule[] = [snake, dragon52, myGame]`

3. 主页卡片、游戏标题条、返回主页逻辑都由 `App` 自动处理，无需改动外壳代码。
4. 需要独立主题时，声明 `theme: '<名字>'` 即可 —— 外壳会在挂载时加 `body.theme-<名字>`、退出时移除。**游戏自己不要操作 `document.body`。**
5. 游戏循环、键盘输入、音效、存档一律用 `src/core/`，通用控件用 `src/ui/`，不要重复实现。

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

### 2048

经典数字合成益智游戏，琥珀色主题：

- **4×4 棋盘**，每回合随机出现一个 2 或 4
- **方向键 / WASD / 触屏滑动** 四向移动，相邻且相同的方块自动合并
- **一次移动中同一行/列最多合并一次**（`2 2 2` 左移得到 `4 2`，不是 `8`）
- **合并规则与得分**都在 `src/games/game2048/logic.ts` 里的纯函数中实现，有独立单元测试覆盖
- **动画**：方块滑动靠 CSS `transform` 过渡，合并时幸存方块弹出、被吸收方块滑过去后淡出，新方块缩放出现 —— 纯 CSS 实现，不引入动画库
- **合成 2048** 弹出胜利提示可继续挑战；**棋盘填满且无法合并**时结算
- **最高分**保存在 `gs:2048.best`

### 扫雷

经典扫雷，钢蓝主题：

- **三档难度**：初级 9×9 / 10 雷、中级 16×16 / 40 雷、高级 30×16 / 99 雷
- **首击永远安全** —— 首次点击时才生成棋盘，那一格及其八邻域都不放雷，所以首击必定展开一片
- **左键翻开**，空白区域连片自动展开并显示相邻雷数；**右键插旗**（手机长按插旗，或切换 🚩 标记模式）
- **计时与计数**：实时显示剩余雷数、用时与该难度的最佳通关时间；切到后台时计时自动暂停
- **胜负**：踩雷则揭开全部雷并标出错插的旗；所有非雷格翻开即胜利，剩余雷自动插旗
- **规则与布雷**在 `src/games/minesweeper/logic.ts` 里的纯函数中实现，有独立单元测试覆盖

## 作者

ZhangShuang
