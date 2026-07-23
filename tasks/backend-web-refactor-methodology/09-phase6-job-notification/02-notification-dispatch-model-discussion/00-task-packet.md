# D6-N-01 — Notification Dispatch Model Discussion

## Status

**Revised owner model ratified by Sir on 2026-07-22; no source mutation is
authorized.** This packet records the discussion about reminder-scheduler,
business/channel templates, user notification options, and the durable task
boundary. It does not authorize application, schema, migration, provider, or
runtime changes.

## Revised Question

Can Notification expose a business-template-based scheduling surface, use a
Job row as the only durable Notification Task, map the business template to a
channel template at execution, and keep preference plus nullable channel credit
in one user-notification-option aggregate?

## Revised Working Hypothesis

Yes, subject to the atomicity and outcome constraints below:

```text
business owner
  → Notification.request(businessTemplate, channel, recipient, payload,
                         semantic facts, metadata)
  → Notification derives timing / creation mode / private dedupe identity
  → Job(handler = notification.send.v1, versioned payload/metadata)
  → Notification execution coordinator
  → business-template × channel binding / renderer
  → NotificationChannelPort.send(rendered notification)
  → Job-owned control/recovery outcome + correlated attempt O11y (D6-J-02)
```

- A public `templateId` is valid when it is a stable **business template ID**;
  it must not be a provider/WeChat template ID.
- The Job is the durable Notification Task. Phase 6 has no target Notification
  Intent / Opportunity record.
- `UserNotificationOption` may coherently contain both preference and channel
  credit. `credit = null` means unlimited, not unknown.
- `NotificationChannelPort.send` remains the transport leaf. The generic Job
  handler still surrounds it with preference revalidation, template mapping,
  attempt-signal emission, and retry/outcome classification.

## Evidence Scope

- current Notification entity/repository/dispatch paths
- current JobRunner timing, retry, payload, and pending-job compatibility
- two historical Notification Manager shapes under
  `/mnt/f/CODING/Project/Anana/main`
- WeChat adapter/config/provider request shape
- durable owner rules and current Phase 6 topology packet

## Non-Mutation Guardrails

- Do not expose provider template IDs or raw provider field names to business
  callers.
- Do not put product preference, membership, message-attention-window policy,
  Job control, or attempt-O11y ownership inside a channel transport adapter.
- The current `notification_opportunities` table is compatibility only; do not
  remove it or replace current job types without a data/pending-job rollout
  strategy.
- Do not claim exactly-once provider send: the current WeChat request has no
  idempotency field.
- Do not interpret nullable credit ambiguously: `null = unlimited` must be a
  declared invariant at code and storage boundaries.

## Artifacts

- `discussion-log.md`: objections, evidence, corrections, and final comparison.
- `decision-log.md`: revised decisions and Sir-ratification status.
- `external-reference-review.md`: read-only review of the historical
  Notification Manager implementations.
- `api-sketch.md`: ratified business-template / Job-task / channel owner
  boundary sketch.
- `rehearsal.md`: execution branches, migration compatibility, and proof plan.
