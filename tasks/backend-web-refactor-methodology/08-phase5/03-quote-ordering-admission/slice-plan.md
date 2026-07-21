# 5-2 Subtask Plan

| Subtask | Owns | Gate | Mental rehearsal | Cheapest credible proof |
| --- | --- | --- | --- | --- |
| `01-placement-entry` | D1 entry outcome and Web routing | no further product decision | creator/no order enters; participant/existing opens it; non-creator/no order never reaches `/order/new` | three focused Web/browser branches |
| `02-attempt-and-pr-lock` | idempotency record/key and PR-owned concurrent uniqueness | current reusable-quote behavior preserved | same key replays result; different payload conflicts; simultaneous creators create only one active PR/Offer order | real-DB backend concurrent scenario |
| `03-provider-unknown-recovery` | durable processing/reconcile boundary for Ride create | selected no-blind-retry rule; no automatic provider lookup assumed | provider accepts but response is lost; retry never creates a second ride | fake provider accept-then-timeout scenario |
| `04-owner-surface-cutover` | Bill unpaid query and Ride provider quote contract | consumers and replacement semantics proven | Trade sees facts/commands, never producer services/models | import inventory plus focused owner tests |
| `05-proof-and-promotion` | regression proof and durable promotion candidates | all prior subtasks | quote expiry refresh is distinct from replay; Rental is not used as a proof path | selected Ride browser scenarios, backend scenarios, type/build |

No numbered subtask may absorb Rental termination, refund recovery, checkout, or final settlement reconciliation.
