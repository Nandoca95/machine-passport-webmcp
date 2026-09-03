// Live smoke: clean Chrome profile (NO WebMCP flag) against the public live URL.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LIVE_URL = 'https://nandoca95.github.io/machine-passport-webmcp/';
const PORT = 9444;
const PROFILE = mkdtempSync(join(tmpdir(), 'mp-live-plain-'));

// Path guard: every URL the served HTML actually references must resolve on the live origin.
const idxRes = await fetch(LIVE_URL);
const idxText = await idxRes.text();
const refs = [...idxText.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('http') && !u.startsWith('#'));
const refResults = {};
for (const ref of refs) {
  const url = new URL(ref, LIVE_URL).href;
  const r = await fetch(url);
  refResults[ref] = { http: r.status, url };
}
const refsAll200 = Object.values(refResults).every((r) => r.http === 200);

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  LIVE_URL,
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jsonGet = async (url) => { const res = await fetch(url); if (!res.ok) throw new Error(`${url} -> ${res.status}`); return res.json(); };

let target = null;
for (let i = 0; i < 30; i++) {
  try {
    const list = await jsonGet(`http://127.0.0.1:${PORT}/json/list`);
    target = list.find((t) => t.type === 'page' && t.url.includes('machine-passport-webmcp'));
    if (target) break;
  } catch { /* chrome not up yet */ }
  await sleep(400);
}
if (!target) { console.log('SMOKE_PLAIN_BEGIN\n{"error":"tab not found"}\nSMOKE_PLAIN_END'); process.exit(3); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

let state = null;
for (let i = 0; i < 20; i++) {
  const r = await send('Runtime.evaluate', { expression: `(() => {
    if (!window.__mp) return null;
    const cards = document.querySelectorAll('#machine-cards .machine-card').length;
    const importArea = !!document.querySelector('#import-area, #import-json');
    return { title: document.title, hasModelContext: !!document.modelContext, cards, importArea, machines: __mp.state().machines.length };
  })()`, returnByValue: true });
  state = r.result.result.value;
  if (state) break;
  await sleep(500);
}
console.log('=======SMOKE_PLAIN_BEGIN=======');
console.log(JSON.stringify({ ...(state || { error: 'page state not ready', title: null }), refsChecked: refs, refsAll200 }, null, 2));
console.log('=======SMOKE_PLAIN_END=======');
ws.close();
chrome.kill('SIGKILL');
rmSync(PROFILE, { recursive: true, force: true });
process.exit(state && state.cards === 3 && refsAll200 ? 0 : 4);