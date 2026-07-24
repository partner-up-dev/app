# `8-5` — Commerce Residual Topology And Authority

## Status

**Complete on 2026-07-23.** Sir authorized continuous execution through
`8-5`; source convergence, authority characterization, review and canonical
local proof are closed.

## Execution Checkpoint

- Bill payment-state and payability rules now consume
  persistence-independent Bill value facts and are exposed through Bill
  contracts.
- The five Trade/RideHailing pure-rule consumers no longer import the
  aggregate Bill query surface.
- The four-node eager Trade/Bill SCC is gone.
- Remeasuring the full graph exposed a previously nested three-node
  RideHailing composition cycle:
  `ports -> sync/transaction adapter -> ports`. The settlement observation and
  reconciliation transaction Port types moved to the stable RideHailing
  contract owner, removing only the type-return edge. Both deliberate dynamic
  imports and provider isolation remain.
- Final Backend static and dynamic-inclusive graphs contain zero SCCs. The Web
  graphs remain at zero SCCs.
- `dispatchBinding` current source/durable agreement is recorded in
  [`dispatch-binding-authority-audit.md`](./dispatch-binding-authority-audit.md).
- Full evidence is recorded in
  [`verification-log.md`](./verification-log.md).

## Objective

After `8-1` establishes the proper RideHailing public Port, remove the eager
Trade/Bill import cycle, remeasure the dynamic-inclusive Commerce dependency
graph, and resolve the `dispatchBinding` source/durable statement from actual
write/read authority.

## Current Topology

```text
eager:
trade/rental-ordering-flow
  -> bill/queries
  -> bill/get-bill-line-checkout-target
  -> trade/queries

full graph:
the eager family
  + Trade cancellation/listing
  + RideHailing Port
  -- deliberate dynamic import -->
  RideHailing provider sync/reconciliation adapter
```

## Execution Order

1. Freeze classic Rental checkout and RideHailing settlement/cancellation
   sequences, including import-time behavior.
2. Move Bill's pure payment-state/payability facts and operations onto its
   stable `model`/`contracts` value surface. Trade and RideHailing stop
   importing the aggregate `bill/queries.ts` merely to use pure rules.
3. Re-run the static and dynamic-inclusive SCC inventory; preserve the
   deliberate provider-isolation edge unless evidence supports a deeper Port.
4. Trace every `dispatchBinding` writer, persisted field, reader and projection.
5. Choose exactly one disposition:
   current source already matches durable truth; source has duplicate
   authority to remove; or durable wording is stale and needs promotion.

## Resolved Change Map

- `bill/model/bill.ts` owns persistence-independent payment-state facts,
  projections and payable-line candidates.
- `bill/services/bill-payment-state.ts` and `payable-bill-lines.ts` consume
  those values instead of Drizzle row types.
- `bill/contracts.ts` exposes the two pure Bill rules and their stable values.
  `bill/queries.ts` stops convenience-re-exporting them.
- Rental flow, Trade settlement/creation and RideHailing reconciliation import
  those rules from Bill contracts. Bill checkout and Trade query ownership do
  not move.
- The deliberate dynamic RideHailing provider-sync import remains. Removing
  the aggregate query dependency is expected to make both eager and
  dynamic-inclusive graphs acyclic; hiding the eager edge behind another
  dynamic import is forbidden.

## `dispatchBinding` Disposition

Current source and durable truth already agree: provider dispatch binding is
owned by `ride_hailing_orders.dispatch_binding`; Trade choice-set resolution
owns only final vehicle/quote selection. Commit `171319de` already promoted
that truth. `8-5` therefore closes stale Phase 5/Phase 8 control-plane rows
with provenance annotations; it does not change source, schema or durable
architecture wording for this fact.

## Preflight Simulation

- Rental historical-detail and termination-placeholder behavior still call the
  same Bill rules with equivalent facts.
- Bill checkout still reads BillLine/Bill, then asks Trade for billing context;
  status/error/payability semantics remain unchanged.
- RideHailing provider I/O stays outside reconciliation transactions, lock
  order stays Trade then RideHailing, and fee-confirmation scheduling remains
  causally keyed after BillLine CAS.
- Importing `trade/queries.ts` no longer re-enters itself through Bill checkout;
  loading the ordinary RideHailing Port still does not construct the
  reconciliation adapter.
- Importing the reconciliation adapter no longer creates a type-only return
  edge into `ports.ts`; public Port compatibility re-exports remain while the
  definitions have one owner in RideHailing contracts.

## Exit

- no eager Trade/Bill SCC;
- the full dynamic graph and intentional edge are explicitly documented;
- no aggregate barrel exports mutation use-cases into a read dependency;
- `dispatchBinding` has one evidence-backed authority statement; and
- no Viewer Bill/Admin-read optimization occurs without measurements.

## Non-goals

Rental product completion, final-fare/refund policy, generic Commerce
transaction helpers, provider replay safety and unmeasured query optimization.
