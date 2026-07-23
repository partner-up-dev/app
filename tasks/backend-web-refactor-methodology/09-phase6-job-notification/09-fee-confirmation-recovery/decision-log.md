# `6-4` Decision Log

The decisions below supersede the earlier uncertainty-heavy owner-state plan.
They were corrected on 2026-07-23 after reviewing first-party CaoCao
documentation and recording Sir's explicit risk acceptance.

## `6-4-D1` — Job is the fee-confirmation task

Fee confirmation has no separate product lifecycle in the current product.
Do not add a FeeConfirmationIntent, owner generation, or
`REQUIRED / IN_FLIGHT / CONFIRMED / UNKNOWN` state machine. A typed generic Job
is sufficient to represent the durable task; its status remains execution
truth, not RideHailing business vocabulary.

## `6-4-D2` — Settlement and task creation are atomic

Bill/BillLine remains authoritative for settlement. The first qualifying
settlement, including an all-zero Bill settled at creation, inserts one
deterministically keyed fee-confirmation Job in the same named short
transaction. Settlement is never replayed to recover a Job.

## `6-4-D3` — The official contract owns request shape

CaoCao's official fee-confirmation documentation makes `order_id` required and
both allowance fields optional. The current product omits both allowance
fields. The repository fake/OpenAPI requirement is a stale fixture discrepancy,
not a reason to invent subsidy ownership or block implementation.

## `6-4-D4` — Provider duplicate-effect risk is accepted

CaoCao's public documentation does not promise fee-confirm-specific idempotency
after a lost response. Sir explicitly decided that Phase 6 need not protect
against repeating a provider operation that already succeeded but lost its
response. Generic Job retry therefore remains legal; no `UNKNOWN` state or
operator reconciliation workflow is introduced for this branch.

## `6-4-D5` — Cut over forward; do not classify historic rows

Existing settled rows receive no speculative backfill or operator
classification. The invariant starts at the migration/deployment cut-over.
This is an explicit scope/risk decision, not an inference that old rows were
confirmed.

## `6-4-D6` — Keep the Provider edge inside RideHailing

Remove fee confirmation from the Trade-facing dispatch port. The Job handler
reloads the RideHailing order/provider binding and invokes a narrow
RideHailing-internal provider operation. JobRunner remains unaware of provider
or settlement semantics.
