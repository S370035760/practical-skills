// 无头端到端：载入演示素材 -> 导出 1080×1920 WebM -> ffprobe 校验时长/分辨率/编码。
// 用法：node tests/headless-export.mjs <wsModulePath> <chromePath> [baseUrl] [outDir]
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const wsPath = process.argv[2];
const chromePath = process.argv[3];
const baseUrl = process.argv[4] || 'http://localhost:5000';
const outDir = process.argv[5] || '/tmp/apn-dl';
if (!wsPath || !chromePath) {
  console.error('usage: node headless-export.mjs <wsPath> <chromePath> [baseUrl] [outDir]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const require = createRequire(import.meta.url);
const WebSocket = require(wsPath);

const PORT = 9337;
const PROFILE_DIR = `/tmp/apn-chrome-profile-export-${process.pid}`;
fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
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

function getJson(p) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
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
  throw new Error('chrome target not ready');
}

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
  let id = 0;
  const pending = new Map();
  const ready = new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  const events = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data.toString());
    if (msg.method) events.push(msg);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  };
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  function nextEvent(predicate, timeout = 120000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        const found = events.find(predicate);
        if (found) return resolve(found);
        if (Date.now() - start > timeout) return reject(new Error('event timeout'));
        setTimeout(tick, 300);
      };
      tick();
    });
  }
  return { ready, send, nextEvent, close: () => ws.close() };
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await waitForTarget();
  const cdp = cdpClient(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: outDir,
    eventsEnabled: true,
  });
  await cdp.send('Page.navigate', { url: `${baseUrl}/` });

  await sleep(7000); // hydration
  await evaluate(cdp, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('短片投稿模式')).click()`);
  await sleep(1200);
  await evaluate(cdp, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('载入演示素材')).click()`);
  await sleep(2500);
  const ready = await evaluate(cdp, `document.body.innerText.includes('素材就绪 9/9')`);
  console.log('[info] 素材就绪:', ready);
  if (!ready) throw new Error('演示素材未就绪');

  const t0 = Date.now();
  await evaluate(cdp, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('导出竖屏短片 WebM')).click()`);
  console.log('[info] 已点击导出，等待实时录制完成（~93s）…');

  const evt = await cdp.nextEvent(
    (m) => m.method === 'Browser.downloadProgress' && m.params?.state === 'completed',
    200000,
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const guid = evt.params.guid;
  // 轮询文件：completed 事件后文件名已落地
  let file = null;
  for (let i = 0; i < 30; i++) {
    const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.webm') && !f.endsWith('.crdownload'));
    if (files.length) {
      const sorted = files.sort((a, b) => fs.statSync(path.join(outDir, b)).mtimeMs - fs.statSync(path.join(outDir, a)).mtimeMs);
      file = path.join(outDir, sorted[0]);
      if (fs.statSync(file).size > 0) break;
    }
    await sleep(500);
  }
  if (!file) throw new Error('未发现导出的 webm 文件');
  console.log(`[ok] WebM 已下载: ${path.basename(file)} · ${(fs.statSync(file).size / 1024 / 1024).toFixed(2)}MB · 录制 ${elapsed}s · guid=${guid.slice(0, 8)}`);

  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,codec_name', '-show_entries', 'format=duration',
    '-of', 'default=nw=1', file], { encoding: 'utf8' });
  console.log('[ffprobe raw]\n' + probe.stdout.trim());
  const out = probe.stdout;
  if (!/width=1080/.test(out) || !/height=1920/.test(out)) throw new Error('分辨率不是 1080×1920');
  const codec = /codec_name=(\S+)/.exec(out)?.[1];

  // MediaRecorder 的流式 WebM 通常缺少 duration 元数据（raw duration=N/A），
  // remux（不解码）后由最后一帧时间戳得到准确时长，与 Chrome 下载的原文件播放时长一致。
  const remux = path.join(outDir, 'remux-check.webm');
  const fm = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', file, '-c', 'copy', remux], { encoding: 'utf8' });
  if (fm.status !== 0) throw new Error('ffmpeg remux 失败：' + fm.stderr);
  const pf = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1', remux], { encoding: 'utf8' });
  const dur = Number(/duration=([\d.]+)/.exec(pf.stdout)?.[1] ?? 0);
  if (dur < 90) throw new Error(`时长 ${dur}s 不足 90s`);
  console.log(`[ok] 分辨率 1080×1920，编码 ${codec}，容器时长 ${dur.toFixed(1)}s ≥ 90s`);
  console.log('EXPORT_E2E_PASS');
  cdp.close();
  chrome.kill();
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  process.exit(0);
}

main().catch((err) => {
  console.error('[FAIL]', err.stack || err.message);
  chrome.kill();
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  process.exit(1);
});
