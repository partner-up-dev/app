# D6-J-01 Evidence — Delivery And Wave Ownership

## `notification_deliveries` Is An Attempt Log, Not Delivery Truth

Current schema and callsites show:

- `notification_deliveries` has a nullable Job FK, PR/user/kind metadata,
  scheduled/sent timestamps, result, and error fields.
- The repository exposes only `create`; no application read or update path was
  found.
- Every notification handler writes a row for `SUCCESS`, `FAILED`, or
  `SKIPPED`. A skipped preflight writes the same table even though no channel
  send occurred.
- Failed retryable sends write a row and throw; a later Job attempt may write
  another row. Therefore one Job has zero-to-many rows.
- Some paths write `FAILED` and return, causing JobRunner to mark the Job
  `SUCCEEDED`; this proves that the current Job transition and “delivery” row
  can contradict one another.
- `sentAt` is populated for failed and skipped outcomes, so its current meaning
  is attempt completion time rather than proven provider delivery time.
- No provider delivery receipt/webhook state or provider message ID is stored.
  `SUCCESS` means the synchronous send call was accepted, not that a user
  received or read a message.

The table therefore models **Notification handler attempt outcomes**, not an
independent Notification delivery lifecycle.

## Job Currently Lacks Structured Control Outcomes And Attempt O11y

`jobs` stores the aggregate execution state: job type/payload, due-time policy,
attempt count, lease, dedupe key, last error, and completion time. JobRunner
invokes a handler and infers only:

- handler returns → `SUCCEEDED`;
- handler throws below max attempts → `RETRY`;
- handler throws at max attempts → `FAILED`;
- tolerance window exceeded → `MISSED`.

It does not distinguish `SKIPPED`, permanent refusal and retryable failure as
structured control outcomes. Folding pure attempt history into the single Job
row would lose history, while adding a second SQL attempt ledger would add an
unneeded owner. D6-J-02 therefore keeps current/terminal control on Job and
emits correlated attempt history to O11y. Provider ambiguity is persisted by
the semantic owner before the handler returns a generic non-retrying result.

## `notification_waves` Is Decorative Current State

Current schema advertises `OPEN`, `NOTIFIED`, `RESOLVED`, and `CANCELED`, plus
aggregate/recipient/time fields. Actual source behavior is much narrower:

- the repository exposes `createOnce` and `findByKindAndWaveKey`;
- only `createOnce` has a callsite;
- no callsite reads a wave or advances any wave status/timestamp;
- no delivery row or Job has a wave FK;
- the table is used only for PR-message notifications.
- its `waveKey` is fixed to `PR:user`, so the first row permanently conflicts
  with later unread-wave generations; later Jobs still schedule because their
  dedupe identity includes the wave-start message ID.

The effective unread-wave truth is instead:

```text
pr_message_inbox_states.lastNotifiedMessageId
  > pr_message_inbox_states.lastReadMessageId
```

Opening a wave updates `lastNotifiedMessageId`; reading messages advances
`lastReadMessageId`; the Job payload carries `waveStartMessageId`; dispatch
revalidates that the inbox state still matches and remains unread. Thus PR inbox
state plus the pending Job already determine the live behavior.

The name `lastNotifiedMessageId` is also misleading: it is written before the
provider is called. Its actual meaning is closer to notification-wave start or
claimed unread boundary.

## Final Ownership Consequence

- Job owns generic current/terminal execution control; pure attempt history is
  O11y evidence shared by Notification, RideHailing and other handlers.
- Provider-effect uncertainty belongs to the semantic owner, never Job.
- PR-message “wave” is a held/released Job creation reservation with monotonic
  high-water and semantic ACK; it is not read/unread product truth.
- Both `notification_waves` and `pr_message_inbox_states` leave the target after
  migration proof, even though inbox markers drive current compatibility.

## Source Index

- delivery schema: `apps/backend/src/entities/notification-delivery.ts`
- delivery create-only repository:
  `apps/backend/src/repositories/NotificationDeliveryRepository.ts`
- representative retrying handler:
  `apps/backend/src/infra/notifications/wechat-activity-start.ts`
- contradictory PR-message failure/return path:
  `apps/backend/src/infra/notifications/wechat-pr-message.ts`
- Job claim/transition/retry implementation:
  `apps/backend/src/infra/jobs/job-runner.ts`
- wave schema and repository:
  `apps/backend/src/entities/notification-wave.ts` and
  `apps/backend/src/repositories/NotificationWaveRepository.ts`
- fixed wave key and task creation:
  `apps/backend/src/domains/notification/services/pr-message-unread-wave.service.ts`
- effective wave predicate:
  `apps/backend/src/domains/notification/model/unread-wave.ts`
- read-marker authority:
  `apps/backend/src/domains/pr/message/advance-pr-message-read-marker.ts`
