# 5-6A.3 Cross-Domain Owner-Edge Closure

## Status

**Complete.** The preceding transport cutover removed controller/script wildcard roots but did not prove
owner-root retirement. This subtask classified and cut over the remaining cross-domain imports beneath
`apps/backend/src/domains`, including retained Rental implementation that is no longer reachable for new runtime
traffic. The following zero-consumer retirement slice then deleted the roots.

## Objective & Hypothesis

Replace every remaining Commerce cross-domain root **or deep implementation** import with the smallest named owner
surface that describes the fact being consumed. The hypothesis is that the true design boundary becomes visible when
each edge must be classified as one of Commands, canonical Queries, stable Contracts, or Ports; edges that cannot
be classified expose a missing owner decision rather than a reason to preserve a wildcard barrel.

## Fact / Edge Ledger Before Mutation

| Consumer → owner | Current fact | Initial classification question | Required proof |
| --- | --- | --- | --- |
| RideHailing → Bill / Trade | materialise one final Bill from committed final settlement and resolve durable pricing | Bill Command/Contract plus Trade canonical Query | terminal callback/reconcile scenario has one Bill |
| Trade → Bill | bill payable-state, charge allocation, and retained target reconciliation | canonical projection/contract versus retained command | current Ride and historical Rental detail proof |
| Trade → Payment | retained Rental refund execution | explicit Payment command, even while new Rental traffic is retired | focused retained-path type/scenario proof |
| Bill → Trade | order-item display naming and Bill target allocation types | canonical Trade Query / stable Contract, not a row leak | Bill detail projection test |
| Trade ↔ RideHailing | provider creation/observation, provider errors, cancellation pre-sync, and terminal Trade transition | explicit Port/Contract/Command pair; provider I/O stays outside local locks | Ride create/cancel/callback scenario |
| Admin → Payment / RideHailing / Trade | provider configuration validation, safe operator views, and admin cancellation | stable Contract/Query/Command surfaces; no direct model/service reach-through | admin provider/order scenario |
| Trade/Admin → Merchandising | SKU facts, validation, placement-binding contracts | pure stable Contract | type/lint plus affected offer/admin scenario |

## Guardrails Touched

- Do not call a use-case re-export a `contract` when it makes entities or models depend on application-layer code.
- Do not turn provider adapters into a generic shared service; the owner must expose a true Port only where the
  caller needs outbound provider work.
- A named category import is not sufficient if it forwards an owner-private service or model; the edge inventory
  must identify the fact and why that category owns it.
- Retired Rental code may be categorised for dependency hygiene, but no new Rental flow, policy, or UX is added.
- Do not delete an owner root in this subtask; root deletion belongs to the final zero-consumer batch.
- Keep provider I/O outside database locks and preserve the existing Trade-then-Ride lock order.

## Rehearsal & Branches

See [`rehearsal.md`](./rehearsal.md). A classification that introduces an owner cycle, exposes persistence rows, or
requires a generic catch-all barrel is a stop condition: record the edge and return to its fact owner instead of
forcing the import migration.

The RideHailing sync path crossed that stop condition during the first import cut: its correctness depends on two
short transactions that jointly coordinate Trade, RideHailing, and (for a terminal fare) Bill. It is therefore
split into the dedicated [`04-ride-hailing-reconciliation-transaction/`](./04-ride-hailing-reconciliation-transaction/)
subtask. That subtask may introduce one named RideHailing-owned Transaction Port; it may not expose a generic
executor, repositories, persistence rows, or provider I/O through that Port.

## Cheapest Credible Verification

1. Run the AST root-and-deep-import inventory before and after the batch; the targeted source edge count must
   decrease.
2. Run backend typecheck and scoped Oxlint after each owner family.
3. Run the scenario that exercises the changed edge: Ride create/callback/cancel, Bill detail, retained Rental
   history, or admin offer mutation as applicable.
4. Leave root removal for a later batch with a zero-consumer AST plus textual backstop.
