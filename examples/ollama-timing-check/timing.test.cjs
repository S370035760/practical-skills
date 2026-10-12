// Original teaching companion. Run: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const modulePath = path.join(__dirname, 'timing.cjs');
let analyze;
test('分析入口存在且可调用', () => {
  assert.ok(fs.existsSync(modulePath), 'missing feature: timing.cjs analyzer');
  analyze = require(modulePath).analyze;
  assert.equal(typeof analyze, 'function');
});
const base = () => ({ done: true, total_duration: 8e9, load_duration: 4e9,
  prompt_eval_duration: 1e9, eval_count: 40, eval_duration: 2e9 });
test('纳秒转秒与输出token吞吐量', () => {
  const r = analyze(base());
  assert.deepEqual(r.seconds, {total: 8, load: 4, prompt: 1, generate: 2, unassigned: 1});
  assert.equal(r.output_tokens_per_second, 20);
  assert.deepEqual(r.largest_recorded_phases, ['load']);
});
test('不把加载较短宣称为模型已驻留或硬件改善', () => {
  const r = analyze({...base(), total_duration: 3.5e9, load_duration: 1e8});
  assert.deepEqual(r.largest_recorded_phases, ['generate']);
  assert.equal(r.output_tokens_per_second, 20);
  assert.equal(r.seconds.unassigned, 0.4);
});
test('零生成时长不除零', () => {
  const r = analyze({...base(), eval_duration: 0});
  assert.equal(r.output_tokens_per_second, null);
  assert.ok(r.warnings.includes('NO_GENERATION_DURATION'));
});
test('阶段合计大于总时长只报警，不伪造网络开销', () => {
  const r = analyze({...base(), total_duration: 1e9});
  assert.equal(r.seconds.unassigned, null);
  assert.ok(r.warnings.includes('PHASE_SUM_EXCEEDS_TOTAL'));
});
test('零时长不臆测最慢阶段', () => {
  const r = analyze({done:true,total_duration:0,load_duration:0,prompt_eval_duration:0,eval_count:0,eval_duration:0});
  assert.deepEqual(r.largest_recorded_phases, []);
});
test('并列阶段全部保留', () => {
  assert.deepEqual(analyze({...base(), load_duration:2e9}).largest_recorded_phases, ['load','generate']);
});
test('中间流式片段拒绝分析', () => {
  assert.throws(() => analyze({...base(), done:false}), /done/);
});
test('接口错误对象保留为错误，不填零', () => {
  assert.throws(() => analyze({error:'model not found'}), /API_ERROR/);
});
test('缺失字段拒绝', () => {
  const r=base(); delete r.eval_count;
  assert.throws(() => analyze(r), /eval_count/);
});
test('字符串负值无穷和不安全整数拒绝', () => {
  for (const v of ['100', -1, Infinity, NaN, Number.MAX_SAFE_INTEGER+1, null, 1.5]) {
    assert.throws(() => analyze({...base(), load_duration:v}), /load_duration/);
  }
});
test('根节点必须是对象', () => {
  for (const v of [null, [], 'json', 1]) assert.throws(() => analyze(v), /object/);
});
test('截断回答明确提示检查质量', () => {
  assert.ok(analyze({...base(), done_reason:'length'}).warnings.includes('OUTPUT_STOPPED_AT_LENGTH'));
});
test('不在报告输出提示词回答模型或其他私密字段', () => {
  const r=JSON.stringify(analyze({...base(),prompt:'PRIVATE',response:'SECRET',model:'PRIVATE-MODEL'}));
  assert.ok(!/PRIVATE|SECRET/.test(r));
});
test('CLI读取示例并打印两个独立报告', () => {
  const run=spawnSync(process.execPath,[modulePath,path.join(__dirname,'sample-responses.json')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const r=JSON.parse(run.stdout); assert.equal(r.length,2);
  assert.equal(r[0].seconds.load,4); assert.equal(r[1].seconds.load,0.1);
});
test('CLI损坏JSON返回非零且不输出输入内容', () => {
  const run=spawnSync(process.execPath,[modulePath],{input:'PRIVATE INVALID JSON',encoding:'utf8'});
  assert.equal(run.status,1); assert.match(run.stderr,/INPUT_ERROR/);
  assert.ok(!run.stderr.includes('PRIVATE'));
});
test('CLI没有最终计时字段时失败而非生成假报告', () => {
  const run=spawnSync(process.execPath,[modulePath],{input:JSON.stringify({done:true}),encoding:'utf8'});
  assert.equal(run.status,1); assert.match(run.stderr,/total_duration/);
});
test('CLI拒绝忽略多余的参数', () => {
  const run=spawnSync(process.execPath,[modulePath,'a','b'],{encoding:'utf8'});
  assert.equal(run.status,1); assert.match(run.stderr,/USAGE/);
});
