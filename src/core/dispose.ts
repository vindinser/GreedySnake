export type Disposer = () => void

// 一次性收拢清理动作：逆序执行、幂等
// 用于把一个游戏内部的 timer、事件监听、GPU 资源统一挂到一个释放口
export class DisposableGroup {
  private items: Disposer[] = [];
  private disposed = false;

  add(disposer: Disposer): void {
    if (this.disposed) {
      // 已经释放过：新增的清理动作立即执行，避免漏掉
      disposer();
      return;
    }
    this.items.push(disposer);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const items = this.items;
    this.items = [];
    // 逆序释放：后注册的先释放，符合依赖方向
    for (let i = items.length - 1; i >= 0; i--) {
      try {
        items[i]();
      } catch (e) {
        console.error(e);
      }
    }
  }
}
