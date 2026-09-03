# BUILD ACCEPTANCE — Machine Passport v0.1 (G4 judge mode)

DATE: 2026-09-03
BUILD_ACCEPTANCE=YES (local build; public action requires separate HUMAN GO)
PUBLICATION_GO_REQUESTED=YES

## G4 checklist (verified)

- [x] Production build PASS — zero build step; static files in `public/`; `node scripts/serve.mjs`
- [x] No secrets / private data — synthetic fixtures only; scan clean (see below)
- [x] No auth required
- [x] Three synthetic fixtures (Atlas, Beacon, Relay), clearly SYNTHETIC
- [x] Reset works (returns to 3 fixtures, clears proposals)
- [x] Five WebMCP tools work (live Chrome check PASS)
- [x] Critical journey works (list → passport → assess → compare → stage → UI → human approve)
- [x] App useful for human alone (plain-Chrome smoke PASS: render/import/assess/reset)
- [x] Materially improved with agent (5 tools, staged proposals, shared state, activity log)
- [x] Compact outputs (all tool returns < 20 KB; most < 1 KB)
- [x] Root OSS license prepared (MIT, LICENSE)
- [x] README/testing/submission material in ENGLISH (README.md, EVAL.md)
- [x] README explains: problem, audience, WebMCP leverage, architecture, five tools, critical journey, 3 copy/paste prompts, no-machine-mutation boundary
- [x] Clean browser path prepared (serve script + flag instructions; human-only fallback)
- [x] No dependence on judges rebuilding project (static app, no npm install needed to run)

## Live verification evidence

| Check | Result |
| --- | --- |
| Deterministic suite (`node tests/run-tests.mjs`) | 141 passed, 0 failed |
| WebMCP check (`node scripts/webmcp-check.mjs`) | PASS — exactFive, descriptions unique, schemas distinct, annotations correct, direct calls, journey, shared UI state, reset, lifecycle, final demo state |
| Smoke plain Chrome (no WebMCP) (`node scripts/smoke-plain.mjs`) | PASS |
| G0 runtime spike (`node scripts/g0-test.mjs`) | PASS (10/10) |

## Private-data scan

Checked source for private identifiers/patterns (Lenovo, Alpha-001, serials, IPs, usernames, paths): none found in repo files. `public/fixtures.js` and all fixtures are SYNTHETIC.

## Pre-publication bounded repair (R1/R2) — applied 2026-09-03

Controller inspection: BUILD_ACCEPTANCE=PASS_WITH_ONE_BOUNDED_REPAIR, PUBLICATION_GO=NOT_YET.

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
execute() callbacks; the WebMCP runtime serializes them (draft-compliant, no double-serialization
risk in conforming runtimes). Re-verified: `rawType: "string"` on all direct calls (runtime
serialization path confirmed), output lengths unchanged, compact.

### Re-verification after repair (all suites)

| Suite | Result |
| --- | --- |
| Deterministic suite | 141 passed, 0 failed |
| WebMCP G2 check | PASS (incl. readOnlyNoMutate, stageSharedState, sharedUIState, lifecycle) |
| G0 lifecycle suite | PASS (10/10) |
| Human smoke suite | PASS (human-only mode) |

## Public action gates — NOT YET AUTHORIZED

Separate HUMAN GO required for each:

- GO PUBLIC REPO
- GO PUBLIC DEPLOY
- GO VIDEO UPLOAD
- GO DEVPOST SUBMIT

STOP before any public action.