# `6-3.2b` Decision Log — Cursor And Invalidation

## D6-3.2b-01 — Cursor is a PRMessage fact, not an inbox fact

**Decision:** expose `acknowledgementCursor` as the greatest PR-message ID for
the PR, including tombstoned rows. `latestVisibleMessageId` continues to mean
the greatest non-tombstoned visible message. The former can be null only when
the PR has never had a message; the latter can be null after all messages are
tombstoned.

**Why:** a held Job window stores a monotonically raised high-water. Physical
deletion or a visible-only maximum can make the visible high-water lower than
the held one and strands the reservation. The cursor must therefore preserve
message identity independently of UI visibility.

**Compatibility:** current `lastReadMessageId` / `hasUnread` remains backed by
the legacy inbox state only for old-client overlap until the `6-3.3` retirement
gate; it does not prove or control the new Job reservation. `6-3.2c` completed
the current Web semantic acknowledgment replacement.

## D6-3.2b-02 — Tombstone before physical purge

**Decision:** admin deletion sets `pr_messages.deleted_at`; ordinary queries,
thread lists, message-summary context selection and counts exclude tombstones.
The row, ID, and cursor remain until a separately authorized retention/purge
policy proves no remaining compatibility or Job reference needs it.

**Why:** soft deletion gives the cursor a durable ordering fact without
inventing a second read/inbox table. Operation log already carries the actor
audit fact, so this slice adds no `deleted_by` state.

## D6-3.2b-03 — Job is neutral; Notification owns invalidation semantics

**Decision:** Job exposes only keyed held-reservation release. It may cancel a
pending/retry execution and release a held reservation, including a terminal
execution that remains held; it does not receive PR, preference, delete or
provider vocabulary. Notification maps semantic `pr.message-summary`
invalidation scope to private creation keys and receives the generic result.

**Why:** a Job is durable work control, not business state. Putting
`PARTICIPANT_EXITED`, `PR_CLOSED`, or WeChat `43101` in Job would make generic
runtime semantics depend on the PR/Notification domain.

## D6-3.2b-04 — Terminal PR blocks attention windows, not message compatibility

**Decision:** `CLOSED` and `EXPIRED` suppress creation and dispatch of
`pr.message-summary` windows and invalidate currently held ones. This does not
silently change existing visible-thread or operator/system posting behavior.

**Why:** state can transition between source creation and external execution;
both source- and dispatch-time fences are required. Expanding the policy into
general message visibility/ACL would be an unrelated product change.

## D6-3.2b-05 — No replay on restored permission/credit

**Decision:** clear/opt-out invalidates held work. A transition from no
available PR-message credit to positive availability clears an obsolete held
generation but does not create a notification for historical messages. Extra
credit while availability remains positive preserves a valid current window.

**Why:** restored permission means permission for future attention, not an
implicit request to replay everything missed. A later committed message is a
clear, causally scoped rearm event.

## D6-3.2b-06 — Preference and channel credit remain one option fact

**Decision:** the existing `user_notification_opts` PR-message fields remain
the current representation of user preference plus limited WeChat credit. A
future unlimited channel may use the same semantic snapshot with `credit =
null`; this slice does not split the table or add an opportunity entity.

**Why:** a user subscription action carries both preference and provider grant
information today. Splitting it now would add state without a distinct owner
or behavior.
