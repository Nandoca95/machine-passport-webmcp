// Synthetic public fixtures — clearly SYNTHETIC, no real machine identifiers.
// Atlas: strong AI workstation, unattended/recovery qualification gap.
// Beacon: reliable general workstation, limited local inference.
// Relay: small always-on/recovery-oriented node, modest compute.
import { SCHEMA_VERSION } from './domain.js';

const ATLAS = {
  schema_version: SCHEMA_VERSION,
  machine: {
    id: 'atlas-001',
    label: 'Atlas',
    device_class: 'workstation',
    source_kind: 'SYNTHETIC',
    capture_timestamp: '2026-09-01T00:00:00Z',
  },
  facts: [
    { id: 'compute_class', domain: 'compute', value: 'workstation', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'cpu_cores', domain: 'compute', value: 16, unit: 'cores', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'gpu_present', domain: 'compute', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'gpu_vram_gb', domain: 'compute', value: 24, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_capability', domain: 'compute', value: 'local_llm_strong', provenance: 'DERIVED', collector_status: 'OK' },
    { id: 'ram_gb', domain: 'memory', value: 64, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'storage_free_gb', domain: 'storage', value: 1200, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'os_family', domain: 'os', value: 'linux', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'always_on', domain: 'availability', value: false, provenance: 'OBSERVED_CURRENT', collector_status: 'OK', unavailable_reason: undefined },
    { id: 'network_stable', domain: 'network', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'recovery_qualified', domain: 'recovery', value: false, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'unattended_recovery_qualified', domain: 'recovery', value: false, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'unattended_ops_approved', domain: 'security', value: false, provenance: 'UNKNOWN', collector_status: 'UNAVAILABLE', unavailable_reason: 'No unattended operation record exists yet' },
    { id: 'disk_encryption', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'secure_boot', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'firewall_active', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_runtime_installed', domain: 'compute', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_benchmark_record', domain: 'compute', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'general_qualification_record', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'ups_present', domain: 'power', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'thermal_class', domain: 'thermal', value: 'adequate', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
  ],
  findings: [
    {
      id: 'atl-qual-gap',
      severity: 'BLOCKER',
      evidence_refs: ['unattended_recovery_qualified', 'recovery_qualified'],
      why_it_matters: 'An overnight/unattended AI workload must prove it can recover without a human in the loop.',
      uncertainty: 'Low — the gap is explicit in the qualification record.',
      next_discriminator: 'Run a supervised unattended recovery drill and record the result.',
    },
    {
      id: 'atl-approval-unknown',
      severity: 'WARNING',
      evidence_refs: ['unattended_ops_approved'],
      why_it_matters: 'Unattended operation needs explicit security approval; none is recorded.',
      uncertainty: 'Unknown — evidence was never collected.',
      next_discriminator: 'Collect the security/ops approval evidence.',
    },
    {
      id: 'atl-compute-strong',
      severity: 'INFO',
      evidence_refs: ['gpu_vram_gb', 'inference_capability', 'ram_gb'],
      why_it_matters: 'Strong compute makes Atlas a good candidate once qualification gaps close.',
      uncertainty: 'Low.',
      next_discriminator: 'None — informational.',
    },
  ],
};

const BEACON = {
  schema_version: SCHEMA_VERSION,
  machine: {
    id: 'beacon-02',
    label: 'Beacon',
    device_class: 'desktop',
    source_kind: 'SYNTHETIC',
    capture_timestamp: '2026-09-01T00:00:00Z',
  },
  facts: [
    { id: 'compute_class', domain: 'compute', value: 'desktop', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'cpu_cores', domain: 'compute', value: 8, unit: 'cores', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'gpu_present', domain: 'compute', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'gpu_vram_gb', domain: 'compute', value: 6, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_capability', domain: 'compute', value: 'modest', provenance: 'DERIVED', collector_status: 'OK' },
    { id: 'ram_gb', domain: 'memory', value: 32, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'storage_free_gb', domain: 'storage', value: 400, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'os_family', domain: 'os', value: 'windows', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'always_on', domain: 'availability', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'network_stable', domain: 'network', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'recovery_qualified', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'unattended_recovery_qualified', domain: 'recovery', value: true, provenance: 'HUMAN_REPORTED', collector_status: 'OK' },
    { id: 'unattended_ops_approved', domain: 'security', value: true, provenance: 'HUMAN_REPORTED', collector_status: 'OK' },
    { id: 'disk_encryption', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'secure_boot', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'firewall_active', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_runtime_installed', domain: 'compute', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_benchmark_record', domain: 'compute', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'general_qualification_record', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'ups_present', domain: 'power', value: false, provenance: 'HUMAN_REPORTED', collector_status: 'OK' },
    { id: 'thermal_class', domain: 'thermal', value: 'adequate', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
  ],
  findings: [
    {
      id: 'bcn-inference-limited',
      severity: 'WARNING',
      evidence_refs: ['gpu_vram_gb', 'inference_capability'],
      why_it_matters: 'Local inference is limited to modest workloads (6 GB VRAM).',
      uncertainty: 'Low — derived from measured VRAM.',
      next_discriminator: 'Run a small benchmark to bound throughput for the intended model.',
    },
    {
      id: 'bcn-reliable-baseline',
      severity: 'INFO',
      evidence_refs: ['always_on', 'unattended_recovery_qualified', 'disk_encryption'],
      why_it_matters: 'Reliable uptime and recovery baseline make Beacon a safe default for unattended duty.',
      uncertainty: 'Low.',
      next_discriminator: 'None — informational.',
    },
  ],
};

const RELAY = {
  schema_version: SCHEMA_VERSION,
  machine: {
    id: 'relay-04',
    label: 'Relay',
    device_class: 'mini_node',
    source_kind: 'SYNTHETIC',
    capture_timestamp: '2026-09-01T00:00:00Z',
  },
  facts: [
    { id: 'compute_class', domain: 'compute', value: 'mini_node', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'cpu_cores', domain: 'compute', value: 4, unit: 'cores', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'gpu_present', domain: 'compute', value: false, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'gpu_vram_gb', domain: 'compute', value: 0, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_capability', domain: 'compute', value: 'none', provenance: 'DERIVED', collector_status: 'OK' },
    { id: 'ram_gb', domain: 'memory', value: 8, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'storage_free_gb', domain: 'storage', value: 128, unit: 'GB', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'os_family', domain: 'os', value: 'linux', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'always_on', domain: 'availability', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'network_stable', domain: 'network', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'recovery_qualified', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'unattended_recovery_qualified', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'unattended_ops_approved', domain: 'security', value: true, provenance: 'HUMAN_REPORTED', collector_status: 'OK' },
    { id: 'disk_encryption', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'secure_boot', domain: 'security', value: false, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'firewall_active', domain: 'security', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_runtime_installed', domain: 'compute', value: false, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'inference_benchmark_record', domain: 'compute', value: false, provenance: 'HUMAN_REPORTED', collector_status: 'OK' },
    { id: 'general_qualification_record', domain: 'recovery', value: true, provenance: 'DOCUMENT_SUPPORTED', collector_status: 'OK' },
    { id: 'ups_present', domain: 'power', value: true, provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
    { id: 'thermal_class', domain: 'thermal', value: 'adequate', provenance: 'OBSERVED_CURRENT', collector_status: 'OK' },
  ],
  findings: [
    {
      id: 'rly-no-gpu',
      severity: 'BLOCKER',
      evidence_refs: ['gpu_present', 'inference_capability'],
      why_it_matters: 'No GPU means no local AI workload capacity.',
      uncertainty: 'Low.',
      next_discriminator: 'None at machine level; allocate workload elsewhere.',
    },
    {
      id: 'rly-always-on-node',
      severity: 'INFO',
      evidence_refs: ['always_on', 'recovery_qualified', 'ups_present'],
      why_it_matters: 'Reliable always-on recovery node for support roles.',
      uncertainty: 'Low.',
      next_discriminator: 'None — informational.',
    },
  ],
};

export const DEFAULT_FIXTURES = [ATLAS, BEACON, RELAY];

// Default readonly starting app state (fresh copies, so reset never mutates fixtures).
export function defaultAppState() {
  return {
    machines: DEFAULT_FIXTURES.map((p) => structuredClone(p)),
    proposals: [],
    activityLog: [],
    lastToolAction: null,
  };
}