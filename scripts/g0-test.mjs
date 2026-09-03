// G0 CDP driver: launches/attaches to Chrome on port 9222, evaluates window.__g0(),
// prints the JSON test result, exits nonzero on FAIL.
import { spawn } from 'node:child_process';

const DEBUG_PORT = 9222;
const APP_URL = 'http://localhost:8787/g0.html'; // G0 single-tool harness (dev page)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = new URL('../.chrome-test-profile', import.meta.url).pathname;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jsonGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

let chromeProc = null;

async function ensureChrome() {
  try {
    const v = await jsonGet(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    console.log('[g0] attached to running Chrome:', v.Browser || v.browser);
    return;
  } catch { /* not running */ }
  console.log('[g0] launching dedicated Chrome (WebMCP profile)...');
  chromeProc = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=TranslateUI',
    '--headless=new',
    APP_URL,
  ], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try { await jsonGet(`http://127.0.0.1:${DEBUG_PORT}/json/version`); return; } catch { /* wait */ }
  }
  throw new Error('Chrome did not open debugging port in time');
}

async function main() {
  await ensureChrome();

  // Find the g0.html tab, creating it if needed
  let target = null;
  for (let i = 0; i < 10; i++) {
    const list = await jsonGet(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    target = list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:8787/g0.html'));
    if (target) break;
    try {
      await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent('http://localhost:8787/g0.html')}`, { method: 'PUT' });
    } catch { /* may already exist */ }
    await sleep(500);
  }
  for (let i = 0; i < 20 && !target; i++) {
    const list = await jsonGet(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    target = list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:8787/g0.html'));
    if (!target) await sleep(500);
  }
  if (!target) throw new Error('App tab not found');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const msgId = ++id;
    pending.set(msgId, res);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.reload'); // always test the current code
  // Wait for module init to set window.__g0
  let ready = false;
  for (let i = 0; i < 20 && !ready; i++) {
    await sleep(500);
    const chk = await send('Runtime.evaluate', { expression: '!!window.__g0', returnByValue: true });
    ready = !!(chk.result && chk.result.result && chk.result.result.value);
  }
  if (!ready) {
    console.log('=====G0_RESULT_BEGIN=====');
    console.log(JSON.stringify({ overall: 'FAIL', steps: {}, detail: { reason: '__g0 not ready after reload' } }, null, 2));
    console.log('=====G0_RESULT_END=====');
    process.exit(2);
  }
  const expr = `__g0()`;
  const r = await send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  const value = r.result && r.result.result && r.result.result.value;
  console.log('=====G0_RESULT_BEGIN=====');
  console.log(JSON.stringify(value, null, 2));
  console.log('=====G0_RESULT_END=====');
  ws.close();
  const ok = value && value.overall === 'PASS';
  if (chromeProc) chromeProc.unref();
  process.exit(ok ? 0 : 2);
}

main().catch((e) => { console.error('[g0] FATAL:', e); process.exit(1); });