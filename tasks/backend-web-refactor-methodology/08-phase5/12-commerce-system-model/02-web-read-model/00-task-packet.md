# C0.2 — Web Read Model And Cache Authority

## Objective

Treat each server-backed UI state as a read projection with one query-key owner, one cache authority, and explicit
post-mutation reconciliation. Distinguish confirmed duplicate reads/second SSoT from hypotheses requiring request
count evidence.

## Scope

- Commerce Placement/listing/order/Bill query keys and invalidation;
- PaymentTx/checkout server read authority;
- Order Detail polling and its relationship to reconciliation;
- Viewer Bill list projection versus per-Bill detail reads.

## Explicit Non-Goal

Do not mechanically split `useCommerce.ts`, duplicate adapters for legitimate multiple consumers, or extract every
computed label into a new composable. The unit of change is a read contract/cache policy, not a file.

See [`confirmed-findings.md`](./confirmed-findings.md) and [`verification-plan.md`](./verification-plan.md).
