import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import games from '../src/games'
import {
  BIG_LETTER,
  CHASE_LINES,
  LETTERS,
  MILESTONES,
  SECRET_PASSWORD,
  WRONG_LINES,
  checkPassword,
  pickLine,
  rollRounds
} from '../src/games/surprise/lines'
import surprise from '../src/games/surprise'
import { FAKE_TIMERS } from './fake-timers'

// 挂载惊喜点点，返回常用元素
function mountSurprise() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const instance = surprise.mount(container);
  const q = <T extends HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
  return {
    container,
    instance,
    input: q<HTMLInputElement>('#spInput'),
    panel: q('#spPanel'),
    cake: q('#spCake'),
    error: q('#spError'),
    chase: q<HTMLButtonElement>('.sp-chase'),
    gift: q('#spGift'),
    envelopeLayer: q('#spEnvelopeLayer'),
    letter: q('#spLetter'),
    letterTitle: q('#spLetterTitle'),
    letterCount: q('#spLetterCount'),
    letterBody: q('#spLetterBody'),
    finale: q('#spFinale'),
    timeline: q('#spTimeline'),
    bgmBtn: q<HTMLButtonElement>('.sp-bgm'),
    submit: q<HTMLButtonElement>('.sp-submit'),
    retry: q<HTMLButtonElement>('.sp-retry')
  };
}

describe('惊喜点点 / 口令逻辑', () => {
  it('么么儿是唯一正确口令', () => {
    expect(SECRET_PASSWORD).toBe('么么儿');
    expect(checkPassword('么么儿')).toBe(true);
  });

  it('忽略首尾空白', () => {
    expect(checkPassword('  么么儿  ')).toBe(true);
    expect(checkPassword('\t么么儿\n')).toBe(true);
  });

  it('其他口令全部失败', () => {
    for (const wrong of ['么么', 'meimeier', '生日快乐', '', '么麼儿', '么么哒', '么么儿。']) {
      expect(checkPassword(wrong)).toBe(false);
    }
  });
});

describe('惊喜点点 / 随机次数与文案', () => {
  it('追逐次数在 3~10 之间（十次以内）', () => {
    for (let i = 0; i < 200; i++) {
      const rounds = rollRounds();
      expect(rounds).toBeGreaterThanOrEqual(3);
      expect(rounds).toBeLessThanOrEqual(10);
    }
  });

  it('rollRounds 覆盖满整个 3~10 区间', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rollRounds());
    for (let n = 3; n <= 10; n++) expect(seen.has(n)).toBe(true);
  });

  it('pickLine 从池中取数，且尽量不连续重复', () => {
    for (let i = 0; i < 100; i++) {
      const line = pickLine(CHASE_LINES);
      expect(CHASE_LINES).toContain(line);
      const avoid = CHASE_LINES[0];
      expect(pickLine(CHASE_LINES, Math.random, avoid)).not.toBe(avoid);
    }
  });

  it('pickLine 空池返回空串', () => {
    expect(pickLine([])).toBe('');
  });
});

describe('惊喜点点 / 情书与时间线', () => {
  it('准备了多封情书，每封都有标题和正文', () => {
    expect(LETTERS.length).toBeGreaterThanOrEqual(4);
    for (const letter of LETTERS) {
      expect(letter.title.length).toBeGreaterThan(0);
      expect(letter.body.length).toBeGreaterThan(0);
      expect(letter.body.join('').length).toBeGreaterThan(0);
    }
  });

  it('压卷大情书篇幅最长、分量最重', () => {
    expect(BIG_LETTER.body.length).toBeGreaterThanOrEqual(8);
    expect(BIG_LETTER.body.join('').length).toBeGreaterThan(
      Math.max(...LETTERS.map(l => l.body.join('').length))
    );
    expect(BIG_LETTER.body.join('')).toContain('2804');
    expect(BIG_LETTER.body.join('')).toContain('11月29日');
  });

  it('情书提到生日 11月29日 与在一起的 2804 天', () => {
    const all = LETTERS.map(l => l.body.join('')).join('');
    expect(all).toContain('11月29日');
    expect(all).toContain('2804');
  });

  it('时间线记录相识到生闺女的完整轨迹', () => {
    const text = MILESTONES.map(m => m.date + m.event).join('');
    for (const key of ['2019年3月18日相识', '2019年3月24日相遇', '2019年3月28日相恋', '订婚', '2025年3月18日领证', '结婚', '我们的闺女出生']) {
      expect(text).toContain(key);
    }
  });
});

describe('惊喜点点 / 注册表', () => {
  it('已登记且是特殊入口', () => {
    expect(games).toContain(surprise);
    expect(surprise.special).toBe(true);
    expect(surprise.id).toBe('surprise');
  });
});

describe('惊喜点点 / 交互流程', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: FAKE_TIMERS });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('口令错误：抖面板 + 甩嘲讽按钮，点了也只会一直刷新', () => {
    const g = mountSurprise();

    g.input.value = '不对不对';
    g.submit.click();

    // 错误提示来自嘲讽池
    expect(WRONG_LINES).toContain(g.error.textContent);
    // 嘲讽按钮已出现
    expect(g.chase.classList.contains('sp-chase--in')).toBe(true);
    expect(WRONG_LINES).toContain(g.chase.textContent);

    // 反复点击：文案一直刷新，且永远停留在嘲讽池里
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const before = g.chase.textContent;
      g.chase.click();
      expect(g.chase.textContent).not.toBe(before);
      expect(WRONG_LINES).toContain(g.chase.textContent);
      seen.add(g.chase.textContent!);
    }
    // 永远点不到礼物和告白
    vi.advanceTimersByTime(120000);
    expect(g.gift.classList.contains('sp-gift--show')).toBe(false);
    expect(g.letter.classList.contains('sp-letter--show')).toBe(false);
    expect(g.finale.classList.contains('sp-finale--show')).toBe(false);
    expect(seen.size).toBeGreaterThan(3);

    // 重新输入口令可以回到输入状态
    g.retry.click();
    expect(g.chase.classList.contains('sp-chase--in')).toBe(false);
    expect(g.error.textContent).toBe('');

    g.instance.destroy();
    document.body.removeChild(g.container);
  });

  it('口令正确：追逐后掉落礼物，不管点哪封都从第一封读，读罢大情书进终场', () => {
    const g = mountSurprise();

    g.input.value = '  么么儿  ';
    g.submit.click();

    // 吹蜡烛、面板退场
    expect(g.cake.classList.contains('sp-cake--out')).toBe(true);
    expect(g.panel.classList.contains('sp-panel--gone')).toBe(true);

    // 追逐按钮稍后就位
    vi.advanceTimersByTime(800);
    expect(g.chase.classList.contains('sp-chase--in')).toBe(true);
    expect(CHASE_LINES).toContain(g.chase.textContent);

    // 每次点击后按钮消失再换位置出现，最多十次
    let clicks = 0;
    for (let round = 0; round < 10; round++) {
      g.chase.click();
      clicks++;
      // 换位冷却中：直接不可见
      expect(g.chase.classList.contains('sp-chase--hide')).toBe(true);
      vi.advanceTimersByTime(450);
      if (g.gift.classList.contains('sp-gift--show')) break;
      expect(g.chase.classList.contains('sp-chase--in')).toBe(true);
      expect(CHASE_LINES).toContain(g.chase.textContent);
    }
    expect(clicks).toBeLessThanOrEqual(10);

    // 礼物掉落 → 炸开 → 蹦出信封
    vi.advanceTimersByTime(2600);
    const envelopes = g.envelopeLayer.querySelectorAll('.sp-envelope');
    expect(envelopes.length).toBe(LETTERS.length);
    vi.advanceTimersByTime(1200);
    expect(g.envelopeLayer.querySelectorAll('.sp-envelope--in').length).toBe(LETTERS.length);

    // 点第四封信：不管点中哪封，都从第一封开始读
    envelopes[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(900);
    expect(g.letter.classList.contains('sp-letter--show')).toBe(true);
    expect(g.letterTitle.textContent).toBe(LETTERS[0].title);
    expect(g.letterCount.textContent).toBe(`第 1 封 / 共 ${LETTERS.length} 封`);
    expect(g.letterBody.querySelectorAll('.sp-letter-p').length).toBeGreaterThan(0);

    // 一封封读下去，直到压卷大情书登场
    let sawBigLetter = false;
    for (let i = 0; i < 400 && !sawBigLetter; i++) {
      vi.advanceTimersByTime(1000);
      sawBigLetter = g.letterTitle.textContent === BIG_LETTER.title && g.letter.classList.contains('sp-letter--grand');
    }
    expect(sawBigLetter).toBe(true);

    // 大情书读罢：进入终场，时间线逐条亮起
    for (let i = 0; i < 400; i++) {
      vi.advanceTimersByTime(1000);
      if (g.finale.classList.contains('sp-finale--show')) break;
    }
    expect(g.finale.classList.contains('sp-finale--show')).toBe(true);
    expect(g.timeline.querySelectorAll('.sp-tl-item').length).toBe(MILESTONES.length);
    expect(g.letter.classList.contains('sp-letter--show')).toBe(false);
    // 终场雪景：一家三口背影 + 一排脚印
    expect(g.finale.querySelector('.sp-scene')).not.toBeNull();
    expect(g.finale.querySelector('.sp-scene-family')).not.toBeNull();
    expect(g.finale.querySelectorAll('.sp-print').length).toBeGreaterThanOrEqual(6);

    // 销毁后不允许残留定时器
    g.instance.destroy();
    expect(vi.getTimerCount()).toBe(0);
    document.body.removeChild(g.container);
  });

  it('不点信封：几秒后自动开播，仍然从第一封读起', () => {
    const g = mountSurprise();

    g.input.value = '么么儿';
    g.submit.click();
    vi.advanceTimersByTime(800);

    // 直接追到结束
    for (let round = 0; round < 10; round++) {
      g.chase.click();
      vi.advanceTimersByTime(450);
      if (g.gift.classList.contains('sp-gift--show')) break;
    }
    vi.advanceTimersByTime(2600);
    vi.advanceTimersByTime(1200);
    // 一直不点信封：自动开播
    vi.advanceTimersByTime(6200);
    expect(g.letter.classList.contains('sp-letter--show')).toBe(true);
    expect(g.letterTitle.textContent).toBe(LETTERS[0].title);

    g.instance.destroy();
    document.body.removeChild(g.container);
  });

  it('背景音乐：首次交互启动，可随时开关，销毁后零残留', () => {
    const g = mountSurprise();

    // 挂载时还没有任何手势：音乐未启动，也无定时器
    expect(g.bgmBtn.classList.contains('sp-bgm--off')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    // 舞台内第一次交互（指针按下）启动音乐
    g.container.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(g.bgmBtn.classList.contains('sp-bgm--off')).toBe(false);
    // 音乐循环靠定时器续杯：推进一个循环周期仍在跑
    vi.advanceTimersByTime(30000);
    expect(g.bgmBtn.classList.contains('sp-bgm--off')).toBe(false);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    // 点一下开关：静音
    g.bgmBtn.click();
    expect(g.bgmBtn.classList.contains('sp-bgm--off')).toBe(true);

    // 再点一下：重新响起
    g.bgmBtn.click();
    expect(g.bgmBtn.classList.contains('sp-bgm--off')).toBe(false);

    // 销毁：音乐与定时器一起收干净
    g.instance.destroy();
    expect(vi.getTimerCount()).toBe(0);
    document.body.removeChild(g.container);
  });
});
