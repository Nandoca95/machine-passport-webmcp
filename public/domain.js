// Machine Passport — Domain Core (G1)
// Pure, deterministic, framework-free. Works in both browser and Node (ESM).
// SEPARATES EVIDENCE (passport facts/findings) FROM ADJUDICATION (readiness engine).

export const SCHEMA_VERSION = '0.1.0';
export const ASSESSMENT_POLICY_VERSION = '0.1.1';

export const SOURCE_KINDS = ['SYNTHETIC', 'REAL_REDACTED', 'IMPORTED'];
export const PROVENANCE = ['OBSERVED_CURRENT', 'HUMAN_REPORTED', 'DOCUMENT_SUPPORTED', 'DERIVED', 'UNKNOWN'];
export const COLLECTOR_STATUS = ['OK', 'PARTIAL', 'UNAVAILABLE', 'ERROR'];
export const SEVERITY = ['INFO', 'WARNING', 'BLOCKER'];
export const ROLES = ['GENERAL_WORKSTATION', 'LOCAL_INFERENCE_NODE', 'UNATTENDED_AI_WORKLOAD'];
export const DIMENSIONS = ['FIT', 'DEPLOYMENT', 'QUALIFICATION', 'SECURITY'];
export const DIM_STATUS = ['READY', 'READY_WITH_LIMITATIONS', 'NOT_READY', 'UNKNOWN'];
export const PROPOSAL_KINDS = ['COLLECT_MORE_EVIDENCE', 'REVIEW_CONFIGURATION', 'PLAN_QUALIFICATION_TEST'];

// ---------------------------------------------------------------------------
// IMPORT TRUST BOUNDARY — bounded strict validation, no code paths.
// ---------------------------------------------------------------------------
const LIMITS = {
  maxJsonBytes: 1_000_000,   // 1 MB
  maxString: 4_096,
  maxFacts: 200,
  maxFindings: 200,
  maxArray: 500,
};

export function validatePassport(raw) {
  // raw: already JSON.parse'd value (or object). Throws Error with safe reason.
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('IMPORT_REJECTED: passport must be a JSON object');
  }
  if (raw.schema_version !== SCHEMA_VERSION) {
    throw new Error(`IMPORT_REJECTED: unsupported schema_version "${String(raw.schema_version)}" (expected ${SCHEMA_VERSION})`);
  }
  const m = raw.machine;
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error('IMPORT_REJECTED: machine required');
  const id = m.id;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) {
    throw new Error('IMPORT_REJECTED: machine.id must match ^[a-z0-9][a-z0-9_-]{0,63}$');
  }
  if (typeof m.label !== 'string' || !m.label.length || m.label.length > 80) {
    throw new Error('IMPORT_REJECTED: machine.label required (<=80 chars)');
  }
  if (!SOURCE_KINDS.includes(m.source_kind)) throw new Error('IMPORT_REJECTED: machine.source_kind invalid');
  if (m.capture_timestamp !== undefined && (typeof m.capture_timestamp !== 'string' || m.capture_timestamp.length > 40)) {
    throw new Error('IMPORT_REJECTED: machine.capture_timestamp must be a short ISO string');
  }
  if (typeof m.device_class !== 'string' || m.device_class.length > 60) {
    throw new Error('IMPORT_REJECTED: machine.device_class required (<=60 chars)');
  }

  const facts = Array.isArray(raw.facts) ? raw.facts : [];
  if (facts.length > LIMITS.maxFacts) throw new Error('IMPORT_REJECTED: too many facts');
  const seenFactIds = new Set();
  for (const f of facts) {
    if (!f || typeof f !== 'object') throw new Error('IMPORT_REJECTED: fact must be an object');
    if (typeof f.id !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,63}$/.test(f.id) || seenFactIds.has(f.id)) {
      throw new Error('IMPORT_REJECTED: fact.id invalid or duplicate');
    }
    seenFactIds.add(f.id);
    if (typeof f.domain !== 'string' || !f.domain.length || f.domain.length > 60) {
      throw new Error('IMPORT_REJECTED: fact.domain required');
    }
    if (!isPrimitive(f.value)) throw new Error('IMPORT_REJECTED: fact.value must be string|number|boolean');
    if (typeof f.value === 'string' && f.value.length > LIMITS.maxString) throw new Error('IMPORT_REJECTED: fact.value too long');
    if (f.unit !== undefined && (typeof f.unit !== 'string' || f.unit.length > 24)) throw new Error('IMPORT_REJECTED: fact.unit invalid');
    if (!PROVENANCE.includes(f.provenance)) throw new Error('IMPORT_REJECTED: fact.provenance invalid');
    if (!COLLECTOR_STATUS.includes(f.collector_status)) throw new Error('IMPORT_REJECTED: fact.collector_status invalid');
    if (f.unavailable_reason !== undefined && (typeof f.unavailable_reason !== 'string' || f.unavailable_reason.length > 240)) {
      throw new Error('IMPORT_REJECTED: fact.unavailable_reason invalid');
    }
  }

  const findings = Array.isArray(raw.findings) ? raw.findings : [];
  if (findings.length > LIMITS.maxFindings) throw new Error('IMPORT_REJECTED: too many findings');
  const seenFindingIds = new Set();
  for (const fn of findings) {
    if (!fn || typeof fn !== 'object') throw new Error('IMPORT_REJECTED: finding must be an object');
    if (typeof fn.id !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,63}$/.test(fn.id) || seenFindingIds.has(fn.id)) {
      throw new Error('IMPORT_REJECTED: finding.id invalid or duplicate');
    }
    seenFindingIds.add(fn.id);
    if (!SEVERITY.includes(fn.severity)) throw new Error('IMPORT_REJECTED: finding.severity invalid');
    if (!Array.isArray(fn.evidence_refs) || fn.evidence_refs.length > LIMITS.maxArray) throw new Error('IMPORT_REJECTED: finding.evidence_refs must be an array');
    for (const ref of fn.evidence_refs) {
      if (typeof ref !== 'string' || ref.length > 80) throw new Error('IMPORT_REJECTED: finding evidence_ref entry invalid');
    }
    for (const k of ['why_it_matters', 'uncertainty', 'next_discriminator']) {
      if (typeof fn[k] !== 'string' || fn[k].length > 600) throw new Error(`IMPORT_REJECTED: finding.${k} required (<=600 chars)`);
    }
  }
  return normalizePassport(raw);
}

function isPrimitive(v) {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

export function normalizePassport(raw) {
  // Builds a NEW object. Never returns references into raw (imported = untrusted).
  const facts = (Array.isArray(raw.facts) ? raw.facts : []).map((f) => ({
    id: String(f.id),
    domain: String(f.domain),
    value: f.value,
    unit: f.unit === undefined ? undefined : String(f.unit),
    provenance: String(f.provenance),
    collector_status: String(f.collector_status),
    unavailable_reason: f.unavailable_reason === undefined ? undefined : String(f.unavailable_reason),
  }));
  const findings = (Array.isArray(raw.findings) ? raw.findings : []).map((fn) => ({
    id: String(fn.id),
    severity: String(fn.severity),
    evidence_refs: fn.evidence_refs.map(String),
    why_it_matters: String(fn.why_it_matters),
    uncertainty: String(fn.uncertainty),
    next_discriminator: String(fn.next_discriminator),
  }));
  return {
    schema_version: SCHEMA_VERSION,
    machine: {
      id: String(raw.machine.id),
      label: String(raw.machine.label),
      device_class: String(raw.machine.device_class),
      source_kind: String(raw.machine.source_kind),
      capture_timestamp: raw.machine.capture_timestamp === undefined ? undefined : String(raw.machine.capture_timestamp),
    },
    facts,
    findings,
  };
}

// ---------------------------------------------------------------------------
// READINESS ENGINE — deterministic adjudication. No LLM, no numeric scores.
// ---------------------------------------------------------------------------

// Rule shape: { id, role_id, dimension, requires:[factId...], evaluate(facts)->status, note }
// Missing required fact OR collector_status !== OK => UNKNOWN (UNKNOWN is not FAIL and not PASS).
const RULES = [
  // GENERAL_WORKSTATION
  {
    id: 'GW-FIT', role_id: 'GENERAL_WORKSTATION', dimension: 'FIT',
    requires: ['compute_class', 'ram_gb'],
    evaluate: (f) => {
      const cls = f('compute_class').value;
      if (['workstation', 'desktop', 'laptop'].includes(cls) && f('ram_gb').value >= 8) return 'READY';
      if (['workstation', 'desktop', 'laptop', 'mini_node', 'server'].includes(cls)) return 'READY_WITH_LIMITATIONS';
      return 'NOT_READY';
    },
    note: 'Adequate compute and memory for general office/engineering work.',
  },
  {
    id: 'GW-DEPLOY', role_id: 'GENERAL_WORKSTATION', dimension: 'DEPLOYMENT',
    requires: ['os_family'],
    evaluate: (f) => (['windows', 'linux', 'macos'].includes(f('os_family').value) ? 'READY' : 'NOT_READY'),
    note: 'Software can be deployed on a known OS.',
  },
  {
    id: 'GW-QUAL', role_id: 'GENERAL_WORKSTATION', dimension: 'QUALIFICATION',
    requires: ['general_qualification_record'],
    evaluate: (f) => (f('general_qualification_record').value === true ? 'READY' : 'READY_WITH_LIMITATIONS'),
    note: 'General qualification record exists.',
  },
  {
    id: 'GW-SEC', role_id: 'GENERAL_WORKSTATION', dimension: 'SECURITY',
    requires: ['disk_encryption'],
    evaluate: (f) => (f('disk_encryption').value === true ? 'READY' : 'READY_WITH_LIMITATIONS'),
    note: 'Data-at-rest protection baseline.',
  },

  // LOCAL_INFERENCE_NODE
  {
    id: 'LI-FIT', role_id: 'LOCAL_INFERENCE_NODE', dimension: 'FIT',
    requires: ['gpu_present', 'gpu_vram_gb', 'inference_capability'],
    evaluate: (f) => {
      if (f('gpu_present').value !== true) return 'NOT_READY';
      const cap = f('inference_capability').value;
      if (cap === 'local_llm_strong' && f('gpu_vram_gb').value >= 16) return 'READY';
      if (cap === 'modest') return 'READY_WITH_LIMITATIONS';
      return 'NOT_READY';
    },
    note: 'GPU + VRAM determine local inference capacity.',
  },
  {
    id: 'LI-DEPLOY', role_id: 'LOCAL_INFERENCE_NODE', dimension: 'DEPLOYMENT',
    requires: ['inference_runtime_installed'],
    evaluate: (f) => (f('inference_runtime_installed').value === true ? 'READY' : 'READY_WITH_LIMITATIONS'),
    note: 'Inference runtime presence/installability.',
  },
  {
    id: 'LI-QUAL', role_id: 'LOCAL_INFERENCE_NODE', dimension: 'QUALIFICATION',
    requires: ['inference_benchmark_record'],
    evaluate: (f) => (f('inference_benchmark_record').value === true ? 'READY' : 'NOT_READY'),
    note: 'Inference must be proven by a benchmark record; otherwise NOT ready.',
  },
  {
    id: 'LI-SEC', role_id: 'LOCAL_INFERENCE_NODE', dimension: 'SECURITY',
    requires: ['disk_encryption', 'firewall_active'],
    evaluate: (f) => {
      const e = f('disk_encryption').value === true;
      const w = f('firewall_active').value === true;
      if (e && w) return 'READY';
      if (e || w) return 'READY_WITH_LIMITATIONS';
      return 'NOT_READY';
    },
    note: 'Encryption and firewall baseline.',
  },

  // UNATTENDED_AI_WORKLOAD
  {
    id: 'UA-FIT', role_id: 'UNATTENDED_AI_WORKLOAD', dimension: 'FIT',
    requires: ['inference_capability', 'gpu_vram_gb', 'ram_gb'],
    evaluate: (f) => {
      const cap = f('inference_capability').value;
      if (cap === 'none') return 'NOT_READY';
      if (cap === 'local_llm_strong' && f('gpu_vram_gb').value >= 16 && f('ram_gb').value >= 32) return 'READY';
      if (cap === 'modest') return 'READY_WITH_LIMITATIONS';
      return 'NOT_READY';
    },
    note: 'Compute needed for unattended AI workloads.',
  },
  {
    id: 'UA-DEPLOY', role_id: 'UNATTENDED_AI_WORKLOAD', dimension: 'DEPLOYMENT',
    requires: ['always_on', 'network_stable'],
    evaluate: (f) => {
      const a = f('always_on').value === true;
      const n = f('network_stable').value === true;
      if (a && n) return 'READY';
      if (a || n) return 'READY_WITH_LIMITATIONS';
      return 'NOT_READY';
    },
    note: 'Overnight unattended operation needs power-on persistence and stable network.',
  },
  {
    id: 'UA-QUAL', role_id: 'UNATTENDED_AI_WORKLOAD', dimension: 'QUALIFICATION',
    requires: ['unattended_recovery_qualified'],
    evaluate: (f) => (f('unattended_recovery_qualified').value === true ? 'READY' : 'NOT_READY'),
    note: 'Autonomous operation must prove unattended recovery; otherwise it is a hard blocker.',
  },
  {
    id: 'UA-SEC', role_id: 'UNATTENDED_AI_WORKLOAD', dimension: 'SECURITY',
    requires: ['unattended_ops_approved', 'disk_encryption'],
    evaluate: (f) => {
      const approved = f('unattended_ops_approved').value === true;
      const enc = f('disk_encryption').value === true;
      if (approved && enc) return 'READY';
      return 'NOT_READY';
    },
    note: 'Unattended operation needs explicit security approval and encryption.',
  },
];

// Conservative aggregation: any required NOT_READY -> NOT_READY; else any UNKNOWN -> UNKNOWN;
// else any READY_WITH_LIMITATIONS -> READY_WITH_LIMITATIONS; else READY.
export function aggregateStatus(statuses) {
  if (statuses.some((s) => s === 'NOT_READY')) return 'NOT_READY';
  if (statuses.some((s) => s === 'UNKNOWN')) return 'UNKNOWN';
  if (statuses.some((s) => s === 'READY_WITH_LIMITATIONS')) return 'READY_WITH_LIMITATIONS';
  return 'READY';
}

export function factGetter(passport) {
  const byId = new Map(passport.facts.map((f) => [f.id, f]));
  return (id) => {
    const fact = byId.get(id);
    if (!fact || fact.collector_status !== 'OK') {
      // Required evidence unavailable -> UNKNOWN semantics.
      return { id, value: undefined, ok: false, collector_status: fact ? fact.collector_status : 'UNAVAILABLE' };
    }
    return { id, value: fact.value, ok: true, collector_status: 'OK' };
  };
}

export function assessRole(passport, roleId) {
  if (!ROLES.includes(roleId)) throw new Error(`role_id must be one of ${ROLES.join(', ')}`);
  const f = factGetter(passport);
  const rules = RULES.filter((r) => r.role_id === roleId);
  const dimensionDetail = {};
  const allStatuses = [];
  for (const dim of DIMENSIONS) {
    const dimRules = rules.filter((r) => r.dimension === dim);
    const statuses = [];
    const refs = [];
    const ruleRefs = [];
    for (const rule of dimRules) {
      let status;
      const missing = rule.requires.filter((rid) => !f(rid).ok);
      if (missing.length > 0) {
        status = 'UNKNOWN';
      } else {
        status = rule.evaluate(f);
      }
      statuses.push(status);
      ruleRefs.push(rule.id);
      refs.push(...rule.requires);
    }
    const dimStatus = dimRules.length ? aggregateStatus(statuses) : 'UNKNOWN';
    dimensionDetail[dim] = {
      status: dimStatus,
      rule_refs: ruleRefs,
      evidence_refs: [...new Set(refs)], // fact ids
    };
    allStatuses.push(dimStatus);
  }
  // Findings surface as blockers only when WARNING/BLOCKER AND at least one of
  // their evidence refs hits a dimension whose current status is NOT_READY or
  // UNKNOWN. Limitations on READY/READY_WITH_LIMITATIONS dimensions are NOT blockers.
  const blockers = [];
  const dimStatusMap = dimensionDetail;
  for (const finding of passport.findings) {
    const involved = finding.evidence_refs.some((ref) =>
      Object.values(dimStatusMap).some((d) => d.evidence_refs.includes(ref) && (d.status === 'NOT_READY' || d.status === 'UNKNOWN')));
    if (involved && finding.severity !== 'INFO') blockers.push(finding.id);
  }
  const refsAll = Object.values(dimensionDetail).flatMap((d) => d.evidence_refs);
  const ruleRefsAll = Object.values(dimensionDetail).flatMap((d) => d.rule_refs);
  return {
    assessment_policy_version: ASSESSMENT_POLICY_VERSION,
    role_id: roleId,
    FIT: dimensionDetail.FIT.status,
    DEPLOYMENT: dimensionDetail.DEPLOYMENT.status,
    QUALIFICATION: dimensionDetail.QUALIFICATION.status,
    SECURITY: dimensionDetail.SECURITY.status,
    OVERALL: aggregateStatus(allStatuses),
    evidence_refs: [...new Set(refsAll)],
    rule_refs: [...new Set(ruleRefsAll)],
    blockers: [...new Set(blockers)],
    dimension_detail: dimensionDetail,
  };
}

// ---- compare (deterministic) -------------------------------------------------
const RANK = { READY: 0, READY_WITH_LIMITATIONS: 1, UNKNOWN: 2, NOT_READY: 3 };

export function compareMachines(passports, machineIds, roleId) {
  const byId = new Map(passports.map((p) => [p.machine.id, p]));
  const selected = machineIds.map((id) => byId.get(id)).filter(Boolean);
  if (selected.length < 1) throw new Error('compare_machines: no known machine ids');
  const assessed = selected.map((p) => {
    const a = assessRole(p, roleId);
    const vram = p.facts.find((x) => x.id === 'gpu_vram_gb');
    return {
      machine_id: p.machine.id,
      label: p.machine.label,
      overall: a.OVERALL,
      blockers: a.blockers,
      compute: vram && typeof vram.value === 'number' ? vram.value : 0,
      assessment: a,
    };
  });
  assessed.sort((x, y) => (RANK[x.overall] - RANK[y.overall]) || x.machine_id.localeCompare(y.machine_id));
  const safest = assessed.find((a) => a.overall === 'READY' || a.overall === 'READY_WITH_LIMITATIONS') || null;
  const runnerUp = assessed.find((a) => a.overall === 'NOT_READY' || a.overall === 'UNKNOWN') || null;
  const tradeoff = {
    note: 'Deterministic, evidence-backed tradeoff. Fastest hardware does not automatically win.',
    safest: safest
      ? { machine_id: safest.machine_id, why: `${safest.label} is ${safest.overall} for ${roleId} with no hard blockers.` }
      : null,
    runner_up: runnerUp
      ? {
        machine_id: runnerUp.machine_id,
        why_blocked: `${runnerUp.label} is ${runnerUp.overall} for ${roleId}.`,
        blockers: runnerUp.blockers,
      }
      : null,
    smallest_safe_next_step: nextStepForRunnerUp(runnerUp, byId),
  };
  return { role_id: roleId, ranked: assessed.map((a) => ({ machine_id: a.machine_id, label: a.label, overall: a.OVERALL, blockers: a.blockers })), tradeoff };
}

function nextStepForRunnerUp(runnerUp, byId) {
  if (!runnerUp || !byId.has(runnerUp.machine_id)) return null;
  const passport = byId.get(runnerUp.machine_id);
  const a = runnerUp.assessment;
  // Prefer a hard blocker finding on QUALIFICATION -> PLAN_QUALIFICATION_TEST
  const quals = passport.findings.filter((fn) =>
    a.blockers.includes(fn.id) && ['QUALIFICATION'].includes(dimOfFinding(passport, a, fn)[0]));
  const qual = quals.find((fn) => fn.severity === 'BLOCKER') || quals[0];
  if (qual) {
    return {
      machine_id: runnerUp.machine_id,
      finding_id: qual.id,
      proposal_kind: 'PLAN_QUALIFICATION_TEST',
      summary: `Plan and run a supervised qualification test for "${qual.id}".`,
    };
  }
  // Security UNKNOWN -> collect evidence first
  if (a.SECURITY === 'UNKNOWN' || a.SECURITY === 'NOT_READY') {
    const sec = passport.findings.find((fn) => a.blockers.includes(fn.id));
    return {
      machine_id: runnerUp.machine_id,
      finding_id: sec ? sec.id : null,
      proposal_kind: 'COLLECT_MORE_EVIDENCE',
      summary: 'Collect pending security/approval evidence for unattended operation.',
    };
  }
  // Deployment limitations -> review configuration
  const dep = passport.findings.find((fn) => a.blockers.includes(fn.id));
  return {
    machine_id: runnerUp.machine_id,
    finding_id: dep ? dep.id : null,
    proposal_kind: 'REVIEW_CONFIGURATION',
    summary: 'Review configuration to close the remaining deployment gap.',
  };
}

function dimOfFinding(passport, assessment, finding) {
  // Find dimensions whose evidence intersects the finding's evidence and are not READY.
  const dims = [];
  for (const dim of DIMENSIONS) {
    const d = assessment.dimension_detail[dim];
    if (d.status !== 'READY' && finding.evidence_refs.some((r) => d.evidence_refs.includes(r))) dims.push(dim);
  }
  return dims;
}

// ---- public helpers -----------------------------------------------------------
export function listMachinesSummary(passports, roleId) {
  return passports
    .map((p) => {
      const a = roleId ? assessRole(p, roleId) : null;
      return {
        id: p.machine.id,
        label: p.machine.label,
        device_class: p.machine.device_class,
        source_kind: p.machine.source_kind,
        overall: a ? a.OVERALL : undefined,
      };
    })
    .sort((x, y) => x.id.localeCompare(y.id));
}

export function compactPassport(passport) {
  // Bounded, JSON-friendly view for tool output.
  return {
    schema_version: passport.schema_version,
    machine: {
      id: passport.machine.id,
      label: passport.machine.label,
      device_class: passport.machine.device_class,
      source_kind: passport.machine.source_kind,
      capture_timestamp: passport.machine.capture_timestamp,
    },
    facts: passport.facts.map((f) => ({
      id: f.id,
      domain: f.domain,
      value: f.value,
      unit: f.unit,
      provenance: f.provenance,
      collector_status: f.collector_status,
      unavailable_reason: f.unavailable_reason,
    })),
    findings: passport.findings.map((fn) => ({
      id: fn.id,
      severity: fn.severity,
      evidence_refs: fn.evidence_refs,
      why_it_matters: fn.why_it_matters,
      uncertainty: fn.uncertainty,
      next_discriminator: fn.next_discriminator,
    })),
  };
}

export function ruleTable() {
  return RULES.map((r) => ({ id: r.id, role_id: r.role_id, dimension: r.dimension, requires: [...r.requires], note: r.note }));
}