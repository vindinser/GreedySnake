// 打砖块：HTML 模板
const GAME_TEMPLATE = `
<div class="bk">
  <!-- 顶部：标题与计数 -->
  <div class="bk-top">
    <div class="bk-brand">
      <div class="bk-title">打砖块</div>
      <div class="bk-sub">BREAKOUT</div>
    </div>
    <div class="bk-hud" id="hudSlot"></div>
  </div>

  <!-- 画面 -->
  <div class="bk-stage">
    <canvas id="canvas"></canvas>
  </div>

  <!-- 操作提示 -->
  <div class="bk-hint">鼠标或方向键移动挡板 · 点击画面发球</div>
</div>
`

export default GAME_TEMPLATE
