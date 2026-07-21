# Phase 5 Decision Ledger

## Already Settled

| Topic | Decision | Consequence |
| --- | --- | --- |
| Rental | R0 runtime clean cut-off; production has no Rental orders | no new Rental placement/listing/quote/order/payment/booking/fulfillment; no schema/data reclamation in Phase 5 |
| unknown Ride create response | durable `PROCESSING`; never blind retry | CreateOrderAttempt/reconciliation must preserve correlation and avoid a second provider create |
| structural objective | fact authority, temporal trigger, read/cache projection, and vocabulary are all required; import topology alone is insufficient | each source slice updates C0 artifacts and has a focused proof |

## Technical Decisions Owned By This Refactor

| Topic | Direction | Reason |
| --- | --- | --- |
| Ride detail read versus reconciliation | target a pure Order Detail projection plus explicit, controlled Ride reconciliation command | current implicit `GET` write hides retry/concurrency/cache semantics; scale-to-zero does not require a permanent worker |
| Web server-state cache | TanStack Query is the single server-cache authority; `PaymentTx` uses it or its unused adapter/key is removed | browser local state remains an opaque continuity hint only |
| query-key/mutation policy | one canonical key family and one invalidate/refetch strategy per projection | prevents duplicate/restarted reads and invisible cache authority |
| final-fare versus payment settlement naming | split the facts rather than overload `settlement` | prevents provider fare, Bill target, and BillLine paid state being treated as one transition |
| provider observation concurrency | duplicated provider reads are acceptable; durable snapshot/final-Bill transitions are conditional and at-most-once | do not hold a database lock across provider network I/O merely to force one callback/poll read |

## Sir Decision Required Before The Relevant Gate

| Decision | Recommended default | Why it cannot be inferred | Latest gate |
| --- | --- | --- | --- |
| Unreconciled Ride `PROCESSING` posture | remain visibly processing until provider callback/reconciliation or an operator resolves it; no timed automatic retry/cancel | a time-out that fails/cancels an actually accepted ride is product/provider policy, not a technical default | `5-2.3` user-visible processing behavior |
| D3 after-final-Bill correction | defer adjustment/refund capability; record an explicit correction-needed seam and never rewrite settled history | allocating/refunding a final fare delta changes financial/customer policy | `5-5` exit scope |
| Phase exit standard | complete local/source/scenario Phase work plus authorized external `5-7a` staging/provider evidence | local fakes cannot prove actual notify/callback topology | `5-7a` / `5-7b` |

If Sir does not override the recommended defaults, implementation proceeds with them; the external-evidence gate still
cannot be claimed complete without the required authority.
