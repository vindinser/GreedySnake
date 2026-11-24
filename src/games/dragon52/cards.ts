// 游龙52式：牌面数据
// 一副牌 52 张：4 种花色 × A~K 13 个档位，强度由 A 到 K 递增

export type SuitKey = 'heart' | 'spade' | 'club' | 'diamond';

export interface Suit {
  key: SuitKey;
  symbol: string;
  name: string;
  // 任务类型
  type: string;
  // true：由对方完成任务，抽牌方得分；false：抽牌方付出，对方得分
  opponentActs: boolean;
}

export const SUITS: Suit[] = [
  { key: 'heart', symbol: '♥', name: '红桃', type: '真心话', opponentActs: true },
  { key: 'spade', symbol: '♠', name: '黑桃', type: '大冒险', opponentActs: true },
  { key: 'club', symbol: '♣', name: '梅花', type: '惩罚', opponentActs: false },
  { key: 'diamond', symbol: '♦', name: '方块', type: '奖励', opponentActs: false }
];

export const RANKS: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// 红桃 · 真心话
const HEART_TASKS: string[] = [
  '说一个你今天偷偷关注对方的瞬间。',
  '对方身上最让你心动的一个细节是什么？',
  '你们的第一次约会是什么场景？',
  '说出一句一直想对对方说、还没说出口的话。',
  '你觉得对方更吸引你的是外表还是性格？说说理由。',
  '描述你第一次觉得「这个人真好」的具体瞬间。',
  '说出对方一个你私心很喜欢的称呼。',
  '你们之间最让你心软的一件事是什么？',
  '如果对方今天心情不好，你会怎么哄？现场演一遍。',
  '说三个你希望对方改掉的小习惯（要温柔）。',
  '说一件你希望对方更主动一点的事。',
  '用三个词形容此刻的你和对方，并解释最难的那个词。',
  '当面说一句会让你脸红的情话，不许笑场。'
];

// 黑桃 · 大冒险
const SPADE_TASKS: string[] = [
  '给对方一个拥抱，保持十秒不松手。',
  '用三种不同的语气说「我喜欢你」。',
  '模仿对方最经典的一个口头禅或动作，让对方评分。',
  '给对方喂一口零食或一口水。',
  '牵着对方的手原地转三圈，然后说出你此刻的方向感。',
  '让对方在你身上选一个位置，用手指画一颗心。',
  '学对方的走路姿势走十步。',
  '抱住对方三十秒，全程不许说话。',
  '给对方唱一小段你们都熟悉的歌。',
  '与对方对视三十秒，先笑的人认输。',
  '让对方在你手臂或脸颊上留下一个专属记号。',
  '现场模仿你们第一次见面的场景和对话。',
  '对着对方做一套十秒的「偶像应援」动作。'
];

// 梅花 · 惩罚
const CLUB_TASKS: string[] = [
  '接下来三句话必须用「喵」结尾。',
  '做十组深蹲，或等量的运动。',
  '一分钟之内不许说「我」字。',
  '让对方随便指定一个词，重复说二十遍。',
  '被对方「喂」完手里这一份零食。',
  '让对方指定一句话，你发到朋友圈。',
  '做二十个深蹲，或深蹲十个加平板支撑一分钟（二选一）。',
  '让对方决定一个亲密小动作，力度以双方舒适为准。',
  '连续说三句情话，中间不许停顿超过两秒。',
  '录一条十秒的语音告白发给对方。',
  '顶着一个专属表情照十张自拍，选一张让对方设成壁纸。',
  '让对方在你脸上画一个专属记号（保留到明天）。',
  '今晚的洗碗和收拾全部由你承包。'
];

// 方块 · 奖励
const DIAMOND_TASKS: string[] = [
  '今晚的睡前故事由你讲给对方听。',
  '送对方一个小礼物（零食、一朵花都算）。',
  '给对方捶背十分钟，全程不许停。',
  '一起拍一张此刻的合照，并设成聊天背景。',
  '写一段不少于三句话的话给对方，今晚念出来。',
  '今晚的洗碗和家务由你承包。',
  '让对方点一首歌，两人一起唱完。',
  '给对方一个不限时长的拥抱。',
  '一起看一部电影，片由对方来选。',
  '和对方一起完成一个拖延已久的小目标（当场定时间）。',
  '说出一个「今晚必须兑现」的愿望，由对方满足。',
  '为对方准备一个惊喜（下次见面时兑现）。',
  '由对方提一个不过分的要求，你当场答应并兑现。'
];

export const TASKS: Record<SuitKey, string[]> = {
  heart: HEART_TASKS,
  spade: SPADE_TASKS,
  club: CLUB_TASKS,
  diamond: DIAMOND_TASKS
};

export interface Card {
  // 牌号（牌堆中的位置）
  number: number;
  suit: Suit;
  // 档位 A~K
  rank: string;
  // 式子内容
  task: string;
}

// 牌号 -> 牌面：花色 = (n-1) % 4，档位 = floor((n-1)/4) + 1
export function cardInfo(n: number): Card {
  const suit = SUITS[(n - 1) % 4];
  const rankIndex = Math.floor((n - 1) / 4);
  return {
    number: n,
    suit: suit,
    rank: RANKS[rankIndex],
    task: TASKS[suit.key][rankIndex]
  };
}

// 换花色：牌号与档位保持不变，只换式子内容
export function withSuit(card: Card, key: SuitKey): Card {
  const rankIndex = RANKS.indexOf(card.rank);
  const suit = SUITS.filter(s => s.key === key)[0];
  return {
    number: card.number,
    suit: suit,
    rank: card.rank,
    task: TASKS[key][rankIndex]
  };
}

// 同花色随机一条式子
export function randomTask(key: SuitKey): string {
  const list = TASKS[key];
  return list[Math.floor(Math.random() * list.length)];
}

// ========== 特殊事件 ==========
export type EventEffect = 'shield' | 'extra' | 'redraw' | 'bonus' | 'both';

export interface SpecialEvent {
  key: string;
  name: string;
  desc: string;
  effect: EventEffect;
}

export const SPECIAL_EVENTS: SpecialEvent[] = [
  { key: 'shield', name: '龙鳞护体', desc: '本次惩罚免除，惩罚牌自动转为奖励牌', effect: 'shield' },
  { key: 'extra', name: '桃花劫', desc: '追加一条同类型的附加任务，双倍刺激', effect: 'extra' },
  { key: 'redraw', name: '双龙戏珠', desc: '立即重抽一张，本张结果作废', effect: 'redraw' },
  { key: 'bonus', name: '龙抬头', desc: '直接加 5 分，气运滔天', effect: 'bonus' },
  { key: 'both', name: '龙凤呈祥', desc: '双方各加 2 分，和气生财', effect: 'both' }
];

// 触发概率与权重
export const EVENT_CHANCE = 0.22;
export const EVENT_WEIGHTS: { key: string; weight: number }[] = [
  { key: 'shield', weight: 30 },
  { key: 'extra', weight: 25 },
  { key: 'redraw', weight: 20 },
  { key: 'bonus', weight: 15 },
  { key: 'both', weight: 10 }
];
