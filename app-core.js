// Machine Passport — app-state core (pure, deterministic, testable in Node and browser).
// Proposal lifecycle: APP STATE ONLY. execution_state is ALWAYS NOT_EXECUTED.
import {
  ASSESSMENT_POLICY_VERSION,
  PROPOSAL_KINDS,
  ROLES,
  validatePassport,
  normalizePassport,
} from './domain.js';
import { defaultAppState } from './fixtures.js';

export const REVIEW_STATES = ['STAGED', 'APPROVED_FOR_REVIEW', 'REJECTED'];
export const EXECUTION_STATE = 'NOT_EXECUTED';

let proposalSeq = 0;

// Deterministic retry fingerprint (normalized) over the meaningful request.
// Purpose: at-least-once tool invocation must not create duplicate proposals.
const FP_FIELDS = ['machine_id', 'role_id', 'finding_id', 'proposal_kind', 'summary', 'acceptance_criterion', 'verification', 'rollback_note'];
const normFp = (v) => String(v === undefined || v === null ? '' : v).trim().toLowerCase();
export function proposalFingerprint(input) {
  return FP_FIELDS.map((k) => normFp(input[k])).join('\u0001');
}
function activeDups(state, input) {
  const fp = proposalFingerprint(input);
  return state.proposals.find((p) => {
    if (p.execution_state !== EXECUTION_STATE) return false;
    if (p.review_state !== 'STAGED' && p.review_state !== 'APPROVED_FOR_REVIEW') return false;
    return proposalFingerprint(p) === fp;
  });
}

function clone(v) {
  return structuredClone(v);
}

export function importPassport(state, rawJsonText) {
  // rawJsonText is UNTRUSTED. Parse -> strict validate -> normalize -> add machine.
  const err = (reason) => ({ state, error: reason, proposal: null });
  if (typeof rawJsonText !== 'string') return err('IMPORT_REJECTED: expected JSON text');
  if (rawJsonText.length > 1_000_000) return err('IMPORT_REJECTED: input too large');
  let parsed;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return err('IMPORT_REJECTED: invalid JSON');
  }
  try {
    const normalized = normalizePassport(validatePassport(parsed));
    if (state.machines.some((m) => m.machine.id === normalized.machine.id)) {
      return err(`IMPORT_REJECTED: machine id "${normalized.machine.id}" already exists`);
    }
    const next = { ...state, machines: [...state.machines, normalized] };
    return { state: next, error: null, proposal: null, machine: normalized };
  } catch (e) {
    return err(String(e.message || e));
  }
}

export function createProposal(state, input) {
  const err = (reason) => ({ state, error: reason, proposal: null });
  if (!input || typeof input !== 'object') return err('PROPOSAL_REJECTED: input object required');
  const machine = state.machines.find((m) => m.machine.id === input.machine_id);
  if (!machine) return err('PROPOSAL_REJECTED: unknown machine_id');
  if (!ROLES.includes(input.role_id)) return err(`PROPOSAL_REJECTED: role_id must be one of ${ROLES.join(', ')}`);
  const finding = machine.findings.find((f) => f.id === input.finding_id);
  if (!finding) return err('PROPOSAL_REJECTED: finding_id must exist on the machine');
  if (!PROPOSAL_KINDS.includes(input.proposal_kind)) {
    return err(`PROPOSAL_REJECTED: proposal_kind must be one of ${PROPOSAL_KINDS.join(', ')}`);
  }
  for (const k of ['summary', 'acceptance_criterion', 'verification', 'rollback_note']) {
    if (typeof input[k] !== 'string' || input[k].length === 0 || input[k].length > 500) {
      return err(`PROPOSAL_REJECTED: ${k} required (1..500 chars)`);
    }
  }
  // Retry-safe: identical active proposal (STAGED/APPROVED_FOR_REVIEW, NOT_EXECUTED) is
  // returned without mutating state or incrementing the sequence. REJECTED allows retry.
  const existing = activeDups(state, input);
  if (existing) {
    return { state, error: null, proposal: existing, duplicate: true };
  }
  proposalSeq += 1;
  const proposal = {
    proposal_id: `P-${String(proposalSeq).padStart(3, '0')}`,
    machine_id: machine.machine.id,
    role_id: input.role_id,
    finding_id: finding.id,
    proposal_kind: input.proposal_kind,
    summary: String(input.summary),
    acceptance_criterion: String(input.acceptance_criterion),
    verification: String(input.verification),
    rollback_note: String(input.rollback_note),
    execution_state: EXECUTION_STATE,
    review_state: 'STAGED',
    staged_by: input.staged_by === 'AGENT' ? 'AGENT' : 'HUMAN',
  };
  return { state: { ...state, proposals: [...state.proposals, proposal] }, error: null, proposal };
}

export function setProposalReview(state, proposalId, decision) {
  const err = (reason) => ({ state, error: reason, proposal: null });
  if (!['APPROVE_FOR_REVIEW', 'REJECT'].includes(decision)) return err('REVIEW_REJECTED: decision must be APPROVE_FOR_REVIEW or REJECT');
  const idx = state.proposals.findIndex((p) => p.proposal_id === proposalId);
  if (idx === -1) return err('REVIEW_REJECTED: unknown proposal_id');
  const proposal = { ...state.proposals[idx], review_state: decision === 'APPROVE_FOR_REVIEW' ? 'APPROVED_FOR_REVIEW' : 'REJECTED' };
  const proposals = [...state.proposals];
  proposals[idx] = proposal;
  return { state: { ...state, proposals }, error: null, proposal };
}

export function resetDemo(state) {
  proposalSeq = 0;
  return defaultAppState();
}

export function sameMachines(a, b) {
  return JSON.stringify(a.machines) === JSON.stringify(b.machines);
}

export function policyMeta() {
  return { assessment_policy_version: ASSESSMENT_POLICY_VERSION, execution_state: EXECUTION_STATE, review_states: REVIEW_STATES };
}