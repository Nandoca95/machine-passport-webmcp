# BUILD ACCEPTANCE — Machine Passport v0.1 (G4 judge mode)

DATE: 2026-09-03
BUILD_ACCEPTANCE=YES

## G4 checklist (verified)

- [x] Production build PASS — zero build step; static files in `public/`; `node scripts/serve.mjs`
- [x] No secrets / private data — synthetic fixtures only; scan clean (see below)
- [x] No auth required
- [x] Three synthetic fixtures (Atlas, Beacon, Relay), clearly SYNTHETIC
- [x] Reset works (returns to 3 fixtures, clears proposals)
- [x] Five WebMCP tools work (live Chrome check PASS)
- [x] Critical journey works (list → passport → assess → compare → stage → UI → human approve)
- [x] App useful for human alone (plain-Chrome smoke PASS: render/import/assess/reset)
- [x] Materially improved with agent (5 tools, staged proposals, shared state)
- [x] Compact outputs (all tool returns < 20 KB; most < 1 KB)
- [x] Root OSS license present (MIT, LICENSE)
- [x] README/testing/submission material in ENGLISH (README.md, EVAL.md)
- [x] README explains: problem, audience, WebMCP leverage, architecture, five tools, critical journey, 3 copy/paste prompts, no-machine-mutation boundary
- [x] Clean browser path prepared (serve script + flag instructions; human-only fallback)
- [x] No dependence on judges rebuilding project (static app, no npm install needed to run)

## Live verification evidence

| Check | Result |
| --- | --- |
| Deterministic suite (`node tests/run-tests.mjs`) | 157 passed, 0 failed (pre-video repair: 141 + 16) |
| WebMCP check (`node scripts/webmcp-check.mjs`) | PASS — exactFive, descriptions unique, schemas distinct, annotations correct, direct calls, journey, shared UI state, reset, lifecycle, final demo state |
| Smoke plain Chrome (no WebMCP) (`node scripts/smoke-plain.mjs`) | PASS |
| G0 runtime spike (`node scripts/g0-test.mjs`) | PASS (10/10) |

## Private-data scan

Final tracked-source scan after public sanitation repair checked for serials,
IPs, usernames, and absolute private workspace paths: none found. Public
fixtures remain synthetic.

## Pre-publication bounded repair (R1/R2) — applied 2026-09-03

### R1 — read-only tools genuinely read-only
`list_machines`, `get_machine_passport`, `assess_role_readiness`, `compare_machines`
no longer call `logActivity()`/`render()`; they do not touch machines, proposals,
activityLog, lastToolAction, or selected state. `stage_change_proposal` remains the
ONLY WebMCP tool that mutates shared app state (APP STATE ONLY, execution_state=NOT_EXECUTED).
README/UI/EVAL corrected. Live assertion added: state snapshot before/after the four
read-only tools — `equal: true` (READ_ONLY_TOOLS_DO_NOT_MUTATE_APP_STATE=PASS).

### R2 — return serialization probe + contract
Temporary A/B probe on the WebMCP Chrome profile (removed after adjudication):

| Case | execute returns | executeTool() resolved | typeof | JSON.parse |
| --- | --- | --- | --- | --- |
| A | `{ ok:true, value:42, nested:{...} }` (object) | `{"ok":true,"value":42,...}` | string | object (single serialization, parse1) |
| B | `JSON.stringify({ ok:true, value:42,... })` (pre-stringified) | `{"ok":true,"value":42,...}` | string | object (no double-serialization) |

Adjudication: current Chrome 152 serializes ordinary object returns correctly, exactly once.
**PRODUCTION_RETURN_CONTRACT = ordinary JSON-serializable objects** returned from all five
execute() callbacks; the WebMCP runtime serializes them. Re-verified: `rawType: "string"`
on all direct calls, output lengths unchanged and compact.

### Re-verification after repair (all suites)

| Suite | Result |
| --- | --- |
| Deterministic suite | 157 passed, 0 failed |
| WebMCP G2 check | PASS (incl. readOnlyNoMutate, stageSharedState, sharedUIState, lifecycle) |
| G0 lifecycle suite | PASS (10/10) |
| Human smoke suite | PASS (human-only mode) |

## Pre-video bounded repair (R1/R2/R3) — applied 2026-09-03

A real ChatGPT in-app judge-path exposed three bounded defects; they were fixed,
re-verified and incorporated into the accepted public build.

### R1 — retry-safe stage_change_proposal (at-least-once tolerance)
Deterministic normalized fingerprint over machine_id, role_id, finding_id, proposal_kind,
summary, acceptance_criterion, verification, rollback_note (no public schema field added).
Identical active proposal (execution_state=NOT_EXECUTED, review_state STAGED or
APPROVED_FOR_REVIEW) → returns the existing proposal: no sequence increment, no state
mutation, no duplicate. REJECTED allows a later identical request. Tests A/B/C/D + no
machine mutation (added to suite).

### R2 — blocker semantics (policy 0.1.0 → 0.1.1)
Findings enter `blockers` only when severity WARNING/BLOCKER AND ≥1 evidence ref
intersects a dimension whose current status is NOT_READY or UNKNOWN. Limitations on
READY/READY_WITH_LIMITATIONS dims are not blockers. Public behavior after fix:
Beacon/UA OVERALL=READY_WITH_LIMITATIONS with blockers=[]; Atlas keeps atl-qual-gap
(QUALIFICATION NOT_READY) and atl-approval-unknown (SECURITY UNKNOWN); Relay keeps
rly-no-gpu. Role definitions and OVERALL results unchanged. SCHEMA_VERSION stays 0.1.0.
Re-frozen as ASSESSMENT_POLICY_VERSION=0.1.1.

### R3 — import status UX microfix
render() writes `importStatus` to `#import-status` via textContent (success and
rejection messages visible; no HTML execution).

### Re-verification after pre-video repair

| Suite | Result |
| --- | --- |
| Deterministic suite | 157 passed, 0 failed |
| WebMCP G2 check | PASS (incl. readOnlyNoMutate, stageSharedState) |
| G0 lifecycle suite | PASS (10/10) |
| Human smoke suite | PASS |
| R3 UI | success + rejection messages visible, textContent only |
| Private real-passport regression | validation PASS, import PASS, three OVERALLs unchanged, UNKNOWN preserved |
