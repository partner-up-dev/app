# D6-F-01 — RideHailing Fee-Confirmation Job Boundary

> Historical decision packet. Its atomic-settlement and Job/domain ownership
> findings remain useful, but the `UNKNOWN` state, confirmation generation,
> operator recovery, allowance gate, and no-retry ambiguity policy were
> superseded on 2026-07-23 by
> [`../09-fee-confirmation-recovery/decision-log.md`](../09-fee-confirmation-recovery/decision-log.md).

## Status

**Read-only review complete; Sir ratified D6-F-01 on 2026-07-22.** This packet
records the smallest RideHailing-order state plus generic Job task boundary
without a separate fee-confirmation intent entity.

It does not authorize application source, schema, migration, provider call,
operator action, or runtime changes.

## Questions

1. Does fee confirmation need an independent entity, or can RideHailing own a
   small order-local state while one typed Job remains only the task record?
2. What exactly precedes fee confirmation: provider final-fare observation,
   final Bill creation, or BillLine payment settlement?
3. What must an operator reconcile after an accepted-but-response-lost result,
   and what action is safe without provider idempotency/query evidence?

## Ratified Conclusion

- The relevant trigger is **BillLine payment settlement**. It commits before
  provider `feeConfirm` is attempted.
- No current product/source consumer proves an independent fee-confirmation
  intent lifecycle. RideHailing owns a bounded `feeConfirmation` state;
  a typed Job owns only generic task mechanics and a per-generation causation
  key.
- Settlement, initial RideHailing `REQUIRED` state and Job creation must be
  atomic or connected by an explicitly recoverable handoff. Creating an intent
  beside Job would not remove this atomicity requirement.
- Before provider I/O, RideHailing enters `IN_FLIGHT`. Definite success becomes
  `CONFIRMED`; response loss or crash becomes/conservatively remains `UNKNOWN`.
  Job records only a generic non-retrying terminal execution result.
- Operator work enters through a RideHailing command. A proven-safe retry
  advances the confirmation generation and creates a new Job; it neither
  mutates the old Job nor reruns Bill settlement.
- `6-4` also has a provider-command input gap independent of persistence shape:
  repository OpenAPI requires both allowance fields, while the current
  Trade-facing call supplies neither. Their semantic owner/default cannot be
  invented in Job payload.

The owner/state/sequence decisions are closed. Provider idempotency/query
evidence and the two allowance-field semantics remain `6-4` execution gates,
not unresolved architecture ownership decisions.

## Artifacts

- `evidence.md`: current settlement and `feeConfirm` source trace.
- `discussion-log.md`: Sir's objections and the corrected interpretation.
- `decision-log.md`: ratified owner, atomicity and replay decisions.
- `target-sequence.md`: corrected ordered sequence and failure branches.
- `rehearsal.md`: proof gates for an executable `6-4` slice.
- `durable-promotion-log.md`: owner correction promoted to architecture,
  Commerce, Job/Notification and deployment contracts.
