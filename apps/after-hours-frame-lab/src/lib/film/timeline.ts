/**
 * 短片时间轴与 LibTV 比例计算（纯函数，无 DOM 依赖）。
 */
import { FILM_SHOTS } from './script';
import { FILM_MIN_DURATION, LIB_RATIO_REQUIRED } from './types';
import type { TimelineSegment, FilmTimeline } from './types';

export interface TimelineConfig {
  introDuration: number;
  shotDuration: number;
  outroDuration: number;
}

export const DEFAULT_TIMELINE: TimelineConfig = {
  introDuration: 6,
  shotDuration: 9,
  outroDuration: 6,
};

export function buildTimeline(config: TimelineConfig = DEFAULT_TIMELINE): FilmTimeline {
  const segments: TimelineSegment[] = [];
  let cursor = 0;

  segments.push({
    kind: 'intro',
    shotIndex: null,
    start: cursor,
    duration: config.introDuration,
    end: cursor + config.introDuration,
  });
  cursor += config.introDuration;

  FILM_SHOTS.forEach((shot) => {
    segments.push({
      kind: 'shot',
      shotIndex: shot.index,
      start: cursor,
      duration: config.shotDuration,
      end: cursor + config.shotDuration,
    });
    cursor += config.shotDuration;
  });

  segments.push({
    kind: 'outro',
    shotIndex: null,
    start: cursor,
    duration: config.outroDuration,
    end: cursor + config.outroDuration,
  });
  cursor += config.outroDuration;

  return {
    introDuration: config.introDuration,
    shotDuration: config.shotDuration,
    outroDuration: config.outroDuration,
    shotCount: FILM_SHOTS.length,
    totalDuration: cursor,
    segments,
    meetsMinDuration: cursor >= FILM_MIN_DURATION,
  };
}

/** 把任意时间点定位到段落；越界返回 null */
export function segmentAt(timeline: FilmTimeline, time: number): TimelineSegment | null {
  if (time < 0 || time >= timeline.totalDuration) return null;
  return timeline.segments.find((s) => time >= s.start && time < s.end) ?? null;
}

/** mm:ss 格式（支持 >60s） */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * LibTV 生成比例：片头片尾字幕卡不算「平台生成镜头」，分母固定为 9 个内容镜头。
 * 已在 LibTV 生成 ≥ 7/9 即达到 70% 门槛（77.8%）。
 */
export function libRatio(doneShots: number): { done: number; total: number; percent: number; passed: boolean } {
  const total = FILM_SHOTS.length;
  const clamped = Math.max(0, Math.min(total, Math.floor(doneShots)));
  const percent = Math.round((clamped / total) * 100);
  return { done: clamped, total, percent, passed: percent >= LIB_RATIO_REQUIRED };
}

/** 时间轴上各镜头在整段里的进度（0-1），用于绘制时间轴 */
export function segmentProgress(segment: TimelineSegment, time: number): number {
  if (segment.duration <= 0) return 0;
  const p = (time - segment.start) / segment.duration;
  return Math.max(0, Math.min(1, p));
}
