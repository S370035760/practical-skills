/**
 * 批量生成引擎 —— 纯函数、种子可复现。
 *
 * 保证：
 * - 同一种子 + 相同锁定/氛围 => 同一批的层选择与完整 prompt 完全一致；
 * - 单 / 四 / 九张批量；九张内主要动作与主机位（成像手法签名）不重复；
 * - 避开最近 20 组指纹；
 * - 商务散场/桌游夜/独处等候/安静空间/刚到场/准备离开 的规则恒成立；
 * - 安全块不可被移除。
 *
 * 说明：底层图像模型不支持数值 seed，故 seed 复现的是「故事卡组合 + prompt 文本」，
 * 不承诺成图像素一致。
 */
import { mulberry32, hashString, shuffle } from './rng';
import { MOODS, MOMENT_POOL, TRACE_POOL } from './options-data';
import {
  availableFor,
  buildContext,
  explainCompatibility,
  resolveClothingFor,
  resolvePool,
} from './rules';
import { toStoryCard } from './compiler';
import { makeFingerprint } from './fingerprint';
import type { EngineResult, EngineSpec, LayerKey, StoryCard } from './types';

const momentPoseOf = (key: string) => MOMENT_POOL.find((m) => m.key === key)?.pose ?? '';

export function generateBatch(spec: EngineSpec): EngineResult {
  const rng = mulberry32(spec.seed ^ hashString(spec.mood));
  const mood = MOODS.find((m) => m.key === spec.mood);

  const ctx = buildContext(spec, {
    phaseKey: spec.locks.phase ?? mood?.phaseBias[0],
    spaceKey: spec.locks.space ?? mood?.spaceBias[0],
  });

  const taskSel = resolvePool('task', ctx.taskKey)!;
  const spaceSel = resolvePool('space', ctx.spaceKey)!;

  const phasePool = availableFor('phase', ctx, spec.locks);
  const momentKeys = availableFor('moment', ctx, spec.locks);
  const traceKeys = availableFor('trace', ctx, spec.locks);

  const forbidden = new Set(spec.avoidFingerprints ?? []);
  const usedMoment = new Set<string>();
  // 主机位以成像痕迹的具体手法为签名，保证九张机位不重复
  const usedCamera = new Set<string>();
  const usedPhase = new Set<string>();

  // 时段：优先使用各不相同的时段，之后再循环复用（时段池少于 9）
  const phaseOrder = spec.locks.phase ? [spec.locks.phase] : shuffle(rng, phasePool);
  let phaseCursor = 0;
  let phaseReused = false;

  const cards: StoryCard[] = [];
  const warnings: string[] = [];
  const cross = { persons: ctx.persons, relation: ctx.relation, tidiness: ctx.tidiness };

  let guard = 0;
  const N = spec.batchSize;
  while (cards.length < N && guard < 800) {
    guard++;
    const phaseKey = phaseOrder[phaseCursor % phaseOrder.length];
    phaseCursor++;
    if (phaseCursor > phaseOrder.length && !phaseReused) {
      phaseReused = true;
      if (phaseOrder.length < N) warnings.push('时段种类少于批次数量，后段允许时段复用以保证数量。');
    }

    const momentKey = spec.locks.moment
      ? spec.locks.moment
      : shuffle(rng, momentKeys).find((k) => !usedMoment.has(k));
    if (!momentKey) {
      if (!warnings.includes('可用主动作不足，后段允许复用主要动作。')) {
        warnings.push('可用主动作不足，后段允许复用主要动作。');
      }
      continue;
    }
    const traceKey = spec.locks.trace
      ? spec.locks.trace
      : shuffle(rng, traceKeys).find((k) => !usedCamera.has(k));
    if (!traceKey) {
      if (!warnings.includes('可用机位不足，后段允许复用主机位。')) {
        warnings.push('可用机位不足，后段允许复用主机位。');
      }
      continue;
    }

    const phaseSel = resolvePool('phase', phaseKey)!;
    const momentSel = resolvePool('moment', momentKey)!;
    const traceSel = resolvePool('trace', traceKey)!;
    const fp = makeFingerprint({ momentKey, camFamily: traceKey, phaseKey });
    // 避开最近 20 组指纹
    if (forbidden.has(fp)) continue;

    usedMoment.add(momentKey);
    usedCamera.add(traceKey);
    usedPhase.add(phaseKey);

    const layers = { task: taskSel, phase: phaseSel, space: spaceSel, moment: momentSel, trace: traceSel };
    // 卡 id 直接使用指纹串，保证与「最近 20 组」去重判定同源
    const id = fp;
    const compatibility = explainCompatibility(ctx, spec);
    const card = toStoryCard({
      layers,
      cross,
      clothing: resolveClothingFor(ctx),
      mood: spec.mood,
      seed: spec.seed,
      index: cards.length,
      batchSize: N,
      id,
      compatibility,
      createdAt: Date.now(),
    });
    cards.push(card);
  }

  if (cards.length < N) warnings.push(`可用组合不足，本次仅生成 ${cards.length} 张。`);
  return { cards, warnings };
}

/** 生成时用：打印一张卡片的可读摘要（调试用，不进 UI） */
export function cardDigest(card: StoryCard): string {
  const l = card.layers;
  return [l.task.labelZh, l.phase.labelZh, l.space.labelZh, l.moment.labelZh, l.trace.labelZh].join(' · ');
}

export { momentPoseOf };

/**
 * 换单变量：在保持其余四层不变的前提下，仅重选目标层并重编译 prompt。
 * 返回新批量；await 保留 createdAt（时间戳复用于历史定位）。
 */
export function swapLayerVariable(
  spec: EngineSpec,
  prev: StoryCard[],
  layer: LayerKey,
): { cards: StoryCard[]; warnings: string[] } {
  if (prev.length === 0) return { cards: [], warnings: ['没有可换的卡片'] };
  const rng = mulberry32(prev[0].seed ^ hashString(`${spec.mood}:swap:${layer}`));
  // 换变量时该层视为未锁定
  const effLocks: EngineSpec['locks'] = { ...spec.locks, [layer]: undefined };
  const warnings: string[] = [];

  const cards: StoryCard[] = prev.map((card, i) => {
    // 其余四层沿用当前卡片
    const keepLayers = { ...card.layers } as StoryCard['layers'];
    const currentKey = card.layers[layer].key;

    const ctx = buildContext({ ...spec, locks: effLocks }, {
      phaseKey: keepLayers.phase.key,
      spaceKey: keepLayers.space.key,
    });
    const choices = shuffle(rng, availableFor(layer, ctx, effLocks)).filter((k) => k !== currentKey);
    const usedElsewhere = new Set(prev.filter((_, j) => j !== i).map((c) => c.layers[layer].key));
    // 尽量不与同批其它卡在这一层重复（moment/trace 尤其重要）
    const nextKey = choices.find((k) => !usedElsewhere.has(k)) ?? choices[0];
    if (!nextKey) {
      warnings.push(`「${card.layers[layer].labelZh}」无法更换其它选项，保持原值。`);
      return card;
    }
    const sel = resolvePool(layer, nextKey)!;
    const layers = { ...keepLayers, [layer]: sel } as StoryCard['layers'];
    const fp = makeFingerprint({
      momentKey: layers.moment.key,
      camFamily: layers.trace.key,
      phaseKey: layers.phase.key,
    });
    const id = fp;
    return toStoryCard({
      layers,
      cross: card.cross,
      clothing: resolveClothingFor(ctx),
      mood: spec.mood,
      seed: card.seed,
      index: i,
      batchSize: card.batchSize,
      id,
      compatibility: explainCompatibility(ctx, spec),
      createdAt: card.createdAt,
      favorite: card.favorite,
    });
  });
  return { cards, warnings };
}