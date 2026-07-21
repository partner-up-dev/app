# 5-6A.3.2 RideHailing Port And Synchronisation Boundary

## Status

**Complete.** Trade consumes provider construction, callback-info construction, provider outcome errors, and the
pre-cancel reconciliation boundary through named RideHailing Ports/Contracts rather than a RideHailing root. The
normal dispatch Port is loadable without eagerly constructing reconciliation persistence; only the pre-cancel path
loads the provider-observation workflow.

## Chosen Boundary

| Trade need | RideHailing surface | Constraint |
| --- | --- | --- |
| construct/query/cancel a provider adapter and create callback info | `ports.ts` | an outbound provider Port, not a general service barrel |
| discriminate create/sync outcome errors and input/result shapes | `contracts.ts` | stable errors/types only; no provider raw snapshot exposure |
| perform pre-cancel durable provider observation | `ports.ts` narrow synchronisation Port | preserves explicit sync trigger and provider I/O outside DB locks without exposing the sync implementation |

## Guardrails

- `syncRideHailingOrderWithProvider` remains an owner command with a typed trigger; it must not be relabelled a
  query simply because callers read its result.
- `createRideHailingProviderPort` remains an outbound boundary. It is not injected into a new generic provider
  service or held across a local DB transaction.
- Browser reconciliation continues through the authenticated `reconcileRideHailingOrder` command; this subtask does
  not broaden that HTTP contract.
- No callback topology, provider config, retry scheduler, outbox, or correction/refund flow is added.

## Rehearsal / Verification

See [`rehearsal.md`](./rehearsal.md). Cheap proof is the AST edge inventory, backend type/lint, and the existing
Ride create/cancel/callback scenarios which already exercise provider construction, response-unknown handling,
pre-cancel sync, and terminal reconciliation.
