# D6-N-01 Decision Log

Sir ratified the revised Job-as-Notification-Task owner model on 2026-07-22.
Ratification does not authorize source or schema changes. D6-J-01 reopened the
placement of delivery-attempt and wave capabilities; D6-J-02 has now finalized
that placement as attempt O11y plus durable Job control/creation state.

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D6-N-01 | Accept a stable **business template ID** in Notification's public API; reject provider/channel template IDs there. | Historical code validates business→channel template/field mapping, while provider IDs are replaceable channel configuration. | Ratified |
| D6-N-02 | Replace per-kind WeChat scheduler glue with Notification-owned template definitions plus Job schedule metadata/configuration. | Timing behavior remains, but it need not exist as a family of scheduler classes/modules. | Ratified |
| D6-N-03 | Use one generic `notification.send.v1` Job handler around rendering, revalidation, outcome classification and `NotificationChannelPort.send`. | The channel is a transport leaf; the Job handler is the Notification execution coordinator. | Ratified; storage/O11y placement finalized by D6-J-02 |
| D6-N-04 | Treat the Job row as the durable Notification Task; do not introduce Notification Intent, and plan retirement/consolidation of `notification_opportunities`. | The current opportunity lifecycle is write-only/incomplete and duplicates Job work identity. | Ratified; supersedes the initial Intent recommendation |
| D6-N-05 | Allow one `UserNotificationOption` aggregate to own preference plus nullable credit, with `null = unlimited` and independent field transition rules. | Subscription can simultaneously express preference and grant entitlement; future unlimited channels fit without a second aggregate. | Ratified |
| D6-N-06 | Preserve `notification_deliveries` as the per-attempt/provider-outcome ledger; retain `notification_waves` only for proven unread aggregation semantics. | This was the conservative boundary before auditing whether Job attempts and PR inbox state already own those facts. | Superseded by ratified D6-J-02: attempt history is O11y and wave is a Job creation mode |
| D6-N-07 | Replacing current `wechat.*` jobs requires versioned payloads plus a legacy decoder, migration, or drain strategy. | Removing handlers before existing pending/retry rows are handled makes JobRunner fail them as unknown work. | Ratified |
| D6-N-08 | Do not promise exactly-once channel send; document at-least-once/ambiguous outcome and provider-specific recovery. | Current WeChat provider request has no idempotency field. | Ratified |
| D6-N-09 | Where task loss is unacceptable, create the Notification Job atomically with the owning business transition or through an explicitly recoverable handoff. | A generic Job is durable only after insertion; separate commits can still lose required work. | Ratified |

## Withdrawn Initial Proposals

| Withdrawn proposal | Why withdrawn |
| --- | --- |
| Exclude every kind of `templateId` from the public API. | It failed to distinguish stable business template IDs from provider template IDs. |
| Promote `notification_opportunity` to a required Notification Intent. | No active reader/terminal lifecycle proves an independent fact; Job can own the task lifecycle. |
| Require preference and credit to be different owner aggregates/tables. | Distinct semantics do not require distinct ownership; one user action and aggregate may validly govern both. |

## Ratified Owner Model

```text
business owner → Notification.request(business template + typed semantic data)
               → Notification derives timing / creation / dedupe policy
               → Job = durable Notification Task
               → notification.send.v1
               → template/channel binding + eligibility revalidation
               → NotificationChannelPort.send
               → structured disposition → Job control + attempt O11y
```

Ratification settles the target boundary, not the order or authorization of
source migrations. Ratified D6-J-02 subsequently places pure attempt history in
O11y, durable control/recovery truth on Job, and PR-message wave behavior in the
Job `UNTIL_ACKNOWLEDGED` creation mode.
