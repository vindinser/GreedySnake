// localStorage 封装：统一前缀、异常兜底
// 隐私模式或配额用满时静默失败，不影响游戏运行

const PREFIX = 'gs:'

export const storage = {
  // 读取并反序列化，失败或不存在时返回默认值
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch (e) {
      return fallback
    }
  },

  // 序列化后写入
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch (e) {
      // 忽略：存储不可用时游戏仍可正常进行
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch (e) {
      // 忽略
    }
  }
}
