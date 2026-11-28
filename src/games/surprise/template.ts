// 惊喜点点：HTML 模板（生日主题舞台，动画全部由 CSS 驱动）
const SURPRISE_TEMPLATE = `
<div class="sp-stage" id="spStage">
  <!-- 夜空装饰：星星与气球（纯 CSS 动画） -->
  <div class="sp-sky" aria-hidden="true">
    <span class="sp-star" style="left:6%;top:8%;animation-delay:0s"></span>
    <span class="sp-star" style="left:18%;top:22%;animation-delay:.4s"></span>
    <span class="sp-star" style="left:31%;top:5%;animation-delay:.9s"></span>
    <span class="sp-star" style="left:45%;top:15%;animation-delay:.2s"></span>
    <span class="sp-star" style="left:58%;top:7%;animation-delay:1.2s"></span>
    <span class="sp-star" style="left:71%;top:20%;animation-delay:.6s"></span>
    <span class="sp-star" style="left:86%;top:9%;animation-delay:1.5s"></span>
    <span class="sp-star" style="left:93%;top:30%;animation-delay:.3s"></span>
    <span class="sp-star" style="left:12%;top:38%;animation-delay:1s"></span>
    <span class="sp-star" style="left:80%;top:42%;animation-delay:.7s"></span>
    <span class="sp-star" style="left:25%;top:52%;animation-delay:1.3s"></span>
    <span class="sp-star" style="left:63%;top:56%;animation-delay:.1s"></span>
    <span class="sp-balloon sp-balloon--a"></span>
    <span class="sp-balloon sp-balloon--b"></span>
    <span class="sp-balloon sp-balloon--c"></span>
  </div>

  <!-- 常驻雪花：她喜欢雪，整个舞台一直下雪 -->
  <div class="sp-snow" id="spSnow" aria-hidden="true"></div>

  <!-- 生日蛋糕：口令正确后蜡烛熄灭 -->
  <div class="sp-cake" id="spCake" aria-hidden="true">
    <div class="sp-candles">
      <span class="sp-candle"><i class="sp-flame"></i></span>
      <span class="sp-candle"><i class="sp-flame"></i></span>
      <span class="sp-candle"><i class="sp-flame"></i></span>
    </div>
    <div class="sp-layer sp-layer--top"></div>
    <div class="sp-layer sp-layer--mid"><span class="sp-cake-num">11·29</span></div>
    <div class="sp-plate"></div>
  </div>

  <!-- 主标题 -->
  <header class="sp-hero">
    <div class="sp-hero-kicker">A LITTLE SURPRISE FOR YOU</div>
    <h1 class="sp-hero-title">生 日 快 乐</h1>
    <div class="sp-hero-sub">有一份专属惊喜，只给对的你</div>
  </header>

  <!-- 口令面板 -->
  <section class="sp-panel" id="spPanel">
    <div class="sp-panel-title">输入口令，解锁惊喜</div>
    <div class="sp-panel-hint">提示：你平时怎么喊我，就输什么</div>
    <div class="sp-panel-row">
      <input class="sp-input" id="spInput" type="text" maxlength="16" placeholder="悄悄输入口令…" autocomplete="off">
    </div>
    <div class="sp-error" id="spError"></div>
    <div class="sp-panel-row" id="spSubmitRow"></div>
    <div class="sp-retry-row" id="spRetryRow"></div>
  </section>

  <!-- 追逐按钮：随机位置乱跑，由 JS 摆放 -->
  <div class="sp-chase-layer" id="spChaseLayer"></div>

  <!-- 告白第一幕：掉落礼物盒，炸开蹦出信封 -->
  <div class="sp-gift" id="spGift">
    <div class="sp-gift-lid"></div>
    <div class="sp-gift-box">
      <span class="sp-gift-ribbon"></span>
    </div>
    <div class="sp-gift-bow"></div>
  </div>
  <div class="sp-envelope-layer" id="spEnvelopeLayer"></div>
  <div class="sp-env-hint" id="spEnvHint">点一个信封，看看里面写着什么…</div>

  <!-- 背景音乐开关（由 JS 挂按钮） -->
  <div class="sp-bgm-row" id="spBgmRow"></div>

  <!-- 告白第二幕：情书朗读 -->
  <section class="sp-letter" id="spLetter">
    <div class="sp-letter-badges">
      <span class="sp-letter-badge">11月29日 · 你的生日</span>
      <span class="sp-letter-badge sp-letter-badge--alt">2804 天 · 我们在一起</span>
    </div>
    <div class="sp-letter-title" id="spLetterTitle">致最爱的么么儿</div>
    <div class="sp-letter-count" id="spLetterCount"></div>
    <div class="sp-letter-body" id="spLetterBody"></div>
    <div class="sp-letter-sign" id="spLetterSign">—— 永远爱你的我</div>
  </section>

  <!-- 告白终场：我们的时间线 + 生日祝福 -->
  <section class="sp-finale" id="spFinale">
    <!-- 终场雪景：月亮、雪松、雪坡，一家三口的背影和一排脚印 -->
    <svg class="sp-scene" viewBox="0 0 420 580" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="spMoonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffe9b8" stop-opacity="0.5"/>
          <stop offset="45%" stop-color="#ffe9b8" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#ffe9b8" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="spGroundFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f6ecff"/>
          <stop offset="100%" stop-color="#c9b2e4"/>
        </linearGradient>
        <!-- 雪松：三层三角叠雪帽 -->
        <g id="spFir">
          <rect x="-2" y="-9" width="4" height="9" fill="#24103a"/>
          <polygon points="-15,0 15,0 0,-22" fill="#24103a"/>
          <polygon points="-15,0 15,0 0,-22" fill="#ecdff9" transform="translate(0,-11) scale(1,0.5)"/>
          <polygon points="-12,-15 12,-15 0,-35" fill="#24103a"/>
          <polygon points="-12,-15 12,-15 0,-35" fill="#ecdff9" transform="translate(0,-25) scale(1,0.5)"/>
          <polygon points="-9,-27 9,-27 0,-46" fill="#24103a"/>
          <polygon points="-9,-27 9,-27 0,-46" fill="#ecdff9" transform="translate(0,-36.5) scale(1,0.5)"/>
        </g>
      </defs>

      <!-- 月亮与光晕 -->
      <circle class="sp-scene-moonglow" cx="64" cy="92" r="52" fill="url(#spMoonGlow)"/>
      <circle cx="64" cy="92" r="23" fill="#ffeec9"/>

      <!-- 雪松：左大右小，还有一棵远的 -->
      <use href="#spFir" transform="translate(34,496) scale(1.15)"/>
      <use href="#spFir" transform="translate(122,480) scale(0.5)"/>
      <use href="#spFir" transform="translate(392,464) scale(0.85)"/>

      <!-- 雪坡 -->
      <path d="M0 580 L0 500 C 60 484, 120 478, 200 484 C 290 490, 350 474, 420 458 L420 580 Z" fill="url(#spGroundFill)"/>
      <path d="M0 500 C 60 484, 120 478, 200 484 C 290 490, 350 474, 420 458" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round"/>

      <!-- 一排脚印：从近景一路小到脚边（他们从远方走来，走向更远的远方） -->
      <g class="sp-scene-prints" fill="#6f4d96">
        <g class="sp-print" style="animation-delay:0s"><ellipse cx="102.5" cy="552" rx="5" ry="2.9" transform="rotate(-14 102.5 552)" opacity="0.62"/><ellipse cx="113.5" cy="554.4" rx="5" ry="2.9" transform="rotate(-14 113.5 554.4)" opacity="0.62"/></g>
        <g class="sp-print" style="animation-delay:.1s"><ellipse cx="118" cy="542" rx="4.5" ry="2.6" transform="rotate(-14 118 542)" opacity="0.57"/><ellipse cx="128" cy="544.4" rx="4.5" ry="2.6" transform="rotate(-14 128 544.4)" opacity="0.57"/></g>
        <g class="sp-print" style="animation-delay:.2s"><ellipse cx="133.5" cy="532" rx="4" ry="2.3" transform="rotate(-14 133.5 532)" opacity="0.52"/><ellipse cx="142.5" cy="534.4" rx="4" ry="2.3" transform="rotate(-14 142.5 534.4)" opacity="0.52"/></g>
        <g class="sp-print" style="animation-delay:.3s"><ellipse cx="149" cy="521" rx="3.6" ry="2" transform="rotate(-14 149 521)" opacity="0.47"/><ellipse cx="157" cy="523.4" rx="3.6" ry="2" transform="rotate(-14 157 523.4)" opacity="0.47"/></g>
        <g class="sp-print" style="animation-delay:.4s"><ellipse cx="164.5" cy="511" rx="3.1" ry="1.8" transform="rotate(-14 164.5 511)" opacity="0.42"/><ellipse cx="171.5" cy="513.4" rx="3.1" ry="1.8" transform="rotate(-14 171.5 513.4)" opacity="0.42"/></g>
        <g class="sp-print" style="animation-delay:.5s"><ellipse cx="180" cy="501" rx="2.7" ry="1.5" transform="rotate(-14 180 501)" opacity="0.37"/><ellipse cx="186" cy="503.4" rx="2.7" ry="1.5" transform="rotate(-14 186 503.4)" opacity="0.37"/></g>
        <g class="sp-print" style="animation-delay:.6s"><ellipse cx="195.5" cy="494" rx="2.3" ry="1.3" transform="rotate(-14 195.5 494)" opacity="0.32"/><ellipse cx="200.5" cy="496.4" rx="2.3" ry="1.3" transform="rotate(-14 200.5 496.4)" opacity="0.32"/></g>
        <g class="sp-print" style="animation-delay:.7s"><ellipse cx="210" cy="489" rx="1.9" ry="1.1" transform="rotate(-14 210 489)" opacity="0.27"/><ellipse cx="214" cy="491.4" rx="1.9" ry="1.1" transform="rotate(-14 214 491.4)" opacity="0.27"/></g>
      </g>

      <!-- 一家三口：手拉手，留给世界三个背影 -->
      <g class="sp-scene-family" fill="#1e0b2e">
        <!-- 手拉手的两段桥 -->
        <line x1="243.3" y1="449.6" x2="234.8" y2="464.3" stroke="#1e0b2e" stroke-width="5" stroke-linecap="round"/>
        <line x1="260.8" y1="452.6" x2="269.2" y2="464.3" stroke="#1e0b2e" stroke-width="5" stroke-linecap="round"/>
        <!-- 爸爸 -->
        <g transform="translate(222,484)">
          <rect x="-7.5" y="-37" width="7" height="37" rx="3.5"/>
          <rect x="1.5" y="-37" width="7" height="37" rx="3.5"/>
          <rect x="-14.5" y="-67" width="29" height="32" rx="11"/>
          <rect x="-20" y="-63" width="6.5" height="29" rx="3.25" transform="rotate(-9 -16.75 -63)"/>
          <rect x="13.5" y="-63" width="6.5" height="29" rx="3.25" transform="rotate(9 16.75 -63)"/>
          <circle cx="0" cy="-76" r="9.5"/>
        </g>
        <!-- 妈妈（背影是一头长发） -->
        <g transform="translate(282,488)">
          <rect x="-7" y="-35" width="6.5" height="35" rx="3.25"/>
          <rect x="1" y="-35" width="6.5" height="35" rx="3.25"/>
          <rect x="-11" y="-86" width="22" height="26" rx="11"/>
          <circle cx="0" cy="-76" r="8.5"/>
          <rect x="-15" y="-66" width="30" height="33" rx="12"/>
          <rect x="-20" y="-62" width="6" height="27" rx="3" transform="rotate(-9 -17 -62)"/>
          <rect x="14" y="-62" width="6" height="27" rx="3" transform="rotate(9 17 -62)"/>
        </g>
        <!-- 丫头（两只小手高高举着） -->
        <g transform="translate(252,486) scale(0.62)">
          <rect x="-5" y="-23" width="5" height="23" rx="2.5"/>
          <rect x="0.5" y="-23" width="5" height="23" rx="2.5"/>
          <rect x="-10.5" y="-46" width="21" height="24" rx="8.5"/>
          <rect x="-14" y="-48" width="5.5" height="21" rx="2.75" transform="rotate(-52 -11.25 -48)"/>
          <rect x="8.5" y="-48" width="5.5" height="21" rx="2.75" transform="rotate(52 11.25 -48)"/>
          <circle cx="0" cy="-54" r="7.5"/>
          <circle cx="0" cy="-63" r="2.6"/>
        </g>
      </g>
    </svg>

    <div class="sp-finale-title">我们的这些年</div>
    <div class="sp-timeline" id="spTimeline"></div>
    <div class="sp-finale-wish">生日快乐，我的么么儿</div>
    <div class="sp-finale-sub">11月29日 · 爱你，比 2804 天还要多一点</div>
  </section>

  <!-- 终场漂浮的爱心 -->
  <div class="sp-hearts" id="spHearts" aria-hidden="true"></div>
</div>
`;

export default SURPRISE_TEMPLATE;
