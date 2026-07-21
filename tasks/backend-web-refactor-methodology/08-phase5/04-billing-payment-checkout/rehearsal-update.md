# 5-3 Execution Rehearsal

| Situation | Before mutation | Intended behavior | Cheap proof |
| --- | --- | --- | --- |
| Bill Detail opens Checkout | route has only `bill-line` | Bill query supplies viewer-authorized target; Payment consumes its projection, not raw Bill rows | typecheck + existing browser path |
| provider first attempt | slot empty | Bill atomically claims provider and increments attempt; Payment derives both codec projections | existing Payment scenario |
| provider failed/closed | slot exact match | Bill clears only that tuple; Checkout remains and can create a later attempt | existing Payment scenario |
| old same-provider attempt later says success | current line has a newer attempt | observation is stale; it never settles the newer attempt or triggers a consequence | focused fake-provider scenario |
| callback and poll observe one success | both race to settle the same tuple | one atomic transition wins; later observer reads canonical settled state | focused fake-provider scenario |
| JSAPI result says success/cancel/fail | browser result is transient | Checkout re-fetches PaymentTx; only backend `SUCCEEDED` returns to Bill | existing browser success path |
| redirect/reload returns to Checkout | component `ref` is gone | session hint restores PaymentTx query; server truth decides next state | Web unit state test |
| provider query itself errors | no provider/Bill truth arrived | stay on Checkout, retain hint, expose explicit re-confirm action | Web unit state test |

## Observed Result

| Situation | Observed result |
| --- | --- |
| failed provider attempt then same-provider retry | Bill clears only the first tuple, opens attempt 2, and preserves it as unfinished |
| old attempt later reports success | Bill returns `STALE`; the historical `PaymentTx` is `PAYMENT_ATTEMPT_SUPERSEDED`; attempt 2 remains unsettled |
| current attempt succeeds | one Bill transition settles the line; a subsequent browser reconciliation returns to Bill Detail |
| browser route returns/reloads in one session | the opaque lookup is re-read and backend `PaymentTx` status decides the next Checkout state |

## Known Recovery Boundary

The current post-settlement Trade consequence is synchronous and has no
durable outbox. This slice will prevent duplicate immediate invocation across
the observed callback/poll race, but will not claim exactly-once delivery
across a process crash after the Bill transition. That remaining recovery
contract stays explicit in the Phase 5 ledger rather than being hidden behind
a browser retry.
