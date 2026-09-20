'use client';

import { FILM_SHOTS } from '@/lib/film/script';
import { formatTimecode } from '@/lib/film/timeline';
import type { FilmTimeline, TimelineSegment } from '@/lib/film/types';

interface FilmTimelineStripProps {
  timeline: FilmTimeline;
  currentTime: number;
  onSeek: (t: number) => void;
}

const ACCENT: Record<string, string> = {
  intro: 'border-[#6f6a60] text-[#8a8478]',
  outro: 'border-[#6f6a60] text-[#8a8478]',
  shot: 'border-[#3a362e] text-[#b7b0a3]',
};

export function FilmTimelineStrip({ timeline, currentTime, onSeek }: FilmTimelineStripProps) {
  const pct = (s: TimelineSegment): number => (s.duration / timeline.totalDuration) * 100;
  const isActive = (s: TimelineSegment): boolean =>
    currentTime >= s.start && currentTime < s.end;

  return (
    <div className="border border-border bg-tray">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 font-mono text-[10px] tracking-[0.25em] text-[#6f6a60]">
        <span>TIMELINE · {timeline.totalDuration}s</span>
        <span className={timeline.meetsMinDuration ? 'text-paper' : 'text-safelight'}>
          {timeline.meetsMinDuration ? 'MEETS ≥90s' : `<90s 不满足门槛`}
        </span>
      </div>

      <div className="flex h-16 w-full">
        {timeline.segments.map((seg, i) => {
          const label =
            seg.kind === 'intro'
              ? '片头'
              : seg.kind === 'outro'
                ? '片尾'
                : `${String((seg.shotIndex ?? 0) + 1).padStart(2, '0')}`;
          const shot = seg.kind === 'shot' ? FILM_SHOTS[seg.shotIndex ?? -1] : null;
          return (
            <button
              key={`${seg.kind}-${i}`}
              type="button"
              onClick={() => onSeek(seg.start + 0.05)}
              style={{ width: `${pct(seg)}%` }}
              className={[
                'group relative h-full shrink-0 border-r border-black/60 px-1 pt-1.5 text-left transition-colors',
                isActive(seg) ? 'bg-safelight/20' : 'hover:bg-white/5',
                ACCENT[seg.kind],
              ].join(' ')}
              title={shot ? `${shot.accidentLabelZh} / ${shot.accidentLabelEn}` : label}
            >
              <span className="block font-mono text-[10px] leading-none">{label}</span>
              {shot && (
                <span className="mt-1 block truncate font-sans text-[9px] leading-tight text-[#6f6a60]">
                  {shot.accidentLabelZh}
                </span>
              )}
              <span className="absolute bottom-1 left-1 font-mono text-[8px] text-[#5d584f]">
                {seg.duration}s
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-border px-3 py-2">
        <input
          type="range"
          min={0}
          max={timeline.totalDuration}
          step={0.1}
          value={Math.min(currentTime, timeline.totalDuration)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="film-range h-1 flex-1"
          aria-label="播放进度"
        />
        <span className="font-mono text-[10px] tabular-nums text-[#8a8478]">
          {formatTimecode(currentTime)} / {formatTimecode(timeline.totalDuration)}
        </span>
      </div>
    </div>
  );
}
