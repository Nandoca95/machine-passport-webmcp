// WebMCP checks (G2): 5 tools discoverable, annotations, distinct schemas/descriptions,
// direct calls, primary journey through executeTool, shared UI state, human review, reset, lifecycle.
import { fileURLToPath } from 'node:url';
const PROFILE = new URL('../.chrome-test-profile', import.meta.url).pathname;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;
const APP_URL = 'http://localhost:8787/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jsonGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

let chromeProc = null;
async function ensureChrome() {
  try { await jsonGet(`http://127.0.0.1:${DEBUG_PORT}/json/version`); return; } catch { /* start */ }
  const { spawn } = await import('node:child_process');
  chromeProc = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--disable-features=TranslateUI',
    '--headless=new', APP_URL,
  ], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 40 && chromeProc.exitCode === null; i++) {
    await sleep(500);
    try { await jsonGet(`http://127.0.0.1:${DEBUG_PORT}/json/version`); return; } catch { /* wait */ }
  }
  throw new Error('Chrome did not open debugging port');
}

async function main() {
  await ensureChrome();
  let target = null;
  for (let i = 0; i < 30; i++) {
    const list = await jsonGet(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    target = list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:8787'));
    if (target) break;
    await sleep(500);
  }
  if (!target) throw new Error('App tab not found');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pend = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.reload');
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    await sleep(500);
    const chk = await send('Runtime.evaluate', { expression: '!!(window.__mp)', returnByValue: true });
    ready = !!(chk.result && chk.result.result && chk.result.result.value);
  }
  if (!ready) throw new Error('__mp not ready');

  const expr = `(async () => {
    const R = { details: {} };
    const tools = await document.modelContext.getTools();
    R.toolNames = tools.map((t) => t.name).sort();
    const exact5 = ['assess_role_readiness','compare_machines','get_machine_passport','list_machines','stage_change_proposal'];
    R.exactFive = JSON.stringify(R.toolNames) === JSON.stringify(exact5);
    R.descriptionsUniqueCount = new Set(tools.map((t) => t.description)).size;
    R.descriptionsAllNonEmpty = tools.every((t) => typeof t.description === 'string' && t.description.length > 20);
    R.schemasDistinctCount = new Set(tools.map((t) => String(t.inputSchema))).size;
    R.annotations = Object.fromEntries(tools.map((t) => [t.name, t.annotations]));
    R.readOnlyExpected = {
      list_machines: true, get_machine_passport: true, assess_role_readiness: true, compare_machines: true, stage_change_proposal: false,
    };
    R.annotationsCorrect = tools.every((t) =>
      (t.annotations.readOnlyHint === R.readOnlyExpected[t.name]) &&
      (t.annotations.untrustedContentHint === true));

    const call = async (name, args) => {
      const t = tools.find((x) => x.name === name);
      if (!t) return { ok: false, error: 'tool not found' };
      try {
        const out = await document.modelContext.executeTool(t, JSON.stringify(args));
        const s = String(out);
        let parsed = null;
        try { parsed = JSON.parse(s); } catch { /* non-json */ }
        return { ok: out !== null && out !== undefined, len: s.length, parsedType: parsed ? typeof parsed : null };
      } catch (e) { return { ok: false, error: String(e).slice(0, 160) }; }
    };

    R.direct = {};
    R.direct.list_machines = await call('list_machines', {});
    R.direct.get_machine_passport = await call('get_machine_passport', { machine_id: 'atlas-001' });
    R.direct.assess_role_readiness = await call('assess_role_readiness', { machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD' });
    R.direct.compare_machines = await call('compare_machines', { machine_ids: ['atlas-001', 'beacon-02', 'relay-04'], role_id: 'UNATTENDED_AI_WORKLOAD' });
    R.direct.stage_change_proposal = await call('stage_change_proposal', {
      machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'atl-qual-gap',
      proposal_kind: 'PLAN_QUALIFICATION_TEST', summary: 'Run a supervised qualification drill for unattended recovery.',
      acceptance_criterion: 'Recovery drill passes twice in a row.', verification: 'Read the qualification record.',
      rollback_note: 'No machine change; Atlas stays out of unattended duty until PASS.',
    });
    R.directAllOk = Object.values(R.direct).every((c) => c.ok === true);
    R.compactReturns = Object.values(R.direct).every((c) => c.len > 0 && c.len < 20000);
    R.parsedJson = Object.values(R.direct).every((c) => c.parsedType === 'object');

    // Clean slate for the journey (drop the direct-call proposals)
    __mp.reset();

    // ---- primary journey through the SAME tool surface an agent uses ----
    const j = {};
    const jList = JSON.parse(await document.modelContext.executeTool(tools.find((t) => t.name === 'list_machines'), '{}'));
    j.listCount = jList.machines.length;
    const jPass = JSON.parse(await document.modelContext.executeTool(tools.find((t) => t.name === 'get_machine_passport'), JSON.stringify({ machine_id: 'atlas-001' })));
    j.passportOk = jPass.machine.id === 'atlas-001' && Array.isArray(jPass.facts) && Array.isArray(jPass.findings);
    const jAssess = JSON.parse(await document.modelContext.executeTool(tools.find((t) => t.name === 'assess_role_readiness'), JSON.stringify({ machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD' })));
    j.assessBlocked = jAssess.OVERALL === 'NOT_READY' && jAssess.blockers.includes('atl-qual-gap');
    const jCmp = JSON.parse(await document.modelContext.executeTool(tools.find((t) => t.name === 'compare_machines'), JSON.stringify({ machine_ids: ['atlas-001', 'beacon-02', 'relay-04'], role_id: 'UNATTENDED_AI_WORKLOAD' })));
    j.compareSafest = jCmp.tradeoff.safest && jCmp.tradeoff.safest.machine_id === 'beacon-02';
    j.compareNext = jCmp.tradeoff.smallest_safe_next_step && jCmp.tradeoff.smallest_safe_next_step.proposal_kind === 'PLAN_QUALIFICATION_TEST';
    const jStage = JSON.parse(await document.modelContext.executeTool(tools.find((t) => t.name === 'stage_change_proposal'), JSON.stringify({
      machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'atl-qual-gap',
      proposal_kind: 'PLAN_QUALIFICATION_TEST', summary: 'Run a supervised qualification drill for unattended recovery.',
      acceptance_criterion: 'Recovery drill passes twice in a row.', verification: 'Read the qualification record.',
      rollback_note: 'No machine change; Atlas stays out of unattended duty until PASS.',
    })));
    j.stageNotExecuted = jStage.execution_state === 'NOT_EXECUTED' && jStage.review_state === 'STAGED';
    j.journeyComplete = j.listCount === 3 && j.passportOk && j.assessBlocked && j.compareSafest && j.compareNext && j.stageNotExecuted;
    R.journey = j;

    // ---- WebMCP action visibly changes the SAME app state the human sees ----
    const machinesBefore = JSON.stringify(__mp.state().machines);
    R.ui = {
      proposalVisible: document.querySelector('#proposals').textContent.includes(jStage.proposal_id),
      notExecutedVisible: document.querySelector('#proposals').textContent.includes('NOT_EXECUTED'),
      stageLineVisible: document.querySelector('#activity').textContent.includes('stage_change_proposal'),
    };
    // human approve (UI-only), scoped to the journey's proposal item
    const proposalItem = [...document.querySelectorAll('#proposals .proposal')].find((n) => n.textContent.includes(jStage.proposal_id));
    [...proposalItem.querySelectorAll('button')].find((b) => b.textContent.includes('Approve')).click();
    R.ui.approvedShown = document.querySelector('#proposals').textContent.includes('APPROVED_FOR_REVIEW');
    const approved = __mp.state().proposals.find((p) => p.proposal_id === jStage.proposal_id);
    R.ui.approvedReviewState = approved.review_state === 'APPROVED_FOR_REVIEW';
    R.ui.approvedKeepsNotExecuted = approved.execution_state === 'NOT_EXECUTED';
    R.ui.machinesUnchangedByReview = JSON.stringify(__mp.state().machines) === machinesBefore;

    // ---- reset ----
    __mp.reset();
    R.reset = __mp.state().machines.length === 3 && __mp.state().proposals.length === 0;
    R.uiAfterReset = document.querySelector('#proposals').textContent.includes('No proposals yet');

    // ---- registration lifecycle on the 5-tool set ----
    const L = {};
    const beforeLife = await document.modelContext.getTools();
    L.beforeCount = beforeLife.length;
    __mp.toolLifecycle.unregister('stage_change_proposal');
    const afterAbort = await document.modelContext.getTools();
    L.goneAfterAbort = !afterAbort.some((t) => t.name === 'stage_change_proposal');
    await __mp.toolLifecycle.registerAll();
    const afterRereg = await document.modelContext.getTools();
    L.countAfterRereg = afterRereg.length;
    L.reregClean = afterRereg.length === 5 && afterRereg.filter((t) => t.name === 'stage_change_proposal').length === 1;
    R.lifecycle = L;

    // re-stage the journey proposal so the page ends in demo state for humans
    const finalTools = await document.modelContext.getTools();
    await document.modelContext.executeTool(finalTools.find((t) => t.name === 'stage_change_proposal'), JSON.stringify({
      machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'atl-qual-gap',
      proposal_kind: 'PLAN_QUALIFICATION_TEST', summary: 'Run a supervised qualification drill for unattended recovery.',
      acceptance_criterion: 'Recovery drill passes twice in a row.', verification: 'Read the qualification record.',
      rollback_note: 'No machine change; Atlas stays out of unattended duty until PASS.',
    }));
    R.finalStagedProposalVisible = document.querySelector('#proposals').textContent.includes('PLAN_QUALIFICATION_TEST');

    const req = ['exactFive', 'descriptionsUniqueCount', 'descriptionsAllNonEmpty', 'schemasDistinctCount', 'annotationsCorrect', 'directAllOk', 'compactReturns', 'parsedJson', 'journey', 'ui', 'reset', 'lifecycle'];
    R.checks = {
      exactFive: R.exactFive,
      descriptions: R.descriptionsUniqueCount === 5 && R.descriptionsAllNonEmpty,
      schemasDistinct: R.schemasDistinctCount === 5,
      annotationsCorrect: R.annotationsCorrect,
      directAllOk: R.directAllOk && R.compactReturns && R.parsedJson,
      journey: R.journey.journeyComplete,
      sharedUIState: Object.values(R.ui).every(Boolean),
      reset: R.reset && R.uiAfterReset,
      lifecycle: Object.values(R.lifecycle).every(Boolean),
      finalDemoState: R.finalStagedProposalVisible,
    };
    R.overall = Object.values(R.checks).every(Boolean) ? 'PASS' : 'FAIL';
    R.failed = Object.entries(R.checks).filter(([, v]) => !v).map(([k]) => k);
    return R;
  })()`;

  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) {
    console.log('CHECK_EXCEPTION', JSON.stringify(r.result.exceptionDetails, null, 2));
    process.exit(3);
  }
  console.log('=====WEBMCP_CHECK_BEGIN=====');
  console.log(JSON.stringify(r.result.result.value, null, 2));
  console.log('=====WEBMCP_CHECK_END=====');
  ws.close();
  if (chromeProc) chromeProc.unref();
  process.exit(r.result.result.value.overall === 'PASS' ? 0 : 2);
}

main().catch((e) => { console.error('[webmcp-check] FATAL:', e); process.exit(1); });