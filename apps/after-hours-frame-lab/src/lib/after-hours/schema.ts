/**
 * localStorage 数据结构 schema 与 JSON 校验（纯函数）。
 *
 * 用于：本地写入前校验、测试、以及从 localStorage 读取时拒绝畸形数据。
 * 规则保证写入「最近 20 组」历史时结构始终一致、可被后端/下游安全消费。
 */
import type { HistoryRecord, LayerKey, StoryCard } from './types';
import { LAYER_KEYS } from './types';

const NON_EMPTY_STRING = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isLayerSelection(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return NON_EMPTY_STRING(o.key) && NON_EMPTY_STRING(o.labelZh) && NON_EMPTY_STRING(o.labelEn);
}

function isCross(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const p = o.persons;
  return isFiniteNum(p) && p >= 1 && p <= 6 && NON_EMPTY_STRING(o.relation) && NON_EMPTY_STRING(o.tidiness);
}

function isLayers(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return LAYER_KEYS.every((k: LayerKey) => isLayerSelection(o[k]));
}

/** 校验一张故事卡；返回问题数组（空数组 = 通过） */
export function validateCard(card: unknown): string[] {
  if (!card || typeof card !== 'object') return ['卡片不是对象'];
  const c = card as Record<string, unknown>;
  const problems: string[] = [];
  if (!NON_EMPTY_STRING(c.id)) problems.push('缺少 id');
  if (!isFiniteNum(c.seed)) problems.push('缺少数字 seed');
  if (![1, 4, 9].includes(c.batchSize as number)) problems.push('batchSize 非法');
  if (!isLayers(c.layers)) problems.push('五层模型结构不完整');
  if (!isCross(c.cross)) problems.push('横向维度不合法');
  if (!NON_EMPTY_STRING(c.clothing)) problems.push('缺少着装');
  if (!Array.isArray(c.compatibility)) problems.push('缺少相容性说明');
  if (!NON_EMPTY_STRING(c.prompt)) problems.push('缺少 prompt');
  if (!NON_EMPTY_STRING(c.safetyBlock) || !c.safetyBlock.includes('25岁以上')) problems.push('缺少安全块');
  if (!isFiniteNum(c.createdAt)) problems.push('缺少时间戳');
  return problems;
}

/** 校验一条历史记录 */
export function validateHistoryRecord(record: unknown): boolean {
  return validateCard(record).length === 0;
}

/** 校验整个历史数组；返回按时间戳倒序、最多 20 条的新→旧列表 */
export function sanitizeHistory(history: unknown): HistoryRecord[] {
  if (!Array.isArray(history)) return [];
  const clean = history
    .filter((h) => validateHistoryRecord(h))
    .sort((a, b) => (b.createdAt - a.createdAt))
    .slice(0, 20) as unknown as HistoryRecord[];
  return clean;
}

/** 校验一条可收藏记录（与历史同构） */
export function validateFavorite(fav: unknown): boolean {
  return validateHistoryRecord(fav);
}

export function cardToHistory(card: StoryCard): HistoryRecord {
  return {
    id: card.id,
    seed: card.seed,
    index: card.index,
    batchSize: card.batchSize,
    fingerprint: card.id,
    layers: card.layers,
    cross: card.cross,
    clothing: card.clothing,
    compatibility: card.compatibility,
    prompt: card.prompt,
    safetyBlock: card.safetyBlock,
    createdAt: card.createdAt,
    favorite: card.favorite,
  };
}