/**
 * 短片投稿模式纯函数回归（Node 直接运行，不依赖浏览器/DOM）。
 * 运行：pnpm exec tsx tests/film.test.ts
 */
import assert from 'node:assert';
import { FILM_SHOTS, FILM_TITLE, LIB_GATES, SUBMISSION_CHECKLIST } from '../src/lib/film/script';
import { buildTimeline, segmentAt, formatTimecode, libRatio, DEFAULT_TIMELINE } from '../src/lib/film/timeline';
import { buildSubmissionReadme, safeFileName } from '../src/lib/film/package-docs';
import { missingFrameIndexes } from '../src/lib/film/exporter';
import { FILM_MIN_DURATION, LIB_RATIO_REQUIRED, type SubmissionPackageMeta } from '../src/lib/film/types';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log('✓', name);
}

const expectedIds = [
  'motion-blur',
  'eyes-closed',
  'cropped-head',
  'flash-overexposure',
  'missed-focus',
  'crooked-frame',
  'bad-low-angle',
  'too-far',
  'hand-blocking-lens',
];

check('默认时间轴：6s 片头 + 9×9s + 6s 片尾 = 93s 且 ≥90s', () => {
  const tl = buildTimeline(DEFAULT_TIMELINE);
  assert.equal(tl.introDuration, 6);
  assert.equal(tl.shotDuration, 9);
  assert.equal(tl.outroDuration, 6);
  assert.equal(tl.shotCount, 9);
  assert.equal(tl.totalDuration, 93);
  assert.equal(tl.segments.length, 11);
  assert.equal(tl.meetsMinDuration, true);
  assert.ok(tl.totalDuration >= FILM_MIN_DURATION);
});

check('段落顺序：intro → 9 shots（0..8）→ outro，时间首尾相接', () => {
  const tl = buildTimeline(DEFAULT_TIMELINE);
  assert.equal(tl.segments[0]!.kind, 'intro');
  assert.equal(tl.segments[10]!.kind, 'outro');
  tl.segments.forEach((seg, i) => {
    if (i > 0) assert.equal(seg.start, tl.segments[i - 1]!.end);
    assert.equal(seg.end - seg.start, seg.duration);
  });
  tl.segments.slice(1, 10).forEach((seg, i) => {
    assert.equal(seg.kind, 'shot');
    assert.equal(seg.shotIndex, i);
  });
});

check('9 个镜头严格绑定 9 个事故，顺序与 id 不重复', () => {
  assert.deepEqual(
    FILM_SHOTS.map((s) => s.accidentId),
    expectedIds,
  );
  assert.equal(new Set(FILM_SHOTS.map((s) => s.accidentId)).size, 9);
  FILM_SHOTS.forEach((s, i) => assert.equal(s.index, i));
});

check('每镜字幕不超过两行，且 LibTV 提示词/参考图用途非空', () => {
  for (const shot of FILM_SHOTS) {
    assert.ok(shot.subtitle.split('\n').length <= 2, `shot ${shot.index + 1} 字幕超过两行`);
    assert.ok(shot.subtitle.length > 0);
    assert.ok(shot.libPrompt.length > 120, `shot ${shot.index + 1} LibTV 提示词过短`);
    assert.ok(shot.referenceUsage.includes('锚点'));
    assert.ok(shot.beat === 'hook' || shot.beat === 'escalation' || shot.beat === 'climax' || shot.beat === 'resolution');
  }
  // 第 1 镜开场钩子、第 9 镜手挡镜头高潮
  assert.equal(FILM_SHOTS[0]!.beat, 'hook');
  assert.equal(FILM_SHOTS[8]!.beat, 'climax');
  assert.equal(FILM_SHOTS[8]!.accidentId, 'hand-blocking-lens');
});

check('提示词包含成年/着装合规要素，且不诱导露骨', () => {
  for (const shot of FILM_SHOTS) {
    const p = shot.libPrompt;
    assert.ok(p.includes('成年'));
    assert.ok(p.includes('全程着装'));
    assert.ok(p.includes('非露骨'));
    assert.ok(p.includes('无文字水印') || p.includes('不丑化') || p.includes('无文字'));
  }
});

check('segmentAt 边界定位正确，越界返回 null', () => {
  const tl = buildTimeline(DEFAULT_TIMELINE);
  assert.equal(segmentAt(tl, 0)!.kind, 'intro');
  assert.equal(segmentAt(tl, 6)!.shotIndex, 0);
  assert.equal(segmentAt(tl, 86.999)!.shotIndex, 8);
  assert.equal(segmentAt(tl, 87)!.kind, 'outro');
  assert.equal(segmentAt(tl, 93), null);
  assert.equal(segmentAt(tl, -1), null);
});

check('formatTimecode 支持 >60s', () => {
  assert.equal(formatTimecode(0), '00:00');
  assert.equal(formatTimecode(93), '01:33');
  assert.equal(formatTimecode(125.9), '02:05');
});

check('LibTV 70% 比例：7/9=78% 达标，6/9=67% 不达标；片头片尾不计入分母', () => {
  assert.deepEqual(libRatio(0), { done: 0, total: 9, percent: 0, passed: false });
  const r6 = libRatio(6);
  assert.equal(r6.percent, 67);
  assert.equal(r6.passed, false);
  const r7 = libRatio(7);
  assert.equal(r7.percent, 78);
  assert.equal(r7.passed, true);
  assert.ok(r7.percent >= LIB_RATIO_REQUIRED);
  // 越界值收敛
  assert.equal(libRatio(99).done, 9);
  assert.equal(libRatio(-3).done, 0);
});

check('更短镜头时长会被判定不满足 90s（8s: 84s）', () => {
  const tl = buildTimeline({ introDuration: 6, shotDuration: 8, outroDuration: 6 });
  assert.equal(tl.totalDuration, 84);
  assert.equal(tl.meetsMinDuration, false);
  const tl10 = buildTimeline({ introDuration: 6, shotDuration: 10, outroDuration: 6 });
  assert.equal(tl10.totalDuration, 102);
  assert.equal(tl10.meetsMinDuration, true);
});

check('导出素材缺失判定：缺哪几张能精确返回', () => {
  const sources = [0, 2, 8].map((i) => ({ index: i, url: `/demo/demo-${i + 1}.jpg` }));
  assert.deepEqual(missingFrameIndexes(sources), [1, 3, 4, 5, 6, 7]);
  // 空 url 视为缺失
  assert.deepEqual(missingFrameIndexes([{ index: 0, url: '' }]), expectedIds.map((_, i) => i));
  assert.deepEqual(missingFrameIndexes(FILM_SHOTS.map((s) => ({ index: s.index, url: 'x' }))), []);
});

check('投稿说明文档含标题/简介/标签/70% 规则/自检/合规，且未达标时明确告警', () => {
  const meta: SubmissionPackageMeta = {
    title: FILM_TITLE.title,
    synopsis: FILM_TITLE.synopsis,
    statement: FILM_TITLE.statement,
    tags: FILM_TITLE.tags,
    totalDuration: 93,
    shotDuration: 9,
    resolution: '1080x1920',
    format: 'WEBM',
    audio: '无音频',
    sourceMode: 'demo',
    libGeneratedShots: 0,
    totalShots: 9,
    ratioPercent: 0,
  };
  const doc = buildSubmissionReadme(meta);
  assert.ok(doc.includes(FILM_TITLE.title));
  assert.ok(doc.includes('未达到 ≥70% 门槛'));
  assert.ok(doc.includes('DEMO 演示素材'));
  assert.ok(doc.includes('投稿自检清单'));
  assert.ok(doc.includes('AI 生成标识'));
  for (const tag of FILM_TITLE.tags) assert.ok(doc.includes(`#${tag}`));

  const docOk = buildSubmissionReadme({ ...meta, libGeneratedShots: 7, ratioPercent: 78, sourceMode: 'live' });
  assert.ok(docOk.includes('达到 ≥70% 门槛'));
});

check('活动门槛与自检清单覆盖关键合规项', () => {
  const gateIds = LIB_GATES.map((g) => g.id);
  for (const id of ['duration', 'ratio', 'canvas', 'submit-link']) assert.ok(gateIds.includes(id));
  const labels = SUBMISSION_CHECKLIST.map((c) => c.label).join(' ');
  for (const kw of ['成年', '着装', 'AI', '水印', '许可', '公开画布', '90 秒']) {
    assert.ok(labels.includes(kw), `缺少合规关键词：${kw}`);
  }
});

check('safeFileName 移除路径与空白风险字符', () => {
  assert.equal(safeFileName('a/b:c? d*e'), 'a-b-c-d-e');
  assert.equal(safeFileName('   '), 'almost-perfect-nine');
});

console.log(`\n${passed} film checks passed.`);
