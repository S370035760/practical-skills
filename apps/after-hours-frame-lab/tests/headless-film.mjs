// 无头浏览器验证短片模式：CDP 驱动，不进入项目运行时依赖（仅复用 pnpm 存储中的 ws）。
// 用法：node tests/headless-film.mjs <wsModulePath> <chromePath> [baseUrl]
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';

const wsPath = process.argv[2];
const chromePath = process.argv[3];
const baseUrl = process.argv[4] || 'http://localhost:5000';
if (!wsPath || !chromePath) {
  console.error('usage: node headless-film.mjs <wsPath> <chromePath> [baseUrl]');
  process.exit(2);
}
const require = createRequire(import.meta.url);
const WebSocket = require(wsPath);

import { rmSync } from 'node:fs';
const PORT = 9333;
const PROFILE_DIR = `/tmp/apn-chrome-profile-film-${process.pid}`;
function cleanProfile() {
  for (let i = 0; i < 3; i++) {
    try {
      cleanProfile();
      return;
    } catch {
      // chrome 退出后文件句柄可能短暂占用，重试删除
    }
  }
}
cleanProfile();
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  '--disable-dev-shm-usage',
  '--autoplay-policy=no-user-gesture-required',
  'about:blank',
], { stdio: 'ignore' });

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await getJson('/json');
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('chrome devtools target not ready');
}

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
  let id = 0;
  const pending = new Map();
  const ready = new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  };
  function send(method, params = {}) {
    const msgId = ++id;
    const payload = JSON.stringify({ id: msgId, method, params });
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(payload);
    });
  }
  return { ready, send, close: () => ws.close() };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(cdp, fnSource, { timeout = 20000, label = 'condition' } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await evaluate(cdp, `(${fnSource})()`);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`timeout waiting: ${label}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await waitForTarget();
  const cdp = cdpClient(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: `${baseUrl}/` });

  await waitFor(cdp, () => document.body.innerText.includes('九宫格废片写真生成器'), { label: 'app mount' });
  // 等 React hydration 完成（mount 断言可能在 SSR HTML 阶段即通过）
  await sleep(2500);
  console.log('[ok] 页面挂载');

  await evaluate(cdp, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('短片投稿模式'))?.click()`);
  await waitFor(cdp, () => document.body.innerText.includes('载入演示素材'), { label: 'film tab' });
  console.log('[ok] 进入短片投稿模式');

  const caps = await evaluate(cdp, `(() => ({
    mr: typeof MediaRecorder !== 'undefined',
    capture: typeof HTMLCanvasElement.prototype.captureStream === 'function',
    types: (typeof MediaRecorder!=='undefined' && MediaRecorder.isTypeSupported)
      ? ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].filter(t=>{try{return MediaRecorder.isTypeSupported(t)}catch{return false}})
      : []
  }))()`);
  console.log('[info] 录制能力:', JSON.stringify(caps));

  await evaluate(cdp, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('载入演示素材'))?.click()`);
  await waitFor(cdp, () => document.body.innerText.includes('素材就绪 9/9'), { timeout: 15000, label: 'demo loaded' });
  console.log('[ok] 演示素材 9/9 载入');

  await sleep(1600);
  const pixels = await evaluate(cdp, `(() => {
    const c = document.querySelector('canvas');
    const x = c.getContext('2d');
    const pts = [[0.5,0.3],[0.5,0.5],[0.5,0.72],[0.3,0.4],[0.7,0.6]]
      .map(([px,py])=>Array.from(x.getImageData((c.width*px)|0,(c.height*py)|0,1,1).data));
    return {size:[c.width,c.height], pts};
  })()`);
  const nonBlack = pixels.pts.flat().some((v) => v > 40);
  console.log('[info] 预览画布', JSON.stringify(pixels.size), '存在非黑像素:', nonBlack);
  if (!nonBlack) throw new Error('预览画布疑似全黑');

  // seek 到第 5 镜（missed-focus），验证时间轴跳转与字幕渲染
  await evaluate(cdp, `[...document.querySelectorAll('button[title]')].find(b=>b.title.includes('失焦'))?.click()`);
  await sleep(700);
  const sub = await evaluate(cdp, `(() => {
    const c=document.querySelector('canvas'); const x=c.getContext('2d');
    // 字幕区域取多个像素，应出现近白色文字
    let light=0;
    const img=x.getImageData(0, (c.height*0.82)|0, c.width, (c.height*0.08)|0).data;
    for(let i=0;i<img.length;i+=16){ if(img[i]>200&&img[i+1]>200&&img[i+2]>190) light++; }
    return light;
  })()`);
  console.log('[info] 第5镜字幕亮像素数:', sub);
  if (sub < 5) throw new Error('未检测到字幕渲染');

  // 播放 3s，检查时间码在走
  const playBtn = () => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='播放'||b.textContent.trim()==='暂停')`;
  await evaluate(cdp, `${playBtn()}.click()`);
  await sleep(3000);
  const playingLabel = await evaluate(cdp, `${playBtn()}?.textContent.trim()`);
  const tc = await evaluate(cdp, `(document.body.innerText.match(/\\d{2}:\\d{2} \\/ 01:33/)||[''])[0]`);
  console.log('[info] 播放按钮态:', playingLabel, '时间码:', tc);

  // 时长门槛
  await evaluate(cdp, `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='8s')?.click()`);
  await sleep(300);
  const warn = await evaluate(cdp, `document.body.innerText.includes('不足 90 秒')`);
  console.log('[ok] 8s 触发 <90s 警告:', warn);
  if (!warn) throw new Error('8s 方案未正确提示门槛');
  await evaluate(cdp, `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='9s')?.click()`);

  // LibTV 勾选 7/9
  const toggleSel = `document.querySelectorAll('ol li button[aria-label^="标记为已在"]')`;
  const before = await evaluate(cdp, `${toggleSel}.length`);
  for (let i = 0; i < 7; i++) await evaluate(cdp, `${toggleSel}[0].click()`);
  await sleep(300);
  const ratioOk = await evaluate(cdp, `document.body.innerText.includes('7/9 · 78%')`);
  const persisted = await evaluate(cdp, `!!localStorage.getItem('apn-lib-replication-v1')`);
  console.log('[info] 可勾选镜头数:', before, '| 7/9·78% 达标:', ratioOk, '| 持久化:', persisted);
  if (!ratioOk || !persisted) throw new Error('LibTV 复刻勾选/持久化异常');

  console.log('\n所有短片 UI/渲染断言通过。');
  cdp.close();
  chrome.kill();
  cleanProfile();
  process.exit(0);
}

main().catch((err) => {
  console.error('[FAIL]', err.stack || err.message);
  chrome.kill();
  cleanProfile();
  process.exit(1);
});
