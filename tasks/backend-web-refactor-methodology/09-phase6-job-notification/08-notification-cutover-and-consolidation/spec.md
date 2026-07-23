# `6-3` Specification

## One-Shot Family Convergence

After the `WAITLIST_PROMOTED` exemplar, migrate:

- confirmation reminder;
- activity-start reminder;
- new partner;
- meeting-point updated;
- PR ready;
- waitlist alternative available.

Every template uses the same public request → private policy/binding → typed
Job → generic handler topology. Kind-specific code is limited to typed policy,
eligibility and rendering; it must not reintroduce scheduler/handler glue.

Before cutting over a template, classify its task handoff:

- **atomic required**: losing the task after the business transition would
  violate a declared product/technical invariant; use a narrow transaction-
  aware port owned at that integration boundary; or
- **recoverable best effort**: task loss is tolerable or an explicit query can
  detect/recreate it; record the recovery rule.

This classification cannot be replaced with a generic outbox or cross-domain
transaction helper.

The rehearsal selects this initial handoff matrix:

| Template | Selected handoff | Required proof |
| --- | --- | --- |
| activity-start reminder | recoverable | named reconciliation from current participant + PR time facts |
| confirmation reminder | recoverable | named reconciliation for both trigger times and every rebuild/cancel caller |
| new partner | atomic required | join mutation and recipient snapshot have no durable event/version from which the exact fan-out can be rebuilt |
| meeting-point updated | atomic required | current product behavior notifies each update; “latest state only” would be a product change |
| PR ready | atomic required | current PR has no stable ready-transition timestamp/causation fact |
| waitlist promoted | atomic required | current promotion has no durable promotion timestamp or reconciler |
| waitlist alternative available | recoverable | named pure current-state scan; dispatch query may not call a PR mutation/temporal refresh |
| PR message summary | atomic required | message write and HELD/high-water coalesce commit together |

Changing an atomic-required family to recoverable requires first adding the
named durable reconstruction fact/query. Merely logging schedule failure is not
recovery.

## PR Message Attention Window

1. Message creation asks Notification to request `pr.message-summary`.
2. Message insertion and the recipient HELD/high-water writes occur in one
   named transaction. A committed/externally visible message cursor is already
   represented in the reservation.
3. First eligible message creates one `UNTIL_ACKNOWLEDGED` Job/reservation for
   `PR / recipient`, with start/high-water cursor.
4. Later messages coalesce and atomically raise high-water, including after Job
   execution is terminal.
5. Handler recomputes current relevant content and revalidates active
   membership, option/credit, channel and HELD reservation.
6. Only a mounted messages route after render commit, while the document is
   visible, sends semantic ACK with `throughCursor`; hidden query/prefetch does
   not. A failed ACK remains retryable for the same cursor.
7. Notification derives the private creation key and releases only a covered
   high-water. Web/PR does not know Job type/key.
8. ACK is notification-frequency control, not a read receipt.
9. Recipient leave or PR termination releases/cancels the current window. A
   later rejoin receives attention only for a later new message, which opens a
   new generation; absence-period messages are not retroactively notified.

If atomic message+reservation commit proves impossible, the implementation must
stop. A recoverable alternative needs a durable acknowledged-through watermark
and key-scoped ACK/schedule serialization so a cursor seen before delayed
scheduling cannot reopen a window. This state is not added while the atomic
path is available.

No target `notification_waves`, `pr_message_inbox_states`, thread read marker or
unread-summary field remains. A future bounded per-message viewed fact belongs
to PRMessage unless independent extraction criteria are proven.

## Compatibility And Retirement

- Sir's explicit forward cut-off supersedes the pending-row compatibility
  strategy: legacy `wechat.*` handlers/decoders and no-cycle generic payload
  variants are removed without inventory or drain.
- `notification_opportunities` and `notification_waves` have no target reader
  and are removed with the inbox table by forward migration.
- Remove inbox entity/repository/API/response fields and Web auto-advance only
  after the replacement ACK system scenario is green.
- `notification_deliveries` remains inert transitional audit evidence.
  Governed, queryable O11y and any delivery-table retirement are deferred to
  Phase 7; `6-5` does not substitute a console sink.
- `notification_deliveries.sentAt` on legacy FAILED/SKIPPED rows is attempt-time
  compatibility data, not proof of provider delivery.
- `user_notification_opts` remains and must not be conflated with the removed
  stores.

## Acceptance Criteria

1. All eight current Notification kinds have a target template and typed
   handler path.
2. No business caller imports `infra/notifications`, channel adapters,
   Notification repositories or provider template data.
3. Timing, eligibility, logical limited/unlimited credit and provider cleanup
   behavior are preserved per template without pretending current WeChat
   counters are nullable.
4. PR-message open/coalesce/terminal-held/stale-ACK/covering-ACK/reopen works
   without inbox/wave state.
5. Old read/unread fields and read-marker endpoint are not silently retained as
   a second authority.
6. Opportunity/wave/inbox persistence and dead code are removed through a
   forward migration with fixtures.
7. Delivery rows are explicitly retained for Phase 7; no false “fully retired”
   claim is made.
8. Legacy per-kind registrations/decoders and no-cycle generic compatibility
   payloads are absent under the explicit forward cut-off.
9. Every family has the selected atomic/recoverable handoff proof; no
   post-transition best effort remains unnamed.
10. All concrete schedule/cancel/rebuild edges, including WeChat controller
    side-effect routes, use the target surface; no legacy compatibility path
    remains.
