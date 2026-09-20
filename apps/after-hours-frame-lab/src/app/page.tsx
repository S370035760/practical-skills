'use client';

import { useMemo, useState } from 'react';
import { Aperture, AlertTriangle, Clapperboard, Grid3X3, MoonStar } from 'lucide-react';
import { useNineGridGenerator } from '@/hooks/use-nine-grid-generator';
import { ControlPanel } from '@/components/nine-grid/control-panel';
import { FrameCard } from '@/components/nine-grid/frame-card';
import { FilmStudio } from '@/components/film/film-studio';
import { AfterHoursStudio } from '@/components/after-hours/after-hours-studio';
import {
  composeContactSheet,
  canvasToBlob,
  downloadBlob,
  downloadSingleImagesZip,
  type LoadableFrame,
} from '@/lib/nine-grid/client/compose';
import { toast, Toaster } from 'sonner';

type AppTab = 'grid' | 'film' | 'afhl';

export default function Home() {
  const g = useNineGridGenerator();
  const [tab, setTab] = useState<AppTab>('grid');
  const [gap, setGap] = useState(0);
  const [exporting, setExporting] = useState(false);

  const readyFrames = useMemo(
    () => g.frames.filter((f) => f.status === 'done' && f.image),
    [g.frames],
  );

  const loadable: LoadableFrame[] = useMemo(
    () =>
      g.frames.map((f) => ({
        url: f.image?.url ?? '',
        focal: f.directive.focal,
      })),
    [g.frames],
  );

  const handleDownloadSheet = async (): Promise<void> => {
    if (readyFrames.length < 9) {
      toast.error(`尚有 ${9 - readyFrames.length} 格未完成`, {
        description: '请等九格全部成像后再导出整组接触表。',
      });
      return;
    }
    setExporting(true);
    try {
      const { canvas } = await composeContactSheet(loadable, gap);
      const blob = await canvasToBlob(canvas, 'image/png');
      downloadBlob(blob, `almost-perfect-nine-${Date.now()}.png`);
      toast.success('已导出 1080×1920 PNG', {
        description: g.options.mode === 'demo' ? '当前为 DEMO 素材导出。' : '导出图不含任何编号、标签或 UI。',
      });
    } catch (error) {
      toast.error('导出失败', {
        description: error instanceof Error ? error.message : '请重试',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadZip = async (): Promise<void> => {
    if (readyFrames.length === 0) {
      toast.error('还没有可导出的单图');
      return;
    }
    setExporting(true);
    try {
      await downloadSingleImagesZip(g.frames);
      toast.success(`已打包 ${readyFrames.length} 张 1080×1920 PNG`);
    } catch (error) {
      toast.error('打包失败', {
        description: error instanceof Error ? error.message : '请重试',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-room text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        {/* 标题（仅经典模式展示） */}
        {tab !== 'afhl' && (
          <header className="mb-6 border-b border-border pb-6">
            <div className="flex items-center gap-2.5">
              <Aperture className="size-5 text-safelight" />
              <span className="font-mono text-[10px] tracking-[0.35em] text-[#8a8478]">
                CONTACT SHEET / 9:16 / 1080×1920
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
              九宫格废片写真生成器
            </h1>
            <p className="mt-1 font-mono text-xs tracking-[0.2em] text-[#6f6a60]">
              ALMOST PERFECT NINE · LIBTV EDITION
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#9a948a]">
              同一位明确成年的虚构东亚女性、同一套衣服、同一间白色公寓：九张独立成像，
              每格只承载一种「差一点封神」的摄影事故。可导出九宫格接触表，也可把九次翻车串成一部 93 秒竖屏短片投稿版。
            </p>
          </header>
        )}

        {/* 模式 Tab */}
        <div className={`mb-8 inline-flex border ${tab === 'afhl' ? 'border-[rgba(216,169,78,0.35)] rounded-full overflow-hidden' : 'border-border'}`}>
          <button
            type="button"
            onClick={() => setTab('grid')}
            className={[
              'inline-flex h-10 items-center gap-2 px-4 text-xs font-medium transition-colors',
              tab === 'grid' ? 'bg-paper text-ink' : 'text-[#b7b0a3] hover:bg-white/5',
            ].join(' ')}
          >
            <Grid3X3 className="size-4" />
            九宫格图片
          </button>
          <button
            type="button"
            onClick={() => setTab('film')}
            className={[
              'inline-flex h-10 items-center gap-2 border-l border-border px-4 text-xs font-medium transition-colors',
              tab === 'film'
                ? 'bg-safelight text-paper'
                : 'text-[#b7b0a3] hover:bg-white/5',
            ].join(' ')}
          >
            <Clapperboard className="size-4" />
            短片投稿模式 · LibTV
          </button>
          <button
            type="button"
            onClick={() => setTab('afhl')}
            className={[
              'inline-flex h-10 items-center gap-2 border-l border-border px-4 text-xs font-medium transition-colors',
              tab === 'afhl'
                ? 'bg-[#d8a94e] text-[#0a1526]'
                : 'text-[#b7b0a3] hover:bg-white/5',
            ].join(' ')}
          >
            <MoonStar className="size-4" />
            夜幕抓拍实验室
          </button>
        </div>

        {tab === 'grid' ? (
          <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
            {/* 左：控制面板 */}
            <section className="lg:sticky lg:top-8 lg:self-start">
              <ControlPanel
                capabilities={g.capabilities}
                options={g.options}
                running={g.running}
                online={g.online}
                anchorStatus={g.anchorStatus}
                progress={g.progress}
                onOptions={g.setOptions}
                onStyle={g.patchStyle}
                onMode={g.switchMode}
                onGenerate={g.generateAll}
                onCancel={g.cancelAll}
                onReset={g.resetAll}
                onDownloadSheet={() => void handleDownloadSheet()}
                onDownloadZip={() => void handleDownloadZip()}
                exporting={exporting}
                readyCount={readyFrames.length}
                gap={gap}
                onGapChange={setGap}
              />
            </section>

            {/* 右：九格接触表 */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.3em] text-[#6f6a60]">
                  FRAME ORDER · TOP-LEFT → BOTTOM-RIGHT
                </span>
                <span
                  className={
                    g.options.mode === 'demo'
                      ? 'border border-safelight/70 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.25em] text-safelight'
                      : 'border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.25em] text-[#8a8478]'
                  }
                >
                  {g.options.mode === 'demo' ? 'DEMO MATERIAL' : 'LIVE OUTPUT'}
                </span>
              </div>

              <div
                className="grid grid-cols-3 bg-paper p-1 shadow-2xl shadow-black/60"
                style={{ gap: `${gap}px`, padding: gap > 0 ? `${gap}px` : '4px' }}
              >
                {g.frames.map((frame) => (
                  <FrameCard
                    key={frame.directive.id}
                    frame={frame}
                    running={g.running}
                    onRegenerate={g.regenerateOne}
                  />
                ))}
              </div>

              {/* 图例 */}
              <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {g.frames.map((frame) => (
                  <div
                    key={`legend-${frame.directive.id}`}
                    className="flex items-baseline gap-2 font-mono text-[10px] text-[#6f6a60]"
                  >
                    <span className="text-[#8a8478]">
                      {String(frame.directive.index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[#b7b0a3]">{frame.directive.labelEn}</span>
                    <span className="text-[#5d584f]">/ {frame.directive.labelZh}</span>
                  </div>
                ))}
              </div>

              {g.progress.error > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-safelight/50 bg-safelight/10 px-3 py-2 text-xs text-safelight">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {g.progress.error} 格生成失败，其余格子不受影响。可点击失败格中的「重试该格」，或悬停已完成格单独重拍。
                  </span>
                </div>
              )}
            </section>
          </div>
        ) : tab === 'film' ? (
          <FilmStudio frames={g.frames} mode={g.options.mode} onLoadDemo={g.loadDemo} />
        ) : (
          <AfterHoursStudio />
        )}

        {tab !== 'afhl' && (
          <footer className="mt-12 border-t border-border pt-4 font-mono text-[10px] leading-relaxed tracking-wider text-[#5d584f]">
            所有人物均为明确成年（22–27 岁）的虚构角色；画面为时尚人像、非露骨内容。
            九宫格导出严格 1080×1920、不含编号/标签/UI；短片导出保留 AI GENERATED 标识，不提供去水印。
          </footer>
        )}
      </div>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#1b1a17',
            border: '1px solid #2f2c25',
            color: '#ece8df',
            fontSize: '12px',
          },
        }}
      />
    </main>
  );
}
