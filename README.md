# Machine Passport — Machine Readiness via WebMCP

**OpenAI WebMCP Challenge 2026 · v0.1.0**

A serious, bounded demo that proves the reusable core of machine readiness:

```
READ-ONLY EVIDENCE
→ NORMALIZED MACHINE PASSPORT
→ DETERMINISTIC ROLE READINESS
→ EVIDENCE-BACKED TRADEOFF
→ WEBMCP SHARED APP STATE
→ STAGED PROPOSAL
→ HUMAN APPROVE-FOR-REVIEW / REJECT
→ MACHINE MUTATION = NONE
```

No SSH. No PowerShell. No device access. No machine mutation. No LLM dependency.
The readiness assessment is a **deterministic engine**, not a model opinion.

---

## The problem

Choosing a machine for a role is usually decided by *spec sheets* and *opinion*:
the fastest GPU wins, nobody can say which blocker matters most, and "it should
work" is treated as evidence.

Machine Passport separates **evidence** from **adjudication**:

1. A `MachinePassport` is a **normalized, versioned record of evidence facts**
   (with provenance and collector status) plus **findings** (severity + evidence refs).
2. A small, inspectable **deterministic engine** maps passports to role readiness
   across four dimensions: **FIT, DEPLOYMENT, QUALIFICATION, SECURITY** (+ **OVERALL**).
3. **UNKNOWN is not FAIL and not PASS.** Missing or unavailable evidence stays UNKNOWN.
4. The **fastest hardware does not automatically win.**

## Who it is for

- **Humans** choosing/validating machines for a role (GENERAL_WORKSTATION,
  LOCAL_INFERENCE_NODE, UNATTENDED_AI_WORKLOAD).
- **AI agents** (ChatGPT in-app browser, Chrome browser agents, WebMCP-capable
  assistants) that need a bounded, read-only view of machine readiness and a
  safe way to *stage* a proposal a human reviews.

## WebMCP leverage

The page registers exactly five WebMCP tools with
`document.modelContext.registerTool`. WebMCP-capable browser agents can discover
and invoke those tools. The included Chrome verification harness
(`scripts/webmcp-check.mjs`) uses `getTools()` and `executeTool()` directly for
deterministic runtime testing, and **all five tools operate over the same
machine/passport domain state the human page renders** — no backend, no
database, no hidden state. The first four tools (`list_machines`,
`get_machine_passport`, `assess_role_readiness`, `compare_machines`) are
**genuinely read-only**: they inspect state and never modify it (no telemetry,
no activity log, no selection). **`stage_change_proposal` is the only WebMCP
tool that mutates shared app state**, and the human UI immediately renders that
mutation (the proposal card). The demo's human–agent shared-state proof is the
staged-proposal flow, not telemetry from read-only tools.

Tool lifecycle uses `AbortController`; registration is removed on `abort()` and
re-registers cleanly (verified; React StrictMode-safe pattern).

## Architecture

```
COLLECTORS / SPECIALISTS (future adapters — NOT in v0.1)
             |
             v
   MACHINE PASSPORT CONTRACT   (public/domain.js — schema + validation)
             |
             v
  READINESS / DECISION LAYER   (rule table + conservative aggregation)
             |
             v
        WEBMCP UI + TOOLS      (public/app.js — 5 tools + shared state)
```

| File | Role |
| --- | --- |
| `public/domain.js` | Versioned schema, strict import validation, rules, engine, compare |
| `public/fixtures.js` | 3 synthetic passport fixtures (Atlas, Beacon, Relay) |
| `public/app-core.js` | App-state transitions: import, stage, review, reset |
| `public/app.js` | 5 WebMCP tools + single-page human UI (textContent-only rendering) |
| `tests/run-tests.mjs` | 157 deterministic tests |
| `scripts/webmcp-check.mjs` | Live Chrome WebMCP verification (CDP) |

**Import trust boundary:** imported JSON is untrusted. Parse → strict schema
validation → bounded sizes → normalized object → app state. Imported values are
rendered as plain text only (no HTML injection), never executed, never fetched.

## The five WebMCP tools

| Tool | Reads | Mutates | Returns |
| --- | --- | --- | --- |
| `list_machines` | app machines (optional role) | — | compact machine list |
| `get_machine_passport` | one machine | — | passport facts + findings |
| `assess_role_readiness` | one machine + role | — | 4 dimensions + overall + blockers |
| `compare_machines` | ≥2 machines + role | — | ranked table + tradeoff + next step |
| `stage_change_proposal` | machine + finding + kind | **app state only** | proposal, `execution_state=NOT_EXECUTED` |

Tools 1–4 are `readOnlyHint: true`; `stage_change_proposal` is
`readOnlyHint: false` but changes **app state only**. Tools that can surface
imported content set `untrustedContentHint: true`.

## The critical user journey

> "I need a machine for an overnight/unattended AI workload.
> Which one is safest, what blocks the runner-up,
> and what is the smallest safe next step?"

Expected path (agent + human):

1. `list_machines` → 3 machines.
2. `get_machine_passport` → evidence for Atlas / Beacon / Relay.
3. `assess_role_readiness` → UNATTENDED_AI_WORKLOAD: Beacon READY_WITH_LIMITATIONS,
   Atlas NOT_READY (QUALIFICATION blocker `atl-qual-gap`), Relay NOT_READY (no GPU).
4. `compare_machines` → **Beacon is safest**; **runner-up Atlas** is blocked by the
   unattended-recovery qualification gap; **smallest safe next step** =
   `PLAN_QUALIFICATION_TEST`.
5. `stage_change_proposal` → proposal card appears in the human UI:
   `review_state=STAGED`, `execution_state=NOT_EXECUTED`.
6. **Human** clicks Approve for Review or Reject — review_state only. Never executed.
7. Reset demo returns to the 3 synthetic fixtures.

## Three copy/paste prompts

**1 — Primary journey (agent + human):**
```
I need a machine for an overnight/unattended AI workload.
Which one is safest, what blocks the runner-up,
and what is the smallest safe next step?
```

**2 — Evidence drill-down:**
```
Show me Atlas's passport facts for recovery and security, then assess it
for UNATTENDED_AI_WORKLOAD and explain which dimensions drive the result.
```

**3 — Tradeoff between two machines:**
```
Compare beacon-02 and atlas-001 for LOCAL_INFERENCE_NODE.
Why does one rank above the other, and what evidence supports that?
```

## Run it locally (no build step)

```bash
node scripts/serve.mjs          # serves ./public at http://localhost:8787
```

Requirements for agent mode:

- Chrome 149+ with `chrome://flags/#enable-webmcp-testing` **Enabled**;
- open `http://localhost:8787/` as a top-level app.

**Human-only mode works without WebMCP** (no agents, no flags): the page fully
renders, imports JSON, shows readiness, and lets a human review proposals.

Test everything:

```bash
node tests/run-tests.mjs        # 157 deterministic tests
node scripts/webmcp-check.mjs   # live WebMCP checks (needs Chrome + flag + server)
node scripts/g0-test.mjs        # G0 runtime spike (single-tool lifecycle)
```

`scripts/prep-chrome-profile.mjs` seeds a dedicated test profile with the WebMCP
flag (a separate profile; your normal Chrome is untouched).

### Testing on the live site

The deterministic WebMCP harness (`scripts/webmcp-check.mjs`) runs against
**localhost**, where the Chrome testing flag exposes the five tools reliably
(verified: discovery → invocation → deterministic output → shared UI state).

Observed Chrome 152 divergence on **remote (https) origins**: registering via
`document.modelContext.registerTool` from page scripts can resolve without the
tool appearing in `getTools()`, and `executeTool` brand checks are flaky for
entries read from `getTools()` — even though the identical build passes 100% on
localhost. The flag is named "WebMCP **for testing**" and this behavior is a
runtime limitation, not an app defect.

**Judge path on the live URL:** use the ChatGPT in-app browser (the intended
WebMCP runtime) or another WebMCP-capable assistant against
https://nandoca95.github.io/machine-passport-webmcp/ and the three copy/paste
prompts in the next section. For deterministic verification of the same build,
use the localhost harness above. `scripts/live-smoke.mjs` verifies the live URL
works in a clean browser (human-only mode) and that every referenced asset
resolves; `scripts/live-webmcp.mjs` runs the judge-path probe on the live URL.

## The boundary

**MACHINE MUTATION = NONE.** This project contains no collector, no SSH, no
PowerShell, no device access, no remediation, and no tool or button that
executes a machine action. `stage_change_proposal` cannot do more than create a
proposal record a human reviews.

## License

MIT — see [LICENSE](./LICENSE).