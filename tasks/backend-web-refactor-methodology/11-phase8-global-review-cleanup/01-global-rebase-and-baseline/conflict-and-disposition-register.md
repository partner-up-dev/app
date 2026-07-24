# `8-0` Conflict And Disposition Register

| ID | Conflict / ambiguity | Resolution in `8-0` | Follow-up owner |
| --- | --- | --- | --- |
| P8-C01 | Backend audit saw `contracts.ts` as explicit type-only; cross-unit audit saw entity/infra sources | both facts were true at `8-0`; `8-2` preserved the facade while moving definitions to owner contract leaves | `8-2` evidence complete |
| P8-C02 | simple SCC scan found 4 nodes; full AST scan found 9 | four was the eager static SCC and nine included deliberate dynamic imports; `8-5` removed both it and the revealed nested type-return cycle | `8-5` evidence complete; both graph modes now have zero SCCs |
| P8-C03 | historical Phase 4 packet says commit pending while Git/roadmap say complete | historical packet stays evidence and now carries a dated current-state annotation | `8-6` documentation reconciliation complete |
| P8-C04 | Phase 7 evidence once named an SLS durable conflict | entry observation is explicitly marked superseded by current durable truth and Phase 7 exit | `8-6` documentation reconciliation complete |
| P8-C05 | Phase 5 external proof expects edge logs removed in Phase 7 | proof now uses operator network/edge capture, provider-signed request and captured Backend receipt; pseudo-observability stays retired | procedure updated in `8-6`; external Phase 5 execution remains |
| P8-C06 | `dispatchBinding` durable/source statements differed at `8-0` | closed by `8-5`: both writers and all provider/reconciliation/projection readers use RideHailing `dispatch_binding`, matching durable truth promoted in `171319de` | `8-5` evidence complete |
| P8-C07 | `notification_deliveries` exists after O11y retirement | intentional inert compatibility; retirement needs future O11y/retention decision | future independent task |
| P8-C08 | `_journal.json` is historical while SQL migrations reach `0096` and CI regenerates artifacts | provenance/generator check is independent; no DB conclusion or generator run in `8-0` | independent DB/tooling check |
| P8-C09 | dead-code report has hundreds of findings | `8-6` consumed only the bounded owner/reference/behavior-proven ledger; broad findings remain report-first | bounded subset complete; future items need new proof |
| P8-C10 | direct WeChat callback violates the generic page rule | it remains the sole fitness finding and named terminal OAuth compatibility seam until its replacement/runtime exit condition is proven | explicit retained exception |
| P8-C11 | Phase 4/5 external observations remain open after local completion | local completion and deployed truth are separate evidence classes | external branches |
| P8-C12 | Viewer Bill 1+N and Admin read composition look inefficient | no request-count/query-plan baseline exists | defer until measured |

## Decision Rule

A later slice may consume a row only when it owns the named evidence class.
For example, `8-6` may reconcile current task indexes but cannot claim provider
topology, and `8-5` may characterize `dispatchBinding` but cannot choose a new
product meaning.
