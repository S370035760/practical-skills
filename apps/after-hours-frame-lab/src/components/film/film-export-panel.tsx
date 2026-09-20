'use client';

import { Download, Film, ImageDown, PackageOpen, Pause, Play, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { EXPORT_PROFILES } from '@/lib/film/types';
import type { ExportProfile } from '@/lib/film/types';

interface FilmExportPanelProps {
  readyCount: number;
  totalDuration: number;
  meetsMinDuration: boolean;
  recordingSupported: boolean | null;
  exporting: boolean;
  exportProgress: number;
  exportStage: string;
  shotDuration: number;
  onShotDuration: (s: number) => void;
  onExportVideo: (profile: ExportProfile) => void;
  onExportCover: () => void;
  onExportPackage: () => void;
  onExportKeyframes: () => void;
  onCancel: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  demoMode: boolean;
}

const DURATION_OPTIONS = [8, 9, 10];

export function FilmExportPanel(props: FilmExportPanelProps) {
  const [profileId, setProfileId] = useState<string>('full');
  const profile = EXPORT_PROFILES.find((p) => p.id === profileId) ?? EXPORT_PROFILES[0]!;
  const allReady = props.readyCount === 9;

  return (
    <div className="space-y-4">
      {/* 播放与时长 */}
      <div className="border border-border bg-tray p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.25em] text-[#8a8478]">PREVIEW & DURATION</span>
          <span className="font-mono text-[10px] text-[#6f6a60]">
            6 + 9×{props.shotDuration}s + 6 = <span className="text-paper">{props.totalDuration}s</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={props.onTogglePlay}
            disabled={!allReady}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 border border-paper bg-paper text-xs font-medium text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {props.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {props.playing ? '暂停预览' : '播放预览'}
          </button>
          <div className="flex items-center gap-1">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => props.onShotDuration(d)}
                className={[
                  'h-9 w-12 border font-mono text-[11px] transition-colors',
                  props.shotDuration === d
                    ? 'border-paper text-paper'
                    : 'border-border text-[#8a8478] hover:border-[#4a463c]',
                ].join(' ')}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
        {!props.meetsMinDuration && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-safelight">
            <ShieldAlert className="size-3.5" />
            当前 {props.totalDuration} 秒不足 90 秒，不满足 LibTV 时长门槛，请选 9s / 10s。
          </p>
        )}
      </div>

      {/* 素材状态 */}
      <div className="border border-border bg-tray px-3 py-2 font-mono text-[10px] text-[#8a8478]">
        素材就绪 {props.readyCount}/9{props.demoMode ? ' · DEMO 素材（仅供流程演示，不可直接投稿）' : ''}
        {!allReady && <span className="text-safelight"> · 请先在九宫格页生成或载入演示素材</span>}
      </div>

      {/* 导出 */}
      <div className="border border-border bg-tray p-3">
        <div className="mb-2 font-mono text-[10px] tracking-[0.25em] text-[#8a8478]">EXPORT · 1080×1920</div>

        <div className="mb-3 grid grid-cols-2 gap-1">
          {EXPORT_PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProfileId(p.id)}
              className={[
                'border px-2 py-1.5 text-left text-[11px] transition-colors',
                p.id === profileId ? 'border-paper text-paper' : 'border-border text-[#8a8478] hover:border-[#4a463c]',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>

        {props.exporting ? (
          <div className="space-y-2">
            <div className="h-1 w-full bg-black/40">
              <div className="h-full bg-safelight transition-all" style={{ width: `${props.exportProgress}%` }} />
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] text-[#8a8478]">
              <span>{props.exportStage} … {Math.round(props.exportProgress)}%</span>
              <span>实时录制需 ~{props.totalDuration}s</span>
            </div>
            <button
              type="button"
              onClick={props.onCancel}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 border border-safelight/60 text-xs text-safelight hover:bg-safelight/10"
            >
              取消导出
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={!allReady || props.recordingSupported === false}
              onClick={() => props.onExportVideo(profile)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 border border-paper bg-paper text-xs font-medium text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Film className="size-4" />
              导出竖屏短片 WebM
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!allReady}
                onClick={props.onExportCover}
                className="inline-flex h-9 items-center justify-center gap-1.5 border border-border text-[11px] text-[#d7d1c4] hover:border-[#4a463c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ImageDown className="size-3.5" />
                封面 PNG
              </button>
              <button
                type="button"
                disabled={!allReady || props.recordingSupported === false}
                onClick={props.onExportPackage}
                className="inline-flex h-9 items-center justify-center gap-1.5 border border-border text-[11px] text-[#d7d1c4] hover:border-[#4a463c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PackageOpen className="size-3.5" />
                投稿包 ZIP
              </button>
            </div>
            {props.recordingSupported === false && (
              <button
                type="button"
                disabled={!allReady}
                onClick={props.onExportKeyframes}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 border border-safelight/50 text-[11px] text-safelight hover:bg-safelight/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="size-3.5" />
                当前浏览器不支持录制，导出关键帧 ZIP（降级）
              </button>
            )}
            {props.recordingSupported === false && (
              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[#8a8478]">
                <RefreshCw className="mt-0.5 size-3 shrink-0" />
                推荐最新版 Chrome / Edge 导出 WebM；关键帧 ZIP 可导入剪辑软件按每镜 {props.shotDuration}s 合成。
              </p>
            )}
          </div>
        )}

        <p className="mt-2 text-[10px] leading-relaxed text-[#5d584f]">
          导出为浏览器 MediaRecorder 生成的 WebM（VP9/VP8），无音频；不提供也不会移除任何水印。
        </p>
      </div>
    </div>
  );
}
