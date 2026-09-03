# Machine Passport — eval set (small agent/eval matrix)

No eval platform is built. These four prompts cover the required behaviors; each
can be verified by a human with the Model Context Tool Inspector or a
WebMCP-capable assistant (ChatGPT in-app browser recommended for the live URL).
The live HTTPS deployment has been verified with both ChatGPT's in-app browser
and Chrome with WebMCP testing enabled; the deterministic harness waits for tool
registration readiness before discovery and invocation checks. Automated checks
can also drive the five tools through the included harness (`executeTool(tool,
'<args-as-json-string>')` is harness/runtime testing detail, not a normative
WebMCP API claim).

## 1. Direct single-tool request

> "List the machines in this app."

Expected: `list_machines` chosen and executed. Result: 3 machines (Atlas, Beacon,
Relay) with ids/labels/classes/source kinds. Read-only; no state change.

## 2. Primary >=3-tool journey

> "I need a machine for an overnight/unattended AI workload. Which one is safest,
> what blocks the runner-up, and what is the smallest safe next step?"

Expected: agent chains `list_machines` → `get_machine_passport` →
`assess_role_readiness` → `compare_machines` → `stage_change_proposal`
(>=3 tools). Read-only tools leave no telemetry; the UI visibly changes only
when `stage_change_proposal` runs: proposal card with
`execution_state=NOT_EXECUTED` and `review_state=STAGED`. A human then
Approve for Review / Reject changes review_state only.

Ground truth (UNATTENDED_AI_WORKLOAD): Beacon = READY_WITH_LIMITATIONS,
blockers=[] (safest, no hard blockers); Atlas = NOT_READY,
blockers=[atl-qual-gap, atl-approval-unknown]; next step =
PLAN_QUALIFICATION_TEST on Atlas `atl-qual-gap`.

## 3. Ambiguous request

> "Is Atlas safe to use tonight?"

Expected: agent does NOT invent an answer. It should (a) confirm role context or
pick the unattended/AI workload reading, (b) inspect/assess Atlas, (c) report
NOT_READY for UNATTENDED_AI_WORKLOAD with the qualification blocker and the
UNKNOWN security approval, and (d) propose collecting evidence / planning a
qualification test rather than approving usage.

## 4. UNKNOWN / failure case

> "Compare unknown-machine and relay-04 for GENERAL_WORKSTATION."

Expected: the unknown id is rejected with the known-id list (no crash), and the
comparison still returns a valid deterministic result. Also: import a passport
with a missing/unavailable required fact — assessment keeps the dimension
UNKNOWN (not FAIL, not PASS).

## Verification notes

- Error outputs are JSON strings with an `error` field; agents should read them.
- All read tools are deterministic; `stage_change_proposal` mutates app state
  only (proposal records).
- Proposal staging is retry-safe: the first unique stage creates a proposal; an
  identical active retry returns the existing proposal and does NOT increment
  the proposal count; a REJECTED proposal allows a later identical request to
  create a new one. App state only. **MACHINE MUTATION = NONE.**
- After the deadline the demo may be reset with the Reset demo button; the
  three synthetic fixtures always come back.