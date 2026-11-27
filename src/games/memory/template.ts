// 记忆翻牌：HTML 模板
const GAME_TEMPLATE = `
<div class="mm">
  <!-- 顶部：标题与计数 -->
  <div class="mm-top">
    <div class="mm-brand">
      <div class="mm-title">翻牌配对</div>
      <div class="mm-sub">MEMORY MATCH</div>
    </div>
    <div class="mm-hud" id="hudSlot"></div>
  </div>

  <!-- 难度切换 -->
  <div class="mm-levels" id="levels"></div>

  <!-- 牌阵 -->
  <div class="mm-grid" id="grid"></div>

  <!-- 操作提示 -->
  <div class="mm-hint">翻开两张相同的牌即可配对 · 步数越少越好</div>
</div>
`

export default GAME_TEMPLATE
