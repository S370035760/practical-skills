'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useFilmPlayer } from '@/hooks/use-film-player';
import { FilmTimelineStrip } from './film-timeline';
import { FilmExportPanel } from './film-export-panel';
import { LibChecklist } from './lib-checklist';
import { GatesPanel } from './gates-panel';
import { libRatio } from '@/lib/film/timeline';
import { SUBMISSION_CHECKLIST } from '@/lib/film/script';
import {
  exportFilmWebm,
  exportCoverPng,
  exportSubmissionPackage,
  exportKeyframesZip,
  downloadVideo,
  isRecordingSupported,
  type ExportResult,
  type FilmFrameSource,
} from '@/lib/film/exporter';
import { downloadBlob } from '@/lib/nine-grid/client/compose';
import { EXPORT_PROFILES } from '@/lib/film/types';
import type { ExportProfile } from '@/lib/film/types';
import type { FrameState, ProviderMode } from '@/lib/nine-grid/types';

const LS_LIB = 'apn-lib-replication-v1';
const LS_CHECK = 'apn-submission-check-v1';

function readRecord(key: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

interface FilmStudioProps {
  frames: FrameState[];
  mode: ProviderMode;
  onLoadDemo: () => void;
}

export function FilmStudio({ frames, mode, onLoadDemo }: FilmStudioProps) {
  const [shotDuration, setShotDuration] = useState(9);
  const player = useFilmPlayer({ frames, shotDuration });

  const [recordingSupported, setRecordingSupported] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('preparing');
  const cancelRef = useRef({ aborted: false });

  const [libStatuses, setLibStatuses] = useState<Record<number, boolean>>({});
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRecordingSupported(isRecordingSupported());
    const lib = readRecord(LS_LIB);
    setLibStatuses(
      Object.fromEntries(Object.entries(lib).map(([k, v]) => [Number(k), v] as const)),
    );
    setChecklist(readRecord(LS_CHECK));
  }, []);

  const persistLib = useCallback((next: Record<number, boolean>) => {
    setLibStatuses(next);
    try {
      window.localStorage.setItem(LS_LIB, JSON.stringify(next));
    } catch {
      /* localStorage 不可用时仅保留内存态 */
    }
  }, []);

  const persistCheck = useCallback((next: Record<string, boolean>) => {
    setChecklist(next);
    try {
      window.localStorage.setItem(LS_CHECK, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const sources: FilmFrameSource[] = useMemo(
    () =>
      frames
        .filter((f) => f.status === 'done' && f.image?.url)
        .map((f) => ({ index: f.directive.index, url: f.image!.url })),
    [frames],
  );

  const libDone = useMemo(
    () => Object.values(libStatuses).filter(Boolean).length,
    [libStatuses],
  );
  const ratio = libRatio(libDone);

  const buildOptions = useCallback(
    (profile: ExportProfile) => ({
      sources,
      profile,
      timelineConfig: { introDuration: 6, shotDuration, outroDuration: 6 },
      libGeneratedShots: libDone,
      sourceMode: mode === 'demo' ? ('demo' as const) : ('live' as const),
      aiMark: true,
      signal: cancelRef.current,
      onProgress: (done: number, total: number, stage: string) => {
        setExportStage(stage);
        setExportProgress(Math.round((done / total) * 100));
      },
    }),
    [sources, shotDuration, libDone, mode],
  );

  const handleExportVideo = useCallback(
    async (profile: ExportProfile) => {
      if (sources.length < 9) {
        toast.error('素材不完整', { description: '请先在九宫格中生成 9 张，或载入演示素材。' });
        return;
      }
      setExporting(true);
      setExportProgress(0);
      setExportStage('recording');
      cancelRef.current = { aborted: false };
      try {
        const result: ExportResult = await exportFilmWebm(buildOptions(profile));
        downloadVideo(result);
        toast.success(`已导出 ${result.extension.toUpperCase()} 短片`, {
          description: `${profile.width}×${profile.height} · ${result.durationSec}s · 无音频`,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          toast.info('已取消导出');
        } else {
          toast.error('短片导出失败', {
            description: error instanceof Error ? error.message : '请重试或更换浏览器。',
          });
        }
      } finally {
        setExporting(false);
      }
    },
    [buildOptions, sources.length],
  );

  const handleExportCover = useCallback(async () => {
    try {
      const blob = await exportCoverPng(buildOptions(EXPORT_PROFILES[0]!));
      downloadBlob(blob, 'almost-perfect-nine-cover-1080x1920.png');
      toast.success('已导出 1080×1920 封面 PNG');
    } catch (error) {
      toast.error('封面导出失败', { description: error instanceof Error ? error.message : '请重试' });
    }
  }, [buildOptions]);

  const handleExportPackage = useCallback(async () => {
    if (sources.length < 9) {
      toast.error('素材不完整，无法生成投稿包');
      return;
    }
    setExporting(true);
    setExportProgress(0);
    setExportStage('recording');
    cancelRef.current = { aborted: false };
    try {
      const video = await exportFilmWebm(buildOptions(EXPORT_PROFILES[0]!));
      setExportStage('packaging');
      const zip = await exportSubmissionPackage(buildOptions(EXPORT_PROFILES[0]!), video, libStatuses);
      downloadBlob(zip, 'LibTV-submission-almost-perfect-nine.zip');
      toast.success('投稿包 ZIP 已生成', {
        description: `含 ${video.extension.toUpperCase()} 短片、封面、投稿说明与 LibTV 复刻清单。`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('已取消导出');
      } else {
        toast.error('投稿包生成失败', { description: error instanceof Error ? error.message : '请重试' });
      }
    } finally {
      setExporting(false);
    }
  }, [buildOptions, libStatuses, sources.length]);

  const handleKeyframes = useCallback(async () => {
    try {
      const zip = await exportKeyframesZip(buildOptions(EXPORT_PROFILES[0]!));
      downloadBlob(zip, 'almost-perfect-nine-keyframes.zip');
      toast.success('已导出关键帧 ZIP（降级方案）');
    } catch (error) {
      toast.error('关键帧导出失败', { description: error instanceof Error ? error.message : '请重试' });
    }
  }, [buildOptions]);

  const allReady = sources.length === 9;

  return (
    <div className="space-y-6">
      {!allReady && (
        <div className="flex flex-col gap-3 border border-safelight/40 bg-safelight/10 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-xs leading-relaxed text-safelight">
            短片模式需要 9 张图片作为镜头素材。可先在「九宫格图片」标签生成，或一键载入内置演示素材（不调用 API、不依赖密钥，完整可导出）。
          </p>
          <button
            type="button"
            onClick={onLoadDemo}
            className="inline-flex h-9 shrink-0 items-center gap-2 border border-paper bg-paper px-3 text-xs font-medium text-ink hover:opacity-90"
          >
            <FlaskConical className="size-4" />
            载入演示素材
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 左：预览 + 时间轴 */}
        <div className="space-y-4">
          <div className="border border-border bg-tray p-3">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-[#8a8478]">
              <span>PREVIEW · 9:16 · 1080×1920</span>
              <span className={mode === 'demo' ? 'text-safelight' : 'text-[#6f6a60]'}>
                {mode === 'demo' ? 'DEMO MATERIAL' : 'LIVE OUTPUT'}
              </span>
            </div>
            <div className="mx-auto w-full max-w-[380px] bg-black">
              <canvas
                ref={player.canvasRef}
                width={540}
                height={960}
                className="block aspect-[9/16] w-full"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => (player.playing ? player.pause() : player.play())}
                disabled={!allReady}
                className="inline-flex h-8 items-center gap-1.5 border border-border px-3 text-[11px] text-paper hover:border-[#4a463c] disabled:opacity-40"
              >
                {player.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {player.playing ? '暂停' : '播放'}
              </button>
              {player.loadError && (
                <span className="text-[10px] text-safelight">{player.loadError}</span>
              )}
            </div>
          </div>

          <FilmTimelineStrip
            timeline={player.timeline}
            currentTime={player.currentTime}
            onSeek={player.seek}
          />
        </div>

        {/* 右：导出面板 */}
        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <FilmExportPanel
            readyCount={sources.length}
            totalDuration={player.timeline.totalDuration}
            meetsMinDuration={player.timeline.meetsMinDuration}
            recordingSupported={recordingSupported}
            exporting={exporting}
            exportProgress={exportProgress}
            exportStage={exportStage}
            shotDuration={shotDuration}
            onShotDuration={setShotDuration}
            onExportVideo={(p) => void handleExportVideo(p)}
            onExportCover={() => void handleExportCover()}
            onExportPackage={() => void handleExportPackage()}
            onExportKeyframes={() => void handleKeyframes()}
            onCancel={() => {
              cancelRef.current.aborted = true;
            }}
            playing={player.playing}
            onTogglePlay={() => (player.playing ? player.pause() : player.play())}
            demoMode={mode === 'demo'}
          />
        </aside>
      </div>

      {/* LibTV 复刻清单 */}
      <LibChecklist
        statuses={libStatuses}
        shotDuration={shotDuration}
        onToggle={(index) => persistLib({ ...libStatuses, [index]: !libStatuses[index] })}
      />

      {/* 门槛 + 合规 */}
      <GatesPanel
        meetsMinDuration={player.timeline.meetsMinDuration}
        totalDuration={player.timeline.totalDuration}
        libRatioPercent={ratio.percent}
        libPassed={ratio.passed}
        demoMode={mode === 'demo'}
        checklist={checklist}
        onToggleCheck={(id) => persistCheck({ ...checklist, [id]: !checklist[id] })}
      />

      <p className="font-mono text-[10px] leading-relaxed text-[#5d584f]">
        自检项 {Object.values(checklist).filter(Boolean).length}/{SUBMISSION_CHECKLIST.length}（仅本地记录，不代表已通过活动审核）。
        本地 WebM 不计入「70% 在 LibTV 生成」；请按复刻清单在 LibTV 公开画布重制至少 7 个镜头。
      </p>
    </div>
  );
}
