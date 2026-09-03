// Machine Passport — deterministic test suite (G1/G2 core), run: node tests/run-tests.mjs
import {
  SCHEMA_VERSION, ASSESSMENT_POLICY_VERSION, ROLES, DIMENSIONS,
  validatePassport, normalizePassport, assessRole, compareMachines,
  aggregateStatus, listMachinesSummary, compactPassport, ruleTable,
} from '../public/domain.js';
import { DEFAULT_FIXTURES, defaultAppState } from '../public/fixtures.js';
import {
  importPassport, createProposal, setProposalReview, resetDemo, sameMachines, policyMeta,
} from '../public/app-core.js';

let pass = 0;
let fail = 0;
const failures = [];
function t(name, cond, detail) {
  if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? ' :: ' + detail : ''}`); }
}

const FIXTURE_IDS = ['atlas-001', 'beacon-02', 'relay-04'];

// Schema validation -----------------------------------------------------------
console.log('\n[1] fixture schema validation');
for (const p of DEFAULT_FIXTURES) {
  try {
    const n = validatePassport(p);
    t(`validate ${p.machine.id}`, n.machine.id === p.machine.id);
  } catch (e) { t(`validate ${p.machine.id}`, false, String(e)); }
}
t('schema_version constant', SCHEMA_VERSION === '0.1.0');
t('assessment_policy_version constant', ASSESSMENT_POLICY_VERSION === '0.1.1');

// Malformed import rejection ---------------------------------------------------
console.log('\n[2] malformed import rejection');
let st = defaultAppState();
t('reject invalid JSON', importPassport(st, '{not json').error !== null);
t('reject non-object', importPassport(st, '42').error !== null);
t('reject wrong schema_version', importPassport(st, JSON.stringify({ ...DEFAULT_FIXTURES[0], schema_version: '9.9.9' })).error !== null);
t('reject bad machine id', importPassport(st, JSON.stringify({ schema_version: SCHEMA_VERSION, machine: { id: 'BAD ID!', label: 'x', device_class: 'd', source_kind: 'IMPORTED' }, facts: [], findings: [] })).error !== null);
t('reject bad provenance', importPassport(st, JSON.stringify({ schema_version: SCHEMA_VERSION, machine: { id: 'zz-test', label: 'x', device_class: 'd', source_kind: 'IMPORTED' }, facts: [{ id: 'f1', domain: 'd', value: 1, provenance: 'MADE_UP', collector_status: 'OK' }], findings: [] })).error !== null);
t('reject bad collector_status', importPassport(st, JSON.stringify({ schema_version: SCHEMA_VERSION, machine: { id: 'zz-test', label: 'x', device_class: 'd', source_kind: 'IMPORTED' }, facts: [{ id: 'f1', domain: 'd', value: 1, provenance: 'DERIVED', collector_status: 'BROKEN' }], findings: [] })).error !== null);
t('reject overloaded string', importPassport(st, JSON.stringify({ schema_version: SCHEMA_VERSION, machine: { id: 'zz-test', label: 'x'.repeat(5000), device_class: 'd', source_kind: 'IMPORTED' }, facts: [], findings: [] })).error !== null);
t('reject duplicate fact id', importPassport(st, JSON.stringify({ schema_version: SCHEMA_VERSION, machine: { id: 'zz-test', label: 'x', device_class: 'd', source_kind: 'IMPORTED' }, facts: [{ id: 'f1', domain: 'd', value: 1, provenance: 'DERIVED', collector_status: 'OK' }, { id: 'f1', domain: 'd', value: 2, provenance: 'DERIVED', collector_status: 'OK' }], findings: [] })).error !== null);
t('reject duplicate machine id (import collides)', importPassport(defaultAppState(), JSON.stringify(DEFAULT_FIXTURES[0])).error !== null);
// Import should not run code or mutate existing machines
const before = JSON.stringify(st.machines);
importPassport(st, JSON.stringify({ __proto__: { evil: 1 }, schema_version: SCHEMA_VERSION, machine: { id: '__proto__' }, facts: [], findings: [] }));
t('no proto mutation on import', JSON.stringify(st.machines) === before && ({}).evil === undefined);

// Valid import normalizes ------------------------------------------------------
console.log('\n[3] valid import normalizes');
const impRaw = JSON.stringify({
  schema_version: SCHEMA_VERSION,
  machine: { id: 'imported-x', label: 'Imported X', device_class: 'laptop', source_kind: 'IMPORTED' },
  facts: [
    { id: 'compute_class', domain: 'compute', value: 'laptop', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'ram_gb', domain: 'memory', value: 16, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'os_family', domain: 'os', value: 'linux', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'disk_encryption', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'general_qualification_record', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
  ],
  findings: [{ id: 'imp-f1', severity: 'INFO', evidence_refs: ['ram_gb'], why_it_matters: 'x', uncertainty: 'y', next_discriminator: 'z' }],
});
const impRes = importPassport(st, impRaw);
t('import resolves', impRes.error === null);
t('import adds machine', impRes.state.machines.some((m) => m.machine.id === 'imported-x'));
t('import preserves provenance', impRes.state.machines.find((m) => m.machine.id === 'imported-x').facts.find((f) => f.id === 'compute_class').provenance === 'OBSERVED_CURRENT');
t('no mutation of other machines', impRes.state.machines.filter((m) => FIXTURE_IDS.includes(m.machine.id)).length === 3);

// UNKNOWN preservation ----------------------------------------------------------
console.log('\n[4] UNKNOWN preservation');
// Atlas has unattended_ops_approved with collector_status UNAVAILABLE -> UA.SECURITY UNKNOWN
const atlasAssess = assessRole(DEFAULT_FIXTURES[0], 'UNATTENDED_AI_WORKLOAD');
t('Atlas UA.SECURITY is UNKNOWN (unavailable fact)', atlasAssess.SECURITY === 'UNKNOWN');
t('Atlas UA.QUALIFICATION is NOT_READY', atlasAssess.QUALIFICATION === 'NOT_READY');
// A passport missing the required fact entirely -> UNKNOWN dimension
const sparse = normalizePassport(validatePassport(JSON.parse(JSON.stringify({
  schema_version: SCHEMA_VERSION,
  machine: { id: 'sparse-1', label: 'Sparse', device_class: 'desktop', source_kind: 'IMPORTED' },
  facts: [{ id: 'compute_class', domain: 'compute', value: 'desktop', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' }],
  findings: [],
}))));
const sparseAssess = assessRole(sparse, 'GENERAL_WORKSTATION');
t('missing ram_gb -> GW.FIT UNKNOWN', sparseAssess.FIT === 'UNKNOWN');

// Readiness rules --------------------------------------------------------------
console.log('\n[5] readiness rules');
const gwA = assessRole(DEFAULT_FIXTURES[0], 'GENERAL_WORKSTATION');
const gwB = assessRole(DEFAULT_FIXTURES[1], 'GENERAL_WORKSTATION');
const gwR = assessRole(DEFAULT_FIXTURES[2], 'GENERAL_WORKSTATION');
t('Atlas GW ready', gwA.OVERALL === 'READY');
t('Beacon GW ready', gwB.OVERALL === 'READY');
t('Relay GW ready_with_limitations (mini_node class)', gwR.OVERALL === 'READY_WITH_LIMITATIONS');
const liA = assessRole(DEFAULT_FIXTURES[0], 'LOCAL_INFERENCE_NODE');
const liB = assessRole(DEFAULT_FIXTURES[1], 'LOCAL_INFERENCE_NODE');
const liR = assessRole(DEFAULT_FIXTURES[2], 'LOCAL_INFERENCE_NODE');
t('Atlas LI ready (strong)', liA.OVERALL === 'READY');
t('Beacon LI ready_with_limitations (modest)', liB.OVERALL === 'READY_WITH_LIMITATIONS');
t('Relay LI not_ready (no gpu)', liR.OVERALL === 'NOT_READY');
const uaA = assessRole(DEFAULT_FIXTURES[0], 'UNATTENDED_AI_WORKLOAD');
const uaB = assessRole(DEFAULT_FIXTURES[1], 'UNATTENDED_AI_WORKLOAD');
const uaR = assessRole(DEFAULT_FIXTURES[2], 'UNATTENDED_AI_WORKLOAD');
t('Atlas UA not_ready (qualification blocker)', uaA.OVERALL === 'NOT_READY');
t('Atlas UA blockers include qualification gap', uaA.blockers.includes('atl-qual-gap'));
t('Beacon UA ready_with_limitations (safest)', uaB.OVERALL === 'READY_WITH_LIMITATIONS');
t('Relay UA not_ready (no compute)', uaR.OVERALL === 'NOT_READY');
t('role catalog exact', JSON.stringify(ROLES) === JSON.stringify(['GENERAL_WORKSTATION', 'LOCAL_INFERENCE_NODE', 'UNATTENDED_AI_WORKLOAD']));

// Blocker semantics (R2: only WARNING/BLOCKER findings touching NOT_READY/UNKNOWN dims) --
console.log('\n[5b] blocker semantics');
t('Beacon UA has no hard blockers (limitation only)', uaB.blockers.length === 0);
t('Beacon UA bcn-inference-limited not a blocker', !uaB.blockers.includes('bcn-inference-limited'));
t('Atlas UA atl-qual-gap remains blocker (QUALIFICATION NOT_READY)', uaA.blockers.includes('atl-qual-gap'));
t('Atlas UA atl-approval-unknown remains blocker (SECURITY UNKNOWN)', uaA.blockers.includes('atl-approval-unknown'));
t('Relay UA rly-no-gpu remains blocker (compute NOT_READY)', uaR.blockers.includes('rly-no-gpu'));
t('blockers never contain INFO findings', DEFAULT_FIXTURES.flatMap((p) => assessRole(p, 'UNATTENDED_AI_WORKLOAD').blockers).every((b) => { const fn = DEFAULT_FIXTURES.flatMap((p) => p.findings).find((f) => f.id === b); return fn && fn.severity !== 'INFO'; }));

// Aggregation ------------------------------------------------------------------
console.log('\n[6] aggregation');
t('aggregate: NOT_READY wins', aggregateStatus(['READY', 'NOT_READY', 'UNKNOWN']) === 'NOT_READY');
t('aggregate: UNKNOWN beats RWL', aggregateStatus(['READY', 'READY_WITH_LIMITATIONS', 'UNKNOWN']) === 'UNKNOWN');
t('aggregate: RWL beats READY', aggregateStatus(['READY', 'READY_WITH_LIMITATIONS']) === 'READY_WITH_LIMITATIONS');
t('aggregate: all READY', aggregateStatus(['READY', 'READY']) === 'READY');

// Evidence refs -----------------------------------------------------------------
console.log('\n[7] evidence refs');
const allRules = ruleTable();
for (const role of ROLES) {
  for (const p of DEFAULT_FIXTURES) {
    const a = assessRole(p, role);
    for (const dim of DIMENSIONS) {
      const d = a.dimension_detail[dim];
      t(`evidence refs non-empty ${p.machine.id}/${role}/${dim}`, Array.isArray(d.evidence_refs) && d.evidence_refs.length > 0);
      t(`rule refs resolve ${p.machine.id}/${role}/${dim}`, d.rule_refs.every((rid) => allRules.some((r) => r.id === rid)));
    }
    t(`assessment evidence subset ${p.machine.id}/${role}`, a.evidence_refs.length > 0);
  }
}
// Rule refs correspond to the role
const uaRules = allRules.filter((r) => r.role_id === 'UNATTENDED_AI_WORKLOAD');
t('UA rule set exactly 4 (one per dimension)', uaRules.length === 4 && JSON.stringify(uaRules.map((r) => r.dimension).sort()) === JSON.stringify(['DEPLOYMENT', 'FIT', 'QUALIFICATION', 'SECURITY']));

// Compare determinism ------------------------------------------------------------
console.log('\n[8] compare determinism');
const cmp1 = compareMachines(DEFAULT_FIXTURES, FIXTURE_IDS, 'UNATTENDED_AI_WORKLOAD');
const cmp2 = compareMachines(DEFAULT_FIXTURES, FIXTURE_IDS, 'UNATTENDED_AI_WORKLOAD');
t('compare is deterministic', JSON.stringify(cmp1) === JSON.stringify(cmp2));
t('compare ranks Beacon first (safest)', cmp1.ranked[0].machine_id === 'beacon-02');
t('compare runner-up is Atlas (fastest not auto-winner)', cmp1.tradeoff.runner_up.machine_id === 'atlas-001');
t('compare suggests PLAN_QUALIFICATION_TEST for runner-up', cmp1.tradeoff.smallest_safe_next_step.proposal_kind === 'PLAN_QUALIFICATION_TEST');
t('compare tradeoff note explicit', cmp1.tradeoff.note.includes('Fastest hardware does not automatically win'));
const cmpSorted = compareMachines(DEFAULT_FIXTURES, ['beacon-02', 'atlas-001', 'relay-04'], 'GENERAL_WORKSTATION');
t('compare output sorted deterministically', JSON.stringify(cmpSorted.ranked.map((m) => m.machine_id)) === JSON.stringify(['atlas-001', 'beacon-02', 'relay-04']));

// Proposal app-state transition -----------------------------------------------------
console.log('\n[9] proposal app-state transition');
let s = defaultAppState();
const p1 = createProposal(s, {
  machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'atl-qual-gap',
  proposal_kind: 'PLAN_QUALIFICATION_TEST',
  summary: 'Plan and run a supervised qualification test.',
  acceptance_criterion: 'Recovery drill passes twice in a row.',
  verification: 'Read the qualification record.',
  rollback_note: 'No machine change; keep Atlas out of unattended duty until PASS.',
});
t('proposal created', p1.error === null && !!p1.proposal);
t('proposal starts STAGED / NOT_EXECUTED', p1.proposal.execution_state === 'NOT_EXECUTED' && p1.proposal.review_state === 'STAGED');
const pid = p1.proposal.proposal_id;
const ap = setProposalReview(p1.state, pid, 'APPROVE_FOR_REVIEW');
t('approval changes review_state only', ap.proposal.review_state === 'APPROVED_FOR_REVIEW' && ap.proposal.execution_state === 'NOT_EXECUTED');
const rj = setProposalReview(p1.state, pid, 'REJECT');
t('reject changes review_state only', rj.proposal.review_state === 'REJECTED' && rj.proposal.execution_state === 'NOT_EXECUTED');
t('unknown proposal rejected', setProposalReview(p1.state, 'P-999', 'APPROVE_FOR_REVIEW').error !== null);
t('bad kind rejected', createProposal(s, {
  machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'atl-qual-gap',
  proposal_kind: 'EXECUTE_STUFF', summary: 'x', acceptance_criterion: 'y', verification: 'z', rollback_note: 'w',
}).error !== null);
t('unknown finding rejected', createProposal(s, {
  machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'nope',
  proposal_kind: 'PLAN_QUALIFICATION_TEST', summary: 'x', acceptance_criterion: 'y', verification: 'z', rollback_note: 'w',
}).error !== null);

// Retry-safe stage (R1: at-least-once invocation must not duplicate proposals) ------
console.log('\n[9b] retry-safe stage');
const RETRY_INPUT = {
  machine_id: 'atlas-001', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'atl-qual-gap',
  proposal_kind: 'PLAN_QUALIFICATION_TEST',
  summary: 'Plan and run a supervised qualification test.',
  acceptance_criterion: 'Recovery drill passes twice in a row.',
  verification: 'Read the qualification record.',
  rollback_note: 'No machine change; keep Atlas out of unattended duty until PASS.',
};
let sa = defaultAppState();
const ra1 = createProposal(sa, RETRY_INPUT);
const pidA = ra1.proposal.proposal_id;
t('A first identical call -> one proposal created', ra1.error === null && !ra1.duplicate && ra1.state.proposals.length === 1 && typeof pidA === 'string' && pidA.startsWith('P-'));
const afterFirst = JSON.stringify(ra1.state);
const ra2 = createProposal(ra1.state, RETRY_INPUT);
t('A second identical call -> same proposal, proposals still=1', ra2.proposal.proposal_id === pidA && ra2.state.proposals.length === 1);
t('A duplicate retry does not mutate state', JSON.stringify(ra2.state) === afterFirst);
t('A duplicate retry flagged', ra2.duplicate === true);
const ra2w = createProposal(ra1.state, { ...RETRY_INPUT, summary: '  Plan and run a supervised qualification test.  ', acceptance_criterion: 'RECOVERY DRILL PASSES TWICE IN A ROW.' });
t('A normalized-fingerprint retry (whitespace/case) returns existing', ra2w.proposal.proposal_id === pidA && ra2w.state.proposals.length === 1);
const bAppr = setProposalReview(ra1.state, pidA, 'APPROVE_FOR_REVIEW');
const bRetry = createProposal(bAppr.state, RETRY_INPUT);
t('B approved -> identical retry returns existing, proposals still=1', bRetry.proposal.proposal_id === pidA && bRetry.state.proposals.length === 1);
t('B approved retry keeps execution NOT_EXECUTED', bRetry.proposal.execution_state === 'NOT_EXECUTED' && bRetry.proposal.review_state === 'APPROVED_FOR_REVIEW');
const cRej = setProposalReview(ra1.state, pidA, 'REJECT');
const cNew = createProposal(cRej.state, RETRY_INPUT);
t('C rejected -> identical request may create new proposal', cNew.proposal.proposal_id !== pidA && cNew.state.proposals.length === 2 && !cNew.duplicate);
const dNew = createProposal(cNew.state, { ...RETRY_INPUT, finding_id: 'atl-approval-unknown' });
t('D different finding -> distinct proposal', dNew.proposal.proposal_id !== pidA && dNew.proposal.proposal_id !== cNew.proposal.proposal_id && dNew.state.proposals.length === 3 && !dNew.duplicate);
t('retry no machine mutation', JSON.stringify(dNew.state.machines) === JSON.stringify(defaultAppState().machines));

// Reset --------------------------------------------------------------------------
console.log('\n[10] reset');
const sr = resetDemo(ap.state);
t('reset restores 3 fixtures', sr.machines.length === 3 && JSON.stringify(sr.machines.map((m) => m.machine.id).sort()) === JSON.stringify(['atlas-001', 'beacon-02', 'relay-04']));
t('reset clears proposals', sr.proposals.length === 0);

// No machine mutation ------------------------------------------------------------
console.log('\n[11] no machine mutation');
let s2 = defaultAppState();
const beforeMachines = JSON.stringify(s2.machines);
const p2 = createProposal(s2, {
  machine_id: 'beacon-02', role_id: 'UNATTENDED_AI_WORKLOAD', finding_id: 'bcn-inference-limited',
  proposal_kind: 'REVIEW_CONFIGURATION',
  summary: 'Review inference config.', acceptance_criterion: 'c', verification: 'v', rollback_note: 'r',
});
const afterProposal = JSON.stringify(p2.state.machines);
t('createProposal does not mutate machines', beforeMachines === afterProposal);
t('sameMachines true after proposal ops', sameMachines(s2, p2.state));
const p3 = setProposalReview(p2.state, p2.proposal.proposal_id, 'REJECT');
t('review does not mutate machines', afterProposal === JSON.stringify(p3.state.machines));

// Helpers ------------------------------------------------------------------------
console.log('\n[12] helpers');
const summary = listMachinesSummary(DEFAULT_FIXTURES, 'UNATTENDED_AI_WORKLOAD');
t('list summary sorted', JSON.stringify(summary.map((m) => m.id)) === JSON.stringify(['atlas-001', 'beacon-02', 'relay-04']));
t('list summary has overall', summary.every((m) => m.overall));
const comp = compactPassport(DEFAULT_FIXTURES[0]);
t('compact passport bounded fields', typeof comp.machine.id === 'string' && Array.isArray(comp.facts) && Array.isArray(comp.findings));
const meta = policyMeta();
t('policy meta exposes NOT_EXECUTED', meta.execution_state === 'NOT_EXECUTED');

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
if (fail > 0) {
  console.log('FAILURES:', failures.join('; '));
  process.exit(1);
}