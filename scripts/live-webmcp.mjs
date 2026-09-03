// Live WebMCP judge-path probe: flag-enabled Chrome against the public live URL.
// Checks: modelContext exists -> getTools -> executeTool (deterministic) ->
// stage_change_proposal visible in shared UI state.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, copyFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LIVE_URL = 'https://nandoca95.github.io/machine-passport-webmcp/';
const PORT = 9223;
const SRC_PROFILE = '/Users/hernandocalderon/tricalguar/machine-passport-webmcp/.chrome-test-profile';
const PROFILE = mkdtempSync(join(tmpdir(), 'mp-live-webmcp-'));
cpSync(SRC_PROFILE, PROFILE, { recursive: true }); // preserves flag-seeded Local State

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
  } catch { /* not up yet */ }
  await sleep(400);
}
if (!target) { console.log('LIVE_WEBMCP_BEGIN\n{"error":"tab not found"}\nLIVE_WEBMCP_END'); process.exit(3); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable');

const expr = `(async () => {
  const out = { url: location.href, hasModelContext: !!document.modelContext };
  if (!document.modelContext) return out;
  const tools = await document.modelContext.getTools();
  out.toolCount = tools.length;
  out.toolNames = tools.map((t) => t.name).sort();
  const byName = (n) => tools.find((t) => t.name === n);
  const listRaw = await document.modelContext.executeTool(byName('list_machines'), '{}');
  out.listDiscoverable = typeof listRaw === 'string' && JSON.parse(listRaw).machines.length === 3;
  const assessRaw = await document.modelContext.executeTool(byName('assess_role_readiness'), JSON.stringify({ machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD' }));
  out.assessDeterministic = JSON.parse(assessRaw).OVERALL === 'NOT_READY';
  const stageRaw = await document.modelContext.executeTool(byName('stage_change_proposal'), JSON.stringify({
    machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'atl-qual-gap',
    proposal_kind: 'PLAN_QUALIFICATION_TEST', summary: 'Live judge-path proposal.',
    acceptance_criterion: 'Drill passes twice.', verification: 'Read record.', rollback_note: 'None.',
  }));
  const staged = JSON.parse(stageRaw);
  out.stageNotExecuted = staged.execution_state === 'NOT_EXECUTED' && staged.review_state === 'STAGED';
  out.proposalVisibleInUI = document.querySelector('#proposals').textContent.includes(staged.proposal_id);
  out.sharedUIState = out.stageNotExecuted && out.proposalVisibleInUI;
  try { byName('get_machine_passport'); } catch {}
  return out;
})()`;

const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
console.log('=======LIVE_WEBMCP_BEGIN=======');
if (r.result.exceptionDetails) console.log(JSON.stringify({ exception: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }, null, 2));
else console.log(JSON.stringify(r.result.result.value, null, 2));
console.log('=======LIVE_WEBMCP_END=======');
ws.close();
chrome.kill('SIGKILL');
rmSync(PROFILE, { recursive: true, force: true });
process.exit(0);