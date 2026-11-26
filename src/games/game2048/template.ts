// 2048：HTML 模板
const GAME_TEMPLATE = `
<div class="g2048">
  <!-- 顶部：标题与分数 -->
  <div class="g2048-top">
    <div class="g2048-brand">
      <div class="g2048-title">2048</div>
      <div class="g2048-sub">把数字合成大块</div>
    </div>
    <div class="g2048-hud" id="hudSlot"></div>
  </div>

  <!-- 棋盘 -->
  <div class="g2048-board" id="board">
    <div class="g2048-grid" id="grid"></div>
    <div class="g2048-tiles" id="tilesLayer"></div>
  </div>

  <!-- 操作提示 -->
  <div class="g2048-hint">方向键 / WASD 移动，或在棋盘上滑动</div>
</div>
`

export default GAME_TEMPLATE
