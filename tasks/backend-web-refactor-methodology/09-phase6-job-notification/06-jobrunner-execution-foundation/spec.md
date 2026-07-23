# `6-1` Specification

## Public Job Contract

1. A producer schedules a named, versioned task through a narrow Job port.
2. Job storage may retain JSON, but every registered definition validates and
   decodes its payload before invocation.
3. Handler registration is owned by the composition root. JobRunner imports no
   Notification, RideHailing or other business implementation.
4. The handler receives a generic execution context and returns exactly one:
   `SUCCEEDED`, `SKIPPED`, `RETRYABLE_FAILURE`, or `PERMANENT_FAILURE` with a
   bounded stable reason.
5. Handler payload and reason are opaque to Job control. JobRunner never
   branches on business fields.

## Durable Control State

Job owns:

- task identity/type/version and opaque payload;
- `runAt`, timing bucket/tolerance and generic creation metadata;
- current status, attempt count, last bounded execution reason;
- claim/lease ownership and expiry;
- retry eligibility/budget and next run time;
- terminal timestamps; and
- optional creation reservation.

Each claim has a unique lease token. A completion/retry/skip write succeeds
only while Job ID, `RUNNING`, lease owner and lease token still match. A stale
handler updates no Job control state and emits only a bounded stale-completion
signal.

The target generic statuses add:

- `SKIPPED`: the current handler invocation deliberately performed no external
  effect and completed the task; and
- `CANCELED`: control was stopped before another invocation, for example by a
  covering ACK while pending/retry.

Neither status is delivery truth. Existing `SUCCEEDED`, `FAILED` and `MISSED`
remain generic execution outcomes.

Job does not own provider acceptance/delivery, user preference, RideHailing
confirmation, operator reconciliation or attempt-by-attempt audit history.

## Creation Reservation

Creation has three distinct modes:

- `ONCE` preserves ordinary/legacy active-dedupe behavior where required;
- `ONCE_PER_CAUSE` gives an owner generation a terminal-safe immutable
  causation key; and
- `UNTIL_ACKNOWLEDGED` adds an orthogonal reservation with:
  - creation key and mode;
  - `HELD | RELEASED` state;
  - window-start cursor and monotonic high-water cursor;
  - release timestamp; and
  - at most one HELD reservation for `(jobType, creationKey)`.

`ONCE_PER_CAUSE` and HELD-reservation uniqueness use separate partial indexes;
neither reuses the existing cross-type active `dedupe_key` index. A coalescing
schedule returns the existing Job ID. A terminal-safe causation row cannot be
retained less time than its owner may repeat the causal command; its retirement
is an explicit owner-lifecycle rule, not ordinary terminal Job cleanup.

Scheduling against a HELD key returns the existing Job and atomically raises
high-water even when execution is terminal. A covering ACK releases only when
`throughCursor >= highWaterCursor`. A stale ACK changes nothing. After release,
the next schedule creates a new Job generation with the same logical key.

Execution terminality and reservation state are independent. Retention must not
delete a terminal Job with a HELD reservation. ACK changes pending/retry work to
`CANCELED`; a running handler only observes release and must recheck reservation
state before an external effect.

The source cursor and its high-water coalesce must commit before that cursor is
externally ACKable. The initial PR-message integration therefore uses one named
transaction. If a producer cannot satisfy this ordering, it must add a durable
acknowledged-through watermark plus key-scoped serialization or stop; the Job
API must not silently accept a best-effort gap.

## Claim, Lease And Disposition

- Claim remains a short transaction using DB coordination; handlers run outside
  it.
- Claim writes a fresh lease token; every terminal/retry update is fenced by
  that token.
- Lease expiry permits recovery, but does not prove a provider call is safe to
  repeat. The handler reloads its semantic owner before any second effect.
- `RETRYABLE_FAILURE` retries only within declared generic budget/timing.
- `PERMANENT_FAILURE` and exhausted retries terminate generic execution.
- `SKIPPED` is explicit in durable Job status and must not masquerade as
  provider delivery.
- `MISSED` remains a generic timing outcome.

## Attempt Observability

Phase 6 does not add a console/stdout attempt sink. Durable Job status, attempt
count, lease and bounded terminal/retry reason remain the current operational
execution facts. A later observability phase may introduce a real adapter only
with a governed backend, correlation/query, retention/access, alerts and
runbooks. Telemetry failure must never change Job state or cause an extra
handler invocation.

Job persistence is isolated behind pure executor-aware storage operations. The
ordinary public scheduling port exposes no Drizzle transaction. A named
cross-owner integration adapter may use a transaction-bound writer for
`ONCE_PER_CAUSE` or `UNTIL_ACKNOWLEDGED` invariants.

## Compatibility

- The nine registered built-in types were a `6-1` entry snapshot. Sir's later
  forward cut-off waived live-row inventory, and `6-3` retired every concrete
  Notification handler/decoder rather than preserving that snapshot.
- A legacy return/throw adapter may remain only for a current
  non-Notification built-in. Every new definition uses structured
  dispositions.
- At the temporary compatibility boundary, legacy return mapped to success and
  throw mapped to its existing retry behavior. The PR-message
  return-after-failure bug was corrected by its generic cutover, not declared
  valid behavior.
- Schema evolution is additive in `6-1`; destructive retirement belongs to
  later slices and was completed by `6-3`.

## Acceptance Criteria

1. No static `Job → business module` dependency exists.
2. Current Job scheduling and due-work behavior remain characterized.
3. Structured outcomes cannot produce “handler reported retryable failure but
   Job became SUCCEEDED”.
4. Concurrent insert/coalesce and schedule/ACK races satisfy the reservation
   invariants.
5. Terminal execution can remain HELD and later release/reopen.
6. Job state/type vocabulary contains no business uncertainty or
   reconciliation state.
7. Phase 6 adds no attempt console sink; durable Job state and protected
   aggregates remain non-business authority until a future professional path
   supplies governed correlated observability. Phase 7 later removed the
   rejected pseudo-observability baseline without supplying that replacement.
8. Existing job rows have an explicit forward-compatibility path.
9. A lease-expired handler cannot overwrite a newer claim.
10. Transaction-bound creation rolls back with its named owner mutation.
