// 扫雷：HTML 模板
const GAME_TEMPLATE = `
<div class="ms">
  <!-- 顶部：标题与计数 -->
  <div class="ms-top">
    <div class="ms-brand">
      <div class="ms-title">扫雷</div>
      <div class="ms-sub">MINESWEEPER</div>
    </div>
    <div class="ms-hud" id="hudSlot"></div>
  </div>

  <!-- 难度切换 -->
  <div class="ms-levels" id="levels"></div>

  <!-- 棋盘 -->
  <div class="ms-board" id="board"></div>

  <!-- 操作提示 -->
  <div class="ms-hint">左键翻开 · 右键插旗（手机长按插旗，或切换🚩模式）</div>
</div>
`

export default GAME_TEMPLATE
