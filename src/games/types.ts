// 游戏实例：游戏挂载后返回，切换视图时调用 destroy 释放资源
export interface GameInstance {
  destroy(): void;
}

// 游戏分类：用于主页的分类筛选
export type GameCategory = 'arcade' | 'puzzle' | 'card' | 'board' | '3d';

// 游戏模块：新增小游戏只需实现该接口并登记到 src/games/index.ts
export interface GameModule {
  // 唯一标识，同时作为路由片段（#/游戏id）
  id: string;
  // 中文名称
  name: string;
  // 英文标题
  title: string;
  // 简介
  description: string;
  // 卡片图标（HTML 片段）
  icon: string;
  // 分类，用于主页筛选
  category?: GameCategory;
  // 标签，预留给主页搜索
  tags?: string[];
  // 主题名：挂载时外壳会给 body 加 theme-<theme>，退出时移除
  theme?: string;
  // 特殊入口：主页用花里胡哨的卡片样式单独渲染（惊喜入口专用）
  special?: boolean;
  // 挂载游戏到容器，返回游戏实例
  mount(container: HTMLElement): GameInstance;
}
