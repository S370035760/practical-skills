'use client';

import { CheckCircle2, Copy, Circle } from 'lucide-react';
import { useState } from 'react';
import { FILM_SHOTS } from '@/lib/film/script';
import { libRatio } from '@/lib/film/timeline';
import { toast } from 'sonner';

interface LibChecklistProps {
  statuses: Record<number, boolean>;
  shotDuration: number;
  onToggle: (index: number) => void;
}

export function LibChecklist({ statuses, shotDuration, onToggle }: LibChecklistProps) {
  const doneCount = FILM_SHOTS.filter((s) => statuses[s.index]).length;
  const ratio = libRatio(doneCount);
  const [copied, setCopied] = useState<number | null>(null);

  const copyPrompt = async (index: number): Promise<void> => {
    const shot = FILM_SHOTS[index];
    if (!shot) return;
    try {
      await navigator.clipboard.writeText(shot.libPrompt);
      setCopied(index);
      toast.success(`镜头 ${index + 1} 提示词已复制`, { description: '可直接粘贴到 LibTV 视频生成输入框。' });
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('复制失败', { description: '浏览器拒绝了剪贴板访问，请手动选择文本。' });
    }
  };

  return (
    <div className="border border-border bg-tray">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.25em] text-[#8a8478]">
          LIBTV CANVAS REPLICATION · 逐镜头复刻
        </span>
        <span
          className={[
            'border px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
            ratio.passed ? 'border-paper/60 text-paper' : 'border-safelight/60 text-safelight',
          ].join(' ')}
        >
          {ratio.done}/{ratio.total} · {ratio.percent}% {ratio.passed ? '· ≥70% 达标' : '· 未达标'}
        </span>
      </div>

      <div className="h-1 w-full bg-black/40">
        <div
          className={ratio.passed ? 'h-full bg-paper transition-all' : 'h-full bg-safelight transition-all'}
          style={{ width: `${ratio.percent}%` }}
        />
      </div>

      <ol className="divide-y divide-border">
        {FILM_SHOTS.map((shot) => {
          const done = !!statuses[shot.index];
          return (
            <li key={shot.accidentId} className="px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggle(shot.index)}
                  className="mt-0.5 shrink-0 text-[#8a8478] transition-colors hover:text-paper"
                  aria-label={done ? '标记为待生成' : '标记为已在 LibTV 生成'}
                >
                  {done ? <CheckCircle2 className="size-4 text-paper" /> : <Circle className="size-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[10px] text-[#6f6a60]">
                      {String(shot.index + 1).padStart(2, '0')}/09 · {shotDuration}s
                    </span>
                    <span className="text-xs font-medium text-paper">{shot.accidentLabelZh}</span>
                    <span className="font-mono text-[9px] uppercase text-[#5d584f]">
                      {shot.accidentLabelEn}
                    </span>
                    <span
                      className={[
                        'ml-auto border px-1 py-px font-mono text-[9px]',
                        done
                          ? 'border-paper/50 text-paper'
                          : 'border-safelight/50 text-safelight',
                      ].join(' ')}
                    >
                      {done ? '已在 LibTV 生成' : '待在 LibTV 生成'}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#8a8478]">
                    {shot.libPrompt}
                  </p>
                  <p className="mt-1 text-[10px] text-[#5d584f]">参考图：{shot.referenceUsage}</p>
                  <button
                    type="button"
                    onClick={() => void copyPrompt(shot.index)}
                    className="mt-1.5 inline-flex items-center gap-1 border border-border px-1.5 py-0.5 font-mono text-[10px] text-[#b7b0a3] transition-colors hover:border-[#4a463c] hover:text-paper"
                  >
                    <Copy className="size-3" />
                    {copied === shot.index ? '已复制' : '复制 LibTV 提示词'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
