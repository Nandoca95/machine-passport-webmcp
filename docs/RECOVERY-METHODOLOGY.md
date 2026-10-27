# Machine Passport — Recovery Methodology

STATUS=PUBLIC_POST_CHALLENGE_METHODOLOGY
SCHEMA_CHANGE=NO
ASSESSMENT_POLICY_CHANGE=NO
MACHINE_CONTROL_AUTHORITY=NONE

## Purpose

Machine Passport should help a human or an AI assistant answer five bounded questions:
1. What is actually observed?
2. What remains unknown?
3. What is the smallest safe test that best discriminates the next decision?
4. Was function recovered, merely worked around, or actually repaired?
5. Is the machine fit for the intended use after verification?

The method does not execute repairs by itself. It does not treat a successful command, a healthy snapshot, a quick diagnostic PASS, or an owner report as universal proof.

## Recovery loop

IDENTIFY -> PRESERVE -> OBSERVE -> BOUND THE FAILURE -> ONE DISCRIMINATING TEST -> RECOVER OR WORK AROUND -> VERIFY FUNCTION -> ASSESS FITNESS FOR USE -> REUSE / REPAIR / DONOR / RETIRE

## 1. Identify without over-collecting

Collect only what is needed for the decision: device class, relevant platform identity, intended role, symptom, known prior interventions, evidence source and time scope.
Do not copy names, usernames, serials, addresses, private paths, photos, account data, client data or raw logs into portable examples.

## 2. Preserve before effectful work

Before changing software, firmware, storage, wiring or parts, decide whether data matters, preserve a reversible baseline when proportionate, separate data recovery from hardware qualification and record the human authorization boundary.
A backup, a recovered file set and a healthy storage device are three different claims.

## 3. Distinguish observability from failure

device_not_visible_through_current_transport != device_failed
driver_or_bridge_required_for_visibility != media_fault
collector_failure != machine_negative_finding
query_success != scope_proven

A missing device behind a controller, bridge or recovery environment may be an observability problem. Improve observation before destructive conclusions.

## 4. Use discriminating controls

Prefer one test that separates hypotheses instead of many generic actions. Examples include pre-OS versus operating-system behavior, internal versus known-good external display, switch/cable continuity before replacing a power supply, known-good transport before declaring a disk dead, or an original memory configuration before buying parts.
A control can localize a failure family without identifying the exact failed component.

## 5. Treat quick diagnostics as bounded evidence

quick_test_pass != whole_component_certified

A passing CPU, memory, board, SMART or short self-test is evidence only for the test's declared coverage. It may lower some hypotheses without certifying cables, panels, intermittent faults, power rails, long-run stability or every block on a storage device.

## 6. Keep recovery, workaround and repair separate

administrative_access_recovered, subsystem_function_recovered, workaround_available, physical_fault_repaired and fitness_for_intended_use_verified are separate claims.
Regaining an administrator account does not repair a display. An external monitor can restore useful work without repairing the internal panel. A service restart can recover a component without proving end-to-end recovery.

## 7. Separate owner report, observation and derivation

OWNER_REPORTED != OBSERVED != DERIVED.
A later test can support, narrow or contradict the report without rewriting history.

## 8. Storage recovery is not storage reliability

data_recovered != media_reliable
SMART_clean != all_blocks_verified
logical_exclusion != physical_repair

For unstable media with valuable data, imaging/cloning may be safer than repeated filesystem scans when the gate admits it. A recovered device may still be unsuitable for important work.

## 9. Donor reuse

A donor is reasonable only when compatibility, functional proof and economic rationale are all established. Data-bearing parts also require a data/privacy decision.
Do not assume RAM, storage, power supplies, screens or chargers are interchangeable by appearance.

## 10. Repair versus part-out

Age alone is not a reason to cannibalize a machine. Prefer a cheap high-information test, a low-cost reversible repair when proven, a practical workaround when it restores useful function, whole-for-parts when repair is uneconomic, and individual part-out only when verified parts justify the extra work.
Marketplace listing prices are decision inputs, not realized value.

## 11. Verify the intended use

A machine is not recovered merely because it boots. Verification should match the role: representative workload, expected duration, display path, storage/data safety, restart/recovery expectations, stability, support constraints and supervision requirements.
Use existing readiness dimensions rather than inventing a new global health score.

## 12. Public learning boundary

Promote generic rules, synthetic cases, tests, methodology, provenance and limitations.
Do not promote owner/client identity, raw evidence, serials, private paths, photos, account details, private agreements, unreviewed Git history or unmeasured environmental-impact claims.

## Mapping to B5/B6

Limited test coverage maps to adjudicate_scope plus evidence-note coverage.
Owner/tool/collector uncertainty maps to observed_state_from_collector and adjudicate_heuristic.
Recovered function versus actual repair maps to recovery_assurance.
Component versus dependency-chain recovery maps to dependency_recovery_assurance.
Offered action versus executed/authorized maps to action_state.
Producer/result reconciliation maps to reconcile_reported_effect.
History/episodes/currentness map to B6 episode helpers.

Therefore this slice does not justify a schema or policy bump.