import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 浏览器环境：游戏与 UI 组件都依赖 DOM
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    restoreMocks: true
  }
})
