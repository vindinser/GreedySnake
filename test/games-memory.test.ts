import { describe, it, expect } from 'vitest'
import { createDeck, isMatch, LEVELS, matchedPairs } from '../src/games/memory/logic'

describe('记忆翻牌 / 难度表', () => {
  it('三档难度', () => {
    expect(LEVELS.map(l => l.key)).toEqual(['easy', 'normal', 'hard']);
    expect(LEVELS[0]).toMatchObject({ cols: 4, pairs: 8 });
    expect(LEVELS[1]).toMatchObject({ cols: 5, pairs: 10 });
    expect(LEVELS[2]).toMatchObject({ cols: 6, pairs: 12 });
  });
});

describe('记忆翻牌 / createDeck', () => {
  it('牌数是配对数的两倍', () => {
    expect(createDeck(8)).toHaveLength(16);
    expect(createDeck(10)).toHaveLength(20);
    expect(createDeck(12)).toHaveLength(24);
  });

  it('每个 id 唯一', () => {
    const cards = createDeck(12);
    expect(new Set(cards.map(c => c.id)).size).toBe(cards.length);
  });

  it('每种牌面恰好出现两次', () => {
    const cards = createDeck(10);
    const counts = new Map<string, number>();
    for (const card of cards) {
      counts.set(card.key, (counts.get(card.key) || 0) + 1);
    }
    expect(counts.size).toBe(10);
    for (const count of counts.values()) {
      expect(count).toBe(2);
    }
  });

  it('不同档位的牌面互不相同', () => {
    const cards = createDeck(12);
    const keys = new Set(cards.map(c => c.key));
    expect(keys.size).toBe(12);
  });

  it('花色与档位都来自共享牌面定义', () => {
    const cards = createDeck(12);
    for (const card of cards) {
      expect(['heart', 'spade', 'club', 'diamond']).toContain(card.suit);
      expect(card.rank.length).toBeGreaterThan(0);
    }
  });

  it('配对数超过牌库上限时不会崩', () => {
    const cards = createDeck(999);
    expect(cards.length).toBeLessThanOrEqual(104);
    expect(cards.length % 2).toBe(0);
  });
});

describe('记忆翻牌 / isMatch', () => {
  it('同牌面、不同实例算配对', () => {
    const [a, b] = createDeck(1);
    expect(isMatch(a, b)).toBe(true);
  });

  it('同一张牌自己不算配对', () => {
    const [a] = createDeck(1);
    expect(isMatch(a, a)).toBe(false);
  });

  it('不同牌面不算配对', () => {
    const cards = createDeck(8);
    const a = cards[0];
    const b = cards.find(c => c.key !== a.key)!;
    expect(isMatch(a, b)).toBe(false);
  });
});

describe('记忆翻牌 / matchedPairs', () => {
  it('已配对的 id 数除以二就是组数', () => {
    const cards = createDeck(8);
    const matched = new Set([cards[0].id, cards[1].id]);
    expect(matchedPairs(cards, matched)).toBe(1);
    matched.add(cards[2].id);
    matched.add(cards[3].id);
    expect(matchedPairs(cards, matched)).toBe(2);
  });
});
