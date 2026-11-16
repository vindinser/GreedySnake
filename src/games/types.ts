// 游戏实例：游戏挂载后返回，切换视图时调用 destroy 释放资源
export interface GameInstance {
  destroy(): void
}

// 游戏模块：新增小游戏只需实现该接口并登记到 src/games/index.ts
export interface GameModule {
  // 唯一标识
  id: string
  // 中文名称
  name: string
  // 英文标题
  title: string
  // 简介
  description: string
  // 卡片图标（HTML 片段）
  icon: string
  // 挂载游戏到容器，返回游戏实例
  mount(container: HTMLElement): GameInstance
}
