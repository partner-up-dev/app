# `6-3.2a-2` — Atomic PR-Message Persistence Source

## Status

**Locally complete.** `6-3.2a-1` provides the generic owner/window contract;
this child now provides a real-Postgres-proven, still-unused-by-production
atomic persistence port. Producer routing remains exclusively reserved for
`6-3.2a-3`.

## Objective

Create the narrow PR-owned transaction that inserts one message and every
currently eligible recipient's generic HELD/high-water reservation together.

## Depends On

`6-3.2a-1` owner/window contract and its transaction-bound Notification port.

## Plan

1. Completed: make the PR message repository transaction-executor aware
   without turning it into a business service.
2. Completed: lock/reload the PR and freeze its active roster inside a named
   message transaction, revalidate the author when required, insert the
   message, then call the transaction-bound Notification port.
3. Completed: keep participant ACL/rate prechecks source-owned and revalidate
   any facts that need the locked PR observation.
4. Completed: make no new-path inbox/wave/opportunity/Delivery or concrete Job
   write. A future producer wrapper may construct its immediate response
   projection without recreating an inbox write.
5. Completed: prove injected reservation failure rolls back the message and
   every Job.

## Rehearsal

- A roster write failure aborts the entire transaction, not one recipient.
- The PR is reloaded under the transaction; an outer stale request cannot
  define a recipient roster.
- The result never calls provider I/O while the transaction is open.

## Implemented Boundary

- `createPRMessagePersistenceTransactionPort` accepts only `prId`, author,
  prevalidated body and an explicit author semantic. It does not accept a
  stale PR, recipient roster, Job configuration, channel or generic callback.
- It obtains `PR FOR UPDATE`, then active partner slots in deterministic
  slot-id order `FOR UPDATE`; a participant-authored message must still have
  an active locked slot. Operator/system messages may deliberately bypass only
  that author-membership check, never the frozen recipient roster.
- The transaction inserts/reloads the message and invokes Notification's
  narrow transaction-bound message-summary port with the DB-created message
  timestamp and ID as the first window cursor. Notification retains channel,
  active-user/OpenID/preference/credit filtering and all Job mechanics.
- A missing channel is a fail-closed Notification decision: the message
  commits and no reservation is created. Reservation creation failure aborts
  the source transaction, including earlier recipient Job rows.
- The adapter intentionally remains internal to PR and has no production
  caller. The current participant, admin and content-generated producers still
  use the old persistence path until `6-3.2a-3` switches all three together.

## Verification Record

- real PostgreSQL scenario — 3 cases passed: frozen-author recheck and
  eligible generic HELD creation; unavailable-channel message-only commit;
  post-write injected reservation failure rolls back the message and Job.
- The scenario also proves no new `pr_message_inbox_states`,
  `notification_waves`, `notification_opportunities`,
  `notification_deliveries`, or `wechat.notification.pr-message` rows arise.
- backend typecheck and lint pass; the backend unit suite passes.

## Durable-Doc Promotion

No additional durable contract is promoted by this child. Its adapter is not
yet a production source path; the already-promoted target owner model remains
the durable truth. `6-3.2a-3` must first prove that all current producers use
this boundary and that legacy rows only drain before source-specific runtime
facts can be promoted.

## Cheapest Verification

- real-Postgres source scenario injects a concrete transaction-bound
  Notification port and asserts the resulting HELD row shape;
- the same scenario deliberately throws only after the real port writes a Job,
  then asserts no message/Job survives and no compatibility table or concrete
  legacy Job received a new row.
