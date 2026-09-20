/**
 * 1080×1920 竖屏短片逐帧渲染器（纯 Canvas 2D，无第三方渲染依赖）。
 *
 * renderFrame() 只负责把「某一时刻 t（秒）」画到传入 canvas，
 * 播放预览与 MediaRecorder 录制共用同一条时间轴，保证所见即所录。
 */
import { FILM_SHOTS, FILM_TITLE } from './script';
import type { FilmTimeline } from './types';

export interface RenderImage {
  index: number;
  img: HTMLImageElement;
}

export interface RenderInput {
  timeline: FilmTimeline;
  images: RenderImage[];
  /** 是否绘制 AI 生成标识，默认 true */
  aiMark?: boolean;
  /** 是否显示调试时间码（录制时建议 false） */
  showTimecode?: boolean;
}

const PAPER = '#f4f2ec';
const INK = '#100f0d';
const SAFELIGHT = '#e4572e';

/** 每镜 Ken Burns 方向：[起始缩放, 结束缩放, panX, panY]（pan 为焦点偏移量，相对宽/高） */
const KEN_BURNS: ReadonlyArray<readonly [number, number, number, number]> = [
  [1.05, 1.16, 0.02, -0.03],
  [1.12, 1.04, -0.04, 0.0],
  [1.06, 1.14, 0.0, -0.05],
  [1.04, 1.1, 0.0, 0.02],
  [1.12, 1.05, 0.03, 0.0],
  [1.05, 1.12, -0.03, 0.03],
  [1.08, 1.15, 0.0, 0.05],
  [1.22, 1.06, 0.0, -0.02],
  [1.06, 1.2, 0.0, 0.0],
];

function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function smooth01(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

/** 中文按字符折行，最多两行，超出加省略号 */
function wrapSubtitle(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const hard: string[] = [];
  for (const para of paragraphs) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        hard.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) hard.push(line);
  }
  if (hard.length <= 2) return hard;
  const second = hard[hard.length - 1];
  let first = hard.slice(0, -1).join('');
  while (ctx.measureText(`${first}…`).width > maxWidth && first.length > 1) {
    first = first.slice(0, -1);
  }
  return [`${first}…`, second];
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
}

/** cover 绘制：按 focal(0-1) 对齐，scale 为额外放大倍数，panX/panY 为相对位移 */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  focal: { x: number; y: number },
  scale: number,
  panX: number,
  panY: number,
): void {
  const targetRatio = w / h;
  const srcRatio = img.width / img.height;
  let dw: number;
  let dh: number;
  if (srcRatio > targetRatio) {
    dh = h * scale;
    dw = dh * srcRatio;
  } else {
    dw = w * scale;
    dh = dw / srcRatio;
  }
  // focal 对齐：焦点固定在屏幕 (focal.x*w, focal.y*h)
  let dx = focal.x * w - focal.x * dw + panX * w;
  let dy = focal.y * h - focal.y * dh + panY * h;
  // 防止露出黑边（cover 必须铺满）
  if (dw >= w) dx = Math.min(0, Math.max(w - dw, dx));
  else dx = (w - dw) / 2;
  if (dh >= h) dy = Math.min(0, Math.max(h - dh, dy));
  else dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawSubtitle(ctx: CanvasRenderingContext2D, w: number, h: number, text: string): void {
  const fontSize = Math.round(w * 0.043);
  ctx.font = `500 ${fontSize}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const lines = wrapSubtitle(ctx, text, w * 0.82);
  const lineHeight = fontSize * 1.5;
  const blockHeight = lines.length * lineHeight;
  const baseY = h - w * 0.16 - blockHeight + lineHeight * 0.85;

  // 半透明暗条，保证白字可读
  ctx.fillStyle = 'rgba(16,15,13,0.55)';
  ctx.fillRect(0, baseY - lineHeight * 1.1, w, blockHeight + lineHeight * 0.7);

  lines.forEach((line, i) => {
    const y = baseY + i * lineHeight;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(line, w / 2 + 2, y + 2);
    ctx.fillStyle = PAPER;
    ctx.fillText(line, w / 2, y);
  });
}

function drawAIMark(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  const fontSize = Math.round(w * 0.024);
  ctx.font = `500 ${fontSize}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(244,242,236,0.92)';
  ctx.fillText('AI GENERATED · 虚构人物 FICTIONAL', w * 0.05, h - w * 0.035);
  ctx.restore();
}

function drawShotTag(ctx: CanvasRenderingContext2D, w: number, _h: number, index: number): void {
  ctx.save();
  const fs = Math.round(w * 0.026);
  ctx.font = `500 ${fs}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(244,242,236,0.85)';
  ctx.fillText(`SHOT ${String(index + 1).padStart(2, '0')}/09`, w * 0.05, w * 0.05);
  ctx.restore();
}

function drawIntro(ctx: CanvasRenderingContext2D, w: number, h: number, p: number, aiMark: boolean): void {
  drawBackground(ctx, w, h);
  // 暗房红呼吸
  const glow = 0.08 + 0.05 * Math.sin(p * Math.PI);
  const grad = ctx.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, w * 0.8);
  grad.addColorStop(0, `rgba(228,87,46,${glow})`);
  grad.addColorStop(1, 'rgba(16,15,13,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const fade = smooth01(p * 6) * (1 - smooth01((p - 0.86) / 0.14));
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a8478';
  ctx.font = `500 ${Math.round(w * 0.024)}px "IBM Plex Mono", monospace`;
  ctx.fillText('ALMOST PERFECT NINE', w / 2, h * 0.2);

  ctx.fillStyle = PAPER;
  ctx.font = `600 ${Math.round(w * 0.066)}px "Noto Sans SC", sans-serif`;
  const titleLines = ['她本来可以拍出', '9 张神图'];
  titleLines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h * 0.36 + i * w * 0.1);
  });
  ctx.fillStyle = SAFELIGHT;
  ctx.font = `500 ${Math.round(w * 0.04)}px "Noto Sans SC", sans-serif`;
  ctx.fillText('但朋友，一次都没拍好', w / 2, h * 0.36 + 2 * w * 0.1 + w * 0.02);

  ctx.fillStyle = '#6f6a60';
  ctx.font = `400 ${Math.round(w * 0.028)}px "Noto Sans SC", sans-serif`;
  ctx.fillText('竖屏轻喜剧 · 9 次封神瞬间 · 9 次翻车', w / 2, h * 0.78);
  ctx.restore();
  if (aiMark) drawAIMark(ctx, w, h);
}

function drawOutro(ctx: CanvasRenderingContext2D, w: number, h: number, p: number, images: RenderImage[]): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  const fade = smooth01(p * 4);
  ctx.save();
  ctx.globalAlpha = fade;

  // 顶部标题
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `600 ${Math.round(w * 0.05)}px "Noto Sans SC", sans-serif`;
  ctx.fillText('一张都没废，只是没封神', w / 2, h * 0.085);
  ctx.fillStyle = '#6f6a60';
  ctx.font = `400 ${Math.round(w * 0.026)}px "IBM Plex Mono", monospace`;
  ctx.fillText('CONTACT SHEET OF ALMOST PERFECT MOMENTS', w / 2, h * 0.115);

  // 3×3 接触表
  const gridW = w * 0.84;
  const gap = w * 0.012;
  const cellW = (gridW - gap * 2) / 3;
  const cellH = cellW * (16 / 9);
  const gridH = cellH * 3 + gap * 2;
  const gridX = (w - gridW) / 2;
  const gridY = (h - gridH) / 2 - h * 0.02;

  images.forEach(({ img }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = gridX + col * (cellW + gap);
    const y = gridY + row * (cellH + gap);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cellW, cellH);
    ctx.clip();
    ctx.fillStyle = '#ddd9cf';
    ctx.fillRect(x, y, cellW, cellH);
    // 每格错峰显现
    const appear = smooth01(p * 3 - i * 0.12);
    ctx.globalAlpha = fade * appear;
    drawCoverImage(ctx, img, cellW, cellH, { x: 0.5, y: 0.4 }, 1.05, 0, 0);
    ctx.restore();
  });

  ctx.globalAlpha = fade;
  ctx.fillStyle = '#5d584f';
  ctx.font = `400 ${Math.round(w * 0.026)}px "Noto Sans SC", sans-serif`;
  ctx.fillText('下次，还是让她自己拿相机吧。', w / 2, h * 0.9);
  ctx.fillStyle = SAFELIGHT;
  ctx.font = `500 ${Math.round(w * 0.024)}px "IBM Plex Mono", monospace`;
  ctx.fillText('AI GENERATED · 全虚构 · 无音频', w / 2, h * 0.935);
  ctx.restore();
}

/** 单镜动态效果，返回是否需要额外的失焦模糊 */
function applyShotEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  index: number,
  p: number,
): { filterBlur: number; draw: () => void } {
  const accidentId = FILM_SHOTS[index]?.accidentId ?? '';
  let filterBlur = 0;
  let extraDraw: () => void = () => {};

  switch (accidentId) {
    case 'motion-blur': {
      // 回头瞬间方向拖影
      const hit = smooth01((p - 0.32) / 0.12) * (1 - smooth01((p - 0.6) / 0.2));
      filterBlur = hit * 3.2;
      break;
    }
    case 'eyes-closed': {
      // 闪光时已在画面（人物眨眼由素材承担），加一记轻闪
      const flash = 1 - smooth01((p - 0.5) / 0.18);
      extraDraw = () => {
        if (flash > 0) {
          ctx.fillStyle = `rgba(244,242,236,${0.12 * flash})`;
          ctx.fillRect(0, 0, w, h);
        }
      };
      break;
    }
    case 'cropped-head': {
      // 缓慢上摇：焦点从下往更上走，但始终被裁
      filterBlur = 0;
      // 通过 drawCoverImage 的 panY 已在外部处理
      break;
    }
    case 'flash-overexposure': {
      const flash = 1 - smooth01((p - 0.42) / 0.3);
      extraDraw = () => {
        const g = ctx.createRadialGradient(w * 0.5, h * 0.34, 10, w * 0.5, h * 0.34, w * 0.75);
        g.addColorStop(0, `rgba(255,253,246,${0.72 * flash})`);
        g.addColorStop(0.6, `rgba(255,250,240,${0.4 * flash})`);
        g.addColorStop(1, 'rgba(255,250,240,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      };
      break;
    }
    case 'missed-focus': {
      // 人物整体失焦，中段最虚
      const depth = Math.sin(p * Math.PI);
      filterBlur = 4 + depth * 6;
      break;
    }
    case 'crooked-frame': {
      // 荷兰角在外部旋转变换里处理
      break;
    }
    case 'bad-low-angle': {
      // 轻微手持仰角晃动
      break;
    }
    case 'too-far': {
      // 拉远 + 留白：外部 scale 处理
      break;
    }
    case 'hand-blocking-lens': {
      const reach = smooth01((p - 0.35) / 0.3);
      filterBlur = reach * 2.5;
      extraDraw = () => {
        // 前景虚焦手掌压暗角（用半透明暖色椭圆模拟遮挡，素材本身已有手）
        ctx.save();
        ctx.globalAlpha = reach * 0.5;
        ctx.fillStyle = 'rgba(40,34,30,0.55)';
        ctx.beginPath();
        ctx.ellipse(w * 0.62, h * 0.42, w * 0.34, h * 0.3, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const flash = 1 - smooth01((p - 0.6) / 0.25);
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,244,232,${0.28 * flash})`;
          ctx.fillRect(0, 0, w, h);
        }
      };
      break;
    }
  }
  return { filterBlur, draw: extraDraw };
}

function drawShot(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  index: number,
  img: HTMLImageElement,
  p: number,
  aiMark: boolean,
): void {
  const shot = FILM_SHOTS[index];
  const [s0, s1, panX0, panY0] = KEN_BURNS[index] ?? [1.05, 1.12, 0, 0];
  const e = easeInOut(p);

  let scale = s0 + (s1 - s0) * e;
  const panX = panX0 * e;
  let panY = panY0 * e;
  let rotate = 0;
  let shakeX = 0;
  let shakeY = 0;

  // 事故专属运镜修正
  if (shot.accidentId === 'crooked-frame') {
    rotate = (10 * Math.PI) / 180;
  } else if (shot.accidentId === 'bad-low-angle') {
    shakeX = Math.sin(p * Math.PI * 6) * w * 0.004;
    shakeY = Math.cos(p * Math.PI * 5) * w * 0.003;
  } else if (shot.accidentId === 'hand-blocking-lens') {
    const reach = smooth01((p - 0.35) / 0.3);
    shakeX = Math.sin(p * 40) * w * 0.006 * reach;
  } else if (shot.accidentId === 'cropped-head') {
    // 缓慢上摇：画面整体下移，露出更多下颌/裁掉更多头顶
    panY += -0.06 * e;
  } else if (shot.accidentId === 'too-far') {
    // 覆盖 Ken Burns：从很近一路拉到很小，四周留白由黑底 + 图小形成
    scale = 1.25 - 0.62 * e;
    panY = 0;
  }

  drawBackground(ctx, w, h);
  ctx.save();
  ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
  ctx.rotate(rotate);
  ctx.translate(-w / 2, -h / 2);

  if (shot.accidentId === 'too-far') {
    // 白色公寓墙底色（白墙留白）
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
  }

  const supportsFilter = typeof ctx.filter === 'string';
  const effect = applyShotEffect(ctx, w, h, index, p);
  if (supportsFilter && effect.filterBlur > 0) {
    ctx.filter = `blur(${effect.filterBlur.toFixed(2)}px)`;
  }
  const focal =
    shot.accidentId === 'too-far'
      ? { x: 0.5, y: 0.62 }
      : { x: 0.5, y: index === 2 ? 0.62 : 0.42 };
  drawCoverImage(ctx, img, w, h, focal, scale, panX, panY);
  if (supportsFilter) ctx.filter = 'none';
  effect.draw();
  ctx.restore();

  // 段落淡入淡出（180ms 量级，避免硬切）
  const fadeIn = smooth01(p / 0.06);
  const fadeOut = smooth01((p - 0.94) / 0.06);
  const edgeFade = Math.min(fadeIn, 1 - fadeOut);
  if (edgeFade < 1) {
    ctx.fillStyle = `rgba(16,15,13,${(1 - edgeFade) * 0.85})`;
    ctx.fillRect(0, 0, w, h);
  }

  drawShotTag(ctx, w, h, index);
  drawSubtitle(ctx, w, h, shot.subtitle);
  if (aiMark) drawAIMark(ctx, w, h);
}

/** 渲染时间 t（秒）对应的整帧 */
export function renderFrame(canvas: HTMLCanvasElement, input: RenderInput, t: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
  const w = canvas.width;
  const h = canvas.height;
  const { timeline, images } = input;
  const aiMark = input.aiMark ?? true;

  const clamped = Math.max(0, Math.min(timeline.totalDuration - 0.001, t));
  const seg = timeline.segments.find((s) => clamped >= s.start && clamped < s.end);

  if (!seg) {
    drawBackground(ctx, w, h);
    return;
  }
  const p = (clamped - seg.start) / seg.duration;

  if (seg.kind === 'intro') {
    drawIntro(ctx, w, h, p, aiMark);
    if (input.showTimecode) drawTimecode(ctx, w, h, t, timeline.totalDuration);
    return;
  }
  if (seg.kind === 'outro') {
    drawOutro(ctx, w, h, p, images);
    if (input.showTimecode) drawTimecode(ctx, w, h, t, timeline.totalDuration);
    return;
  }

  const idx = seg.shotIndex;
  if (idx === null) return;
  const loaded = images.find((im) => im.index === idx);
  if (!loaded) {
    // 素材缺失：明确画占位，而不是崩溃或静默黑屏
    drawBackground(ctx, w, h);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = SAFELIGHT;
    ctx.font = `500 ${Math.round(w * 0.032)}px "IBM Plex Mono", monospace`;
    ctx.fillText(`SHOT ${String(idx + 1).padStart(2, '0')} · MISSING IMAGE`, w / 2, h / 2);
    ctx.fillStyle = '#8a8478';
    ctx.font = `400 ${Math.round(w * 0.026)}px "Noto Sans SC", sans-serif`;
    ctx.fillText('该镜头图片缺失，请先在九宫格中补齐或使用演示素材', w / 2, h / 2 + w * 0.06);
    ctx.restore();
    if (aiMark) drawAIMark(ctx, w, h);
    return;
  }
  drawShot(ctx, w, h, idx, loaded.img, p, aiMark);
  if (input.showTimecode) drawTimecode(ctx, w, h, t, timeline.totalDuration);
}

function drawTimecode(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, total: number): void {
  const mmss = (sec: number): string => {
    const s = Math.max(0, Math.floor(sec));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  ctx.save();
  ctx.font = `500 ${Math.round(w * 0.024)}px "IBM Plex Mono", monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(244,242,236,0.8)';
  ctx.fillText(`${mmss(t)} / ${mmss(total)}`, w * 0.95, h - w * 0.035);
  ctx.restore();
}

/** 封面：取第 1 镜起始帧 + 标题（1080×1920） */
export function renderCover(canvas: HTMLCanvasElement, input: RenderInput): void {
  renderFrame(canvas, input, input.timeline.introDuration + 0.4);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.fillStyle = 'rgba(16,15,13,0.42)';
  ctx.fillRect(0, 0, w, h * 0.22);
  ctx.textAlign = 'center';
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${Math.round(w * 0.052)}px "Noto Sans SC", sans-serif`;
  ctx.fillText('她本来可以拍出9张神图', w / 2, h * 0.1);
  ctx.fillStyle = SAFELIGHT;
  ctx.font = `500 ${Math.round(w * 0.038)}px "Noto Sans SC", sans-serif`;
  ctx.fillText('但朋友一次都没拍好', w / 2, h * 0.15);
  ctx.fillStyle = 'rgba(244,242,236,0.8)';
  ctx.font = `400 ${Math.round(w * 0.026)}px "IBM Plex Mono", monospace`;
  ctx.fillText(FILM_TITLE.subtitle.toUpperCase(), w / 2, h * 0.19);
  ctx.restore();
}
