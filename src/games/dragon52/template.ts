// 游龙52式：HTML 模板
const DRAGON_TEMPLATE = `
<div class="dragon">
  <!-- 顶部 -->
  <div class="dragon-top">
    <div class="speaker-grille">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
    <div class="brand">ZhangShuang</div>
    <div class="led-light on"></div>
  </div>

  <!-- 标题 -->
  <div class="dragon-title">游龙52式</div>
  <div class="dragon-sub">52 张牌 · 两个人的夜晚</div>

  <!-- 比分 -->
  <div class="score-board">
    <div class="player-box" id="playerBox0">
      <div class="player-name">你</div>
      <div class="player-score" id="score0">0</div>
      <div class="player-draws" id="draws0">已抽 0 张</div>
    </div>
    <div class="score-vs">VS</div>
    <div class="player-box" id="playerBox1">
      <div class="player-name">TA</div>
      <div class="player-score" id="score1">0</div>
      <div class="player-draws" id="draws1">已抽 0 张</div>
    </div>
  </div>

  <!-- 历史最佳 -->
  <div class="dragon-best" id="bestSlot"></div>

  <!-- 特殊事件横幅 -->
  <div class="event-banner" id="eventBanner">
    <span class="event-name" id="eventName"></span>
    <span class="event-desc" id="eventDesc"></span>
  </div>

  <!-- 牌面 -->
  <div class="card-area">
    <div class="card" id="card">
      <div class="card-inner">
        <div class="card-face card-back">
          <div class="card-back-number">52</div>
          <div class="card-back-text">点击下方抽牌</div>
        </div>
        <div class="card-face card-front">
          <div class="card-corner">
            <span class="card-suit" id="cardSuit">♥</span>
            <span class="card-rank" id="cardRank">A</span>
          </div>
          <div class="card-number" id="cardNumber">0</div>
          <div class="card-type" id="cardType"></div>
          <div class="card-task" id="cardTask"></div>
          <div class="card-hint" id="cardHint"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 操作 -->
  <button class="draw-btn" id="drawBtn">抽 牌</button>
  <button class="reshuffle-btn" id="reshuffleBtn">重新洗牌</button>

  <!-- 牌堆轨道 -->
  <div class="track">
    <div class="track-head">
      <span>牌堆</span>
      <span id="trackInfo">0 / 52</span>
    </div>
    <div class="track-grid" id="trackGrid"></div>
  </div>

  <!-- 回合提示 -->
  <div class="turn-hint" id="turnHint">轮到 你 抽牌</div>

  <!-- 结束覆盖层 -->
  <div class="dragon-over" id="gameOver">
    <div class="dragon-over-title">52 张<br>抽完啦</div>
    <div class="dragon-over-score">
      <span class="final-name">你</span> <span id="finalScore0">0</span>
      <span class="final-colon">:</span>
      <span id="finalScore1">0</span> <span class="final-name">TA</span>
    </div>
    <button class="again-btn" id="againBtn">再来一局</button>
  </div>
</div>
`

export default DRAGON_TEMPLATE
