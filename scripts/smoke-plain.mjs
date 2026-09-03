// Smoke test: human-only mode in a plain Chrome profile (NO WebMCP flag).
// Page must still render, import, assess, and reset — proving no hard WebMCP dependency.
import { spawn } from 'node:child_process';

const PORT = 9333; // separate debug port, plain profile
const PROFILE = '/tmp/mp-plain-chrome-profile';
const APP_URL = 'http://localhost:8787/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jsonGet = async (url) => { const res = await fetch(url); if (!res.ok) throw new Error(`${url} -> ${res.status}`); return res.json(); };

const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-features=TranslateUI',
  '--headless=new', APP_URL,
], { stdio: 'ignore', detached: true });

try {
  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const list = await jsonGet(`http://127.0.0.1:${PORT}/json/list`);
      target = list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:8787'));
      if (target) break;
    } catch { /* wait */ }
  }
  if (!target) throw new Error('plain Chrome tab not found');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.reload');
  let ready = false;
  for (let i = 0; i < 20 && !ready; i++) {
    await sleep(500);
    const chk = await send('Runtime.evaluate', { expression: '!!(window.__mp)', returnByValue: true });
    ready = !!(chk.result && chk.result.result && chk.result.result.value);
  }

  const expr = `(() => {
    const R = {};
    R.modelContext = typeof document.modelContext;
    R.cardCount = document.querySelectorAll('.machine-card').length;
    R.toolList = document.querySelector('#tool-list').textContent;
    R.humanNotice = R.toolList.includes('Human-only');
    R.assessAtlasUA = __mp.assess('atlas-001', 'UNATTENDED_AI_WORKLOAD').OVERALL;
    R.assessBeaconUA = __mp.assess('beacon-02', 'UNATTENDED_AI_WORKLOAD').OVERALL;
    // import via UI function
    const imp = __mp.importText(JSON.stringify({
      schema_version: '0.1.0',
      machine: { id: 'plain-9', label: 'Plain Import', device_class: 'desktop', source_kind: 'IMPORTED' },
      facts: [
        { id: 'compute_class', domain: 'compute', value: 'desktop', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
        { id: 'ram_gb', domain: 'memory', value: 16, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
        { id: 'os_family', domain: 'os', value: 'linux', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
        { id: 'disk_encryption', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
        { id: 'general_qualification_record', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
      ],
      findings: [{ id: 'fl-1', severity: 'INFO', evidence_refs: ['ram_gb'], why_it_matters: 't', uncertainty: 'l', next_discriminator: 'n' }],
    }));
    R.importError = imp.error;
    R.cardCountAfterImport = document.querySelectorAll('.machine-card').length;
    R.importedVisible = document.querySelector('#machine-cards').textContent.includes('plain-9');
    // reset
    __mp.reset();
    R.cardCountAfterReset = document.querySelectorAll('.machine-card').length;
    // invalid import fails safely
    const bad = __mp.importText('{bad json');
    R.badImportRejected = !!bad.error;
    return R;
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log('=====SMOKE_PLAIN_BEGIN=====');
  console.log(JSON.stringify(r.result.result.value, null, 2));
  console.log('=====SMOKE_PLAIN_END=====');
  ws.close();
  const v = r.result.result.value;
  const ok = v.modelContext === 'undefined' && v.cardCount === 3 && v.humanNotice &&
    v.assessAtlasUA === 'NOT_READY' && v.assessBeaconUA === 'READY_WITH_LIMITATIONS' &&
    v.importError === null && v.cardCountAfterImport === 4 && v.importedVisible &&
    v.cardCountAfterReset === 3 && v.badImportRejected;
  process.exit(ok ? 0 : 2);
} finally {
  proc.unref();
}