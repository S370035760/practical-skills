'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FILM_SHOTS } from '@/lib/film/script';
import { buildTimeline, segmentAt, DEFAULT_TIMELINE, type TimelineConfig } from '@/lib/film/timeline';
import { renderFrame, type RenderImage } from '@/lib/film/renderer';
import { loadImage } from '@/lib/nine-grid/client/compose';
import type { FrameState } from '@/lib/nine-grid/types';

export interface UseFilmPlayerArgs {
  frames: FrameState[];
  shotDuration: number;
}

interface Loaded {
  images: RenderImage[];
  missing: number[];
}

export function useFilmPlayer({ frames, shotDuration }: UseFilmPlayerArgs) {
  const timelineConfig: TimelineConfig = useMemo(
    () => ({ ...DEFAULT_TIMELINE, shotDuration }),
    [shotDuration],
  );
  const timeline = useMemo(() => buildTimeline(timelineConfig), [timelineConfig]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startWallRef = useRef(0);
  const baseTimeRef = useRef(0);
  const imagesRef = useRef<RenderImage[]>([]);

  const [loaded, setLoaded] = useState<Loaded>({ images: [], missing: FILM_SHOTS.map((s) => s.index) });
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 加载 9 张素材为可绘制 Image（同源 /demo 与媒体代理均允许 canvas）
  useEffect(() => {
    let cancelled = false;
    const sources = frames
      .filter((f) => f.status === 'done' && f.image?.url)
      .map((f) => ({ index: f.directive.index, url: f.image!.url }));
    const have = new Set(sources.map((s) => s.index));
    const missing = FILM_SHOTS.map((s) => s.index).filter((i) => !have.has(i));

    if (sources.length === 0) {
      imagesRef.current = [];
      setLoaded({ images: [], missing });
      setLoadError(null);
      return;
    }

    void Promise.all(
      sources.map(async (s) => {
        try {
          const img = await loadImage(s.url);
          return { index: s.index, img } satisfies RenderImage;
        } catch {
          return { index: s.index, failed: true } as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const images = results
        .filter((r): r is RenderImage => !('failed' in r))
        .sort((a, b) => a.index - b.index);
      imagesRef.current = images;
      const failedIdx = results.filter((r) => 'failed' in r).map((r) => r.index);
      setLoaded({ images, missing: [...missing, ...failedIdx] });
      setLoadError(
        failedIdx.length > 0
          ? `部分图片加载失败：${failedIdx.map((i) => i + 1).join('、')}，将显示缺失占位。`
          : null,
      );
      // 首帧
      const canvas = canvasRef.current;
      if (canvas) renderFrame(canvas, { timeline, images }, 0);
    });

    return () => {
      cancelled = true;
    };
  }, [frames, timeline]);

  const paint = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderFrame(canvas, { timeline, images: imagesRef.current, aiMark: true, showTimecode: true }, t);
  }, [timeline]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(function tickNext() {
    const elapsed = (performance.now() - startWallRef.current) / 1000;
    const t = baseTimeRef.current + elapsed;
    if (t >= timeline.totalDuration) {
      setCurrentTime(timeline.totalDuration);
      paint(timeline.totalDuration - 0.001);
      setPlaying(false);
      rafRef.current = null;
      return;
    }
    setCurrentTime(t);
    paint(t);
    rafRef.current = requestAnimationFrame(tickNext);
  }, [paint, timeline.totalDuration]);

  const play = useCallback(() => {
    if (loaded.missing.length === 9) return;
    const startAt = currentTime >= timeline.totalDuration ? 0 : currentTime;
    baseTimeRef.current = startAt;
    startWallRef.current = performance.now();
    setCurrentTime(startAt);
    setPlaying(true);
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
  }, [currentTime, loaded.missing.length, stopLoop, tick, timeline.totalDuration]);

  const pause = useCallback(() => {
    stopLoop();
    setPlaying(false);
  }, [stopLoop]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(timeline.totalDuration - 0.001, t));
      baseTimeRef.current = clamped;
      startWallRef.current = performance.now();
      setCurrentTime(clamped);
      paint(clamped);
    },
    [paint, timeline.totalDuration],
  );

  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  // 时长方案改变后回到起点
  useEffect(() => {
    stopLoop();
    setPlaying(false);
    setCurrentTime(0);
    paint(0);
  }, [timeline, paint, stopLoop]);

  const activeSegment = useMemo(() => segmentAt(timeline, currentTime), [timeline, currentTime]);

  return {
    canvasRef,
    timeline,
    currentTime,
    playing,
    activeSegment,
    readyCount: loaded.images.length,
    missing: loaded.missing,
    loadError,
    play,
    pause,
    seek,
  };
}
