# `6-4` Execution Plan

## Current Gate Result

`6-4a` is **Go**. Official CaoCao documentation establishes an
`order_id`-only request as valid; both allowance fields are optional. Sir
accepts the duplicate-effect-on-lost-response risk and excludes historic-row
recovery. No production DB/log/jump-function evidence gates local work.

## Ordered Children

1. **`6-4a` — Official contract and policy gate (complete)**
   - preserve the first-party links and exact contract;
   - record the accepted retry and forward-cut-over risks.
2. **`6-4b` — Atomic settlement handoff (complete)**
   - bind exact settlement/all-zero Bill creation to one transaction-bound
     `ONCE_PER_CAUSE` Job;
   - prove duplicate and write-failure behavior without provider I/O.
3. **`6-4c` — Typed provider Job handler (complete)**
   - remove the Trade-facing fee-confirmation edge;
   - use a RideHailing-internal typed provider port and versioned Job payload;
   - reload provider binding, call `feeConfirm` with `order_id` only, and return
     generic Job dispositions.
4. **`6-4d` — Verification and cut-over (complete)**
   - prove paid and all-zero handoffs, duplicate callbacks, retry, exhausted
     retry, and rollback behavior;
   - remove the old synchronous consequence edge;
   - use a forward-only deployment cut-over with no historic-row backfill.

## Detailed Mutation Sequence

1. **Add the narrow settlement handoff**
   - extend the existing named reconciliation transaction boundary or add the
     smallest owner-specific adapter;
   - preserve Trade -> Ride lock order, atomically settle the exact line,
     recompute all charges paid, and insert one deterministic
     `ONCE_PER_CAUSE` Job;
   - prove duplicate callbacks are no-ops for handoff creation.
   - route zero-charge auto-settled Bill creation through the same invariant.
2. **Repair the provider boundary and add the typed Job definition**
   - remove fee confirmation from the Trade-facing dispatch port;
   - invoke the provider with `order_id`; omit both optional allowances;
   - payload carries stable identifiers and schema version, not amounts or
     mutable provider data;
   - map success and errors to generic Job dispositions.
3. **Verify and promote current truth**
   - run adapter, transaction failure, retry, concurrency and all-zero tests;
   - update durable current-state wording only after source proof.

## Stop Conditions

- `6-1` lacks transaction-bound `ONCE_PER_CAUSE` creation or lease fencing in
  the checked-out source.
- Atomicity would require a generic Commerce transaction helper.
- A handler needs JobRunner to interpret RideHailing/provider business state.
- The implementation invents allowance values or performs an obligatory extra
  provider query on the happy path.
- Source work adds a fee-confirmation state machine or historic-row backfill
  that the accepted-risk model no longer needs.
