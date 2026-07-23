# `6-4b` Plan

1. Extend the named Trade → RideHailing transaction boundary; never export a
   generic executor.
2. Bind exact BillLine settlement/all-charges recomputation and
   transaction-bound `ONCE_PER_CAUSE` insertion atomically.
3. Route all-zero `createBillFromSeed` settlement through the same invariant.
4. Prove paid, exact-replay and all-zero owner paths, then reuse the generic
   transaction-bound writer's real-Postgres rollback proof, advisory
   serialization and partial database uniqueness constraint.

## Cheapest Credible Verification

The completed proof deliberately avoids a fee-specific fault-injection seam or
duplicate JobRunner test harness. It combines paid/replay/all-zero
RideHailing scenarios with the generic writer's real-Postgres rollback test,
creation-key lock and partial unique index. The parent verification plan and
log own this later evidence calibration.
