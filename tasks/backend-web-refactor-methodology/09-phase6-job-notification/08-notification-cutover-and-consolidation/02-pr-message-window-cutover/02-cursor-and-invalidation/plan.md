# `6-3.2b` Plan

## Ordered Children

1. **`6-3.2b-1` cursor/tombstone foundation.** Add nullable tombstone
   persistence through the standard next migration, make normal message reads
   visible-only, add an explicit all-row cursor lookup, and expose the opaque
   `acknowledgementCursor` alongside the current legacy thread fields. Do not
   change HTTP read-marker semantics or wire the admin delete route yet.
2. **`6-3.2b-2` invalidation foundation — complete.** Add a generic Job release operation
   for held `UNTIL_ACKNOWLEDGED` reservations and a Notification-owned
   `pr.message-summary` invalidation command/transaction port. The source-side
   option observation must share the option-row serialization boundary with
   PR-message preference mutation. Do not let PR import a Job identity.
3. **`6-3.2b-3` lifecycle wiring — complete.** Participant removal completed
   first because later PR-wide transitions can only enumerate the current
   roster; terminal fences, tombstone/root-delete, subscription/controller and
   generic `43101` conversion then completed before the lifecycle matrix.
   Message visibility/post compatibility remains intact. The exact dependency
   graph, historical former-recipient compatibility decision and final evidence
   are in the [child packet](./03-lifecycle-wiring/00-task-packet.md).

## Cross-Child Stop Conditions

- Stop if a visible-only lookup is reused as the acknowledgement cursor.
- Stop if Job receives a PR status, delete reason, provider code, or user
  preference, or if PR constructs a `notification.send.v1` key.
- Stop if a compatibility `read-marker` update is described as releasing a
  generic window before `6-3.2c` proves the user-visible semantic ACK.
- Stop if a source transaction reads notification availability without sharing
  the option-row serialization boundary used by the corresponding mutation.
- Stop if a migration modifies the already-existing untracked `0089`–`0092`
  migrations instead of allocating the next standard migration.

## Cheapest Verification

- `6-3.2b-1`: tombstone a held high-water message, assert it leaves the visible
  list while `acknowledgementCursor` remains covering; prove legacy thread
  fields remain compatibility-only.
- `6-3.2b-2`: exact/prefix release tests for pending, running and terminal-held
  rows; owner tests prove semantic input maps to private keys only.
- `6-3.2b-3`: real-Postgres matrix for admin tombstone, exit, terminal,
  opt-out, provider permission loss, rejoin and later message. It must prove
  no historical replay on credit restoration.
