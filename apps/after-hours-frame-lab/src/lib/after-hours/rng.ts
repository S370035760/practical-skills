/**
 * 种子可复现的伪随机数生成器（mulberry32）。
 * 同一种子产出的参数序列完全一致，从而保证「故事卡组合 + 完整 prompt」可复现。
 * 注意：底层图像模型不支持数值 seed，因此同一 seed 可复现 prompt，不保证成图像素。
 */

export type RNG = () => number;

/** 根据 32 位整数种子创建 PRNG */
export function mulberry32(seedState: number): RNG {
  let a = seedState >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 把任意字符串哈希成 32 位无符号整数（用于 seed 派生/指纹） */
export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** [min, max] 闭区间随机整数 */
export function intInRange(rng: RNG, min: number, max: number): number {
  const span = max - min + 1;
  return min + Math.floor(rng() * span);
}

/** 从数组中以（可选加权的）均匀方式取一个元素 */
export function pickOne<T>(rng: RNG, items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

/** 可复现的洗牌（Fisher–Yates），返回新数组 */
export function shuffle<T>(rng: RNG, items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}