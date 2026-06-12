# GreedySnake 贪吃蛇

基于 TypeScript + Webpack 实现的贪吃蛇网页游戏，采用复古游戏机外观设计，支持电脑键盘和手机触屏操控。

## [在线体验](http://greedysnake.zsawxotof.site/)

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:8080` 即可开始游戏。

## 构建部署

```bash
npm run build
```

打包产物输出到 `dist/` 目录。

## 操作方式

| 操作 | 电脑 | 手机 |
|------|------|------|
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

## 技术栈

- **语言**：TypeScript（严格模式）
- **构建**：Webpack 5 + Babel + ts-loader
- **样式**：Less + PostCSS
- **兼容性**：IE 10+（Webpack 输出无箭头函数和 const）

## 项目结构

```
src/
├── index.html          # HTML 模板
├── index.ts            # 入口文件
├── moduls/             # 游戏模块（注意：目录名拼写如此）
│   ├── GameControl.ts  # 游戏控制器（状态机、输入处理）
│   ├── Snake.ts        # 蛇（移动、碰撞检测）
│   ├── Food.ts         # 食物（随机生成）
│   └── ScorePanel.ts   # 计分板（分数、等级）
└── style/
    └── index.less      # 全部样式（游戏机外观、响应式适配）
```

## 作者

ZhangShuang
