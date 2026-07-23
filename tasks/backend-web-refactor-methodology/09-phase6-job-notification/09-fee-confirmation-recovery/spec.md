# `6-4` Specification

## Ownership

Bill/BillLine owns paid settlement truth. RideHailing owns provider binding and
the provider operation. One typed generic Job is the durable
fee-confirmation task and owns only generic execution control.

There is no FeeConfirmationIntent/table, confirmation generation, duplicated
RideHailing status machine, or Job business-reconciliation status.

The pre-Phase-6 source had no owner fee-confirmation fact: it settled a
BillLine, called a separate consequence chain, then invoked `confirmFee`
synchronously. A later failure could leave a settled line with no task, while
duplicate reconciliation returned `ALREADY_SETTLED` without re-running that
consequence.

Current source replaces that chain. The qualifying Bill settlement transition
owns a transaction-bound fee-confirmation Job, including creation-time
auto-settlement for an all-zero final Bill that will never receive a payment
callback.

## Handoff Invariant

On the first qualifying transition where all applicable Bill charge lines are
settled, one narrow transaction must:

1. compare-and-set the exact BillLine payment execution; and
2. ensure one typed Job exists for a deterministic settlement-cause key.

The implementation extends or mirrors the existing named RideHailing
reconciliation transaction and preserves its Trade -> Ride lock order before
settling the exact BillLine tuple/recomputing the Bill. It uses `6-1`'s
transaction-bound `ONCE_PER_CAUSE` writer; a non-transaction-bound scheduler
would not satisfy this invariant.

The qualifying transition also includes Bill creation where all charge lines
are zero and therefore auto-settled. That path establishes the same owner
Job in the same short transaction; it cannot wait for a payment callback that
will never occur and does not create a parallel repair state.

If the existing cross-owner transaction adapter cannot safely own this exact
invariant, use a named recoverable handoff with equivalent deterministic proof.
Do not expose a generic transaction executor.

Duplicate payment callbacks/reconciliation cannot create another Job for the
same qualifying settlement.

## Handler Contract

1. Decode a versioned payload containing only stable local identifiers.
2. Reload the RideHailing order and provider binding.
3. Invoke the RideHailing-internal `confirmFee` operation with CaoCao
   `order_id`; omit `allowance_amount` and `cao_allowance_amount`.
4. Return only generic `SUCCEEDED`, `RETRYABLE_FAILURE`,
   `PERMANENT_FAILURE`, or `SKIPPED` execution dispositions.

The handler need not pre-query provider order detail on the happy path. Generic
retry may repeat an already-applied operation after a lost response; Sir has
explicitly accepted that risk. JobRunner never interprets provider or
settlement semantics.

## Forward Cut-Over

The invariant applies to settlements after the forward migration/deployment
cut-over. Existing settled rows are neither backfilled nor classified. No
production inventory is required for that deliberate choice.

## Acceptance Criteria

1. Settlement and Job cannot split silently.
2. One qualifying payment completion produces one causally keyed Job.
3. Zero-charge auto-settlement reaches the same handoff invariant.
4. Duplicate callbacks do not create duplicate Jobs.
5. The provider call is outside the settlement transaction.
6. The adapter serializes `order_id` and neither allowance field.
7. Job receives only generic dispositions and has no reconciliation state.
8. Existing settled rows remain untouched.
