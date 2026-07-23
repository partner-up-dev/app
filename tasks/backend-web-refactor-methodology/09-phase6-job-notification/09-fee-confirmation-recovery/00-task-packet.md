# `6-4` — RideHailing Fee-Confirmation Recovery

## Status

**Locally complete on 2026-07-23.** First-party CaoCao
documentation and Sir's 2026-07-23 risk decisions close the former external
evidence gate. The checked-out source proves two current lost-task paths:

- an exact `ALREADY_SETTLED` payment replay does not re-run the settlement
  consequence; and
- an all-zero final Bill is settled at creation and has no payment callback to
  start the current synchronous `confirmFee` chain.

The official contract makes both allowance fields optional. The target sends
`order_id` only. Sir accepts duplicate provider-effect risk after a lost
response, so the earlier owner-state/ambiguity/operator design is removed.
This slice requires `6-1`'s transaction-bound `ONCE_PER_CAUSE` writer and
fenced generic execution, not Notification internals.

The qualifying payment-settlement and all-zero final-Bill paths now create one
deterministically keyed Job inside the named RideHailing reconciliation
transaction. The handler reloads current provider context after commit and
serializes only `order_id`. The old synchronous Trade consequence is removed;
focused and broad proof is recorded in [`verification-log.md`](./verification-log.md).

## Objective And Hypothesis

Close Phase 5 F-02 without a FeeConfirmationIntent, duplicate business state,
or business-aware Job. One deterministically keyed typed Job is the durable
fee-confirmation task created atomically with the qualifying Bill settlement.

## Owned Scope

- final BillLine payment-settlement → Job atomic handoff;
- `ride-hailing.fee-confirm.v1` definition/handler;
- `order_id`-only CaoCao request;
- ordinary generic Job success/retry/permanent-failure classification;
- removal of fee confirmation from the Trade-facing dispatch port in favor of
  a RideHailing-internal typed provider port;
- fake-provider and concurrency proof.

## Non-Goals

- no replay of Bill settlement;
- no FeeConfirmationIntent or standalone confirmation table;
- no RideHailing fee-confirmation generation/state machine;
- no Job `RECONCILIATION_REQUIRED`/`UNKNOWN` business state;
- no special lost-response/operator reconciliation workflow;
- no generic Commerce transaction helper or global outbox;
- no allowance values while the product has no subsidy decision;
- no historic-row classification or backfill.

## Packet Files

- `spec.md`
- `plan.md`
- `rehearsal.md`
- `verification-plan.md`
- `decision-log.md`
- `preflight-evidence.md`
- `evidence-request.md`
- `official-caocao-contract-review.md`
- `verification-log.md`

## Sub-Task Layout

- [`00-provider-product-runtime-evidence-gate/`](./00-provider-product-runtime-evidence-gate/)
  is complete after official-contract review and explicit risk decisions.
- [`01-atomic-settlement-handoff/`](./01-atomic-settlement-handoff/) completed the
  exact settlement/all-zero transaction and one causal Job insertion.
- [`02-typed-provider-job-handler/`](./02-typed-provider-job-handler/) completed the
  RideHailing-internal provider boundary and typed Job handler.
- [`03-verification-and-cutover/`](./03-verification-and-cutover/) completed focused
  regression proof, forward-only cut-over evidence, and removal of the old
  synchronous edge.

The ratified discussion evidence remains in
[`../05-ride-hailing-fee-confirmation-job-boundary/`](../05-ride-hailing-fee-confirmation-job-boundary/).
