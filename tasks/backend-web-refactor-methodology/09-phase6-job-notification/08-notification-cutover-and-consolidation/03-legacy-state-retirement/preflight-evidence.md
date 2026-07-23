# `6-3.3` Read-Only Preflight Evidence

## Static Topology Observed Locally

| Legacy concern | Current static state | Consequence |
| --- | --- | --- |
| New PR-message source | Atomic PR-message creation uses generic `pr.message-summary`; current Web calls semantic acknowledgement and contains no `/read-marker` transport. | Target replacement is proven; no new source expands legacy state. |
| Inbox/API | `domains/pr/message/list-pr-messages.ts` still reads `PRMessageInboxState`; `advance-pr-message-read-marker.ts` still writes it and response types retain `lastReadMessageId` / `hasUnread`. | Cannot remove inbox/API without old-client sunset and decoder decision. |
| Concrete PR-message Job | `infra/notifications/wechat-pr-message.ts` is registered from backend boot; its handler reads inbox last-read/notified state and records legacy delivery. The subscription controller still exposes legacy cancellation on `CLEAR`. | Pending legacy Jobs require a named decoder/migrate/drain policy before inbox drop. |
| Wave | `pr-message-unread-wave.service.ts` remains as an isolated historical service with no current non-test producer call. | A static zero-reference proof is plausible, but old deployed writers and retained data still gate drop. |
| Opportunity | Legacy scheduler definitions in activity-start, reminder and waitlist-promoted modules still contain opportunity writes, although their business callers are absent. | The shared table cannot drop on PR-message evidence alone: all legacy family writers, deployment safety, archive and Job inventory gate it. |
| Delivery | Per-kind legacy handlers still record delivery attempts. | Explicitly retained for `6-5`; exclude from all `6-3.3` migrations. |

## Legacy Job Families Requiring Inventory

- `wechat.notification.activity-start-reminder`
- `wechat.reminder.confirmation`
- `wechat.notification.new-partner`
- `wechat.notification.pr-message`
- `wechat.notification.meeting-point-updated`
- `wechat.notification.pr-ready`
- `wechat.notification.waitlist-promoted`
- `wechat.notification.waitlist-alternative-available`

The generic `notification.send.v1` population is not a retirement candidate; it
is the target execution family and is included only to distinguish it from old
rows.

## Static Reference Result

The local call ledger finds no non-test business caller of
`createPRMessageUnreadWaveNotificationOpportunities`,
`scheduleWeChatPRMessageNotification`, or the legacy Opportunity scheduler
exports. This proves only the checked-out source graph. Backend boot still
registers every legacy `wechat.*` decoder, and a rolling old deployment may
still execute its older writer paths; external runtime evidence remains
authoritative.

## Local Proof Still Needed After External Gate

1. a source reference ledger for each deleted table/API/handler;
2. migration fixtures for clean and representative legacy state;
3. an old-Job decoder/drain proof (especially PR-message inbox dependency);
4. targeted API/system behavior after field/route retirement; and
5. forward-only migration and rollback/restore runbook validation.
