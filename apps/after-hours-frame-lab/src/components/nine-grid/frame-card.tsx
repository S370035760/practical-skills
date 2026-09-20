'use client';

import { RefreshCw, AlertTriangle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FrameState } from '@/lib/nine-grid/types';

interface FrameCardProps {
  frame: FrameState;
  running: boolean;
  onRegenerate: (index: number) => void;
}

const STATUS_TEXT: Record<FrameState['status'], string> = {
  idle: 'EMPTY',
  queued: 'QUEUED',
  generating: 'EXPOSING',
  done: 'FIXED',
  error: 'ERROR',
};

export function FrameCard({ frame, running, onRegenerate }: FrameCardProps) {
  const { directive, status, image, errorMessage } = frame;
  const num = String(directive.index + 1).padStart(2, '0');
  const busy = status === 'generating' || status === 'queued';

  return (
    <div
      className={cn(
        'group relative aspect-[9/16] overflow-hidden rounded-[3px] border bg-paper',
        status === 'error' ? 'border-safelight' : 'border-black/60',
      )}
    >
      {/* 图片层 */}
      {status === 'done' && image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={`${num} ${directive.labelZh}`}
          className={cn(
            'absolute inset-0 h-full w-full object-cover',
            busy && 'opacity-40',
          )}
          style={{ objectPosition: `${directive.focal.x * 100}% ${directive.focal.y * 100}%` }}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            'empty-paper absolute inset-0',
            busy && 'scanline overflow-hidden',
          )}
        />
      )}

      {/* 生成中遮罩 */}
      {busy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <RefreshCw className="size-4 animate-spin text-safelight" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-safelight">
            {STATUS_TEXT[status]}
          </span>
        </div>
      )}

      {/* 错误遮罩 */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-room/85 px-2 text-center">
          <AlertTriangle className="size-4 text-safelight" />
          <span className="font-mono text-[10px] tracking-widest text-safelight">
            FRAME {num} FAILED
          </span>
          <span className="line-clamp-3 text-[10px] leading-relaxed text-[#c9c2b4]">
            {errorMessage ?? '生成失败'}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="mt-1 h-7 border-safelight/60 px-2 text-[11px] text-safelight hover:bg-safelight/10 hover:text-safelight"
            onClick={() => onRegenerate(directive.index)}
          >
            <RefreshCw className="size-3" />
            重试该格
          </Button>
        </div>
      )}

      {/* DEMO 角标：仅 UI，不进导出 */}
      {status === 'done' && image?.mode === 'demo' && (
        <span className="absolute left-1 top-1 border border-safelight/70 bg-room/80 px-1 py-[1px] font-mono text-[8px] tracking-[0.25em] text-safelight">
          DEMO
        </span>
      )}

      {/* 编号 + 失败类型信息条：仅 UI，不进导出 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-1.5 pb-1 pt-5">
        <div className="min-w-0">
          <div className="font-mono text-[9px] leading-none text-white/55">{num} / 09</div>
          <div className="truncate text-[10px] font-medium leading-tight text-white/95">
            {directive.labelZh}
          </div>
        </div>
        <span className="hidden font-mono text-[7px] uppercase leading-tight tracking-wider text-white/60 min-[380px]:block">
          {directive.labelEn}
        </span>
      </div>

      {/* 重拍该格：桌面悬停显现，触屏常显半透明；仅 UI，不进导出 */}
      {status === 'done' && !running && (
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label={`重生成第 ${Number(num)} 格`}
          className="absolute right-1 top-1 size-7 bg-black/65 text-white opacity-70 backdrop-blur-sm transition-opacity hover:bg-black/85 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          onClick={() => onRegenerate(directive.index)}
          title="仅重生成该格（保留其他 8 格）"
        >
          <RefreshCw className="size-3" />
        </Button>
      )}
      {status === 'idle' && !running && (
        <div className="absolute right-1 top-1 text-white/35">
          <Ban className="size-3" />
        </div>
      )}
    </div>
  );
}
