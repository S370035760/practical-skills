/**
 * 指纹生成与最近去重 —— 纯函数。
 *
 * 一张故事卡的指纹由「人物瞬间 + 成像痕迹主镜族 + 时段」三方共同构成。
 * - 连续生成要避开最近 20 组指纹；
 * - 九张同批内主维度（主要动作、主机位、时段）不得重复。
 */

import type { LayerSelection } from './types';

export interface FingerprintParts {
  momentKey: string;
  camFamily: string;
  phaseKey: string;
}

export function makeFingerprint(parts: FingerprintParts): string {
  return `${parts.momentKey}::${parts.camFamily}::${parts.phaseKey}`;
}

export function makeFingerprintParts(
  moment: LayerSelection,
  trace: LayerSelection,
  phase: LayerSelection,
  camFamilyOf: (traceKey: string) => string,
): FingerprintParts {
  return {
    momentKey: moment.key,
    camFamily: camFamilyOf(trace.key),
    phaseKey: phase.key,
  };
}

/** 从一组指纹里取出最近 20 条（保留最晚的）。
 * 诚实地说明：存储按时间追加，越靠前的越新便于前端展示。 */
export function recentN(all: string[], n = 20): string[] {
  return all.slice(0, n);
}

/** 判断一个候选指纹是否与禁止集合冲突 */
export function conflicts(candidate: string, forbidden: Set<string>): boolean {
  return forbidden.has(candidate);
}

/** 判断两指纹是否共享同一主镜位（用于九张去重） */
export function sameCamera(a: FingerprintParts, b: FingerprintParts): boolean {
  return a.camFamily === b.camFamily;
}

/** 判断两指纹是否共享同一时段（用于九张去重） */
export function samePhase(a: FingerprintParts, b: FingerprintParts): boolean {
  return a.phaseKey === b.phaseKey;
}

/** 判断两指纹是否共享同一主要动作（用于九张去重） */
export function sameMoment(a: FingerprintParts, b: FingerprintParts): boolean {
  return a.momentKey === b.momentKey;
}

/**
 * 从候选集里挑出与「现状集合」都不冲突的一个（主动作/主镜位/时段 全局不重复）。
 * 找不到可用返回 undefined，由调用方做降级重试。
 */
export function pickDistinct<T>(
  candidates: T[],
  partsOf: (item: T) => FingerprintParts,
  used: FingerprintParts[],
): T | undefined {
  return candidates.find((item) => {
    const p = partsOf(item);
    return !used.some((u) => sameMoment(u, p) || sameCamera(u, p) || samePhase(u, p));
  });
}