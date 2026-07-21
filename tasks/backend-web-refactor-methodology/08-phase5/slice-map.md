# Phase 5 Slice Map

## Target State

Commerce converges on five active backend owners rather than one large ecommerce module. Rental Fulfillment is
retired as a runtime capability; it is not extended into a product owner:

```text
Merchandising -- quote / offer facts --> Trade -- contract/order
                                     |              |
                                     v              v
                                   Bill <--- settlement ---- Payment
                                     ^
                                     |
                         RideHailing provider observation / port
```

The Web keeps page assembly separate from query/command adapters. It may present a coherent Commerce journey, but
it must not make quote, order, bill, settlement, provider, or payment facts authoritative.

## Proposed Order

| Slice | Status | Owns | Prerequisite / decision gate | Cheapest credible proof |
| --- | --- | --- | --- | --- |
| `C0` Commerce System Model | Complete | fact authority, primary sequences, read/cache model, vocabulary conflict ledger, phase rebase | source/doc/test triangulation; explicitly distinguish confirmed findings from hypotheses | characterization tests, static evidence, and request-count baseline where a network claim is made |
| `5-0` entry inventory | Complete | current topology, durable-contract comparison, candidate map | none | source/doc inventory and existing scenario inventory |
| `5-1` authority and idempotency matrix | Complete | current/target public surfaces, direct-edge ledger, idempotency matrix | D1–D3 ratified; later concurrency gates explicit | deterministic import inventory and independent source traces |
| `5-2` quote-to-order admission | Complete | Merchandising→Trade quote intake, PR attachment/admission, Placement entry behavior, CreateOrderAttempt, Bill/Ride category cutover | C0 fact/sequence/vocabulary decisions; durable idempotency and PR lock order | focused RideHailing quote/order proof; Rental is excluded |
| `5-3` Bill–Payment checkout | Deferred — post-settlement fee confirmation moves to a future job-runner/outbox slice | Bill checkout target, Payment execution/polling, Web checkout assembly, and the post-settlement delivery/recovery seam | future slice must make delivery state, retry trigger, and provider idempotency explicit | first consequence failure then controlled retry; no duplicate Bill settlement |
| `5-4` Rental runtime retirement | Deferred by Sir — known R0 divergence is not repaired in this pass | stop new Rental order/payment/fulfillment traffic; remove the Trade→Fulfillment runtime edge | scope/risk acceptance only; do not rewrite durable R0 absent a separate product decision | historical Rental read remains compatible; checkout/payment execution/provider prepay are a recorded residual risk |
| `5-5` RideHailing observation/reconciliation | Complete | explicit observation command/trigger, callback/poll convergence, durable execution projection, and final-Bill consequence surfaces | C0 decision on query-versus-reconcile shape; observation monotonicity, terminal race, and bounded retry model | backend callback/poll convergence scenarios + one controlled browser observation journey |
| Read-model tranche (Checkout cache) | Complete — PaymentTx authority and terminal policy proven | one PaymentTx read authority and a deterministic terminal mutation policy | coordinated with the 5-3 source changes | query-client request-count tests, focused remount/retry proof, and the existing Checkout journey |
| `5-6A` core public-surface closure | Complete | core wildcard/deep-import reduction and controller entrypoint cutover | zero core consumer inventory for each retired symbol | import graph + focused regression + type/build/scenario |
| `5-6B` Admin read-composition | Deferred beyond Phase 5 | Admin repository-composition debt | canonical admin read-contract design | separate topology packet, not this Phase |
| `5-7a` provider runtime topology evidence | Safe public probe complete but inconclusive; provider-safe smoke remains | payment notify/CaoCao edge topology | an Internet-reachable staging observer plus provider-safe smoke authority | signed staging callback and negative edge checks; see `08-provider-runtime-evidence-and-phase-review/02-external-runtime-evidence/` |
| `5-7b` Phase review | Local follow-up complete — `5-7b.3` repaired F-03; F-01/F-02 are explicit deferred findings | evidence-backed Phase exit claims | carried-forward deferrals and each local slice's focused/cross-unit proof; `5-7a` remains separate | separate source, scenario, and external-evidence review |

## Why This Order

`C0` is a gate, not another numbered implementation phase: it prevents a static import ledger from deciding the
shape of a lifecycle, cache, or vocabulary refactor. `5-1` makes later migration edges visible without inventing a
new owner. `5-3` completed as the approved first vertical mutation. Sir has prioritized `5-2`; after C0 it remains
the first write-state mutation and does not enlarge Rental retirement. `5-4` is a forward-only runtime cut-off.
`5-5` turns the currently hidden read-triggered synchronization into an explicit observation/reconciliation model.
The un-numbered read/cache coherence tranche exists only where C0 has confirmed an actual duplicate authority or
request pattern; it is not a cosmetic Web split. Every retained replacement is now proven and the core
compatibility surfaces are removed in `5-6A`. `5-6B` is deliberately outside the Phase. `5-7a` remains a
runtime-evidence branch: local source cannot prove a deployed callback edge; `5-7b` is a final review, not a
substitute for local proof.

## Explicit Non-Goals

- Do not split files because they are large alone.
- Do not change all Commerce domains in one migration.
- Do not turn Rental retirement, D3 settlement correction, refund policy, generic provider retry, or an outbox into
  incidental work inside an owner-surface slice.
- Do not make a browser handoff, payment client return, or provider callback a second source of settlement truth.
- Do not fold provider configuration or deployment changes into an owner-bound code slice.
