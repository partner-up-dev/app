# `6-3.2a-3` — Producer Cutover / Legacy Message Drain

## Status

**Complete.** The participant, admin-system and content-generated callers now
enter the atomic source port. The focused real-Postgres matrix proves source
eligibility, one coalesced generic window, terminal-held/stale-and-covering
ACK behavior, reopen after release, no new legacy writes, and a historical
concrete-row drain. See [`verification-log.md`](./verification-log.md).

## Objective

Move the three current PR-message producers to the one atomic source path,
then prove the generic Job-window matrix while keeping only historical
concrete message Jobs alive. The producer boundary is explicit:

- Participant `POST /api/pr/:id/messages` keeps its authenticated active-
  participant ACL and three-per-minute rate precheck, then calls the port with
  `authorKind: ACTIVE_PARTICIPANT`; its post-commit operation action remains
  `pr.create_message`.
- Admin-system `POST /api/admin/prs/:id/messages` keeps service-role auth, PR
  existence and body validation, then calls the port with
  `authorKind: OPERATOR_OR_SYSTEM`; it does not require the operator to be an
  active participant, and its post-commit operation action remains
  `pr.create_system_message`.
- Content-generated messages are emitted only for non-DRAFT core-field changes
  from the user content route after the existing content transaction commits.
  The creator ACL and all content/release prechecks remain source-owned; the
  independent system-context message transaction uses
  `authorKind: OPERATOR_OR_SYSTEM` and
  retains `pr.notify_core_field_change` (alongside the existing
  `pr.update_content`) as fire-and-forget post-commit logging.

The existing response shape remains available through a synthetic immediate
thread read projection. The participant create response may report the new
message as immediately read without persisting an inbox marker; the admin-
system create response keeps a null read marker. The content command has no
message-thread response and persists neither projection nor inbox state.

## Depends On

`6-3.2a-1` and `6-3.2a-2`.

## Plan

1. Route participant, admin-system and content-generated callers through the
   canonical atomic helper and map port outcomes to their existing HTTP
   problems. Keep content's message call after its already-committed content
   transaction; do not create a generic content-plus-message transaction.
2. Remove every new call to unread-wave, `NotificationOpportunity`, inbox/wave/
   Delivery repositories and the concrete message scheduler. The new path may
   write only `PRMessage` plus generic `notification.send.v1` reservations;
   only the participant create response uses a synthetic read projection.
3. Prove the real-Postgres window matrix: M1 creates one HELD reservation and
   M2 coalesces the same PR/recipient key while raising high-water; terminal
   execution leaves it HELD; stale ACK is ignored, covering ACK releases, and
   a later message reopens a new generation.
4. Cover configured, missing-channel and no-credit source-time eligibility,
   including no-reservation cases, then prove a historical
   `wechat.notification.pr-message` row still drains with its inbox dependency.
5. Audit reverse edges and retain the old handler/decoder/Delivery path only
   for historical-row drain. This slice must not claim the later HTTP semantic
   ACK or retire legacy inbox/read-marker state.

## Stop Conditions

- Stop if any current producer writes a new inbox, wave, opportunity, Delivery
  or concrete `wechat.notification.pr-message` row.
- Stop if the content producer is moved into (or causes widening of) the
  existing content transaction, or if a response depends on a persisted new
  inbox marker.
- Stop if ACK behavior is described as an HTTP semantic ACK; this slice proves
  Job-level stale/covering ACK only.
- Stop if a legacy handler removal is required to make the source audit pass;
  historical drain is an explicit compatibility gate.

## Rehearsal

- M1/M2 repeated messages may raise high-water but never create a second HELD
  row for one PR/recipient generation.
- Terminal execution does not release HELD; stale ACK cannot release a window,
  while a covering ACK releases it and the next source message opens a new
  generation.
- Missing channel, inactive/unbound recipient or absent PR-message credit
  creates no generic reservation, while configured eligible recipients receive
  exactly one held reservation.
- A legacy read marker cannot release a generic reservation.
- A content-change message starts its own atomic message window only after its
  earlier content mutation commits; retrying the message window never re-runs
  that content mutation.
- The legacy concrete handler remains registered and drains only a fixture row;
  no current producer reaches it.

## Cheapest Verification

- existing Job-window scenario primitives plus one PR-message producer matrix;
- configured/missing/no-credit recipient probes and a targeted legacy-drain
  fixture;
- reverse-edge search proving only the historical handler retains concrete-job
  references;
- backend unit/scenario/type/lint/build gates after the vertical is complete.
