# `6-3.2b-2` — Job / Notification Window Invalidation Foundation

## Status

**Complete.** `6-3.2b-1` proved the durable cursor/tombstone boundary; this
child proved the generic Job/Notification release seam before PR lifecycle
entrances were rewired. The dependent `6-3.2b-3` lifecycle wiring is now also
locally complete.

## Objective

Expose the smallest generic held-reservation release operation and map it to a
Notification-owned PR-message semantic invalidation surface. This child owns
the source/preference option-row serialization mechanism; it does not yet wire
every PR lifecycle mutation.

## Scope

- Job contracts, store/repository and transaction writer for releasing held
  `UNTIL_ACKNOWLEDGED` reservation(s) under private creation-key locks;
- Notification public/transaction-bound semantic invalidation contract for
  `pr.message-summary`, with aggregate/recipient scope and private key mapping;
- option-row locked source-time observation and a Notification-owned PR-message
  subscription mutation seam that can serialize update/release with source
  scheduling;
- focused unit/real-Postgres concurrency proof.

## Implemented Boundary

- Job exposes neutral exact-key and stable-prefix held-reservation release. It
  cancels only pending/retry execution, releases a held terminal/running row
  without rewriting its execution history, and returns no business reason.
- Notification maps semantic `pr.message-summary` aggregate/recipient scope to
  its private `notification.send.v1` identity. Neither PR nor provider code
  imports that identity.
- The PR-message source locks a recipient option row before eligibility. The
  Notification-owned `ADD_ONE` / `CLEAR` mutation locks the same row, changes
  preference/credit and releases recipient held work before commit. `0 →
  positive` removes an obsolete held generation but never schedules historical
  messages.
- Generic `43101` cleanup for `pr.message-summary` enters that same serialized
  mutation seam. The authenticated subscription HTTP route now delegates to
  the canonical command, with only an explicit historical concrete-job drain
  remaining on `CLEAR`.

## Exit

Notification can cause a held window to become released without PR or a
provider importing Job identity. A source create and an option clear/re-enable
cannot commit an invalid mixed availability/window outcome.

## Non-Goals

- no PR route/lifecycle wiring;
- no authenticated subscription-route or other PR lifecycle wiring;
- no semantic HTTP acknowledgement;
- no generic cross-domain transaction framework.
