/**
 * 浏览器端短片导出：
 * - 实时驱动 renderFrame()，canvas.captureStream + MediaRecorder 录制 WebM；
 * - 能力探测 / 缺失素材 / 编码不支持 / 中途失败均显式报错，不伪造成功；
 * - 同时支持封面 PNG 与「投稿包 ZIP」（WebM + 封面 + 投稿说明 + 复刻清单）。
 */
import JSZip from 'jszip';
import { buildTimeline, type TimelineConfig } from './timeline';
import { buildSubmissionReadme, safeFileName } from './package-docs';
import { FILM_SHOTS } from './script';
import { EXPORT_PROFILES, type ExportProfile } from './types';
import type { FilmTimeline, SubmissionPackageMeta } from './types';
import type { RenderImage } from './renderer';
import { downloadBlob } from '@/lib/nine-grid/client/compose';

// 渲染/图片加载依赖浏览器 Canvas：仅在真正导出时动态加载，保证本模块的
// 纯函数（能力探测、缺失素材判定）可在 Node 下被单测直接引用。
async function loadBrowserDeps(): Promise<{
  renderFrame: typeof import('./renderer').renderFrame;
  renderCover: typeof import('./renderer').renderCover;
  loadImage: (url: string) => Promise<HTMLImageElement>;
  canvasToBlob: (canvas: HTMLCanvasElement, type: string) => Promise<Blob>;
}> {
  const [renderer, compose] = await Promise.all([import('./renderer'), import('@/lib/nine-grid/client/compose')]);
  return {
    renderFrame: renderer.renderFrame,
    renderCover: renderer.renderCover,
    loadImage: compose.loadImage,
    canvasToBlob: compose.canvasToBlob,
  };
}

export interface FilmFrameSource {
  index: number;
  url: string;
}

export interface ExportOptions {
  sources: FilmFrameSource[];
  profile: ExportProfile;
  timelineConfig: TimelineConfig;
  /** 0-9，已在 LibTV 生成的镜头数 */
  libGeneratedShots: number;
  sourceMode: 'demo' | 'live';
  aiMark?: boolean;
  /** 测试用：覆盖 requestAnimationFrame/时钟 */
  onProgress?: (done: number, total: number, stage: string) => void;
  signal?: { aborted: boolean };
}

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  durationSec: number;
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickMimeType() !== null
  );
}

export function supportedMimeTypes(): string[] {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return [];
  }
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];
  return candidates.filter((c) => {
    try {
      return MediaRecorder.isTypeSupported(c);
    } catch {
      return false;
    }
  });
}

function pickMimeType(): string | null {
  return supportedMimeTypes()[0] ?? null;
}

export function missingFrameIndexes(sources: FilmFrameSource[]): number[] {
  const have = new Set(sources.filter((s) => s.url).map((s) => s.index));
  return FILM_SHOTS.map((s) => s.index).filter((i) => !have.has(i));
}

async function loadAllImages(sources: FilmFrameSource[]): Promise<RenderImage[]> {
  const { loadImage } = await loadBrowserDeps();
  const images: RenderImage[] = [];
  const failures: number[] = [];
  await Promise.all(
    sources.map(async (source) => {
      try {
        const img = await loadImage(source.url);
        images.push({ index: source.index, img });
      } catch {
        failures.push(source.index);
      }
    }),
  );
  if (failures.length > 0) {
    throw new Error(`以下镜头图片加载失败：${failures.map((i) => i + 1).join('、')}。请重新生成或改用演示素材。`);
  }
  return images.sort((a, b) => a.index - b.index);
}

function waitFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame((ts) => resolve(ts)));
}

/**
 * 录制整片。实时录制（不跳帧），保证 WebM 时长与时间轴一致。
 * 约 93 秒，30fps；以真实墙上时钟推进，避免定时器漂移导致时长不足。
 */
export async function exportFilmWebm(options: ExportOptions): Promise<ExportResult> {
  if (!isRecordingSupported()) {
    throw new Error('当前浏览器不支持 MediaRecorder 录制 WebM，可改用「导出关键帧 ZIP」降级，或使用最新版 Chrome / Edge。');
  }
  const missing = missingFrameIndexes(options.sources);
  if (missing.length > 0) {
    throw new Error(`素材不完整，缺第 ${missing.map((i) => i + 1).join('、')} 镜，请补齐九宫格或使用演示素材。`);
  }

  const timeline = buildTimeline(options.timelineConfig);
  const images = await loadAllImages(options.sources);
  const { renderFrame } = await loadBrowserDeps();
  const canvas = document.createElement('canvas');
  canvas.width = options.profile.width;
  canvas.height = options.profile.height;

  const stream = canvas.captureStream(30);
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error('未找到可用的 WebM 编码。');
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: options.profile.bitrateKbps * 1000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const renderInput = {
    timeline,
    images,
    aiMark: options.aiMark ?? true,
    showTimecode: false,
  };

  recorder.start(250);
  const startWall = performance.now();
  const totalMs = timeline.totalDuration * 1000;
  options.onProgress?.(0, timeline.totalDuration, 'recording');

  try {
    // 先画首帧，确保录制器拿到数据
    renderFrame(canvas, renderInput, 0);
    await waitFrame();

    while (true) {
      if (options.signal?.aborted) {
        throw new DOMException('用户取消导出', 'AbortError');
      }
      await waitFrame();
      const elapsed = performance.now() - startWall;
      const t = Math.min(elapsed / 1000, timeline.totalDuration - 1 / 30);
      renderFrame(canvas, renderInput, t);
      options.onProgress?.(Math.min(timeline.totalDuration, elapsed / 1000), timeline.totalDuration, 'recording');
      if (elapsed >= totalMs) break;
    }
  } catch (error) {
    if (recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  options.onProgress?.(timeline.totalDuration, timeline.totalDuration, 'finalizing');

  const blob = new Blob(chunks, { type: mimeType });
  if (blob.size < 10 * 1024) {
    throw new Error('导出的视频体积异常小，录制可能失败，请重试或更换浏览器。');
  }
  return { blob, mimeType, extension, durationSec: timeline.totalDuration };
}

/** 生成 1080×1920 封面 PNG Blob */
export async function exportCoverPng(options: ExportOptions): Promise<Blob> {
  const missing = missingFrameIndexes(options.sources);
  if (missing.length > 0) {
    throw new Error(`封面需要第 1 镜素材，当前缺失：${missing.map((i) => i + 1).join('、')}`);
  }
  const images = await loadAllImages(options.sources);
  const { renderCover, canvasToBlob } = await loadBrowserDeps();
  const profile = EXPORT_PROFILES[0];
  const canvas = document.createElement('canvas');
  canvas.width = profile.width;
  canvas.height = profile.height;
  renderCover(canvas, { timeline: buildTimeline(options.timelineConfig), images, aiMark: options.aiMark ?? true });
  return canvasToBlob(canvas, 'image/png');
}

/** 降级导出：每镜 3 个关键时刻 + 片头片尾关键帧 PNG 打包，附播放说明 */
export async function exportKeyframesZip(options: ExportOptions): Promise<Blob> {
  const images = await loadAllImages(options.sources);
  const { renderFrame, canvasToBlob } = await loadBrowserDeps();
  const timeline = buildTimeline(options.timelineConfig);
  const profile = EXPORT_PROFILES[0];
  const canvas = document.createElement('canvas');
  canvas.width = profile.width;
  canvas.height = profile.height;
  const input = { timeline, images, aiMark: options.aiMark ?? true };
  const zip = new JSZip();
  const frames = zip.folder('keyframes');
  if (!frames) throw new Error('无法创建压缩包目录');

  const stamps: { t: number; name: string }[] = [];
  stamps.push({ t: timeline.segments[0]!.start + 1, name: '00-intro' });
  timeline.segments
    .filter((s) => s.kind === 'shot')
    .forEach((s) => {
      stamps.push({ t: s.start + s.duration * 0.5, name: `shot-${String((s.shotIndex ?? 0) + 1).padStart(2, '0')}` });
    });
  const outro = timeline.segments[timeline.segments.length - 1];
  if (outro) stamps.push({ t: outro.start + 2, name: '99-outro' });

  for (const stamp of stamps) {
    renderFrame(canvas, input, stamp.t);
    const blob = await canvasToBlob(canvas, 'image/png');
    frames.file(`${stamp.name}.png`, blob);
  }
  frames.file(
    'README-降级说明.txt',
    [
      '当前浏览器不支持 MediaRecorder，已导出关键帧 PNG 作为降级方案。',
      '这些关键帧覆盖片头、9 个镜头中点与片尾；可导入剪映/PR 按每镜 9 秒配 Ken Burns 运镜合成。',
      '推荐使用最新版 Chrome / Edge 直接导出 WebM。',
    ].join('\n'),
  );
  return zip.generateAsync({ type: 'blob' });
}

/** 完整投稿包：WebM + 封面 + 投稿说明 + LibTV 复刻清单 */
export async function exportSubmissionPackage(
  options: ExportOptions,
  video: ExportResult,
  libStatuses: Record<number, boolean>,
): Promise<Blob> {
  const timeline: FilmTimeline = buildTimeline(options.timelineConfig);
  const cover = await exportCoverPng(options);
  const zip = new JSZip();
  zip.file(`almost-perfect-nine.${video.extension}`, video.blob);
  zip.file('cover-1080x1920.png', cover);

  const doneCount = Object.values(libStatuses).filter(Boolean).length;
  const meta: SubmissionPackageMeta = {
    title: '她本来可以拍出9张神图，但朋友一次都没拍好',
    synopsis:
      '白色公寓里，状态极佳的模特准备了九次封神瞬间，按快门的朋友却次次失手：糊片、眨眼、裁切、过曝、失焦、端歪、仰拍、太远、手挡镜头，最终凑成一张可爱好笑的废片接触表。',
    statement:
      '全片角色为明确成年的虚构东亚女性，时尚人像、全程着装、非露骨，不使用真实私人影像；图像由 AI 逐格生成并在浏览器本地合成动态短片，无付费服务、无版权音乐，保留 AI 生成标识。',
    tags: ['LibTV', 'AI短片', '竖屏', '轻喜剧', '摄影废片', 'CCD', '接触表', 'AIGC'],
    totalDuration: timeline.totalDuration,
    shotDuration: timeline.shotDuration,
    resolution: `${options.profile.width}x${options.profile.height}`,
    format: video.extension.toUpperCase(),
    audio: '无音频（无版权音乐；如需配乐请自行添加可商用免版税音乐）',
    sourceMode: options.sourceMode,
    libGeneratedShots: doneCount,
    totalShots: FILM_SHOTS.length,
    ratioPercent: Math.round((doneCount / FILM_SHOTS.length) * 100),
  };
  zip.file('投稿说明 README.txt', buildSubmissionReadme(meta));

  const lines: string[] = [
    '# LibTV 画布复刻清单（逐镜头可粘贴提示词）',
    '',
    `在 LibTV 公开画布逐镜生成，每个镜头 ${timeline.shotDuration} 秒；至少完成 7/9 才满足 70% 规则。`,
    '',
  ];
  FILM_SHOTS.forEach((shot) => {
    const done = libStatuses[shot.index] ? '已在 LibTV 生成' : '待在 LibTV 生成';
    lines.push(
      `## 镜头 ${shot.index + 1} / 09 · ${shot.accidentLabelZh}（${shot.accidentLabelEn}）`,
      `- 状态：${done}`,
      `- 时长：${timeline.shotDuration} 秒`,
      `- 参考图用途：${shot.referenceUsage}`,
      `- 失败原因（每镜仅一个）：${shot.accidentLabelZh}`,
      '- LibTV 视频生成提示词：',
      shot.libPrompt,
      '',
    );
  });
  zip.file('LibTV画布复刻清单.md', lines.join('\n'));

  return zip.generateAsync({ type: 'blob' });
}

export function downloadVideo(video: ExportResult): void {
  downloadBlob(video.blob, `almost-perfect-nine-film-${Date.now()}.${video.extension}`);
}

export function fileNameBase(): string {
  return safeFileName('almost-perfect-nine');
}
