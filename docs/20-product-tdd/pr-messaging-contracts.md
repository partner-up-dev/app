# PR Messaging Contracts

This file owns the cross-unit contract for participant-authored messages,
operator-authored system messages, visibility, visible-thread acknowledgment,
and Notification handoff.

## 1. Message And Viewer State

- Backend owns persisted `PRMessage` items inside one `PartnerRequest` thread.
- A message is participant-authored or operator-authored system context;
  backend owns author/type classification and plain-text validation.
- The current product contract does not persist a general per-viewer read
  position, unread badge, per-message receipt, or separate inbox aggregate.
- Showing the visible thread may emit an explicit acknowledgment used only to
  release the recipient's `PR_MESSAGE` attention-window reservation. It is not
  a reusable read receipt or canonical unread projection.
- Hidden loads and prefetches cannot acknowledge a window.
- An attention acknowledgment carries an opaque, monotonic message-stream
  cursor. It is neither a per-viewer fact nor a claim that every historical
  message remains visible. The cursor is kept separately from the rendered
  item projection so a held window remains coverable when its high-water item
  is later removed from that projection.
- Administrative message removal is logical/tombstone removal while
  a held window can still reference the message cursor: normal thread reads
  exclude the tombstone, while cursor validation retains its PR/thread identity
  and ordering. Physical purge must wait until no held reservation can
  reference it (or use an equivalent retained cursor fact); deletion must not
  make a valid already-rendered acknowledgment impossible.
- `PRMessage.deletedAt`, visible-only reads and the
  all-row `acknowledgementCursor` are implemented. Administrative delete now
  tombstones a visible row and invalidates current-recipient windows in the
  same transaction; a repeated delete remains not-found, while physical purge
  stays gated by cursor/reservation retention. No source may treat a physical
  delete as a shortcut around that contract.

If a future product introduces per-message viewed membership for the small,
bounded PR participant set, prefer a message-owned `viewedByUserIds` set while
it shares the message lifecycle and has no per-view metadata. Apply the durable
fact placement rule in
[`architecture-objectives-and-decision-rules.md`](./architecture-objectives-and-decision-rules.md)
before creating a separate relation. No viewed-membership fact exists in the
current product.

## 2. Route And API Contract

- Frontend page placement is route-based: `/pr/:id` is the handoff/detail page,
  and `/pr/:id/messages` is the dedicated message page.
- The stable message routes remain:
  - `GET /api/pr/:id/messages`
  - `POST /api/pr/:id/messages`
  - `POST /api/pr/:id/messages/acknowledgement`
  - `POST /api/admin/prs/:id/messages`
- The message read response contains ordered visible items, author/type
  classification, posting capability, the latest visible message marker, and
  an opaque acknowledgement cursor. The acknowledgement cursor may remain
  coverable after its high-water item is logically deleted; it is not a
  read-position field. The response does not expose
  backend-authoritative `lastReadMessageId` or `hasUnread`.
- A visible-thread acknowledgment remains an explicit browser action rather
  than a side effect of `GET`. The browser posts
  `POST /api/pr/:id/messages/acknowledgement` with
  `{ acknowledgementCursor: positive integer }` only after the dedicated
  message route has committed a render while the document is visible. It
  receives `{ ok: true }`, not Job/reservation state. Internally the action
  enters Notification through a semantic acknowledgment command rather than
  exposing Job type/key mechanics to Web or PR callers.

## 3. Visibility And Notification Handoff

- Only current active participants may view, post, or acknowledge the thread.
- Admin-authored system-message creation remains a separate admin-only
  capability and does not make the operator a participant.
- PR message creation asks Notification to schedule the stable
  `pr.message-summary` business template for eligible recipients.
- Notification selects the Job creation mode and private creation key. Job owns
  the held/released creation reservation; PR and Web do not import Job
  persistence or construct provider template data.
- Visible-thread acknowledgment enters Notification with PR, recipient and
  the response's acknowledgement cursor. Notification releases only when that
  cursor covers the matching window's current coalesced high-water cursor; an
  ACK for an older rendered snapshot cannot release unseen messages or a newer
  generation. PR validates current participant access and that the cursor is an
  all-row message belonging to the PR (including a tombstone); Notification
  then derives the private Job identity. The cursor check uses PRMessage stream
  identity, not only the currently visible row set.
- Dispatch-time membership, preference/credit, window reservation, current
  messages and channel configuration are backend-revalidated.
- PR-owned lifecycle transactions invalidate source-ineligible windows before
  commit without seeing Job identity: a participant removal releases only that
  recipient, a terminal transition releases the current roster, and admin
  tombstone/root deletion release the roster while it is still capturable.
  `CLOSED` and `EXPIRED` remain message-visibility-compatible but are
  attention-terminal at both source and dispatch time.

## 4. Current Runtime Boundary

Current message creation uses the named atomic PR-message source: participant
posts, admin-system posts and content-generated system context commit a
`PRMessage` with any source-eligible generic `pr.message-summary` held Job
reservations. The participant create response is derived from message state;
it does not persist a viewer read fact. Generic message notification work does
not write the transitional `notification_deliveries` audit table.

For each eligible recipient, source creation locks the recipient's
`user_notification_opts` row before it observes PR-message preference/credit
and creates/coalesces a held window. Notification's named PR-message
preference/credit mutation locks the same row and releases the recipient's
held windows before commit. Clearing permission releases current work; restoring
credit after zero only releases an obsolete held generation and does not replay
messages from the unavailable period. Job receives neither these reasons nor
PR identity—only Notification's opaque creation identity. The authenticated
subscription route and generic `43101` permission-refusal path both delegate
to this canonical mutation; neither path replays historical attention.

The former `pr_message_inbox_states`, `lastReadMessageId` / `hasUnread`,
`lastNotifiedMessageId`, `POST /api/pr/:id/messages/read-marker` transport and
concrete `wechat.notification.pr-message` handler are forward-retired. The
cut-off intentionally did not preserve already-deployed legacy clients or
concrete Jobs. No replacement unread table, compatibility bridge or
per-viewer receipt exists.

The current acknowledgement cursor is the greatest PRMessage ID for the PR,
including a tombstone; it can be greater than `latestVisibleMessageId`. Normal
thread lists and notification-context message selection exclude tombstones.
The cursor field itself does not release a Job: `GET` is not a semantic
attention acknowledgement. Only the dedicated acknowledgement route may ask
Notification to evaluate the held window.

- Owner: Phase 6 Job / Notification refactor.
- Current replacement: Job's `UNTIL_ACKNOWLEDGED` creation mode,
  explicit visible-thread acknowledgment, high-water/stale-ACK protection, and
  the cross-unit open/coalesce/acknowledge/reopen scenario are proven.
- Forward-retirement decision: no production inventory, old-client sunset or
  historical concrete-row drain was required.
- Anti-widening rule: no new surface may reintroduce inbox rows, read-marker
  transport, `lastReadMessageId`, `lastNotifiedMessageId`, or `hasUnread`.
