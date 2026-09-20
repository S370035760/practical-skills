/**
 * Prompt 编译器 —— 纯函数、种子可复现。
 *
 * 把五层模型 + 横向维度 + 着装 + 氛围基调编译成一条可投喂给图像模型的中文+英文
 * 混合叙事指令，末尾固定追加不可移除的安全块。同一种子产生的同一组层选择，
 * 编译结果文本完全一致。
 */
import { MOOD_NOTE, MOMENT_POOL } from './options-data';
import { SAFETY_BLOCK, withSafety } from './safety';
import type { CrossFields, LayerSelection, StoryCard } from './types';

export interface CompileInput {
  layers: Record<'task' | 'phase' | 'space' | 'moment' | 'trace', LayerSelection>;
  cross: CrossFields;
  clothing: string;
  mood: string;
  poseHint?: string;
}

export function compilePrompt(input: CompileInput): string {
  const { layers, cross, clothing, mood } = input;
  const task = layers.task;
  const phase = layers.phase;
  const space = layers.space;
  const moment = layers.moment;
  const trace = layers.trace;

  const moodLine = MOOD_NOTE[mood] ?? '自然平静的夜晚社交氛围';
  const peopleWord = cross.persons === 1 ? '一位成年人' : `${cross.persons} 位成年人`;
  const relationLine = cross.persons === 1 ? '' : `，彼此为${cross.relation}的关系`;
  const poseHintText = MOMENT_POOL.find((m) => m.key === moment.key)?.pose ?? '';

  const body = [
    `《${task.labelZh} · ${phase.labelZh}》${moodLine}。`,
    `在一处${space.labelZh}空间里，${peopleWord}${relationLine}正在发生一场真实自然的都市社交时刻。`,
    `画面中主体是一位约 28 岁的虚构成年东亚女性${cross.persons !== 1 ? '的右侧/侧前方人物' : ''}，${poseHintText}${input.poseHint ? `（${input.poseHint}）` : ''}，动作正在进行、身体语言自然。`,
    `现场${cross.tidiness}；着装：${clothing}。`,
    `空间细节符合「${space.labelEn}」的氛围，光线与触碰的关系服从「${trace.labelEn}」的成像痕迹：${traceRemarks(trace.key)}。`,
    `请按真实纪录影像来拍：画面自然、略带即兴，人物表情生动而不刻意，构图服从${trace.labelZh}。`,
  ].join('\n');

  const enTail = `Documentary street-observation of adult social nightlife; ${trace.labelEn}; ${moment.labelEn}; ${space.labelEn}; ${phase.labelEn}; ${task.labelEn}; natural candid, subtle grain, no text watermark logo.`;

  return withSafety(`${body}\n${enTail}`);
}

function traceRemarks(traceKey: string): string {
  switch (traceKey) {
    case 'phone_1x':
      return '主摄标准焦段、轻微手持、成像均衡';
    case 'phone_wide':
      return '超广角略变大视野、边缘透视加强';
    case 'compact_digital':
      return '消费级数码的轻度噪点与略压缩';
    case 'weak_direct_flash':
      return '弱直闪补光、前景略提亮、光线生硬但不刺眼';
    case 'mixed_wb':
      return '暖钨丝与冷窗光混合、白平衡略有偏差';
    case 'high_iso':
      return '高感光颗粒、暗部噪声可见、氛围更密';
    case 'partial_occlusion':
      return '前景轻微遮挡、主体部分可见、层次更强';
    case 'offcenter':
      return '主体非居中、留白偏一侧、构图松弛';
    case 'soft_flare':
      return '逆光或侧逆光形成柔和光晕、边缘透光';
    case 'digital_zoom':
      return '数码变焦裁切、画质略软、视距拉近';
    default:
      return '自然手摄、光线真实';
  }
}

export function toStoryCard(params: {
  layers: CompileInput['layers'];
  cross: CrossFields;
  clothing: string;
  mood: string;
  seed: number;
  index: number;
  batchSize: number;
  id: string;
  compatibility: string[];
  createdAt: number;
  favorite?: boolean;
}): StoryCard {
  const prompt = compilePrompt({
    layers: params.layers,
    cross: params.cross,
    clothing: params.clothing,
    mood: params.mood,
  });
  return {
    id: params.id,
    seed: params.seed,
    index: params.index,
    batchSize: params.batchSize,
    layers: params.layers,
    cross: params.cross,
    clothing: params.clothing,
    compatibility: params.compatibility,
    prompt,
    safetyBlock: SAFETY_BLOCK,
    createdAt: params.createdAt,
    favorite: params.favorite ?? false,
  };
}