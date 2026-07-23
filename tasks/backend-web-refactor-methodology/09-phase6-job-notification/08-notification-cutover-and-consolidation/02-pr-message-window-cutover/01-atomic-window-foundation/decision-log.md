# `6-3.2a` Decision Log

## `6-3.2a-D1` — Reservation state stays in Job

The durable `pr.message-summary` task retains its existing semantic payload
`{ prId }`. `windowStartCursor` and high-water are the generic Job reservation
fields; the runner exposes the immutable start cursor to the claimed handler,
while a fresh `isCreationReservationHeld()` query remains the final side-effect
fence. This avoids two sources for the creation-window lifecycle.

## `6-3.2a-D2` — A channel availability query is Notification-owned

The generic channel port gains a narrow configuration check. The
transaction-bound PR-message Notification port invokes it before creating
HELD work, so an unavailable WeChat template creates no unreleaseable window.
PR never imports a provider/configuration adapter.

## `6-3.2a-D3` — Atomicity begins at message persistence

The named PR-message transaction has one explicit lock/hand-off order:
`PR FOR UPDATE → active roster FOR UPDATE + author recheck → insert/reload
message → transaction-bound Notification handoff`. The locked PR and roster are
the source snapshot: participant authors cannot race an exit after the active
author recheck, while `OPERATOR_OR_SYSTEM` bypasses only author membership and
still uses the frozen recipient roster. Every source-eligible reservation is
written before commit. It does not widen an independently valuable content-edit
transaction merely because that edit later asks to create a system message.

The roster lock is taken in deterministic slot-id order. Notification receives
only that frozen candidate list and the same transaction executor, so Job
reservations commit or roll back with the message and no provider I/O occurs
under the source transaction.

## `6-3.2a-D4` — Compatibility writes are not carried forward

New message creation writes neither `pr_message_inbox_states`,
`notification_waves`, `notification_opportunities`, nor
`notification_deliveries`. The old concrete message handler and its inbox
dependency remain registered only to drain historical rows. `/read-marker`
continues to affect only that legacy path for old deployed clients until the
`6-3.3` retirement gate. `6-3.2c` completed the current Web semantic-ACK
replacement and never uses this route.

## `6-3.2a-D5` — A post-claim check is not exactly-once delivery

An ACK that releases a HELD reservation before provider I/O causes generic
dispatch to skip. If it races after I/O starts, the provider effect may still
occur; Job does not gain business state and the system makes no cancellation or
exactly-once claim.

## `6-3.2a-D6` — Producer mapping and overlap response

The participant producer passes `authorKind: ACTIVE_PARTICIPANT`; admin-system
and user content-generated system-context producers pass
`authorKind: OPERATOR_OR_SYSTEM`. Participant ACL/rate checks and content
prechecks remain source-owned; the adapter's locked author recheck closes the
participant-exit race without adding a new post-content-commit membership race.
New creation writes no inbox, wave, opportunity, Delivery or concrete message
Job. During overlap, only the participant create response synthesizes an
immediate last-read cursor equal to the created message ID; admin-system keeps
a null cursor and content exposes no message-thread response. No new inbox
marker is persisted. This slice proves Job-level ACK only, not HTTP semantic
ACK.

The operation-log actions remain source semantics and are emitted only after a
`CREATED` message commit: `pr.create_message`, `pr.create_system_message`, or
`pr.notify_core_field_change` (with `pr.update_content` still belonging to the
already-committed content mutation). A rejected port outcome never emits a
message operation log.
