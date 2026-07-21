# Web Read-Model Findings

## Confirmed

| Finding | Evidence | System significance | Candidate owner/slice |
| --- | --- | --- | --- |
| Checkout terminal reconciliation can fetch active target/Bill/order queries twice | `PaymentCheckoutFlow.vue` invalidates them, then calls `refetchQueries({ type: "all" })`; TanStack Query's default invalidate refetches active queries | duplicate traffic obscures which terminal read is authoritative | un-numbered Checkout cache source slice: choose invalidate-driven *or* explicit-refetch-driven policy |
| PaymentTx has two Web read authorities | `usePaymentTx`/`queryKeys.payment.tx` have no consumer; Checkout uses local `paymentTx` plus raw `fetchPaymentTx` and invalidates the unused key | cache key and local ref disagree about server-state ownership | un-numbered Checkout cache source slice: adopt the query adapter or deliberately remove it; no two authority paths |
| Placement/listing keys bypass or conflict with the query-key factory | factory `commerce.placement` has no consumer; actual match uses `placements/match`; offer listing uses a literal key | invalidation/governance cannot reason about the actual cache namespace | un-numbered cache-contract source slice: canonical key factory and mutation invalidation table |
| Viewer Bill list is an HTTP 1+N projection | backend list returns `billIds`; page mounts one Bill Detail query per card despite backend list already loading related data | list page creates a read-model shape rather than merely sharing a detail consumer | later un-numbered viewer-bill summary/batched projection slice, after a request-count baseline and focused TDD contract decision; IDs-only is currently intentional |
| Cancel success can restart the same Order Detail fetch | exact-order invalidation then broad `['commerce']` invalidation both refetch active observers | mutation cache policy has hidden request/cancellation behavior | un-numbered cache-contract source slice: one mutation reconciliation policy per affected projection |

## Hypotheses Requiring Network Evidence

| Hypothesis | Why not yet a confirmed defect | Required observation |
| --- | --- | --- |
| 2-second Ride polling overlaps or amplifies on focus | static interval exists, but actual query cancellation/deduping and request timing are not characterized | request-count trace for `/orders/:id` with focus, slow provider, and active phase |
| `refetchOnMount: "always"` duplicates useful reads | it may be intentional freshness behavior | navigation/mount trace with cache age and resulting UI need |
| broad `['commerce']` invalidation overfetches all active surfaces | broad scope is visible, but active observer set varies by page | query-client request-count tests / browser network trace |

## Read-Model Rule To Promote After Proof

TanStack Query owns server-cache state. Browser-local state may hold only opaque continuity hints, never a second copy
of server status. Every mutation names affected projections and uses one deterministic invalidate/refetch policy.
