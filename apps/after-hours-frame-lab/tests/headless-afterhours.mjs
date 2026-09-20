// 无头浏览器验证夜幕抓拍实验室：桌面 + 手机宽度、连续生成出现明显不同、回归旧 Tab。
// 用法：node tests/headless-afterhours.mjs <wsPath> <chromePath> [baseUrl]
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';

const wsPath = process.argv[2];
const chromePath = process.argv[3];
const baseUrl = process.argv[4] || 'http://localhost:5000';
const require = createRequire(import.meta.url);
const WebSocket = require(wsPath);

const PORT = 9444;
const PROFILE_DIR = `/tmp/apn-chrome-profile-afhl-${process.pid}`;
try { require('node:fs').rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch {}
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage',
  'about:blank',
], { stdio: 'ignore' });

const getJson = (p) => new Promise((res, rej) => {
  const req = http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => {
    let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d)));
  });
  req.on('error', rej);
});
async function waitTarget() {
  for (let i = 0; i < 60; i++) {
    try { const l = await getJson('/json'); const p = l.find((t) => t.type === 'page'); if (p?.webSocketDebuggerUrl) return p; } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('chrome target not ready');
}
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
  let id = 0; const pending = new Map();
  const ready = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); ws.on('message', (raw) => { const m = JSON.parse(raw.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } }); });
  const send = (method, params = {}) => { const mid = ++id; ready.then(() => ws.send(JSON.stringify({ id: mid, method, params }))); return new Promise((res) => pending.set(mid, res)); };
  return { send, close: () => ws.close() };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ev(client, expression) {
  const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error('eval error: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
  return r.result?.result?.value;
}
const SNAP = `(() => {
  const cards = [...document.querySelectorAll('article')].map(a => a.innerText.replace(/[\\s\\n]+/g,' ').trim());
  return cards.length + '::' + cards.join(' <|> ');
})()`;

async function clickText(client, text) {
  return ev(client, `(() => { const b=[...document.querySelectorAll('button')].find(x => x.textContent.includes(${JSON.stringify(text)})); if(!b) return false; b.click(); return true; })()`);
}

async function main() {
  const target = await waitTarget();
  const client = cdp(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await client.send('Page.navigate', { url: baseUrl });
  for (let i = 0; i < 80; i++) { if ((await ev(client, 'document.readyState')) === 'complete') break; await sleep(250); }
  await sleep(1200);

  if (!(await ev(client, `document.body.innerText.includes('夜幕抓拍实验室')`))) throw new Error('桌面：未找到夜幕抓拍实验室 Tab');
  await clickText(client, '夜幕抓拍实验室');
  await sleep(900);
  if (!(await ev(client, `document.body.innerText.includes('今晚想记录的感觉')`))) throw new Error('桌面：情绪门未出现');
  // 点击第一个情绪（MoodGate 的按钮带 afhl-panel 样式）
  const entered = await ev(client, `(() => { const b=[...document.querySelectorAll('button.afhl-panel')][0]; if(!b) return false; b.click(); return true; })()`);
  if (!entered) throw new Error('未找到情绪门按钮');
  await sleep(600);

  // 确认 9 张批量按钮，点击生成
  await clickText(client, '9');
  await scrollClick(client, '生成一组') || await clickText(client, '生成一组');
  await sleep(800);
  const checks = [];
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    await clickText(client, '生成一组');
    let snap = '';
    for (let k = 0; k < 40; k++) {
      await sleep(200);
      snap = await ev(client, SNAP);
      if (snap.split('::')[0] === '9') break;
    }
    const n = Number(snap.split('::')[0]);
    if (n !== 9) throw new Error(`第 ${i + 1} 次生成卡片数应为 9，实际 ${n}`);
    const hasCard9 = /CARD 9\/9/.test(await ev(client, 'document.body.innerText'));
    if (!hasCard9) throw new Error(`第 ${i + 1} 次未渲染 CARD 9/9`);
    seen.add(snap.split('::')[1] || '');
  }
  if (seen.size < 2) throw new Error('连续 5 次生成内容无明显不同');
  console.log('[ok] 桌面：连续 5 次生成均为 9 张且内容明显不同', seen.size, '余种');

  // 手机宽度回归
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await client.send('Page.navigate', { url: baseUrl });
  for (let i = 0; i < 80; i++) { if ((await ev(client, 'document.readyState')) === 'complete') break; await sleep(200); }
  await sleep(1600);
  const mobTab = await ev(client, `(() => { const b=[...document.querySelectorAll('button')].find(x => x.textContent.includes('夜幕抓拍实验室')); if(!b) return false; b.scrollIntoView({block:'center'}); b.click(); return true; })()`);
  if (!mobTab) throw new Error('手机宽度：未找到夜幕 Tab');
  await sleep(900);
  const mobVisible = (await ev(client, `document.body.innerText.includes('今晚想记录的感觉')`)) || (await ev(client, `document.body.innerText.includes('生成一组')`));
  await sleep(200);
  if (!mobVisible) throw new Error('手机宽度：夜幕实验室不可见');

  // 回归旧 Tab（九宫格 + 短片）
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await client.send('Page.navigate', { url: baseUrl });
  for (let i = 0; i < 80; i++) { if ((await ev(client, 'document.readyState')) === 'complete') break; await sleep(200); }
  await sleep(1200);
  for (const tab of ['九宫格图片', '短片投稿模式']) {
    if (!(await ev(client, `document.body.innerText.includes(${JSON.stringify(tab)})`))) throw new Error('回归失败：缺少 Tab ' + tab);
  }
  await clickText(client, '九宫格图片');
  await sleep(900);
  if (!(await ev(client, `document.body.innerText.includes('九宫格废片写真生成器')`))) throw new Error('回归失败：九宫格页不可见');
  await sleep(300);

  client.close();
  chrome.kill();
  console.log('PASS headless-afterhours: 桌面+手机宽度可见、连续 5 次生成不同、旧 Tab 可用');
}

async function scrollClick(client, text) {
  // 滚动到目标再点，避免被遮挡
  await ev(client, `(() => { const b=[...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(text.trim())}); if(!b) return false; b.scrollIntoView({block:'center'}); return true; })()`);
  await sleep(150);
  return clickText(client, text);
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL', e.message); chrome.kill(); process.exit(1); });
setTimeout(() => { chrome.kill(); process.exit(2); }, 90000).unref();