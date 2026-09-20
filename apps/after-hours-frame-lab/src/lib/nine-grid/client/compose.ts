/**
 * 前端拼合与导出（仅浏览器使用）。
 * 输出画布严格 1080x1920，不烧录任何文字/编号/角标。
 */
import JSZip from 'jszip';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  computeCoverRect,
  computeGridGeometry,
  type CellRect,
} from '../geometry';
import type { FrameState } from '../types';

const LOAD_TIMEOUT_MS = 45_000;

export interface LoadableFrame {
  url: string;
  focal: { x: number; y: number };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      reject(new Error('IMAGE_LOAD_TIMEOUT'));
    }, LOAD_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('IMAGE_LOAD_FAILED'));
    };
    img.src = url;
  });
}

/** 在目标矩形内按 cover + focal 绘制一张图 */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: Pick<CellRect, 'x' | 'y' | 'w' | 'h'>,
  focal: { x: number; y: number },
): void {
  const sW = img.naturalWidth || img.width;
  const sH = img.naturalHeight || img.height;
  const cover = computeCoverRect({
    sW,
    sH,
    dW: rect.w,
    dH: rect.h,
    focal,
  });
  ctx.drawImage(
    img,
    cover.sx,
    cover.sy,
    cover.sw,
    cover.sh,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
  );
}

export interface ComposeResult {
  canvas: HTMLCanvasElement;
  geometry: ReturnType<typeof computeGridGeometry>;
}

/**
 * 将 9 格拼为 1080x1920 接触表。
 * @param frames 长度必须为 9，且每格需有可用 url
 * @param seamGap 白缝像素，0 无缝
 */
export async function composeContactSheet(
  frames: LoadableFrame[],
  seamGap = 0,
): Promise<ComposeResult> {
  if (frames.length !== 9) {
    throw new Error(`EXPECT_9_FRAMES_GOT_${frames.length}`);
  }
  const geometry = computeGridGeometry(seamGap);
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_2D_UNAVAILABLE');

  // 相纸白底（缝隙模式会看到白色）
  ctx.fillStyle = '#f4f2ec';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 先全部加载再统一绘制，半成品不导出
  const images = await Promise.all(frames.map((f) => loadImage(f.url)));
  images.forEach((img, i) => {
    drawCover(ctx, img, geometry.cells[i], frames[i].focal);
  });

  return { canvas, geometry };
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('CANVAS_TO_BLOB_FAILED'));
      },
      type,
      quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 给浏览器一点时间触发下载后再释放
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

/** 下载整组 PNG 接触表 */
export async function downloadContactSheet(
  frames: LoadableFrame[],
  seamGap = 0,
): Promise<void> {
  const { canvas } = await composeContactSheet(frames, seamGap);
  const blob = await canvasToBlob(canvas, 'image/png');
  downloadBlob(blob, `almost-perfect-nine-contact-${Date.now()}.png`);
}

/**
 * 九张单图各导出为 1080x1920 PNG，并打包成 zip
 * （与整图同分辨率的单格竖幅，避免触发浏览器多文件下载拦截）。
 */
export async function downloadSingleImagesZip(frameStates: FrameState[]): Promise<void> {
  const ready = frameStates.filter((f) => f.status === 'done' && f.image);
  if (ready.length === 0) throw new Error('NO_READY_FRAMES');
  const zip = new JSZip();
  await Promise.all(
    ready.map(async (frame) => {
      const img = await loadImage(frame.image!.url);
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('CANVAS_2D_UNAVAILABLE');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawCover(
        ctx,
        img,
        { x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
        frame.directive.focal,
      );
      const blob = await canvasToBlob(canvas, 'image/png');
      const num = String(frame.directive.index + 1).padStart(2, '0');
      zip.file(`almost-perfect-nine-${num}-${frame.directive.id}.png`, blob);
    }),
  );
  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, `almost-perfect-nine-frames-${Date.now()}.zip`);
}
