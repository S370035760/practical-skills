/**
 * 情境规则引擎 —— 纯函数。
 *
 * 规则回答两件事：
 * 1) 在给定横向维度+任务+时段下，每一层有哪些可用选项（filterAvailable）；
 * 2) 最终组合为什么相容（解释性文本 explainCompatibility）。
 *
 * 规则是最小可信集合：必须保证「25+ 成年人+安全块」恒成立之外，只约束真实的情境逻辑，
 * 不堆形容词。所有判定输入为结构化 key，输出为稳定的 key 集合/说明。
 */
import { TASK_POOL, PHASE_POOL, SPACE_POOL, MOMENT_POOL, TRACE_POOL, MOODS, MOOD_NOTE } from './options-data';
import type { CrossFields, LayerKey, LayerSelection, EngineSpec } from './types';

export interface RuleContext {
  taskKey: string;
  phaseKey: string;
  spaceKey: string;
  persons: number;
  relation: string;
  tidiness: string;
}

const byKey = <T extends { key: string }>(pool: T[], key: string | undefined): T | undefined =>
  pool.find((o) => o.key === key);

/** 由锁定表 + 横向维度偏好 + 氛围 构造规则上下文（未锁定的用规则补齐默认） */
export function buildContext(spec: EngineSpec, moodBias: { phaseKey?: string; spaceKey?: string }): RuleContext {
  const task = byKey(TASK_POOL, spec.locks.task ?? undefined);
  let persons = spec.cross?.persons ?? 3;
  let relation = spec.cross?.relation ?? '';
  const tidiness = spec.cross?.tidiness ?? '自然松弛';

  // 规则：独处等候只能 1 人（不可被随机逻辑移除）
  if (task?.key === 'solo_wait' || spec.locks.task === 'solo_wait') {
    persons = 1;
    relation = '独自一人';
  } else if (task?.relationBias) {
    relation = relation || task.relationBias;
  }
  // 人数收进任务允许区间
  if (task) {
    if (persons < task.personsMin) persons = task.personsMin;
    if (persons > task.personsMax) persons = task.personsMax;
  }
  persons = Math.max(1, Math.min(6, Math.round(persons)));

  const phaseKey = spec.locks.phase ?? moodBias.phaseKey ?? 'warming';
  const spaceKey = spec.locks.space ?? moodBias.spaceKey ?? 'wood_warm';
  return { taskKey: task?.key ?? 'after_work', phaseKey, spaceKey, persons, relation, tidiness };
}

export function availableFor(layer: LayerKey, ctx: RuleContext, locks: EngineSpec['locks']): string[] {
  // 已锁定则该层仅允许锁定项
  const locked = locks[layer];
  if (locked) return [locked];

  switch (layer) {
    case 'task':
      return TASK_POOL.map((o) => o.key);
    case 'phase':
      return PHASE_POOL.map((o) => o.key);
    case 'space':
      return SPACE_POOL.map((o) => o.key);
    case 'moment': {
      const task = byKey(TASK_POOL, ctx.taskKey);
      let keys = MOMENT_POOL.map((o) => o.key);
      // 商务散场：克制的握手寒暄更贴合；不出现「摇骰子」
      if (task?.key === 'business_coda') {
        keys = keys.filter((k) => ['handshake_coda', 'answering', 'passing_item', 'gazing_window', 'adjusting_cuff', 'half_laugh', 'checking_phone', 'whisper_lean'].includes(k));
      }
      // 桌面游戏：才出现「摇骰子」
      if (task?.key === 'board_game') {
        keys = keys.filter((k) => ['rolling_dice', 'answering', 'half_laugh', 'finding_seat', 'reaching_glass', 'whisper_lean', 'checking_phone'].includes(k));
      }
      // 独处等候：禁止需要对话互动的瞬间
      if (task?.key === 'solo_wait') {
        keys = keys.filter((k) => ['gazing_window', 'adjusting_cuff', 'finding_seat', 'checking_phone', 'tying_hair'].includes(k));
      }
      // 安静空间（安静吧台）或安静时段：优先自处/低互动
      if (ctx.spaceKey === 'quiet_bar' && ctx.phaseKey === 'quiet') {
        keys = keys.filter((k) => ['gazing_window', 'adjusting_cuff', 'half_laugh', 'checking_phone'].includes(k));
      }
      return keys;
    }
    case 'trace': {
      // 安静空间优先中长焦：消费级/高 ISO/混合白平衡/手机 1x
      const space = byKey(SPACE_POOL, ctx.spaceKey);
      if (space?.shotHint === 'tele') {
        return TRACE_POOL.filter((t) => ['phone_1x', 'compact_digital', 'high_iso', 'mixed_wb', 'digital_zoom'].includes(t.key)).map((t) => t.key);
      }
      return TRACE_POOL.map((o) => o.key);
    }
    default:
      return [];
  }
}

/** 推导着装 */
export function resolveClothingFor(ctx: RuleContext): string {
  const task = byKey(TASK_POOL, ctx.taskKey);
  const formal = task?.formal ?? 0.3;
  const space = byKey(SPACE_POOL, ctx.spaceKey);
  if (formal >= 0.75) return '利落合身、面料挺括，正式场合得体的通勤社交装束，剪裁干净' as const;
  if (formal >= 0.4) return '收腰不紧绷、针织与垂感面料，半正式、可通勤可社交' as const;
  if (space?.key === 'neon_booth') return '宽松而有轮廓，轻光泽面料，夜晚清爽但不抢镜' as const;
  return '柔软松弛、棉麻与针织，舒适自然的日常社交气息' as const;
}

/** 说明该组合为何相容（由匹配到的规则生成，原文原创） */
export function explainCompatibility(ctx: RuleContext, spec: EngineSpec): string[] {
  const notes: string[] = [];
  const task = byKey(TASK_POOL, ctx.taskKey);
  const phase = byKey(PHASE_POOL, ctx.phaseKey);
  const space = byKey(SPACE_POOL, ctx.spaceKey);
  const mood = MOODS.find((m) => m.key === spec.mood);

  if (task?.key === 'solo_wait') notes.push('独处等候限定为 1 人，画面围绕单人的自处状态展开，不出现对话互动。');
  if (task?.key === 'board_game') notes.push('桌游夜出现牌或骰子等桌面道具，人物呈围坐、伸手、笑闹的社交姿态。');
  if (task?.key === 'business_coda') notes.push('商务散场偏正式：着装克制、桌面收拾齐整，动作以告别寒暄为主。');
  if (phase?.key === 'arrival') notes.push('刚到场时段以站姿、进门、找座位为主，画面有「刚开始」的动势。');
  if (phase?.key === 'leaving') notes.push('准备离开时段更松弛、桌面可略凌乱，但保持自主判断、绝不表现失控或醉酒。');
  if (space) notes.push(`空间为「${space.labelZh}」，光源与私密度与当前时段和人数彼此匹配。`);
  if (mood) notes.push(`氛围基调「${mood.labelZh}」主导整体情绪，${MOOD_NOTE[mood.key] ?? ''}。`);
  if (ctx.persons >= 4) notes.push(`人数较多时各层仍保持足够差异，避免同批构图重复。`);
  return notes.filter((n) => n.length > 0);
}

/** 供 engine 使用：把可用 key 集合解析成选项对象 */
export function resolvePool(layer: LayerKey, key: string): LayerSelection | undefined {
  const pool =
    layer === 'task' ? TASK_POOL :
    layer === 'phase' ? PHASE_POOL :
    layer === 'space' ? SPACE_POOL :
    layer === 'moment' ? MOMENT_POOL :
    TRACE_POOL;
  const o = byKey(pool as { key: string }[], key) as
    | { key: string; labelZh: string; labelEn: string }
    | undefined;
  return o ? { key: o.key, labelZh: o.labelZh, labelEn: o.labelEn } : undefined;
}