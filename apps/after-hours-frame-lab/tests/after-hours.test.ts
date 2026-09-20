import assert from 'node:assert/strict';
import { generateBatch, swapLayerVariable } from '../src/lib/after-hours/engine';
import { withSafety, promptContainsSafety, SAFETY_BLOCK } from '../src/lib/after-hours/safety';
import { validateCard, sanitizeHistory, validateHistoryRecord, cardToHistory } from '../src/lib/after-hours/schema';
import { makeFingerprint } from '../src/lib/after-hours/fingerprint';
import { buildContext, availableFor, resolveClothingFor } from '../src/lib/after-hours/rules';
import type { EngineSpec, StoryCard } from '../src/lib/after-hours/types';

const base = (over: Partial<EngineSpec> = {}): EngineSpec => ({
  seed: 20240517,
  batchSize: 9,
  locks: {},
  mood: 'soft_warm',
  cross: { persons: 3, relation: '多年老友', tidiness: '自然松弛' },
  avoidFingerprints: [],
  ...over,
});

const nines = () => generateBatch(base()).cards;

function assertSafety(prompt: string) {
  assert.ok(promptContainsSafety(prompt), 'final prompt 必须包含 safety block');
  assert.match(prompt, /25\s*岁|二十五岁|25岁/, '必须出现 25 岁以上成人声明');
}

function assertValid(card: StoryCard) {
  const problems = validateCard(card);
  assert.ok(problems.length === 0, `卡应通过 schema 校验: ${problems.join(',')}`);
  assertSafety(card.prompt);
}

// 1) 固定 seed 可复现
{
  const a = nines();
  const b = generateBatch(base()).cards;
  assert.equal(a.length, 9, '9 张可生成');
  for (let i = 0; i < a.length; i++) {
    assert.equal(a[i].prompt, b[i].prompt, '同 seed 同批 prompt 完全一致');
    assert.equal(a[i].id, b[i].id, '同 seed 同批卡 id 一致');
  }
  console.log('[ok] 固定 seed 可复现，9 张批次完整');
}

// 2) 九格主维度唯一（同批不重复主要动作 moment / 主机位 trace）
{
  const cards = nines();
  assert.equal(cards.length, 9);
  const moments = new Set(cards.map((c) => c.layers.moment.key));
  const cameras = new Set(cards.map((c) => c.layers.trace.key));
  assert.equal(moments.size, 9, `九张主要动作应各不相同，实际 ${moments.size}`);
  assert.equal(cameras.size, 9, `九张主机位应各不相同，实际 ${cameras.size}`);
  console.log('[ok] 九格主维度唯一（moment×9 / trace×9）');
}

// 3) 每条 prompt 必含 25+ 与 safety block
{
  const cards = nines();
  for (const c of cards) assertValid(c);
  assert.equal(promptContainsSafety(SAFETY_BLOCK + '\n正文'), true);
  assert.equal(promptContainsSafety('just some text'), false);
  assert.equal(withSafety('正文').includes('25'), true);
  console.log('[ok] 安全块恒存在，且每条最终 prompt 均包含');
}

// 4) 最近 20 组去重
{
  const first = nines();
  const avoid = first.map((c) => c.id);
  const second = generateBatch(base({ seed: 7, avoidFingerprints: avoid })).cards;
  assert.ok(second.length >= 1);
  for (const c of second) {
    assert.equal(avoid.includes(c.id), false, `不应命中最近 20 组指纹: ${c.id}`);
  }
  console.log('[ok] 最近 20 组指纹去重生效');
}

// 5) 条件规则：商务散场 → 正式服装
{
  const ctx = buildContext(base({ locks: { task: 'business_coda' } }), {});
  const clothing = resolveClothingFor(ctx);
  assert.match(clothing, /正式|利落/, `商务散场服装偏正式，实际: ${clothing}`);
  console.log('[ok] 商务散场：正式服装');
}

// 6) 桌游夜 → 出现牌或骰子道具
{
  const ctx = buildContext(base({ locks: { task: 'board_game' } }), {});
  const momentChoices = availableFor('moment', ctx, {});
  const hasProp = momentChoices.some((k) => /card|dice|tile|token|board|rolling/.test(k));
  assert.ok(hasProp, `桌游夜 moment 池应含牌/骰子道具: ${momentChoices.join(',')}`);
  console.log('[ok] 桌游夜：moment 池含牌/骰子道具');
}

// 7) 独处等候 → 仅 1 人
{
  const spec = base({ cross: { persons: 4 } });
  const ctx = buildContext(spec, {});
  // 未锁定时人数允许 4；锁定后强制 1
  const lockedCtx = buildContext(base({ locks: { task: 'solo_wait' }, cross: { persons: 4 } }), {});
  assert.equal(lockedCtx.persons, 1, '独处等候人数应恒为 1');
  const cards = generateBatch({ ...spec, locks: { task: 'solo_wait' } }).cards;
  for (const c of cards) assert.equal(c.cross.persons, 1, '故事卡人数恒为 1');
  console.log('[ok] 独处等候：人数恒定 1');
}

// 8) 安静空间 → 中长焦（数码变焦）可用
{
  const ctx = buildContext(base({ locks: { space: 'quiet_bar' } }), {});
  const traces = availableFor('trace', ctx, {});
  const hasTele = traces.some((k) => k === 'digital_zoom');
  assert.ok(hasTele, `安静空间应含中长焦成像痕迹: ${traces.join(',')}`);
  console.log('[ok] 安静空间：中长焦可用');
}

// 9) 人数 1–6 全范围
{
  for (let n = 1; n <= 6; n++) {
    const ctx = buildContext(base({ cross: { persons: n } }), {});
    assert.ok(ctx.persons >= 1 && ctx.persons <= 6);
  }
  console.log('[ok] 人数 1–6 全范围合法');
}

// 10) JSON schema / 历史清洗
{
  const card = nines()[0];
  assertValid(card);
  const h = cardToHistory(card);
  assert.ok(validateHistoryRecord(h));
  const many = Array.from({ length: 30 }, (_, i) => ({ ...h, id: `x${i}`, createdAt: i, fingerprint: `fp-${i}` }));
  const cleaned = sanitizeHistory(many);
  assert.equal(cleaned.length, 20, '历史最多保留最近 20 组');
  assert.equal(cleaned[0].id, 'x29');
  assert.equal(sanitizeHistory([]).length, 0);
  console.log('[ok] JSON schema 校验 + 最近 20 组历史清洗');
}

// 11) 换单变量：仅替换目标层，其余四层不变
{
  const cards = nines();
  const target = 'moment';
  const swap = swapLayerVariable(base(), cards, target);
  assert.equal(swap.cards.length, 9);
  const changed = swap.cards.map((c, i) => c.layers[target].key !== cards[i].layers[target].key);
  const changedCount = changed.filter(Boolean).length;
  assert.ok(changedCount >= 5, `至少多数卡在 moment 层变化，实际 ${changedCount}`);
  for (let i = 0; i < 9; i++) {
    for (const layer of ['task', 'phase', 'space', 'trace'] as const) {
      assert.equal(swap.cards[i].layers[layer].key, cards[i].layers[layer].key, `${layer} 不应变化`);
    }
    assertSafety(swap.cards[i].prompt);
  }
  console.log('[ok] 换单变量：仅替换 moment，其余四层不变，安全块保留');
}

// 12) 无 Key Demo：纯函数不依赖任何密钥即可产出完整故事卡 + prompt
{
  const cards = generateBatch(base({ seed: 888, batchSize: 1 })).cards;
  assert.equal(cards.length, 1);
  assertValid(cards[0]);
  assert.ok(cards[0].prompt.length > 0);
  assert.match(cards[0].prompt, /28 岁/, '主体为约 28 岁的成年东亚女性');
  console.log('[ok] 无 Key Demo：纯逻辑可产出完整故事卡与 prompt');
}

// 13) 指纹函数
{
  const fp = makeFingerprint({ momentKey: 'answering', camFamily: 'flash', phaseKey: 'peak' });
  assert.ok(fp.length > 0);
  const fp2 = makeFingerprint({ momentKey: 'answering', camFamily: 'flash', phaseKey: 'quiet' });
  assert.notEqual(fp, fp2, '不同时段指纹不同');
  console.log('[ok] 指纹函数输出稳定且区分时段');
}

console.log('\nAFTER HOURS FRAME LAB 测试全部通过 ✔');