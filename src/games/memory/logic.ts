// 记忆翻牌：牌堆与配对规则纯逻辑，不碰 DOM
import { CARD_RANKS, CARD_SUITS, SuitKey } from '../../ui/cardFace'

export interface MemoryCard {
  // 实例唯一 id：同一副牌里两张一样的牌 id 不同
  id: number;
  // 牌面标识：同一对的两张共享
  key: string;
  suit: SuitKey;
  rank: string;
}

export interface Level {
  key: string;
  name: string;
  cols: number;
  pairs: number;
}

// 三档难度：4×4 / 4×5 / 4×6
export const LEVELS: Level[] = [
  { key: 'easy', name: '简单', cols: 4, pairs: 8 },
  { key: 'normal', name: '普通', cols: 5, pairs: 10 },
  { key: 'hard', name: '困难', cols: 6, pairs: 12 }
];

// 生成牌堆：pairCount 组互不相同的牌，每组两张
export function createDeck(pairCount: number): MemoryCard[] {
  const pool: { key: string; suit: SuitKey; rank: string }[] = [];
  for (const suit of CARD_SUITS) {
    for (const rank of CARD_RANKS) {
      pool.push({ key: suit.key + ':' + rank, suit: suit.key, rank });
    }
  }

  // 洗牌后取前 N 组
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const chosen = pool.slice(0, Math.min(pairCount, pool.length));

  const cards: MemoryCard[] = [];
  chosen.forEach((card, i) => {
    cards.push({ id: i * 2, key: card.key, suit: card.suit, rank: card.rank });
    cards.push({ id: i * 2 + 1, key: card.key, suit: card.suit, rank: card.rank });
  });

  // 再洗一次，打散配对位置
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cards[i];
    cards[i] = cards[j];
    cards[j] = tmp;
  }
  return cards;
}

// 两张牌是否配对（同一张牌不算配对）
export function isMatch(a: MemoryCard, b: MemoryCard): boolean {
  return a.id !== b.id && a.key === b.key;
}

// 已配对的组数
export function matchedPairs(cards: MemoryCard[], matchedIds: Set<number>): number {
  return Math.floor(matchedIds.size / 2);
}
