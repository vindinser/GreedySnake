// 共享牌面：花色与点数的唯一定义，记忆翻牌与游龙52式共用

export type SuitKey = 'heart' | 'spade' | 'club' | 'diamond';

export interface CardSuit {
  key: SuitKey;
  symbol: string;
  name: string;
  // 牌面主色
  color: string;
}

// 四种花色。顺序即牌号映射顺序：牌号 n 的花色是 (n-1) % 4
export const CARD_SUITS: CardSuit[] = [
  { key: 'heart', symbol: '♥', name: '红桃', color: '#e03131' },
  { key: 'spade', symbol: '♠', name: '黑桃', color: '#2b3038' },
  { key: 'club', symbol: '♣', name: '梅花', color: '#2b3038' },
  { key: 'diamond', symbol: '♦', name: '方块', color: '#1c7ed6' }
];

// A~K 共 13 个档位
export const CARD_RANKS: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// 渲染一张牌面（花色 + 点数），样式只依赖 src/style/ui.less 的 token
export function createCardFace(suit: CardSuit, rank: string, className?: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'gs-card-face' + (className ? ' ' + className : '');
  el.style.color = suit.color;

  const symbol = document.createElement('span');
  symbol.className = 'gs-card-face-symbol';
  symbol.textContent = suit.symbol;

  const value = document.createElement('span');
  value.className = 'gs-card-face-rank';
  value.textContent = rank;

  el.appendChild(symbol);
  el.appendChild(value);
  return el;
}
