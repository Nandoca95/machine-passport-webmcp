# SCHEMA AND POLICY V0.1 FREEZE — Machine Passport

DATE: 2026-09-03
STATUS: **SCHEMA_AND_POLICY_V0_1_FROZEN=YES**

| Field | Value |
| --- | --- |
| SCHEMA_VERSION | `0.1.0` (UNCHANGED by repair) |
| ASSESSMENT_POLICY_VERSION | `0.1.0` → **`0.1.1`** (2026-09-03 pre-video repair R2: blockers = WARNING/BLOCKER findings with evidence intersecting a NOT_READY/UNKNOWN dimension; limitations on READY/READY_WITH_LIMITATIONS dims are not blockers) |
| SCHEMA_PATH | `public/domain.js` (validatePassport / normalizePassport) |
| POLICY_PATH | `public/domain.js` (RULES table + aggregateStatus + assessRole) |
| FIXTURE_TESTS | `tests/run-tests.mjs` — **157/157 PASS** (fixtures, malformed rejection, UNKNOWN, rules, aggregation, evidence refs, compare determinism, proposals, retry-safe stage R1, blocker semantics R2, reset, no machine mutation) |
| KNOWN_GAPS | See below |

## Freeze preconditions (all verified)

- [x] Parser passes (strict validation, bounded sizes/strings, enums, no code paths)
- [x] Three synthetic fixtures pass (Atlas, Beacon, Relay — schema-valid)
- [x] Readiness rules pass (deterministic; exact 3-role catalog)
- [x] UNKNOWN semantics pass (missing/unavailable evidence → UNKNOWN, never FAIL/PASS)
- [x] Role catalog frozen (GENERAL_WORKSTATION, LOCAL_INFERENCE_NODE, UNATTENDED_AI_WORKLOAD)
- [x] Import trust boundary passes (JSON parse → strict validate → normalize → app state; textContent-only rendering; __proto__ tamper test)

## Reference adjudications (frozen)

UNATTENDED_AI_WORKLOAD:

| Machine | FIT | DEPLOYMENT | QUALIFICATION | SECURITY | OVERALL |
| --- | --- | --- | --- | --- | --- |
| atlas-001 | READY | READY_WITH_LIMITATIONS | NOT_READY | UNKNOWN | NOT_READY |
| beacon-02 | READY_WITH_LIMITATIONS | READY | READY | READY | READY_WITH_LIMITATIONS |
| relay-04 | NOT_READY | READY | READY | READY | NOT_READY |

## Known gaps (accepted for v0.1)

1. Rules are intentionally small (4 per role); GA/security depth beyond the 3 roles is future work.
2. `compare_machines` "smallest safe next step" heuristic is deterministic but prioritizes a QUALIFICATION blocker → security-UNKNOWN → deployment order.
3. Natural-language invocation (eval prompt 3/4) requires a real WebMCP agent/human; API-level preconditions verified, full NL selection remains a manual/human check.
4. G0 step 6/7 (Chrome Model Context Tool Inspector, NL invocation) are human-in-the-loop; programmatic proxies passed.
5. Post-challenge v0.2 gap (documented, NOT repaired): findings carry no `role_id`; the blocker semantics repair (policy 0.1.1) stays finding-driven per dimension status. A full generic role-scoped findings redesign is deferred to v0.2.

## Consumer note (INFRA)

INFRA may now independently derive the sanitized Lenovo MachinePassport against this frozen
schema/policy. Constraints stay: no raw logs, no usernames, no serials, no IPs, no private paths;
collector_status UNAVAILABLE must be preserved; UNKNOWN is not FAIL and not PASS.
Validation is private (G3) and nonblocking.