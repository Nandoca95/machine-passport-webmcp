# Machine Passport — eval set (small agent/eval matrix)

No eval platform is built. These four prompts cover the required behaviors; each
can be verified by a human with the Model Context Tool Inspector / a WebMCP agent
against the live app, or by driving the five tools directly
(`document.modelContext.executeTool(tool, '{"...":"..."}')`).

## 1. Direct single-tool request

> "List the machines in this app."

Expected: `list_machines` chosen and executed. Result: 3 machines (Atlas, Beacon,
Relay) with ids/labels/classes/source kinds. Read-only; no state change.

## 2. Primary >=3-tool journey

> "I need a machine for an overnight/unattended AI workload. Which one is safest,
> what blocks the runner-up, and what is the smallest safe next step?"

Expected: agent chains `list_machines` → `get_machine_passport` →
`assess_role_readiness` → `compare_machines` → `stage_change_proposal`
(>=3 tools). The UI visibly changes: activity log line, proposal card with
`execution_state=NOT_EXECUTED` and `review_state=STAGED`. A human then
Approve for Review / Reject changes review_state only.

Ground truth: Beacon = READY_WITH_LIMITATIONS (safest); Atlas = NOT_READY,
blocker `atl-qual-gap`; next step = PLAN_QUALIFICATION_TEST on Atlas
`atl-qual-gap`.

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
- All read tools are deterministic; `stage_change_proposal` increments a
  proposal sequence (app state only).
- After the deadline the demo may be reset with the Reset demo button; the
  three synthetic fixtures always come back.