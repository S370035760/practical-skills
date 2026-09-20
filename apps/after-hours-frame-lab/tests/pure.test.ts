/**
 * 纯逻辑关键交互测试（无浏览器、无网络）：
 *   pnpm exec tsx tests/pure.test.ts
 */
import assert from 'node:assert/strict';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  computeCoverRect,
  computeGridGeometry,
} from '../src/lib/nine-grid/geometry';
import {
  buildAnchorPrompt,
  buildFramePrompt,
  frameDirectives,
  identityAnchor,
  negativePrompt,
  outfitAnchor,
} from '../src/lib/nine-grid/prompts';
import { DEFAULT_OPTIONS } from '../src/lib/nine-grid/types';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

check('画布为 1080×1920', () => {
  assert.equal(CANVAS_WIDTH, 1080);
  assert.equal(CANVAS_HEIGHT, 1920);
});

check('无缝模式：9 格，每格 360×640，位置正确', () => {
  const g = computeGridGeometry(0);
  assert.equal(g.cells.length, 9);
  assert.equal(g.cellWidth, 360);
  assert.equal(g.cellHeight, 640);
  assert.deepEqual(
    { x: g.cells[0].x, y: g.cells[0].y },
    { x: 0, y: 0 },
  );
  assert.deepEqual(
    { x: g.cells[8].x, y: g.cells[8].y },
    { x: 720, y: 1280 },
  );
  // 右下边恰好贴齐画布
  const last = g.cells[8];
  assert.equal(last.x + last.w, CANVAS_WIDTH);
  assert.equal(last.y + last.h, CANVAS_HEIGHT);
});

check('4px 白缝：每格 354×634，居中、缝宽 4px 且严格铺满', () => {
  const g = computeGridGeometry(4);
  assert.equal(g.cellWidth, 354);
  assert.equal(g.cellHeight, 634);
  assert.equal(g.marginX, 5);
  assert.equal(g.marginY, 5);
  const first = g.cells[0];
  const last = g.cells[8];
  assert.equal(first.x, 5);
  assert.equal(first.y, 5);
  assert.equal(last.x + last.w, CANVAS_WIDTH - 5);
  assert.equal(last.y + last.h, CANVAS_HEIGHT - 5);
  assert.equal(g.cells[1].x - (first.x + g.cellWidth), 4);
});

check('方形素材 cover 到 9:16：按焦点保留区域', () => {
  const rect = computeCoverRect({
    sW: 2048,
    sH: 2048,
    dW: 360,
    dH: 640,
    focal: { x: 0.5, y: 0.78 },
  });
  assert.equal(rect.sw, 1152);
  assert.equal(rect.sh, 2048);
  assert.equal(rect.sx, 448);
  assert.equal(rect.sy, 0);
  // 焦点偏左时保留区域起点靠左，且不越界
  const left = computeCoverRect({
    sW: 2048,
    sH: 2048,
    dW: 360,
    dH: 640,
    focal: { x: 0, y: 0.5 },
  });
  assert.equal(left.sx, 0);
  assert.ok(left.sx + left.sw <= 2048);
});

check('九格镜头表：9 个、编号连续、事故 id 不重复', () => {
  assert.equal(frameDirectives.length, 9);
  frameDirectives.forEach((d, i) => assert.equal(d.index, i));
  const ids = new Set(frameDirectives.map((d) => d.id));
  assert.equal(ids.size, 9);
  const ens = new Set(frameDirectives.map((d) => d.labelEn));
  assert.equal(ens.size, 9);
});

check('每格只承载一种事故，且三档强度文案都存在', () => {
  for (const d of frameDirectives) {
    for (const level of ['subtle', 'standard', 'obvious'] as const) {
      assert.ok(d.accident[level].length > 20, `${d.id}/${level} 事故文案过短`);
    }
  }
});

check('单格提示词包含身份/服装/事故/负面，且引用正确的格子', () => {
  const p4 = buildFramePrompt(4, DEFAULT_OPTIONS);
  assert.match(p4, /same woman as the reference picture/);
  assert.ok(p4.includes(identityAnchor.en.slice(0, 60)));
  assert.ok(p4.includes(outfitAnchor.en.slice(0, 60)));
  assert.match(p4, /missed focus/i);
  assert.ok(p4.includes(negativePrompt));
  assert.match(p4, /THE ONE AND ONLY PHOTOGRAPHY MISTAKE/);

  const p0 = buildFramePrompt(0, DEFAULT_OPTIONS);
  assert.match(p0, /motion blur/i);
  assert.doesNotMatch(p0, /eyes closed/i);
});

check('anchor 提示词：无事故、含身份与负面', () => {
  const a = buildAnchorPrompt(DEFAULT_OPTIONS);
  assert.ok(a.includes(identityAnchor.en.slice(0, 60)));
  assert.ok(a.includes(negativePrompt));
  assert.doesNotMatch(a, /PHOTOGRAPHY MISTAKE/);
});

check('越界格子抛错', () => {
  assert.throws(() => buildFramePrompt(9, DEFAULT_OPTIONS));
});

console.log(`\n${passed} checks passed.`);
