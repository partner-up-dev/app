# 5-X Post-5-3 Dependency Resequencing

## Status

**Explore complete; no runtime source mutation.** This packet corrects the Phase 5 dependency graph after the
completed Bill–Payment Checkout slice. Its original `5-4 → 5-5 → 5-2` execution recommendation is superseded by
Sir's later prioritization of `5-2` and the Rental scope review in
[`10-rental-fulfillment-scope/`](../10-rental-fulfillment-scope/). It remains task-local planning evidence, not a
new product or technical contract.

## Objective And Hypothesis

Determine whether work that starts from an already-persisted Commerce order may execute before the deferred
Placement→Quote→create-order admission slice.

Validated hypothesis: `5-4` Rental termination and `5-5` RideHailing reconciliation do not require `5-2`'s D1
Placement behavior or its Quote/admission implementation. They do retain separate design gates, and their shared
Trade termination shape makes serial execution cheaper than parallel source mutation.

## Guardrails

- Do not recast a user-visible mock fulfillment action as test-only merely because of its name.
- Do not use a seeded order to claim the unimplemented Placement/admission journey is proven.
- Do not treat local fake-provider success as deployed callback-edge evidence.
- Do not begin compatibility deletion before every named replacement surface has real consumer proof.

## Verification

- Source/data-flow trace from each slice entry point to its writes; see [`evidence.md`](./evidence.md).
- Rehearsal of the proposed sequence and failure branches; see [`rehearsal.md`](./rehearsal.md).
- Slice-by-slice execution order and proof boundary; see [`proposed-order.md`](./proposed-order.md).

## Durable-Documentation Disposition

No durable documentation changes are promoted by this packet. It records only a work-order correction and stale
task-packet status fixes. Stable owner/behavior claims continue to require the named slice's focused proof.
