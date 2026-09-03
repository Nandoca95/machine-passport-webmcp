// Machine Passport — WebMCP product app (v0.1)
// 5 exact WebMCP tools over the SAME app state the human page renders.
// Trust boundary: imported JSON is strictly validated; all rendering uses textContent.
import {
  SCHEMA_VERSION,
  ASSESSMENT_POLICY_VERSION,
  ROLES,
  DIMENSIONS,
  PROPOSAL_KINDS,
  assessRole,
  compareMachines,
  listMachinesSummary,
  compactPassport,
  ruleTable,
} from './domain.js';
import { defaultAppState } from './fixtures.js';
import {
  importPassport,
  createProposal,
  setProposalReview,
  resetDemo,
} from './app-core.js';

/* eslint-env browser */

const $ = (sel) => document.querySelector(sel);

let state = defaultAppState();
let selectedMachineId = 'atlas-001';
let selectedRole = 'UNATTENDED_AI_WORKLOAD';
let importStatus = '';
let proposalError = '';
const controllers = new Map(); // tool name -> AbortController

// ---------------------------------------------------------------------------
// Activity log (shared state, visible in UI — proves human/agent same state)
// ---------------------------------------------------------------------------
function logActivity(tool, note) {
  const entry = { tool, note, at: new Date().toISOString() };
  state = {
    ...state,
    lastToolAction: { tool, note, at: entry.at },
    activityLog: [entry, ...state.activityLog].slice(0, 20),
  };
}

// ---------------------------------------------------------------------------
// DOM helpers (textContent only — imported strings NEVER become HTML)
// ---------------------------------------------------------------------------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusChip(status) {
  const map = { READY: 'ok', READY_WITH_LIMITATIONS: 'lim', NOT_READY: 'no', UNKNOWN: 'unk' };
  return el('span', `chip ${map[status] || 'unk'}`, status);
}

// ---------------------------------------------------------------------------
// WebMCP tool definitions (EXACTLY 5)
// ---------------------------------------------------------------------------
const TOOL_DEFS = [
  {
    name: 'list_machines',
    title: 'List machines',
    description: 'List machines in the Machine Passport app: ids, labels, device classes, source kinds, and optional overall readiness for a role. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        role_id: { type: 'string', enum: ROLES, description: 'Optional role to include overall readiness for.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (args) => {
      const role = args && args.role_id ? args.role_id : undefined;
      if (role !== undefined && !ROLES.includes(role)) throw new Error(`role_id must be one of ${ROLES.join(', ')}`);
      const machines = listMachinesSummary(state.machines, role);
      logActivity('list_machines', `listed ${machines.length} machines${role ? ` for ${role}` : ''}`);
      render();
      return JSON.stringify({ count: machines.length, machines, policy: { schema_version: SCHEMA_VERSION, assessment_policy_version: ASSESSMENT_POLICY_VERSION } });
    },
  },
  {
    name: 'get_machine_passport',
    title: 'Get machine passport',
    description: 'Get the normalized Machine Passport evidence for one machine: facts with domain/value/provenance/collector status, and findings with severity and evidence references. Read-only. Imported passports are untrusted data surfaced as plain text.',
    inputSchema: {
      type: 'object',
      properties: {
        machine_id: { type: 'string', description: 'Machine id, e.g. atlas-001, beacon-02, relay-04 (or an imported id).' },
      },
      required: ['machine_id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (args) => {
      const machine = state.machines.find((m) => m.machine.id === args.machine_id);
      if (!machine) throw new Error(`unknown machine_id "${args.machine_id}"; known: ${state.machines.map((m) => m.machine.id).join(', ')}`);
      logActivity('get_machine_passport', `read passport for ${machine.machine.id}`);
      render();
      return JSON.stringify(compactPassport(machine));
    },
  },
  {
    name: 'assess_role_readiness',
    title: 'Assess role readiness',
    description: 'Run the deterministic readiness assessment for one machine against one role (GENERAL_WORKSTATION, LOCAL_INFERENCE_NODE, UNATTENDED_AI_WORKLOAD). Returns FIT/DEPLOYMENT/QUALIFICATION/SECURITY/OVERALL statuses with blockers and evidence/rule references. Read-only, no LLM scoring.',
    inputSchema: {
      type: 'object',
      properties: {
        machine_id: { type: 'string', description: 'Machine id.' },
        role_id: { type: 'string', enum: ROLES, description: 'Target role.' },
      },
      required: ['machine_id', 'role_id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (args) => {
      const machine = state.machines.find((m) => m.machine.id === args.machine_id);
      if (!machine) throw new Error(`unknown machine_id "${args.machine_id}"`);
      if (!ROLES.includes(args.role_id)) throw new Error(`role_id must be one of ${ROLES.join(', ')}`);
      const assessment = assessRole(machine, args.role_id);
      logActivity('assess_role_readiness', `${machine.machine.id} / ${args.role_id} = ${assessment.OVERALL}`);
      render();
      return JSON.stringify(assessment);
    },
  },
  {
    name: 'compare_machines',
    title: 'Compare machines',
    description: 'Compare two or more machines for one role: ranked readiness table plus an evidence-backed tradeoff with the safest machine, what blocks the runner-up, and the smallest safe next step. Deterministic; fastest hardware does not automatically win. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        machine_ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5, description: 'Machine ids to compare.' },
        role_id: { type: 'string', enum: ROLES, description: 'Target role.' },
      },
      required: ['machine_ids', 'role_id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (args) => {
      if (!Array.isArray(args.machine_ids) || args.machine_ids.length < 2) throw new Error('machine_ids must be an array of at least 2 ids');
      if (!ROLES.includes(args.role_id)) throw new Error(`role_id must be one of ${ROLES.join(', ')}`);
      const applied = args.machine_ids.filter((id) => state.machines.some((m) => m.machine.id === id));
      const result = compareMachines(state.machines, applied.length ? applied : args.machine_ids, args.role_id);
      logActivity('compare_machines', `compared ${args.machine_ids.join(', ')} for ${args.role_id}`);
      render();
      return JSON.stringify(result);
    },
  },
  {
    name: 'stage_change_proposal',
    title: 'Stage change proposal',
    description: 'Stage a change proposal for one machine. Choose a machine, role, an existing finding on that machine, and a proposal kind: COLLECT_MORE_EVIDENCE, REVIEW_CONFIGURATION, or PLAN_QUALIFICATION_TEST. Changes APP STATE ONLY: proposal is created with execution_state=NOT_EXECUTED and review_state=STAGED; a human later Approves for Review or Rejects in the UI. No machine action is ever executed.',
    inputSchema: {
      type: 'object',
      properties: {
        machine_id: { type: 'string', description: 'Machine id.' },
        role_id: { type: 'string', enum: ROLES, description: 'Role context.' },
        finding_id: { type: 'string', description: 'Existing finding id on that machine that this proposal addresses.' },
        proposal_kind: { type: 'string', enum: PROPOSAL_KINDS, description: 'Kind of staged action.' },
        summary: { type: 'string', description: 'What will be done (1..500 chars).' },
        acceptance_criterion: { type: 'string', description: 'How success is measured (1..500 chars).' },
        verification: { type: 'string', description: 'How the change will be verified (1..500 chars).' },
        rollback_note: { type: 'string', description: 'Why/rollback note: machine state untouched (1..500 chars).' },
      },
      required: ['machine_id', 'role_id', 'finding_id', 'proposal_kind', 'summary', 'acceptance_criterion', 'verification', 'rollback_note'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute: async (args) => {
      const res = createProposal(state, { ...args, staged_by: 'AGENT' });
      if (res.error) throw new Error(res.error);
      state = res.state;
      logActivity('stage_change_proposal', `staged ${res.proposal.proposal_id} (${res.proposal.proposal_kind}) for ${res.proposal.machine_id}`);
      render();
      return JSON.stringify(res.proposal);
    },
  },
];

// ---------------------------------------------------------------------------
// WebMCP registration lifecycle (AbortController; no React, single registration)
// ---------------------------------------------------------------------------
async function registerAllTools() {
  if (!document.modelContext) return;
  for (const def of TOOL_DEFS) {
    const controller = new AbortController();
    controllers.set(def.name, controller);
    try {
      await document.modelContext.registerTool(def, { signal: controller.signal });
    } catch (e) {
      console.error('[webmcp] register failed', def.name, e);
    }
  }
}

// ---------------------------------------------------------------------------
// UI rendering (fresh from state on every change)
// ---------------------------------------------------------------------------
function render() {
  renderMachineCards();
  renderDetail();
  renderRoleTabs();
  renderReadiness();
  renderCompare();
  renderProposals();
  renderActivity();
}

function renderMachineCards() {
  const box = $('#machine-cards');
  box.textContent = '';
  const summary = listMachinesSummary(state.machines, selectedRole);
  for (const m of summary) {
    const card = el('button', `machine-card ${m.id === selectedMachineId ? 'selected' : ''}`);
    card.type = 'button';
    const head = el('div', 'mc-head');
    head.append(el('span', 'mc-id', m.id), el('span', `chip ${m.source_kind === 'SYNTHETIC' ? 'syn' : 'imp'}`, m.source_kind));
    card.append(head, el('div', 'mc-label', m.label), el('div', 'mc-class', m.device_class));
    if (m.overall) card.append(el('div', 'mc-overall', `Overall (${roleShort(selectedRole)}):`), statusChip(m.overall));
    card.addEventListener('click', () => { selectedMachineId = m.id; render(); });
    box.append(card);
  }
}

function roleShort(role) {
  return { GENERAL_WORKSTATION: 'GW', LOCAL_INFERENCE_NODE: 'LI', UNATTENDED_AI_WORKLOAD: 'UA' }[role] || role;
}

function renderDetail() {
  const box = $('#detail');
  box.textContent = '';
  const machine = state.machines.find((m) => m.machine.id === selectedMachineId);
  if (!machine) { box.append(el('p', 'muted', 'No machine selected.')); return; }
  const meta = el('div', 'detail-meta');
  meta.append(
    el('span', 'chip', machine.machine.source_kind),
    el('span', 'muted', `${machine.machine.device_class}${machine.machine.capture_timestamp ? ' · captured ' + machine.machine.capture_timestamp : ''}`),
    el('span', 'muted', `schema ${machine.schema_version}`),
  );
  box.append(el('h3', null, `${machine.machine.label} — ${machine.machine.id}`), meta);

  const facts = el('table', 'table');
  // build header properly
  const thead = el('thead', null, '');
  const trh = el('tr', null, '');
  for (const h of ['Fact id', 'Domain', 'Value', 'Unit', 'Provenance', 'Collector']) trh.append(el('th', null, h));
  thead.append(trh);
  facts.append(thead);
  const tbody = el('tbody', null, '');
  for (const f of machine.facts) {
    const tr = el('tr', null, '');
    const statusCell = f.collector_status === 'OK'
      ? el('td', 'chip ok', f.collector_status)
      : el('td', 'chip unk', `${f.collector_status}${f.unavailable_reason ? ' — ' + f.unavailable_reason.slice(0, 60) : ''}`);
    tr.append(
      el('td', 'mono', f.id),
      el('td', null, f.domain),
      el('td', 'mono', String(f.value)),
      el('td', 'muted', f.unit || ''),
      el('td', null, f.provenance),
      statusCell,
    );
    tbody.append(tr);
  }
  facts.append(tbody);
  box.append(facts);

  const findings = el('div', 'findings');
  findings.append(el('h4', null, 'Findings'));
  for (const fn of machine.findings) {
    const severity = { INFO: 'info', WARNING: 'warn', BLOCKER: 'block' }[fn.severity] || 'info';
    const item = el('div', `finding ${severity}`);
    const head = el('div', 'finding-head');
    head.append(el('span', `chip ${severity}`, fn.severity), el('span', 'mono', fn.id));
    item.append(head, el('div', null, fn.why_it_matters));
    item.append(el('div', 'muted small', `uncertainty: ${fn.uncertainty} · next: ${fn.next_discriminator} · evidence: ${fn.evidence_refs.join(', ')}`));
    findings.append(item);
  }
  box.append(findings);
}

function renderRoleTabs() {
  const box = $('#role-tabs');
  box.textContent = '';
  for (const role of ROLES) {
    const b = el('button', `tab ${role === selectedRole ? 'active' : ''}`, role);
    b.type = 'button';
    b.addEventListener('click', () => { selectedRole = role; render(); });
    box.append(b);
  }
}

function renderReadiness() {
  const box = $('#readiness');
  box.textContent = '';
  const machine = state.machines.find((m) => m.machine.id === selectedMachineId);
  if (!machine) { box.append(el('p', 'muted', 'Select a machine.')); return; }
  const a = assessRole(machine, selectedRole);
  const grid = el('div', 'dims');
  for (const dim of DIMENSIONS) {
    const d = a.dimension_detail[dim];
    const cell = el('div', 'dim');
    cell.append(el('div', 'dim-name', dim), statusChip(d.status));
    cell.append(el('div', 'muted small', `rules: ${d.rule_refs.join(', ')}`));
    cell.append(el('div', 'muted small', `evidence: ${d.evidence_refs.join(', ')}`));
    grid.append(cell);
  }
  const overall = el('div', 'dim overall');
  overall.append(el('div', 'dim-name', 'OVERALL'), statusChip(a.OVERALL));
  grid.append(overall);
  box.append(grid);

  box.append(el('p', 'small', `policy ${a.assessment_policy_version} · role ${a.role_id}`));
  if (a.blockers.length) {
    const b = el('div', 'blockers');
    b.append(el('h4', null, 'Blockers / open evidence'));
    for (const id of a.blockers) {
      const fn = machine.findings.find((f) => f.id === id);
      b.append(el('div', 'finding block', `[${id}] ${fn ? fn.why_it_matters : ''}`));
    }
    box.append(b);
  }
}

function renderCompare() {
  const box = $('#compare');
  box.textContent = '';
  const ids = state.machines.map((m) => m.machine.id);
  if (ids.length < 1) { box.append(el('p', 'muted', 'No machines.')); return; }
  let cmp;
  try {
    cmp = compareMachines(state.machines, ids, selectedRole);
  } catch (e) {
    box.append(el('p', 'muted', `compare error: ${e.message}`));
    return;
  }
  const tbl = el('table', 'table');
  const thead = el('thead', null, '');
  const trh = el('tr', null, '');
  for (const h of ['Rank', 'Machine', 'Overall', 'Blockers']) trh.append(el('th', null, h));
  thead.append(trh);
  tbl.append(thead);
  const tbody = el('tbody', null, '');
  cmp.ranked.forEach((r, i) => {
    const tr = el('tr', null, '');
    const overallTd = el('td', null, '');
    overallTd.append(statusChip(r.overall));
    tr.append(el('td', 'mono', String(i + 1)), el('td', null, `${r.label} (${r.machine_id})`), overallTd, el('td', 'muted small', r.blockers.join(', ') || '—'));
    tbody.append(tr);
  });
  tbl.append(tbody);
  box.append(tbl);

  const t = el('div', 'tradeoff');
  t.append(el('h4', null, 'Evidence-backed tradeoff'));
  t.append(el('p', null, t.note = cmp.tradeoff.note));
  if (cmp.tradeoff.safest) t.append(el('p', null, `Safest: ${cmp.tradeoff.safest.machine_id} — ${cmp.tradeoff.safest.why}`));
  if (cmp.tradeoff.runner_up) {
    t.append(el('p', null, `Runner-up: ${cmp.tradeoff.runner_up.machine_id} — ${cmp.tradeoff.runner_up.why_blocked} blockers: ${(cmp.tradeoff.runner_up.blockers || []).join(', ') || 'none'}`));
  }
  if (cmp.tradeoff.smallest_safe_next_step) {
    const n = cmp.tradeoff.smallest_safe_next_step;
    t.append(el('p', 'small', `Smallest safe next step: ${n.proposal_kind} on ${n.machine_id}${n.finding_id ? ' (' + n.finding_id + ')' : ''} — ${n.summary}`));
  }
  box.append(t);
}

function renderProposals() {
  const box = $('#proposals');
  box.textContent = '';
  if (state.proposals.length === 0) {
    box.append(el('p', 'muted', 'No proposals yet. An agent can stage one with stage_change_proposal.'));
    return;
  }
  if (proposalError) box.append(el('p', 'fail-text', proposalError));
  for (const p of state.proposals) {
    const item = el('div', 'proposal');
    const head = el('div', 'proposal-head');
    head.append(el('span', 'mono', p.proposal_id), el('span', 'chip', p.proposal_kind),
      el('span', `chip ${p.review_state === 'STAGED' ? 'lim' : p.review_state === 'APPROVED_FOR_REVIEW' ? 'ok' : 'no'}`, p.review_state),
      el('span', 'chip', `exec: ${p.execution_state}`));
    item.append(head);
    item.append(el('div', null, `${p.machine_id} · ${p.role_id} · finding ${p.finding_id}`));
    item.append(el('div', 'small', p.summary));
    item.append(el('div', 'muted small', `accept: ${p.acceptance_criterion}`));
    item.append(el('div', 'muted small', `verify: ${p.verification}`));
    item.append(el('div', 'muted small', `rollback: ${p.rollback_note}`));
    const actions = el('div', 'row');
    const approve = el('button', 'btn', 'Approve for Review');
    approve.type = 'button';
    approve.addEventListener('click', () => { proposalError = ''; const res = setProposalReview(state, p.proposal_id, 'APPROVE_FOR_REVIEW'); if (res.error) { proposalError = res.error; } else { state = res.state; logActivity('human', `approved ${p.proposal_id} for review`); } render(); });
    const reject = el('button', 'btn btn-danger', 'Reject');
    reject.type = 'button';
    reject.addEventListener('click', () => { proposalError = ''; const res = setProposalReview(state, p.proposal_id, 'REJECT'); if (res.error) { proposalError = res.error; } else { state = res.state; logActivity('human', `rejected ${p.proposal_id}`); } render(); });
    actions.append(approve, reject);
    item.append(actions);
    box.append(item);
  }
}

function renderActivity() {
  const box = $('#activity');
  box.textContent = '';
  if (state.lastToolAction) {
    box.append(el('p', 'small', `Last action: [${state.lastToolAction.tool}] ${state.lastToolAction.note}`));
  }
  if (!state.activityLog.length) {
    box.append(el('p', 'muted', 'No agent activity yet.'));
  } else {
    const ul = el('ul', 'log');
    for (const e of state.activityLog.slice(0, 6)) {
      ul.append(el('li', 'small', `${e.at} [${e.tool}] ${e.note}`));
    }
    box.append(ul);
  }
  const tools = TOOL_DEFS.map((t) => t.name).join(', ');
  $('#tool-list').textContent = document.modelContext
    ? `WebMCP tools registered (5): ${tools}. Shared state, read-only except stage_change_proposal (app state only).`
    : 'WebMCP not available in this browser (Chrome 149+ with chrome://flags/#enable-webmcp-testing). Human-only mode: the app, imports, and review fully work without agents.';
}

// ---------------------------------------------------------------------------
// Human controls: import + reset
// ---------------------------------------------------------------------------
function handleImport() {
  const text = $('#import-text').value;
  const res = importPassport(state, text);
  if (res.error) {
    importStatus = res.error;
  } else {
    importStatus = `Imported ${res.machine.machine.id} (${res.machine.machine.label}) — ${res.machine.facts.length} facts, ${res.machine.findings.length} findings.`;
    state = res.state;
    selectedMachineId = res.machine.machine.id;
    $('#import-text').value = '';
  }
  render();
}

function handleReset() {
  state = resetDemo(state);
  selectedMachineId = 'atlas-001';
  importStatus = 'Demo reset to the 3 synthetic fixtures.';
  proposalError = '';
  render();
}

function bindControls() {
  $('#import-btn').addEventListener('click', handleImport);
  $('#reset-btn').addEventListener('click', handleReset);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
(async function init() {
  bindControls();
  await registerAllTools();
  render();
  window.__mp = {
    state: () => state,
    selectedRole: () => selectedRole,
    tools: () => TOOL_DEFS.map((t) => t.name),
    assess: (machineId, roleId) => {
      const m = state.machines.find((x) => x.machine.id === machineId);
      return m ? assessRole(m, roleId) : null;
    },
    compare: (roleId) => compareMachines(state.machines, state.machines.map((m) => m.machine.id), roleId),
    importText: (text) => { const r = importPassport(state, text); if (!r.error) { state = r.state; selectedMachineId = r.machine.machine.id; } render(); return r; },
    reset: handleReset,
    toolLifecycle: {
      unregister: (name) => { const c = controllers.get(name); if (c) c.abort(); },
      registerAll: registerAllTools,
    },
  };
})();