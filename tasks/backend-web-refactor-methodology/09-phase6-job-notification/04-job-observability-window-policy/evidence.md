# D6-J-02 Evidence

## Attempt History Versus Durable Control

Current `notification_deliveries` is create-only and has no product/runtime
reader. It records handler outcomes for diagnosis; `SKIPPED` and `FAILED` rows
also receive `sentAt`, so it is not a provider delivery fact.

Job already persists the control facts that determine future execution:

- aggregate status, attempt/max-attempt count, run time and timing tolerance;
- lease owner/deadline, last-attempt time, last error and completion time;
- active dedupe identity.

The current deployment sends runtime logs to Aliyun Log Service. Durable docs
also identify OTLP-compatible trace/log/metric correlation as the intended
program-observability boundary. No current structured per-Job-attempt telemetry
contract exists, so observability parity is a migration gate before removing
`notification_deliveries`.

Pure history can be telemetry. Generic state that changes automatic task retry
is durable on Job. A provider-ambiguous acceptance that changes business
reconciliation is also not pure history, but it belongs durably to the semantic
domain owner rather than becoming a Job status/disposition.

## What `pr_message_inbox_states` Currently Does

`lastReadMessageId` currently supports:

- backend `hasUnread` derivation in PR message responses;
- frontend's explicit read-marker request after the visible latest message is
  loaded;
- unread message selection/count during notification rendering;
- closing the current notification wave.

`lastNotifiedMessageId` exists only for notification-wave creation and
execution revalidation.

The web does not render `hasUnread` or a persisted unread badge. It reads
`lastReadMessageId` only to avoid resending the same read-marker mutation while
the component is mounted. Across reloads, the acknowledgment can safely be
idempotent. The author-side “mark own message read” write also has no separate
visible consumer.

Therefore no current product use independently requires persistent per-PR/user
read state once Job owns the window reservation and rendering uses the Job's
window cursor range. This is a current-scope conclusion, not a claim that a
future inbox/read-receipt feature would never require PR-owned read state.

Before D6-J-02 promotion, `docs/20-product-tdd/pr-messaging-contracts.md`
declared backend-authoritative per-viewer read markers, `hasUnread` or an
equivalent summary, and an explicit read-marker API. D6-J-02 explicitly revised
that durable contract: the visible-thread action acknowledges a Job creation
window and does not persist general PR read state.

## Why Active-Only Job Dedupe Is Insufficient

Current Job dedupe uniqueness covers only `PENDING`, `RETRY`, and `RUNNING`.
For one-notification-per-unread-wave, the creation reservation must remain held
after the Job reaches `SUCCEEDED` or `FAILED`; otherwise a later message creates
another Job before the user reads the thread.

Execution state and creation-window state are therefore orthogonal:

```text
execution: PENDING → RUNNING → SUCCEEDED / FAILED / ...
window:    HELD ─────────────────────────→ RELEASED by explicit acknowledgment
```

The present `notification_waves` table does not implement this: it is never
read/advanced and its fixed `PR:user` key cannot represent later generations.

## Source Index

- Job control/dedupe: `apps/backend/src/entities/job.ts` and
  `apps/backend/src/infra/jobs/job-runner.ts`
- deployment observability: `docs/40-deployment/observability.md`
- current durable read-state contract:
  `docs/20-product-tdd/pr-messaging-contracts.md` and
  `docs/20-product-tdd/system-state-and-authority.md`
- PR thread response/read derivation:
  `apps/backend/src/domains/pr/services/pr-message-thread.service.ts`
- explicit read mutation:
  `apps/backend/src/domains/pr/message/advance-pr-message-read-marker.ts`
- web acknowledgment watcher:
  `apps/web/src/domains/pr/ui/sections/PRMessageThread.vue`
- notification wave gate and render:
  `apps/backend/src/domains/notification/model/unread-wave.ts` and
  `apps/backend/src/domains/notification/services/pr-message-dispatch.service.ts`
