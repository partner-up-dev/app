# 07E — Verification

## Objective

Prove the complete CF-01 outcome across durable truth, Backend persistence/ownership, WeCom handling and the selected
Browser journey, then record evidence sufficient for `3-7` exit without claiming broader auth or draft redesign.

## Owned Surface

- The task-local CF-01 verification matrix, command log, results and exit evidence.
- Exact focused Backend/Web/scenario/System tests frozen after 07A–07D, plus only the minimal test fixture changes
  needed to close a demonstrated proof gap.
- Reconciliation of the 3-7 packet status only after every exit claim is supported.

New runtime behavior, durable policy changes and broad test refactors are outside 07E. Any missing behavior returns
to its owning 07A–07D subtask.

## Entry Information

- 07A–07D are complete with scoped diffs and their focused evidence recorded.
- Browser A is selected; failed authenticated DRAFT treatment is explicitly cleanup residue for the newly-created,
  still-DRAFT row only.
- Freeze the final test inventory against the current repository immediately before running it; planning-time paths
  and old `pr-core` locations are not authoritative.
- Baseline the exact row-count, owner, state, privacy and response assertions for public H5, WeCom, authenticated
  `USER`, `ADMIN` and `SYSTEM` actors.

## Fork / Stop Conditions

- If any ingress can still persist an anonymous or creatorless `USER` PR/DRAFT, stop exit and return to 07B.
- If legacy DRAFT privacy or failed-create row outcome is ambiguous, stop and return to 07C.
- If the Browser journey sends a create request before authentication, promises persistence/replay, or otherwise
  exceeds Browser A's declared loss boundary, stop and return to 07D.
- If proof requires runtime redesign or a new auth channel, fork it to the owning slice; do not hide it in fixtures.

## Low-cost Verification

- Run the cheapest focused unit and characterization tests first, then Backend/Web type and build checks.
- Run the selected Backend create/DRAFT scenarios and targeted Browser → HTTP → Backend journey.
- Run the repository's required full System and architecture-fitness gates for 3-7 exit.
- Final scope/diff audit proves each behavior change belongs to 07A–07D and every exit statement links to current
  evidence; update status only after all required gates are green.

## Status

Complete. [`01-final-integration-verification/`](./01-final-integration-verification/) records the frozen matrix,
full gates, scope audit and exit evidence. CF-01 is closed without expanding its authorization into OAuth/session,
historical-DRAFT cleanup, or waitlist work.
