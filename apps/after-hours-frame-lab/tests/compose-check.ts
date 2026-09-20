/**
 * 拼合管线校验（需在项目根目录执行：pnpm exec tsx tests/compose-check.ts）
 *
 * 用 sharp 按 computeGridGeometry/coverRect 的同一套几何，把 9 张 demo 素材
 * 合成到 1080×1920 画布，验证：尺寸、白缝、无缝铺满。仅用于本地/CI 校验，
 * 不参与应用运行时（浏览器端的真实合成在 lib/nine-grid/client/compose.ts）。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CANVAS_HEIGHT, CANVAS_WIDTH, computeCoverRect, computeGridGeometry } from '../src/lib/nine-grid/geometry';
import { frameDirectives } from '../src/lib/nine-grid/prompts';

async function build(gap: number, out: string): Promise<void> {
  const g = computeGridGeometry(gap);
  const layers: Array<{ input: Buffer; left: number; top: number }> = [];

  for (let i = 0; i < 9; i += 1) {
    const file = join(process.cwd(), 'public', 'demo', `demo-${i + 1}.jpg`);
    if (!existsSync(file)) throw new Error(`缺少 demo 素材: ${file}`);
    const src = await sharp(file).rotate().metadata();
    const s = computeCoverRect({
      sW: src.width ?? 0,
      sH: src.height ?? 0,
      dW: g.cellWidth,
      dH: g.cellHeight,
      focal: frameDirectives[i].focal,
    });
    const crop = await sharp(file)
      .rotate()
      .extract({ left: s.sx, top: s.sy, width: s.sw, height: s.sh })
      .resize(g.cellWidth, g.cellHeight, { fit: 'fill' })
      .jpeg({ quality: 92 })
      .toBuffer();
    const cell = g.cells[i];
    layers.push({ input: crop, left: cell.x, top: cell.y });
  }

  await sharp({
    create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite(layers)
    .png()
    .toFile(out);
}

async function main(): Promise<void> {
  const seamless = '/tmp/apn-contact-seamless.png';
  const seamed = '/tmp/apn-contact-g4.png';

  await build(0, seamless);
  const m0 = await sharp(seamless).metadata();
  if (m0.width !== 1080 || m0.height !== 1920) throw new Error(`无缝画布尺寸错误: ${m0.width}x${m0.height}`);
  console.log('seamless', m0.width + 'x' + m0.height);

  await build(4, seamed);
  const m4 = await sharp(seamed).metadata();
  if (m4.width !== 1080 || m4.height !== 1920) throw new Error(`白缝画布尺寸错误: ${m4.width}x${m4.height}`);
  console.log('gap4', m4.width + 'x' + m4.height);

  // 白缝画布：第一、二条纵向缝隙处的中心像素必须接近纯白
  const { data, info } = await sharp(seamed).raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number): [number, number, number] => {
    const o = (y * info.width + x) * info.channels;
    return [data[o], data[o + 1], data[o + 2]];
  };
  const g4 = computeGridGeometry(4);
  const seamX1 = g4.cells[0].x + g4.cellWidth + 2; // 354+5+2 = 361
  const seamY1 = g4.cells[0].y + g4.cellHeight + 2;
  for (const p of [px(seamX1, 960), px(seamX1 + g4.cellWidth + 4, 960), px(540, seamY1)]) {
    if (Math.min(p[0], p[1], p[2]) < 248) throw new Error(`白缝像素不白: ${p.join(',')}`);
  }
  console.log('gap pixels are white: OK');

  // 接缝报告字节数，供人工查看
  const stat = await import('node:fs/promises').then(fs => fs.stat(seamed));
  console.log('sample bytes:', stat.size);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
