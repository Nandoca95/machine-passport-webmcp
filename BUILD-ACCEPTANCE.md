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

## Public action gates — NOT YET AUTHORIZED

Separate HUMAN GO required for each:

- GO PUBLIC REPO
- GO PUBLIC DEPLOY
- GO VIDEO UPLOAD
- GO DEVPOST SUBMIT

STOP before any public action.