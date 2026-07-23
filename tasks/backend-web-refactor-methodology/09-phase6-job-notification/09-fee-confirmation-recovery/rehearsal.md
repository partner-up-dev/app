# `6-4` Mental Rehearsal

## Current Failure Shape

1. A provider payment settles the exact BillLine. The current consequence
   reaches synchronous Trade-facing `confirmFee`; a later timeout/failure leaves
   no owner fact or Job. A replay that observes `ALREADY_SETTLED` returns
   without rerunning that consequence.
2. A terminal RideHailing order creates a final Bill whose charge lines are all
   zero. Bill creation writes `settledAt` directly, so no payment callback can
   ever reach the current fee-confirmation consequence.
3. Therefore wrapping only the current synchronous call in retry is not enough:
   it does not close either lost-task handoff.

## Normal And Duplicate Paths

1. Final qualifying BillLine settles; the transaction creates one causally
   keyed Job; later fee confirmation cannot roll back payment.
2. Duplicate payment notification returns already settled; the deterministic
   creation key prevents a second task.
3. Handler reloads the order/provider binding, calls `feeConfirm(order_id)`,
   and returns generic success.
4. A final Bill is created with every charge line zero and auto-settled: the
   creation path establishes the same Job invariant even though no payment
   callback will arrive.

## Failure Paths

1. **Job insertion fails inside transaction.** Exact BillLine settlement and
   roll back together; no invisible missing task is accepted.
2. **Transient provider/network failure.** Job uses its ordinary retry policy.
3. **Provider accepts, response is lost.** A retry may invoke `feeConfirm`
   again; this duplicate-effect risk is explicitly accepted.
4. **Retry exhausts.** Job ends in its generic failed state. No
   `RECONCILIATION_REQUIRED` business meaning is added to Job or RideHailing.
5. **Historic settled row exists at cut-over.** It remains untouched; the
   migration does not infer or replay fee confirmation.

## Likely Traps

- Triggering fee confirmation from `ALREADY_SETTLED` as a recovery shortcut.
- Putting `RECONCILIATION_REQUIRED` on Job.
- Adding a RideHailing confirmation state machine after its only motivating
  ambiguity branch was explicitly accepted.
- Sending invented zero allowance values instead of omitting optional fields.
- Leaving `confirmFee` on the Trade-facing dispatch port.
- Adding an obligatory order-detail query that recreates the redundant-fetch
  problem without a product need.
- Missing the all-zero auto-settlement path.
- Treating repository fixtures as higher authority than official provider docs.
